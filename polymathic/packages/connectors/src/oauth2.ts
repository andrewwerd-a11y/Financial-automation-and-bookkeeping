import { createHash, randomBytes } from 'node:crypto';

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: 'S256';
}

export function createPkcePair(): PkcePair {
  const verifier = base64url(randomBytes(32));
  return { verifier, challenge: pkceChallenge(verifier), method: 'S256' };
}

export function pkceChallenge(verifier: string): string {
  return base64url(createHash('sha256').update(verifier).digest());
}

export function createState(): string {
  return base64url(randomBytes(16));
}

export interface AuthorizeParams {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge?: string;
}

export function buildAuthorizeUrl(p: AuthorizeParams): string {
  const url = new URL(p.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('state', p.state);
  if (p.scopes.length) url.searchParams.set('scope', p.scopes.join(' '));
  if (p.codeChallenge) {
    url.searchParams.set('code_challenge', p.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return url.toString();
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** ISO timestamp, if the provider returned expires_in. */
  expiresAt?: string;
  scope?: string;
  tokenType: string;
}

interface TokenRequestBase {
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  fetch?: typeof fetch;
  now?: () => Date;
}

export async function exchangeCode(
  p: TokenRequestBase & { code: string; redirectUri: string; codeVerifier?: string },
): Promise<TokenSet> {
  const body = new URLSearchParams({ grant_type: 'authorization_code', code: p.code, redirect_uri: p.redirectUri });
  if (p.codeVerifier) body.set('code_verifier', p.codeVerifier);
  return tokenRequest(p, body);
}

export async function refreshAccessToken(p: TokenRequestBase & { refreshToken: string }): Promise<TokenSet> {
  const tokens = await tokenRequest(p, new URLSearchParams({ grant_type: 'refresh_token', refresh_token: p.refreshToken }));
  // Some providers omit the refresh token on refresh, meaning "keep using the old one".
  return { ...tokens, refreshToken: tokens.refreshToken ?? p.refreshToken };
}

export function isExpired(tokens: TokenSet, now = new Date(), skewMs = 60_000): boolean {
  return tokens.expiresAt !== undefined && Date.parse(tokens.expiresAt) - skewMs <= now.getTime();
}

async function tokenRequest(p: TokenRequestBase, body: URLSearchParams): Promise<TokenSet> {
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
    accept: 'application/json',
  };
  if (p.clientSecret) {
    headers.authorization = `Basic ${Buffer.from(`${p.clientId}:${p.clientSecret}`).toString('base64')}`;
  } else {
    body.set('client_id', p.clientId);
  }

  const res = await (p.fetch ?? fetch)(p.tokenUrl, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`Token endpoint returned ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as Record<string, unknown>;
  if (typeof json.access_token !== 'string') throw new Error('Token response missing access_token');

  const now = (p.now ?? (() => new Date()))();
  return {
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : undefined,
    expiresAt:
      typeof json.expires_in === 'number' ? new Date(now.getTime() + json.expires_in * 1000).toISOString() : undefined,
    scope: typeof json.scope === 'string' ? json.scope : undefined,
    tokenType: typeof json.token_type === 'string' ? json.token_type : 'Bearer',
  };
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}
