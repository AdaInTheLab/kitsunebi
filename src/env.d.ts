/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    /**
     * The signed-in human (GitHub OAuth) for this request, or null when the
     * request is anonymous. Populated by src/middleware.ts on every request.
     * API endpoints check the cookie themselves via requireAuth() and don't
     * read this field; it's exclusively for SSR templates that need to
     * decide whether to render write affordances.
     */
    user: { username: string } | null;
  }
}
