import { describe, expect, test, vi } from 'vitest';
import { OPEN_SESSION_TTL_MS, createOpenSession, ensureOpenSession } from './session';

describe('session helpers', () => {
  test('createOpenSession builds deterministic token and expiry', () => {
    const now = Date.parse('2026-02-16T12:00:00.000Z');
    const session = createOpenSession(now);

    expect(session.token).toBe('open-local-1771243200000');
    expect(session.expiresAt).toBe(new Date(now + OPEN_SESSION_TTL_MS).toISOString());
  });

  test('ensureOpenSession returns existing session without writing', () => {
    const existing = {
      token: 'existing-token',
      expiresAt: '2030-01-01T00:00:00.000Z',
    };
    const load = vi.fn(() => existing);
    const save = vi.fn();

    const resolved = ensureOpenSession(load, save);

    expect(resolved).toBe(existing);
    expect(save).not.toHaveBeenCalled();
  });

  test('ensureOpenSession creates and saves when no session exists', () => {
    const load = vi.fn(() => null);
    const save = vi.fn();
    const now = Date.parse('2026-02-16T12:00:00.000Z');

    const resolved = ensureOpenSession(load, save, now);

    expect(resolved.token).toBe('open-local-1771243200000');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(resolved);
  });
});
