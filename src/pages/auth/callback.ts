/**
 * GET /auth/callback
 *
 * GitHub redirects here with ?code=...&state=... after the user approves.
 * We verify the state matches the cookie we set in /auth/login (CSRF
 * defense), exchange the code for an access token, fetch the user's login,
 * check the allowlist, and either set a session cookie + redirect to /board
 * or bounce back to / with a denial reason.
 */

import type { APIRoute } from 'astro';
import { exchangeCodeForToken, fetchUser } from '../../lib/github-oauth';
import { isAllowed } from '../../lib/auth-allowlist';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '../../lib/session';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = cookies.get('kitsunebi_oauth_state')?.value;
  cookies.delete('kitsunebi_oauth_state', { path: '/' });

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirect('/?auth=invalid_state');
  }

  let username: string;
  try {
    const accessToken = await exchangeCodeForToken(code);
    const user = await fetchUser(accessToken);
    username = user.login;
  } catch (err) {
    console.error('[kitsunebi:auth] OAuth exchange failed:', err);
    return redirect('/?auth=exchange_failed');
  }

  if (!isAllowed(username)) {
    return redirect(`/?auth=denied&u=${encodeURIComponent(username)}`);
  }

  cookies.set(SESSION_COOKIE, signSession(username), {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
  });
  return redirect('/board');
};
