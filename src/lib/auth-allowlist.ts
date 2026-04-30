/**
 * GitHub username allowlist for human (browser) sign-in.
 *
 * Configured via the env var KITSUNEBI_GITHUB_ALLOWLIST as a comma-separated
 * list of GitHub usernames (case-insensitive). Anyone who completes the
 * OAuth flow but isn't on the list gets bounced back to / with a denial
 * banner and never gets a session cookie.
 *
 * Agent tokens (src/lib/agent-auth.ts) are a separate auth path and are
 * NOT subject to this allowlist ~ they're matched by secret, not username.
 */

let cached: Set<string> | null = null;

function loadAllowlist(): Set<string> {
  if (cached) return cached;
  const raw = process.env.KITSUNEBI_GITHUB_ALLOWLIST ?? '';
  cached = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return cached;
}

export function isAllowed(username: string): boolean {
  return loadAllowlist().has(username.toLowerCase());
}

export function allowlist(): string[] {
  return [...loadAllowlist()];
}

/** Test/dev only ~ env hot-reloads otherwise look stale. */
export function _resetAllowlistCache(): void {
  cached = null;
}
