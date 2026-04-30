/**
 * Debounced background git committer.
 *
 * The model: API routes mutate `cards/*.md` and `public/attachments/**`
 * directly, which is the source of truth. This module piggybacks on every
 * mutation by scheduling a `git add . && git commit && git push` ~5s after
 * the most recent write. That way:
 *
 *   - GitHub stays current as offsite backup + activity log,
 *   - the user gets a snappy API response (we don't await git on the
 *     critical path),
 *   - rapid drag-and-drops collapse into a single commit.
 *
 * Soft-fails on every git error and just logs. Worst case, GitHub falls
 * behind disk; a manual `git push` from the VPS catches it back up. The
 * source of truth is on disk, not in GitHub.
 */

import { spawn } from 'node:child_process';

const DEBOUNCE_MS = 5_000;
const REPO_DIR = process.cwd();
const ENABLED = process.env.KITSUNEBI_GIT_SYNC !== 'off';

interface PendingSync {
  reasons: string[];
  timer: NodeJS.Timeout;
}

let pending: PendingSync | null = null;
let inFlight: Promise<void> | null = null;

/**
 * Mark that something on disk has changed and a commit is desired. Calls
 * pile up inside the debounce window ~ one commit will eventually land
 * with a message that summarizes the batch.
 */
export function scheduleGitSync(reason: string): void {
  if (!ENABLED) {
    console.log('[kitsunebi/git-sync] disabled, skipping:', reason);
    return;
  }

  if (pending) {
    pending.reasons.push(reason);
    pending.timer.refresh();
    return;
  }

  const reasons: string[] = [reason];
  const timer = setTimeout(() => {
    pending = null;
    void runSync(reasons);
  }, DEBOUNCE_MS);
  pending = { reasons, timer };
}

/**
 * If there's a pending debounced sync, fire it now without waiting for
 * the timer. Mostly useful for tests and graceful shutdown.
 */
export async function flushGitSync(): Promise<void> {
  if (pending) {
    clearTimeout(pending.timer);
    const reasons = pending.reasons;
    pending = null;
    await runSync(reasons);
  }
  if (inFlight) await inFlight;
}

async function runSync(reasons: string[]): Promise<void> {
  // If a sync is already running, chain after it so commits stay ordered.
  const start = inFlight ?? Promise.resolve();
  const next = start.then(() => doSync(reasons));
  inFlight = next.finally(() => {
    if (inFlight === next) inFlight = null;
  });
  await next;
}

async function doSync(reasons: string[]): Promise<void> {
  const message = formatCommitMessage(reasons);
  try {
    await git(['add', 'cards/', 'comments/', 'public/attachments/']);
    const status = await git(['status', '--porcelain']);
    if (status.stdout.trim() === '') {
      // Nothing actually staged (e.g. status patch that resolved to a
      // no-op). Skip the commit entirely.
      return;
    }
    await git(['commit', '-m', message]);

    // Origin may have moved since we last touched it (code PR merged,
    // Ada's local kitsunebi pushed a data commit). Without this rebase,
    // the push gets rejected with "fetch first" and our commit sits
    // local-only. The 2026-04-27 incident was a week of such orphaned
    // commits piling up because origin had drifted.
    //
    // We rebase rather than merge so the audit log stays linear ~ each
    // (agent) commit lands cleanly on top of whatever origin had.
    try {
      await git(['fetch', 'origin', 'main']);
      await git(['rebase', 'origin/main']);
    } catch (err: any) {
      console.error(
        '[kitsunebi/git-sync] rebase onto origin/main failed; commit kept locally, push skipped:',
        err?.message ?? err,
      );
      // Best-effort cleanup so we don't leave a half-rebased tree behind.
      try { await git(['rebase', '--abort']); } catch { /* nothing to abort */ }
      return;
    }

    await git(['push', 'origin', 'main']);
    console.log(`[kitsunebi/git-sync] pushed: ${message.split('\n')[0]}`);
  } catch (err: any) {
    console.error('[kitsunebi/git-sync] failed:', err?.message ?? err);
    // Don't rethrow ~ git is best-effort. Source of truth is the filesystem.
  }
}

function formatCommitMessage(reasons: string[]): string {
  // Collapse duplicates while preserving order (drag back and forth in
  // <5s shouldn't produce a 12-line commit message).
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const r of reasons) {
    if (!seen.has(r)) {
      seen.add(r);
      dedup.push(r);
    }
  }

  const summary = dedup.length === 1 ? dedup[0] : `kitsunebi: ${dedup.length} updates`;
  if (dedup.length <= 1) return summary;

  return `${summary}\n\n${dedup.map((r) => `- ${r}`).join('\n')}`;
}

interface GitResult {
  stdout: string;
  stderr: string;
}

function git(args: string[]): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: REPO_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b) => (stdout += b.toString('utf8')));
    child.stderr.on('data', (b) => (stderr += b.toString('utf8')));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`git ${args.join(' ')} exited ${code}: ${stderr.trim()}`));
    });
  });
}
