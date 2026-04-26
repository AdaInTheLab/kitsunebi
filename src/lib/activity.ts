/**
 * Activity feed: parse the local git log for kitsunebi-shaped commit
 * subjects and turn them into structured events.
 *
 * Every API write goes through `scheduleGitSync(reason)`, which formats
 * a stable subject like:
 *
 *   patch <id>: <fields> (<agent>)
 *   move <id> → <status> (<agent>)
 *   reorder <id> (#<order>) (<agent>)
 *   attach <id>/<file> (+ body) (<agent>)
 *   detach <id>/<file> (+ body) (<agent>)
 *   create <id>: <title> (<agent>)
 *   comment on <id>: <author>
 *   auto-archive: N card(s) past Md done
 *
 * The agent suffix is optional: browser-driven writes don't include it,
 * commits authored before agent-attribution shipped don't either.
 *
 * We intentionally drop merge commits, code commits, and anything we
 * can't parse — the activity feed is about *board* changes, not source.
 */

import { spawn } from 'node:child_process';

export type ActivityType =
  | 'create'
  | 'patch'
  | 'move'
  | 'reorder'
  | 'touch'
  | 'attach'
  | 'detach'
  | 'comment'
  | 'auto-archive';

export interface ActivityEvent {
  hash: string;
  /** ISO timestamp from `git log %aI`. */
  timestamp: string;
  type: ActivityType;
  /** null for system-level events like auto-archive. */
  cardId: string | null;
  /** "luna" / "koda" / "ada" / "system" / null (browser write before attribution shipped). */
  agent: string | null;
  /** Human-friendly verb phrase, e.g. "moved to done", "attached screenshot.png". */
  detail: string;
  /** Original commit subject — kept around in case the renderer wants the source. */
  raw: string;
}

const PATTERNS: Array<{ re: RegExp; build: (m: RegExpMatchArray) => Omit<ActivityEvent, 'hash' | 'timestamp'> | null }> = [
  // patch <id>: <fields> [(<agent>)]
  {
    re: /^patch ([a-z0-9][a-z0-9-]*): (.+?)(?: \(([^()]+)\))?$/,
    build: (m) => ({ type: 'patch', cardId: m[1], detail: `patched ${m[2].trim()}`, agent: m[3] ?? null, raw: m[0] }),
  },
  // move <id> → <status> [(#<order>)] [(<agent>)]
  {
    re: /^move ([a-z0-9][a-z0-9-]*) → ([a-z_]+)(?: \(#([\d.\-]+)\))?(?: \(([^()]+)\))?$/,
    build: (m) => ({ type: 'move', cardId: m[1], detail: `moved to ${m[2]}`, agent: m[4] ?? null, raw: m[0] }),
  },
  // reorder <id> (#<order>) [(<agent>)]
  {
    re: /^reorder ([a-z0-9][a-z0-9-]*) \(#([\d.\-]+)\)(?: \(([^()]+)\))?$/,
    build: (m) => ({ type: 'reorder', cardId: m[1], detail: 'reordered', agent: m[3] ?? null, raw: m[0] }),
  },
  // touch <id> [(<agent>)]
  {
    re: /^touch ([a-z0-9][a-z0-9-]*)(?: \(([^()]+)\))?$/,
    build: (m) => ({ type: 'touch', cardId: m[1], detail: 'touched', agent: m[2] ?? null, raw: m[0] }),
  },
  // attach <id>/<filename> [(+ body)] [(<agent>)]
  {
    re: /^attach ([a-z0-9][a-z0-9-]*)\/(\S+?)( \(\+ body\))?(?: \(([^()]+)\))?$/,
    build: (m) => ({ type: 'attach', cardId: m[1], detail: `attached ${m[2]}`, agent: m[4] ?? null, raw: m[0] }),
  },
  // detach <id>/<filename> [(+ body)] [(<agent>)]
  {
    re: /^detach ([a-z0-9][a-z0-9-]*)\/(\S+?)( \(\+ body\))?(?: \(([^()]+)\))?$/,
    build: (m) => ({ type: 'detach', cardId: m[1], detail: `removed ${m[2]}`, agent: m[4] ?? null, raw: m[0] }),
  },
  // create <id>: <title> [(<agent>)]
  {
    re: /^create ([a-z0-9][a-z0-9-]*): (.+?)(?: \(([^()]+)\))?$/,
    build: (m) => ({ type: 'create', cardId: m[1], detail: 'created', agent: m[3] ?? null, raw: m[0] }),
  },
  // comment on <id>: <author>   (author isn't parenthesized — comment commits are formatted differently)
  {
    re: /^comment on ([a-z0-9][a-z0-9-]*): (.+)$/,
    build: (m) => ({ type: 'comment', cardId: m[1], detail: 'commented', agent: m[2].trim(), raw: m[0] }),
  },
  // auto-archive: N card(s) past Md done
  {
    re: /^auto-archive: (\d+) cards? past (\d+)d done$/,
    build: (m) => ({
      type: 'auto-archive',
      cardId: null,
      detail: `auto-archived ${m[1]} card${m[1] === '1' ? '' : 's'} past ${m[2]}d done`,
      agent: 'system',
      raw: m[0],
    }),
  },
];

function parseSubject(subject: string): Omit<ActivityEvent, 'hash' | 'timestamp'> | null {
  // Drop merge commits and obvious code-PR commits — they're not board activity.
  if (
    subject.startsWith('Merge pull request') ||
    subject.startsWith('Merge branch') ||
    subject.startsWith('Revert ')
  ) {
    return null;
  }
  for (const { re, build } of PATTERNS) {
    const m = subject.match(re);
    if (m) {
      return build(m);
    }
  }
  return null;
}

/** Read recent activity from the local git log. */
export async function readActivity({ limit = 200 }: { limit?: number } = {}): Promise<ActivityEvent[]> {
  let raw: string;
  try {
    raw = await runGit(['log', `--max-count=${limit}`, '--pretty=format:%H%x1f%aI%x1f%s']);
  } catch {
    return [];
  }
  const out: ActivityEvent[] = [];
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const [hash, ts, ...rest] = line.split('\x1f');
    const subject = rest.join('\x1f');
    const parsed = parseSubject(subject);
    if (parsed) {
      out.push({ hash, timestamp: ts, ...parsed });
    }
  }
  return out;
}

function runGit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b) => (stdout += b.toString('utf8')));
    child.stderr.on('data', (b) => (stderr += b.toString('utf8')));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`git ${args.join(' ')} exited ${code}: ${stderr.trim()}`));
    });
  });
}

/** Pure helper exposed for tests. */
export const _parseSubject = parseSubject;
