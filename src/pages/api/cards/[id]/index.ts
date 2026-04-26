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
import { patchCardFrontmatter, readCard, type CardPatch } from '../../../../lib/cards-fs';
import { json, jsonError, readJson, requireSameOrigin } from '../../../../lib/api-helpers';
import { requireAuth } from '../../../../lib/agent-auth';
import { scheduleGitSync } from '../../../../lib/git-sync';
import { notifyCardChangeBackground } from '../../../../lib/mesh-notify';

const PATCHABLE_KEYS = ['title', 'owner', 'collaborators', 'tags', 'due', 'blocked_by'] as const;
type PatchableKey = (typeof PATCHABLE_KEYS)[number];

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

  const id = ctx.params.id;
  if (typeof id !== 'string' || id.length === 0) {
    return jsonError(400, 'missing_id', 'Path parameter "id" is required.');
  }

  try {
    const card = await readCard(id);
    return json(200, {
      frontmatter: normalizeFrontmatter(card.frontmatter),
      body: card.body,
    });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return jsonError(404, 'not_found', `No card with id "${id}".`);
    }
    return jsonError(500, 'read_failed', err?.message ?? 'Failed to read card.');
  }
};

export const PATCH: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

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

  const agentSuffix = auth.agent ? ` (${auth.agent})` : '';
  const patchedKeys = Object.keys(patch);
  scheduleGitSync(`patch ${id}: ${patchedKeys.join(', ')}${agentSuffix}`);

  // Re-read to get the post-patch title for the notification text.
  let title = id;
  try {
    title = (await readCard(id)).frontmatter.title ?? id;
  } catch {
    // fall through with id as title
  }
  notifyCardChangeBackground({
    cardId: id,
    actor: auth.agent,
    event: { type: 'patch', fields: patchedKeys, title },
  });

  return json(200, { id, patched: patchedKeys, ignored });
};

/**
 * Convert any Date objects to YYYY-MM-DD strings so JSON output stays stable
 * across YAML quirks (gray-matter auto-parses unquoted ISO dates).
 */
function normalizeFrontmatter(fm: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    out[k] = v instanceof Date ? v.toISOString().split('T')[0] : v;
  }
  return out;
}
