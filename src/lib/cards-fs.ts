/**
 * Filesystem-level read/write for kitsunebi cards.
 *
 * The board's source of truth is `cards/<id>.md` on disk. The Astro content
 * collection reads them at request time (server output). The API routes
 * mutate them directly via this module.
 *
 * Why we don't use `gray-matter.stringify` for writes:
 *   js-yaml (gray-matter's engine) reformats every key on round-trip — flow
 *   arrays become block style, unquoted strings get quoted, blank lines
 *   collapse. Every save would be a noisy git diff against itself.
 *
 *   So writes are *surgical*: we read the file as text, locate the line
 *   matching `^<key>:`, replace just the value, and leave the rest of the
 *   frontmatter byte-identical. Reads still use gray-matter (parsing into
 *   a typed object is fine; nothing's being written).
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';

const CARDS_DIR = join(process.cwd(), 'cards');

export type CardStatus = 'backlog' | 'in_progress' | 'blocked' | 'done' | 'archived';

export interface CardFrontmatter {
  id: string;
  title: string;
  status: CardStatus;
  owner: string;
  collaborators?: string[];
  due?: string | null;
  created?: string | null;
  completed?: string | null;
  tags?: string[];
  blocked_by?: string[];
  /**
   * Floating-point sort key for intra-column position. Cards without one
   * fall back to sorting by `-created` (newer-first). See the interleaved
   * sort in src/pages/index.astro and the drop-position math in the
   * board's drag-drop client script.
   */
  order?: number | null;
}

export interface ParsedCard {
  frontmatter: CardFrontmatter;
  body: string;
  /** The raw on-disk text, useful for surgical edits. */
  raw: string;
}

/** A patch that can be applied to a card's frontmatter. Only specified keys get touched. */
export type CardPatch = Partial<Omit<CardFrontmatter, 'id'>>;

/** Read and parse a card by id. Throws if the file doesn't exist. */
export async function readCard(id: string): Promise<ParsedCard> {
  if (!isSafeId(id)) {
    throw new Error(`Refused to read card with unsafe id: ${id}`);
  }
  const path = join(CARDS_DIR, `${id}.md`);
  const raw = await readFile(path, 'utf8');
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data as CardFrontmatter,
    body: parsed.content,
    raw,
  };
}

/** List all card ids (basename without `.md`) currently on disk. */
export async function listCardIds(): Promise<string[]> {
  const entries = await readdir(CARDS_DIR);
  return entries
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/**
 * Apply a patch to a card's frontmatter, surgically. Lines for keys in the
 * patch get their values rewritten; everything else stays byte-identical.
 *
 * If a key in the patch isn't in the frontmatter yet, it's appended at the
 * end of the frontmatter block (just before the closing `---`).
 *
 * Returns the updated raw text (also writes to disk).
 */
export async function patchCardFrontmatter(id: string, patch: CardPatch): Promise<string> {
  if (!isSafeId(id)) {
    throw new Error(`Refused to write card with unsafe id: ${id}`);
  }
  const path = join(CARDS_DIR, `${id}.md`);
  const current = await readFile(path, 'utf8');
  const next = applyFrontmatterPatch(current, patch);
  if (next !== current) {
    await writeFile(path, next, 'utf8');
  }
  return next;
}

/**
 * Pure function form of the patch — exposed for unit testing without
 * touching disk. Does the surgical YAML rewrite.
 */
export function applyFrontmatterPatch(raw: string, patch: CardPatch): string {
  const { fmStart, fmEnd } = locateFrontmatter(raw);
  const fmBlock = raw.slice(fmStart, fmEnd);
  const lines = fmBlock.split('\n');

  const remainingPatch = new Map<string, unknown>(Object.entries(patch));

  // CRLF compatibility: when the file uses Windows line endings, splitting on
  // `\n` leaves a `\r` glued to the end of each element. JavaScript regex
  // treats `\r` as a line terminator that `.` won't match and `$` won't see
  // past, so a naive `(.*)$` quietly fails to match every CRLF line. We
  // strip the trailing `\r` for matching, then re-attach it when writing
  // the replacement so the file's existing line endings are preserved.
  const KEY_LINE_RE = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasCR = line.endsWith('\r');
    const stripped = hasCR ? line.slice(0, -1) : line;
    const m = stripped.match(KEY_LINE_RE);
    if (!m) continue;
    const key = m[1];
    if (!remainingPatch.has(key)) continue;

    const value = remainingPatch.get(key);
    remainingPatch.delete(key);
    lines[i] = `${key}: ${formatYamlValue(value)}${hasCR ? '\r' : ''}`;
  }

  // Any keys in the patch not yet in the frontmatter get appended at the end.
  // (lines[lines.length - 1] is empty because the block ends with \n before
  // the closing `---`, so we insert before that empty trailing line.)
  if (remainingPatch.size > 0) {
    const insertAt = lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
    // Match the file's existing line-ending convention. We sample the line
    // *before* the insert point — if it ends with `\r`, the file is CRLF.
    const sampleLine = insertAt > 0 ? lines[insertAt - 1] : '';
    const eol = sampleLine.endsWith('\r') ? '\r' : '';
    const additions: string[] = [];
    for (const [key, value] of remainingPatch) {
      additions.push(`${key}: ${formatYamlValue(value)}${eol}`);
    }
    lines.splice(insertAt, 0, ...additions);
  }

  return raw.slice(0, fmStart) + lines.join('\n') + raw.slice(fmEnd);
}

/**
 * Returns the byte offsets of the frontmatter block contents (i.e. between
 * the opening `---\n` and the closing `\n---`). Throws if the file doesn't
 * start with a frontmatter block — kitsunebi cards always do.
 */
function locateFrontmatter(raw: string): { fmStart: number; fmEnd: number } {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    throw new Error('card has no opening frontmatter delimiter');
  }
  const openLen = raw.startsWith('---\r\n') ? 5 : 4;
  // Find the next `---` on its own line.
  const closeMatch = raw.slice(openLen).match(/\n---\r?\n/);
  if (!closeMatch || closeMatch.index === undefined) {
    throw new Error('card has no closing frontmatter delimiter');
  }
  const fmStart = openLen;
  const fmEnd = openLen + closeMatch.index + 1; // include trailing \n of last frontmatter line
  return { fmStart, fmEnd };
}

/** Render a JS value into the inline YAML style our cards already use. */
function formatYamlValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(formatYamlScalar).join(', ')}]`;
  return formatYamlScalar(value);
}

/** Render a non-array scalar. Quotes if needed (special chars / starts-with-number). */
function formatYamlScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const str = String(value);
  // ISO YYYY-MM-DD dates are the existing card convention — emit them
  // unquoted to preserve clean git diffs. YAML auto-parses them to a
  // Date object, and our `dateish` schema transform normalizes them back
  // to a string downstream, so the round trip is lossless either way.
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Quote if the string contains YAML-meaningful chars or could be confused with a number/bool.
  if (
    str === '' ||
    /^[-?:,\[\]{}#&*!|>'"%@`]/.test(str) ||
    /[:#]\s/.test(str) ||
    /^(true|false|null|yes|no|on|off)$/i.test(str) ||
    /^-?\d/.test(str) // numeric-ish — quote it so parsers don't coerce
  ) {
    // Use double quotes; escape backslashes and double quotes inside.
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return str;
}

/**
 * Card ids are used as path components — refuse anything that could escape
 * the cards/ directory or cause weird filesystem behavior.
 */
function isSafeId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,99}$/i.test(id);
}
