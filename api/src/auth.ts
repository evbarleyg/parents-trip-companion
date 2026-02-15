import { sign, verify } from 'hono/jwt';
import type { AuthPayload, EnvBindings } from './types';

const TOKEN_TTL_SECONDS = 12 * 60 * 60;
const DEFAULT_DEV_PASSCODE_HASH = 'c7518df5723d1ea11e6ca7b8e18e3c2d0165d9335c59a61dcefc1d3741748a62';

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(digest);
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifyPasscode(passcode: string, env: EnvBindings): Promise<boolean> {
  const hash = await sha256Hex(passcode);
  const expected = (env.PASSCODE_HASH || DEFAULT_DEV_PASSCODE_HASH).toLowerCase();
  return safeEqual(hash, expected.toLowerCase());
}

export async function issueToken(secret: string): Promise<{ token: string; expiresAt: string }> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AuthPayload = {
    sub: 'parents-trip',
    scope: 'family',
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  };

  const token = await sign(payload as unknown as Record<string, unknown>, secret, 'HS256');
  const expiresAt = new Date((payload.exp || issuedAt) * 1000).toISOString();
  return { token, expiresAt };
}

export async function verifyToken(token: string, secret: string): Promise<AuthPayload> {
  const payload = await verify(token, secret, 'HS256');
  return {
    sub: String(payload.sub || ''),
    scope: payload.scope === 'family' ? 'family' : 'family',
    iat: Number(payload.iat || 0),
    exp: Number(payload.exp || 0),
  };
}
