/**
 * POST /api/cards/:id/move
 *
 * Body: { status: CardStatus, completed?: string | null }
 *
 * Used by the board's drag-and-drop. Sets the card's `status:` to the new
 * column and, if moving into `done`, fills in `completed:` with today's
 * date if it isn't already set. Conversely, moving *out* of done clears
 * `completed:` (it stops being meaningful).
 *
 * Triggers a debounced git-sync so the change ends up on GitHub as audit
 * log, but the response doesn't wait for it.
 */

import type { APIRoute } from 'astro';
import { patchCardFrontmatter, readCard, type CardStatus, type CardPatch } from '../../../../lib/cards-fs';
import { json, jsonError, readJson, requireSameOrigin } from '../../../../lib/api-helpers';
import { scheduleGitSync } from '../../../../lib/git-sync';

const VALID_STATUSES: ReadonlySet<CardStatus> = new Set([
  'backlog',
  'in_progress',
  'blocked',
  'done',
  'archived',
]);

interface MoveBody {
  status: CardStatus;
  /** Optional override; defaults to today's YYYY-MM-DD when status === 'done'. */
  completed?: string | null;
}

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const reject = requireSameOrigin(ctx);
  if (reject) return reject;

  const body = await readJson<MoveBody>(ctx);
  if (body instanceof Response) return body;

  const id = ctx.params.id;
  if (typeof id !== 'string' || id.length === 0) {
    return jsonError(400, 'missing_id', 'Path parameter "id" is required.');
  }

  if (!VALID_STATUSES.has(body.status)) {
    return jsonError(400, 'invalid_status', `status must be one of: ${[...VALID_STATUSES].join(', ')}`);
  }

  let current;
  try {
    current = await readCard(id);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return jsonError(404, 'not_found', `No card with id "${id}".`);
    }
    return jsonError(500, 'read_failed', err?.message ?? 'Failed to read card.');
  }

  const patch: CardPatch = { status: body.status };

  if (body.status === 'done') {
    // Don't overwrite an existing completed date — preserves history if a
    // card is bumped back to in_progress and then re-shipped on a later day,
    // unless the caller explicitly passes a new value.
    if (body.completed !== undefined) {
      patch.completed = body.completed;
    } else if (!current.frontmatter.completed) {
      patch.completed = todayIsoDate();
    }
  } else {
    // Moving away from done: only clear completed: if it's currently set,
    // and only if the caller didn't pass an explicit completed override.
    if (body.completed !== undefined) {
      patch.completed = body.completed;
    } else if (current.frontmatter.completed) {
      patch.completed = null;
    }
  }

  try {
    await patchCardFrontmatter(id, patch);
  } catch (err: any) {
    return jsonError(500, 'write_failed', err?.message ?? 'Failed to write card.');
  }

  scheduleGitSync(`move ${id} → ${body.status}`);

  return json(200, {
    id,
    status: body.status,
    completed: patch.completed ?? current.frontmatter.completed ?? null,
  });
};

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}
