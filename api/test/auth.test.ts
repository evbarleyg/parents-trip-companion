import { describe, expect, it } from 'vitest';
import { sign } from 'hono/jwt';
import { issueToken, sha256Hex, verifyPasscode, verifyToken } from '../src/auth';

describe('auth utilities', () => {
  it('validates passcode hash', async () => {
    const hash = await sha256Hex('family-secret');
    const valid = await verifyPasscode('family-secret', {
      JWT_SECRET: 's',
      PASSCODE_HASH: hash,
    });
    const invalid = await verifyPasscode('wrong', {
      JWT_SECRET: 's',
      PASSCODE_HASH: hash,
    });

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

  it('issues and verifies jwt tokens', async () => {
    const secret = 'unit-test-secret';
    const issued = await issueToken(secret);

    const payload = await verifyToken(issued.token, secret);
    expect(payload.scope).toBe('family');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('rejects expired token', async () => {
    const secret = 'unit-test-secret';
    const expired = await sign(
      {
        sub: 'parents-trip',
        scope: 'family',
        iat: 1,
        exp: 2,
      },
      secret,
    );

    await expect(verifyToken(expired, secret)).rejects.toBeTruthy();
  });
});
