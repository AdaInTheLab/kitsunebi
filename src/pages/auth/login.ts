/**
 * GET /auth/login
 *
 * Generates a random CSRF state, stashes it in a short-lived cookie,
 * and 302s the user to GitHub's authorize endpoint. The matching
 * /auth/callback verifies the state on return.
 */

import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { buildAuthorizeUrl } from '../../lib/github-oauth';

export const GET: APIRoute = ({ cookies, redirect }) => {
  const state = randomBytes(16).toString('hex');
  cookies.set('kitsunebi_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes ~ plenty for the round trip to GitHub
  });
  return redirect(buildAuthorizeUrl(state));
};
