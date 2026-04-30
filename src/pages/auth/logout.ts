/**
 * /auth/logout (GET or POST)
 *
 * Clears the session cookie and bounces to /. GET is intentionally
 * supported so a plain anchor can sign you out without JS.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/session';

function clearAndRedirect(cookies: Parameters<APIRoute>[0]['cookies'], redirect: Parameters<APIRoute>[0]['redirect']) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/');
}

export const GET: APIRoute = ({ cookies, redirect }) => clearAndRedirect(cookies, redirect);
export const POST: APIRoute = ({ cookies, redirect }) => clearAndRedirect(cookies, redirect);
