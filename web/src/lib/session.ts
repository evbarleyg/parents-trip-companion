import type { UnlockResponse } from '../types';

export const OPEN_SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export function createOpenSession(now = Date.now()): UnlockResponse {
  return {
    token: `open-local-${now}`,
    expiresAt: new Date(now + OPEN_SESSION_TTL_MS).toISOString(),
  };
}

export function ensureOpenSession(
  load: () => UnlockResponse | null,
  save: (session: UnlockResponse) => void,
  now = Date.now(),
): UnlockResponse {
  const existing = load();
  if (existing) return existing;

  const next = createOpenSession(now);
  save(next);
  return next;
}
