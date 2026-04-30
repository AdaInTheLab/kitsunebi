/**
 * GitHub OAuth helpers (web app flow).
 *
 * No third-party auth library. We do exactly two things GitHub asks for:
 *   1. redirect the user to /login/oauth/authorize with our client_id and a
 *      CSRF state we'll verify on return,
 *   2. POST /login/oauth/access_token with the code we got back, exchanging
 *      it for an access token that we use once to fetch the user's login.
 *
 * Pairs with the auth pages in src/pages/auth/.
 */

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_USER = 'https://api.github.com/user';

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  publicUrl: string;
  redirectUri: string;
}

function getConfig(): OAuthConfig {
  const clientId = process.env.KITSUNEBI_GITHUB_CLIENT_ID;
  const clientSecret = process.env.KITSUNEBI_GITHUB_CLIENT_SECRET;
  const publicUrlRaw = process.env.KITSUNEBI_PUBLIC_URL ?? 'https://kitsunebi.kitsuneden.net';
  if (!clientId || !clientSecret) {
    throw new Error(
      'KITSUNEBI_GITHUB_CLIENT_ID and KITSUNEBI_GITHUB_CLIENT_SECRET must both be set. ' +
        'Create a GitHub OAuth App at https://github.com/settings/developers and copy the values.',
    );
  }
  const publicUrl = publicUrlRaw.replace(/\/$/, '');
  return {
    clientId,
    clientSecret,
    publicUrl,
    redirectUri: `${publicUrl}/auth/callback`,
  };
}

export function buildAuthorizeUrl(state: string): string {
  const cfg = getConfig();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: 'read:user',
    state,
    allow_signup: 'false',
  });
  return `${GITHUB_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const cfg = getConfig();
  const res = await fetch(GITHUB_TOKEN, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'kitsunebi',
    },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!body.access_token) {
    throw new Error(
      `GitHub token exchange returned no access_token (${body.error ?? 'unknown'}): ${body.error_description ?? ''}`,
    );
  }
  return body.access_token;
}

export async function fetchUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch(GITHUB_USER, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'kitsunebi',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub /user failed: HTTP ${res.status}`);
  }
  return (await res.json()) as GitHubUser;
}
