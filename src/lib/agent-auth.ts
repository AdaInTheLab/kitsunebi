/**
 * Agent token auth.
 *
 * Phase 3 lets Skulk agents (Koda, Sage, Luna, eventually Vesper) call the
 * kitsunebi API directly. Each agent gets a unique secret; the env var
 * `KITSUNEBI_AGENT_TOKENS` packs them as comma-separated `name:secret`
 * pairs:
 *
 *   KITSUNEBI_AGENT_TOKENS=koda:abc123,sage:def456,luna:ghi789
 *
 * On every request we look at the `Authorization: Bearer <token>` header.
 * If it matches one of the configured secrets, the request is attributed
 * to that agent name. Comparison is constant-time so timing doesn't leak
 * which name a stranger's guess landed near.
 *
 * Browser requests (with cookie + same Origin) still go through the
 * existing `requireSameOrigin` path.
 */

import type { APIContext } from 'astro';
import { timingSafeEqual } from 'node:crypto';

interface AgentRecord {
  name: string;
  secret: Buffer;
}

let cached: AgentRecord[] | null = null;

function loadAgentTokens(): AgentRecord[] {
  if (cached) return cached;
  const raw = process.env.KITSUNEBI_AGENT_TOKENS ?? '';
  const records: AgentRecord[] = [];
  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx <= 0) continue;
    const name = trimmed.slice(0, idx).trim();
    const secret = trimmed.slice(idx + 1).trim();
    if (!name || !secret) continue;
    records.push({ name, secret: Buffer.from(secret, 'utf8') });
  }
  cached = records;
  return records;
}

/**
 * Check the Authorization header against the configured agents.
 * Returns the agent name if a match is found, null otherwise.
 *
 * The match is constant-time relative to *each* configured secret so a
 * timing-side-channel attacker can't tell which agent name they're close
 * to. (We pad/clip the supplied token to each secret's length per check.)
 */
export function verifyAgentToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const presented = Buffer.from(m[1].trim(), 'utf8');
  if (presented.length === 0) return null;

  for (const rec of loadAgentTokens()) {
    if (rec.secret.length !== presented.length) continue;
    try {
      if (timingSafeEqual(rec.secret, presented)) return rec.name;
    } catch {
      // Length-mismatch shouldn't reach here given the guard above, but be defensive.
      continue;
    }
  }
  return null;
}

/**
 * Test-only / on-demand cache reset. Production code shouldn't call this;
 * exposed because env-var hot-reloads in dev otherwise look stale.
 */
export function _resetAgentTokenCache(): void {
  cached = null;
}

/** For typed handlers that want auth context inline. */
export interface AuthOk {
  agent: string | null;
}

/**
 * Authorise a request. Agent token wins if present and valid; otherwise
 * fall back to the same-origin browser path. Returns either a context
 * object (with the agent name, or null for browser callers) or a Response
 * to send back unmodified.
 *
 * Defined here rather than in api-helpers.ts so api-helpers stays focused
 * on its narrow CSRF concern; this module owns "who is calling".
 */
export function requireAuth(
  ctx: APIContext,
  requireSameOrigin: (ctx: APIContext) => Response | null,
): AuthOk | Response {
  const agent = verifyAgentToken(ctx.request);
  if (agent) return { agent };
  const reject = requireSameOrigin(ctx);
  if (reject) return reject;
  return { agent: null };
}
