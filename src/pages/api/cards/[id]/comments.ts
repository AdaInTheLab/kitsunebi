/**
 * GET  /api/cards/:id/comments
 *   Returns: { comments: Comment[] } in arrival order (oldest first).
 *
 * POST /api/cards/:id/comments
 *   Body: { text: string, author?: string }
 *
 *   Author resolution, in precedence:
 *     1. agent-authed request → caller's agent name
 *     2. body.author (browser callers, where Ada types her own name)
 *     3. "anon"
 *
 * Both endpoints accept same-origin browser auth or `Authorization: Bearer
 * <agent-token>` (the same path the rest of the API uses).
 */

import type { APIRoute } from 'astro';
import { listComments, appendComment } from '../../../../lib/comments-fs';
import { readCard } from '../../../../lib/cards-fs';
import { json, jsonError, readJson, requireSameOrigin } from '../../../../lib/api-helpers';
import { requireAuth } from '../../../../lib/agent-auth';
import { scheduleGitSync } from '../../../../lib/git-sync';
import { notifyCardChangeBackground } from '../../../../lib/mesh-notify';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

  const id = ctx.params.id;
  if (typeof id !== 'string' || id.length === 0) {
    return jsonError(400, 'missing_id', 'Path parameter "id" is required.');
  }

  try {
    const comments = await listComments(id);
    return json(200, { id, comments, count: comments.length });
  } catch (err: any) {
    return jsonError(500, 'read_failed', err?.message ?? 'Failed to read comments.');
  }
};

export const POST: APIRoute = async (ctx) => {
  const auth = requireAuth(ctx, requireSameOrigin);
  if (auth instanceof Response) return auth;

  const body = await readJson<{ text?: string; author?: string }>(ctx);
  if (body instanceof Response) return body;

  const id = ctx.params.id;
  if (typeof id !== 'string' || id.length === 0) {
    return jsonError(400, 'missing_id', 'Path parameter "id" is required.');
  }

  // Validate the card exists — don't accept comments on non-existent cards
  // (would otherwise create an orphaned `comments/<id>.jsonl`).
  try {
    await readCard(id);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return jsonError(404, 'not_found', `No card with id "${id}".`);
    }
    return jsonError(500, 'card_read_failed', err?.message ?? 'Failed to verify card.');
  }

  if (typeof body.text !== 'string' || body.text.trim() === '') {
    return jsonError(400, 'invalid_field', 'text is required and must be a non-empty string.');
  }

  // Author precedence: agent name (if agent-authed) > explicit body.author > "anon".
  let author: string;
  if (auth.agent) {
    author = auth.agent;
  } else if (typeof body.author === 'string' && body.author.trim() !== '') {
    author = body.author.trim();
  } else {
    author = 'anon';
  }

  let comment;
  try {
    comment = await appendComment(id, { text: body.text, author });
  } catch (err: any) {
    return jsonError(500, 'append_failed', err?.message ?? 'Failed to write comment.');
  }
  scheduleGitSync(`comment on ${id}: ${author}`);

  // Comment notification: actor is the comment author (agent or browser
  // typed-name). Preview is first 80 chars, no surrounding quotes.
  let title = id;
  try { title = (await readCard(id)).frontmatter.title ?? id; } catch {}
  const preview = body.text.length > 80 ? body.text.slice(0, 77) + '…' : body.text;
  notifyCardChangeBackground({
    cardId: id,
    actor: author,
    event: { type: 'comment', preview, title },
  });

  return json(201, { id, comment });
};
