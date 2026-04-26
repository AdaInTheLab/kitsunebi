/**
 * Auto-archive sweep.
 *
 * Cards in `done` for ≥ KITSUNEBI_ARCHIVE_DAYS (default 14) get auto-moved
 * to `archived`. The sweep runs lazily on board page loads, debounced 1h via
 * a stamp file at `.archive-sweep-stamp`. No cron required.
 *
 * Eligibility uses the `completed:` date — i.e. the day the card was moved
 * into the done column. Cards with `status: done` but no `completed` are
 * skipped (we have no clock to start counting from).
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { patchCardFrontmatter } from './cards-fs';
import { scheduleGitSync } from './git-sync';

const STAMP_PATH = join(process.cwd(), '.archive-sweep-stamp');
const DEBOUNCE_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SweepResult {
  swept: string[];
  skipped: 'recent' | null;
}

export async function maybeSweepArchived(): Promise<SweepResult> {
  try {
    const s = await stat(STAMP_PATH);
    if (Date.now() - s.mtimeMs < DEBOUNCE_MS) {
      return { swept: [], skipped: 'recent' };
    }
  } catch {
    // No stamp yet — first sweep.
  }

  const days = Number(process.env.KITSUNEBI_ARCHIVE_DAYS ?? 14);
  if (!Number.isFinite(days) || days <= 0) {
    await touchStamp();
    return { swept: [], skipped: null };
  }

  const cutoffMs = Date.now() - days * DAY_MS;
  const cardsDir = join(process.cwd(), 'cards');
  const swept: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(cardsDir);
  } catch {
    return { swept: [], skipped: null };
  }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const id = entry.slice(0, -3);
    const path = join(cardsDir, entry);

    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch {
      continue;
    }

    const data = matter(raw).data as Record<string, unknown>;
    if (data.status !== 'done') continue;
    const completed = data.completed;
    if (completed == null) continue;

    const completedMs =
      completed instanceof Date ? completed.getTime() : Date.parse(String(completed));
    if (!Number.isFinite(completedMs)) continue;
    if (completedMs > cutoffMs) continue;

    try {
      await patchCardFrontmatter(id, { status: 'archived' });
      swept.push(id);
    } catch (err) {
      console.error(`archive-sweep: failed to archive ${id}:`, err);
    }
  }

  await touchStamp();

  if (swept.length > 0) {
    scheduleGitSync(`auto-archive: ${swept.length} card(s) past ${days}d done`);
  }

  return { swept, skipped: null };
}

async function touchStamp(): Promise<void> {
  try {
    await writeFile(STAMP_PATH, String(Date.now()), 'utf8');
  } catch (err) {
    console.error('archive-sweep: failed to write stamp:', err);
  }
}
