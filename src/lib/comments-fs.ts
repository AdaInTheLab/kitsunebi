/**
 * Per-card comment storage.
 *
 * Each card's comments live at `comments/<card-id>.jsonl` ~ one comment
 * per line, in order of arrival. Append-only on the happy path so adds
 * are atomic and git diffs stay clean (one new line per comment).
 *
 * Why JSONL not a JSON array:
 *   - append is one syscall, no read-modify-write race window
 *   - git diffs show exactly the added line, not "[N lines reformatted]"
 *   - parsing is line-at-a-time; a corrupt line doesn't kill the rest
 *
 * Why a separate top-level `comments/` dir:
 *   - keeps `cards/*.md` clean (frontmatter + markdown only)
 *   - mirrors `public/attachments/` as a parallel "tied to a card" subtree
 *   - the top-level location matches the deploy script's existing rsync set
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const COMMENTS_DIR = join(process.cwd(), 'comments');

export interface Comment {
  /** Short random hex id, scoped to this card. */
  id: string;
  /** Agent name (e.g. "luna", "koda") or human name (e.g. "ada"). */
  author: string;
  /** Free-form markdown ~ preserved as-is, displayed as plain text on the page. */
  text: string;
  /** ISO timestamp when the comment was first written. */
  createdAt: string;
}

export interface NewComment {
  text: string;
  author: string;
  /** Optional explicit createdAt; defaults to now(). Useful for backfills/tests. */
  createdAt?: string;
}

/**
 * Card ids are reused as filename components; reject anything unsafe so
 * we never resolve outside `comments/`.
 */
function isSafeCardId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,99}$/i.test(id);
}

function pathFor(cardId: string): string {
  return join(COMMENTS_DIR, `${cardId}.jsonl`);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Read all comments for a card. Empty array if the file doesn't exist yet. */
export async function listComments(cardId: string): Promise<Comment[]> {
  if (!isSafeCardId(cardId)) throw new Error(`unsafe card id: ${cardId}`);
  const path = pathFor(cardId);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err: any) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
  const out: Comment[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as Comment;
      if (parsed && typeof parsed.id === 'string' && typeof parsed.author === 'string' && typeof parsed.text === 'string') {
        out.push(parsed);
      }
    } catch {
      // Skip malformed lines rather than fail the whole read ~ a bad line
      // shouldn't blast the rest of the conversation.
    }
  }
  return out;
}

/** Append a comment to a card's log. Returns the persisted record. */
export async function appendComment(cardId: string, input: NewComment): Promise<Comment> {
  if (!isSafeCardId(cardId)) throw new Error(`unsafe card id: ${cardId}`);
  if (typeof input.text !== 'string' || input.text.trim().length === 0) {
    throw new Error('comment.text is required and must be non-empty');
  }
  if (typeof input.author !== 'string' || input.author.trim().length === 0) {
    throw new Error('comment.author is required and must be non-empty');
  }

  const comment: Comment = {
    id: randomBytes(6).toString('hex'),
    author: input.author.trim(),
    text: input.text,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  await mkdir(COMMENTS_DIR, { recursive: true });
  const path = pathFor(cardId);
  const line = JSON.stringify(comment) + '\n';
  // Open with O_APPEND via writeFile + flag:'a' ~ fs writes are atomic for
  // small payloads on common filesystems, so concurrent appends don't tear.
  await writeFile(path, line, { flag: 'a', encoding: 'utf8' });
  return comment;
}

/** Number of comments for a card. Used by detail-page count badges. */
export async function countComments(cardId: string): Promise<number> {
  const list = await listComments(cardId);
  return list.length;
}

/**
 * Test-helper: wipe all comments for a card. Not exposed via API; used by
 * tests to reset state. Returns true if a file was removed.
 */
export async function _clearComments(cardId: string): Promise<boolean> {
  if (!isSafeCardId(cardId)) throw new Error(`unsafe card id: ${cardId}`);
  const path = pathFor(cardId);
  if (!(await fileExists(path))) return false;
  await writeFile(path, '');
  return true;
}
