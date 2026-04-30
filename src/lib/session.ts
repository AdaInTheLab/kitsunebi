/**
 * Browser session for human users (GitHub OAuth flow).
 *
 * We sign a tiny `username:expiresAt` payload with HMAC-SHA256 using
 * KITSUNEBI_SESSION_SECRET, encode the result as `username:expiresAt:sig`,
 * and stash it in an httpOnly cookie. No DB, no Lucia/Auth.js dependency,
 * no token revocation list ~ if a session needs to be killed, rotate the
 * secret and every cookie out there becomes invalid in one move.
 *
 * Pairs with src/lib/agent-auth.ts: agent tokens stay separate (Bearer),
 * sessions live in a cookie. Both paths feed into requireAuth().
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'kitsunebi_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret(): Buffer {
  const raw = process.env.KITSUNEBI_SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'KITSUNEBI_SESSION_SECRET must be set to a random string of 32+ characters. ' +
        'Generate one with: node -e "console.log(crypto.randomBytes(48).toString(\'base64url\'))"',
    );
  }
  return Buffer.from(raw, 'utf8');
}

export interface SessionPayload {
  username: string;
  expiresAt: number; // epoch seconds
}

/** Sign a fresh cookie value for the given username. */
export function signSession(username: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${username}:${expiresAt}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}:${sig}`;
}

/** Verify a cookie value. Returns the payload or null if invalid/expired. */
export function verifySession(value: string | undefined | null): SessionPayload | null {
  if (!value) return null;
  const idx = value.lastIndexOf(':');
  if (idx <= 0) return null;
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);

  const inner = payload.lastIndexOf(':');
  if (inner <= 0) return null;
  const username = payload.slice(0, inner);
  const expiresAt = Number(payload.slice(inner + 1));
  if (!username || !Number.isFinite(expiresAt)) return null;
  if (expiresAt < Math.floor(Date.now() / 1000)) return null;

  let expected: string;
  try {
    expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  } catch {
    return null;
  }
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return { username, expiresAt };
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
