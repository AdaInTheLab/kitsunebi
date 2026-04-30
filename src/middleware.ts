/**
 * Astro middleware: populate Astro.locals.user from the session cookie.
 *
 * Runs on every request. Pages and components can read `Astro.locals.user`
 * to decide whether to render write affordances (drag handles, "add card"
 * buttons, comment forms) or just the read-only view.
 *
 * API mutation endpoints don't depend on this middleware ~ they call
 * requireAuth() in src/lib/agent-auth.ts directly, which checks the cookie
 * itself. Middleware is purely for the SSR templates.
 */

import { defineMiddleware } from 'astro:middleware';
import { verifySession, SESSION_COOKIE } from './lib/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const value = context.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(value);
  context.locals.user = session ? { username: session.username } : null;
  return next();
});
