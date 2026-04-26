/**
 * GET  /api/cards
 *   Optional query: ?status=, ?owner=, ?tag=, ?include=body
 *   Returns: { cards: CardFrontmatter[] } (or with body if ?include=body).
 *
 * POST /api/cards
 *   Body: NewCardSpec (id, title, status, owner, ... + optional body).
 *   Returns 201 with the created frontmatter, or 409 if the id is taken.
 *
 * Both endpoints accept either a same-origin browser request (the existing
 * Zero-Trust + cookie path) or `Authorization: Bearer <agent-token>` for
 * agent runtimes.
 */

import type { APIRoute } from 'astro';
import {
  createCard,
  listCardIds,
  readCard,
  type NewCardSpec,
  type CardStatus,
} from '../../../lib/cards-fs';
import {
  json,
  jsonError,
  readJson,
  requireSameOrigin,
} from '../../../lib/api-helpers';
import { requireAuth } from '../../../lib/agent-auth';
import { scheduleGitSync } from '../../../lib/git-sync';

const VALID_STATUSES: ReadonlySet<CardStatus> = new Set([
  'backlog',
  'in_progress',
  'blocked',
  'done',
  'archived',
]);

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

  const url = new URL(ctx.request.url);
  const wantStatus = url.searchParams.get('status');
  const wantOwner = url.searchParams.get('owner');
  const wantTag = url.searchParams.get('tag');
  const includeBody = url.searchParams.get('include') === 'body';

  if (wantStatus && !VALID_STATUSES.has(wantStatus as CardStatus)) {
    return jsonError(400, 'invalid_status', `status must be one of: ${[...VALID_STATUSES].join(', ')}`);
  }

  let ids: string[];
  try {
    ids = await listCardIds();
  } catch (err: any) {
    return jsonError(500, 'list_failed', err?.message ?? 'Failed to list cards.');
  }

  const out: Array<Record<string, unknown>> = [];
  for (const id of ids) {
    let card;
    try {
      card = await readCard(id);
    } catch {
      continue;
    }
    const fm = normalizeFrontmatter(card.frontmatter);
    if (wantStatus && fm.status !== wantStatus) continue;
    if (wantOwner && fm.owner !== wantOwner) continue;
    if (wantTag && !((fm.tags as string[] | undefined) ?? []).includes(wantTag)) continue;
    out.push(includeBody ? { ...fm, body: card.body } : fm);
  }

  return json(200, { cards: out, count: out.length });
};

export const POST: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

  const body = await readJson<Partial<NewCardSpec>>(ctx);
  if (body instanceof Response) return body;

  // Required fields.
  if (typeof body.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/i.test(body.id)) {
    return jsonError(400, 'invalid_id', 'id is required and must match /^[a-z0-9][a-z0-9-]{0,99}$/i.');
  }
  if (typeof body.title !== 'string' || body.title.trim() === '') {
    return jsonError(400, 'invalid_field', 'title is required and must be a non-empty string.');
  }
  if (typeof body.status !== 'string' || !VALID_STATUSES.has(body.status as CardStatus)) {
    return jsonError(400, 'invalid_status', `status must be one of: ${[...VALID_STATUSES].join(', ')}`);
  }
  if (typeof body.owner !== 'string' || body.owner.trim() === '') {
    return jsonError(400, 'invalid_field', 'owner is required and must be a non-empty string.');
  }
  for (const k of ['collaborators', 'tags', 'blocked_by'] as const) {
    if (k in body && body[k] !== undefined && !Array.isArray(body[k])) {
      return jsonError(400, 'invalid_field', `${k} must be an array.`);
    }
  }

  const spec: NewCardSpec = {
    id: body.id,
    title: body.title.trim(),
    status: body.status as CardStatus,
    owner: body.owner.trim(),
    collaborators: body.collaborators ?? [],
    due: body.due ?? null,
    created: body.created ?? null,
    completed: body.completed,
    tags: body.tags ?? [],
    blocked_by: body.blocked_by ?? [],
    order: body.order ?? null,
    body: body.body ?? '',
  };

  try {
    await createCard(spec);
  } catch (err: any) {
    if (err?.code === 'EEXIST') {
      return jsonError(409, 'already_exists', `A card with id "${spec.id}" already exists.`);
    }
    return jsonError(500, 'create_failed', err?.message ?? 'Failed to write card.');
  }

  const agentSuffix = auth.agent ? ` (${auth.agent})` : '';
  scheduleGitSync(`create ${spec.id}: ${spec.title}${agentSuffix}`);

  // Read back so the response reflects the on-disk state (including the
  // defaulted `created` date when the caller didn't supply one).
  let created;
  try {
    created = await readCard(spec.id);
  } catch (err: any) {
    return json(201, { id: spec.id, frontmatter: null, note: 'created but read-back failed' });
  }
  return json(201, {
    id: spec.id,
    frontmatter: normalizeFrontmatter(created.frontmatter),
  });
};

/** Convert any Date objects to YYYY-MM-DD strings so JSON output stays stable. */
function normalizeFrontmatter(fm: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    out[k] = v instanceof Date ? v.toISOString().split('T')[0] : v;
  }
  return out;
}
