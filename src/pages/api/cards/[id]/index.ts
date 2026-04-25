/**
 * PATCH /api/cards/:id
 *
 * Body: a subset of CardPatch — title, owner, collaborators, tags, due,
 * blocked_by. (status changes go through the dedicated /move endpoint
 * because they have side effects on `completed:`.)
 *
 * Used by inline-edit chips on the board (click a tag to retag, etc).
 */

import type { APIRoute } from 'astro';
import { patchCardFrontmatter, type CardPatch } from '../../../../lib/cards-fs';
import { json, jsonError, readJson, requireSameOrigin } from '../../../../lib/api-helpers';
import { scheduleGitSync } from '../../../../lib/git-sync';

const PATCHABLE_KEYS = ['title', 'owner', 'collaborators', 'tags', 'due', 'blocked_by'] as const;
type PatchableKey = (typeof PATCHABLE_KEYS)[number];

export const prerender = false;

export const PATCH: APIRoute = async (ctx) => {
  const reject = requireSameOrigin(ctx);
  if (reject) return reject;

  const body = await readJson<Record<string, unknown>>(ctx);
  if (body instanceof Response) return body;

  const id = ctx.params.id;
  if (typeof id !== 'string' || id.length === 0) {
    return jsonError(400, 'missing_id', 'Path parameter "id" is required.');
  }

  // Only accept whitelisted keys so a typo or hostile field can't sneak
  // into the frontmatter.
  const patch: CardPatch = {};
  const ignored: string[] = [];
  for (const [k, v] of Object.entries(body)) {
    if ((PATCHABLE_KEYS as readonly string[]).includes(k)) {
      (patch as Record<string, unknown>)[k] = v;
    } else {
      ignored.push(k);
    }
  }

  if (Object.keys(patch).length === 0) {
    return jsonError(400, 'empty_patch', `No patchable keys in body. Allowed: ${PATCHABLE_KEYS.join(', ')}.`);
  }

  // Light schema enforcement on the array-shaped fields.
  for (const k of ['collaborators', 'tags', 'blocked_by'] as PatchableKey[]) {
    if (k in patch && patch[k] !== undefined && !Array.isArray(patch[k])) {
      return jsonError(400, 'invalid_field', `${k} must be an array.`);
    }
  }
  if (patch.title !== undefined && (typeof patch.title !== 'string' || patch.title.trim() === '')) {
    return jsonError(400, 'invalid_field', 'title must be a non-empty string.');
  }
  if (patch.owner !== undefined && (typeof patch.owner !== 'string' || patch.owner.trim() === '')) {
    return jsonError(400, 'invalid_field', 'owner must be a non-empty string.');
  }

  try {
    await patchCardFrontmatter(id, patch);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return jsonError(404, 'not_found', `No card with id "${id}".`);
    }
    return jsonError(500, 'write_failed', err?.message ?? 'Failed to write card.');
  }

  scheduleGitSync(`patch ${id}: ${Object.keys(patch).join(', ')}`);

  return json(200, { id, patched: Object.keys(patch), ignored });
};
