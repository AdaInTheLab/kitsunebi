/**
 * Tiny shared helpers for the kitsunebi API routes.
 *
 * These endpoints all sit behind the Cloudflare Zero Trust gate on
 * kitsunebi.kitsuneden.net ~ that's our authn. The same-origin check below
 * is just CSRF defense in depth: even if Zero Trust were misconfigured to
 * allow some other origin's browser session, we'd still reject the write
 * because the Origin header wouldn't match.
 */

import type { APIContext } from 'astro';

const ALLOWED_ORIGINS = new Set<string>([
  'https://kitsunebi.kitsuneden.net',
  // Local dev: Astro dev server defaults
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  // Local preview of the standalone Node build
  'http://localhost:4322',
  'http://127.0.0.1:4322',
]);

/**
 * Reject requests whose Origin doesn't match an allowlisted host. Returns
 * a Response if the request should be rejected, or null if it's OK.
 */
export function requireSameOrigin(ctx: APIContext): Response | null {
  const origin = ctx.request.headers.get('origin');
  if (!origin) {
    // Server-to-server tooling occasionally lacks Origin (e.g. curl); allow
    // those *only* when there's no Cookie either, since CSRF needs both an
    // origin (the attacker's) and ambient credentials (the victim's session)
    // to be exploitable.
    if (!ctx.request.headers.get('cookie')) return null;
    return jsonError(403, 'forbidden_origin', 'Missing Origin header on cookie-bearing request.');
  }
  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonError(403, 'forbidden_origin', `Origin ${origin} is not allowed.`);
  }
  return null;
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function jsonError(status: number, code: string, message: string): Response {
  return json(status, { error: code, message });
}

/**
 * Pull JSON from the request, returning either the parsed object or a
 * Response describing what went wrong. Caller checks with `instanceof Response`.
 */
export async function readJson<T = unknown>(ctx: APIContext): Promise<T | Response> {
  const ct = ctx.request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return jsonError(415, 'unsupported_media_type', 'Expected application/json.');
  }
  try {
    return (await ctx.request.json()) as T;
  } catch {
    return jsonError(400, 'invalid_json', 'Request body was not valid JSON.');
  }
}
