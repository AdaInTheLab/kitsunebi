/**
 * POST /api/cards/:id/move
 *
 * Body: { status: CardStatus, completed?: string | null, order?: number | null }
 *
 * Used by the board's drag-and-drop:
 *
 *   - `status` sets which column the card lives in. Inter-column moves
 *     also auto-fill (or clear) `completed:` based on whether you're
 *     entering/leaving the `done` column.
 *
 *   - `order` is an optional floating-point sort key for intra-column
 *     position. The client computes it as the midpoint of the dragged
 *     card's new neighbors' effective orders. Same endpoint handles both
 *     "move to other column" and "move within column" — usually you do
 *     both at once on a drop, in one round trip.
 *
 * Triggers a debounced git-sync so the change ends up on GitHub as
 * audit log, but the response doesn't wait for it.
 */

import type { APIRoute } from 'astro';
import { patchCardFrontmatter, readCard, type CardStatus, type CardPatch } from '../../../../lib/cards-fs';
import { json, jsonError, readJson, requireSameOrigin } from '../../../../lib/api-helpers';
import { requireAuth } from '../../../../lib/agent-auth';
import { scheduleGitSync } from '../../../../lib/git-sync';
import { notifyCardChangeBackground } from '../../../../lib/mesh-notify';

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
  /** Optional float; explicit intra-column position. */
  order?: number | null;
}

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

  const body = await readJson<MoveBody>(ctx);
  if (body instanceof Response) return body;

  const id = ctx.params.id;
  if (typeof id !== 'string' || id.length === 0) {
    return jsonError(400, 'missing_id', 'Path parameter "id" is required.');
  }

  if (!VALID_STATUSES.has(body.status)) {
    return jsonError(400, 'invalid_status', `status must be one of: ${[...VALID_STATUSES].join(', ')}`);
  }

  if (body.order !== undefined && body.order !== null && !Number.isFinite(body.order)) {
    return jsonError(400, 'invalid_order', 'order must be a finite number, null, or omitted.');
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

  // Apply the optional intra-column position.
  if (body.order !== undefined) {
    patch.order = body.order;
  }

  try {
    await patchCardFrontmatter(id, patch);
  } catch (err: any) {
    return jsonError(500, 'write_failed', err?.message ?? 'Failed to write card.');
  }

  // Commit message reflects what changed: status alone, order alone, or both.
  const statusChanged = body.status !== current.frontmatter.status;
  const orderChanged = body.order !== undefined && body.order !== current.frontmatter.order;
  let summary: string;
  if (statusChanged && orderChanged) summary = `move ${id} → ${body.status} (#${body.order})`;
  else if (statusChanged)             summary = `move ${id} → ${body.status}`;
  else if (orderChanged)              summary = `reorder ${id} (#${body.order})`;
  else                                summary = `touch ${id}`;
  if (auth.agent) summary += ` (${auth.agent})`;
  scheduleGitSync(summary);

  // Only notify on column changes — pure intra-column reorders are noisy
  // and not action-worthy for collaborators.
  if (statusChanged) {
    notifyCardChangeBackground({
      cardId: id,
      actor: auth.agent,
      event: {
        type: 'move',
        toStatus: body.status,
        title: current.frontmatter.title ?? id,
      },
    });
  }

  // Build the response from the *patched* state. `current.frontmatter` has
  // dates as Date objects (gray-matter auto-parses unquoted YYYY-MM-DD), so
  // we'd return ISO timestamps if we fell back to it. Normalize to YYYY-MM-DD.
  const finalCompleted =
    patch.completed !== undefined
      ? patch.completed
      : isoDateString(current.frontmatter.completed);

  return json(200, {
    id,
    status: body.status,
    completed: finalCompleted,
    order: body.order !== undefined ? body.order : current.frontmatter.order ?? null,
  });
};

function isoDateString(d: unknown): string | null {
  if (d == null) return null;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d);
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}
