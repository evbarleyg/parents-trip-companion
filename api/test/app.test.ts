import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { app } from '../src/index';
import { sha256Hex } from '../src/auth';

async function makeEnv() {
  return {
    JWT_SECRET: 'test-secret',
    PASSCODE_HASH: await sha256Hex('parent-passcode'),
    ALLOWED_ORIGIN: 'http://localhost:5173',
  };
}

async function unlockToken(env: Awaited<ReturnType<typeof makeEnv>>): Promise<string> {
  const response = await app.request(
    '/v1/auth/unlock',
    {
      method: 'POST',
      body: JSON.stringify({ passcode: 'parent-passcode' }),
      headers: { 'Content-Type': 'application/json' },
    },
    env,
  );

  expect(response.status).toBe(200);
  const payload = (await response.json()) as { token: string };
  return payload.token;
}

describe('api integration', () => {
  it('rejects invalid passcode and accepts valid passcode', async () => {
    const env = await makeEnv();

    const invalid = await app.request(
      '/v1/auth/unlock',
      {
        method: 'POST',
        body: JSON.stringify({ passcode: 'nope' }),
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    );
    expect(invalid.status).toBe(401);

    const valid = await app.request(
      '/v1/auth/unlock',
      {
        method: 'POST',
        body: JSON.stringify({ passcode: 'parent-passcode' }),
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    );
    expect(valid.status).toBe(200);
  });

  it('extract endpoint parses DOCX upload', async () => {
    const env = await makeEnv();
    const token = await unlockToken(env);

    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<w:document><w:body><w:p>Wed Feb 12</w:p><w:p>SALALAH</w:p><w:p>Explore Salalah and Al Baleed</w:p></w:body></w:document>',
    );
    const blob = await zip.generateAsync({ type: 'blob' });

    const form = new FormData();
    form.append(
      'file',
      new File([blob], 'oman-detail.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    const response = await app.request(
      '/v1/documents/extract',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
      env,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      tripPatch: { daysUpdated: Array<{ date: string }> };
      warnings: string[];
    };

    expect(payload.tripPatch.daysUpdated.length).toBeGreaterThan(0);
    expect(payload.tripPatch.daysUpdated[0].date).toBe('2026-02-12');
  });

  it('extract endpoint accepts text-like PDF upload', async () => {
    const env = await makeEnv();
    const token = await unlockToken(env);

    const form = new FormData();
    form.append(
      'file',
      new File(['Thu Feb 13\nSALALAH\nSafari 09:00-17:00'], 'oman-detail.pdf', {
        type: 'application/pdf',
      }),
    );

    const response = await app.request(
      '/v1/documents/extract',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
      env,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      tripPatch: { daysUpdated: Array<{ date: string }> };
      warnings: string[];
    };

    expect(payload.tripPatch.daysUpdated[0]?.date).toBe('2026-02-13');
    expect(payload.warnings.join(' ')).toMatch(/PDF extraction/i);
  });

  it('nearby recommendations returns sorted category items', async () => {
    const env = await makeEnv();
    const token = await unlockToken(env);

    const response = await app.request(
      '/v1/recommendations/nearby',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: 38.7223,
          lng: -9.1393,
          date: '2026-03-08',
          timeLocal: '12:00',
          category: 'food',
          radiusMeters: 2000,
        }),
      },
      env,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      items: Array<{ category: string; distanceMeters: number }>;
    };

    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items.every((item) => item.category === 'food')).toBe(true);
    const sorted = [...payload.items].sort((a, b) => a.distanceMeters - b.distanceMeters);
    expect(payload.items).toEqual(sorted);
  });

  it('chat endpoint returns non-empty answer with nearby context', async () => {
    const env = await makeEnv();
    const token = await unlockToken(env);

    const response = await app.request(
      '/v1/chat/recommendations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: 'What should we do in the next two hours?',
          context: {
            date: '2026-03-08',
            region: 'Portugal - Lisbon',
            activeItemTitle: 'Historic Lisbon walking tour',
            activeItemLocation: 'Alfama',
            lat: 38.711,
            lng: -9.129,
          },
          nearby: [
            {
              placeId: 'x1',
              name: 'Miradouro Pick',
              category: 'sights',
              distanceMeters: 320,
              rating: 4.6,
              openNow: true,
              mapsUrl: 'https://maps.example',
            },
          ],
        }),
      },
      env,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { answer: string; highlights: unknown[] };

    expect(payload.answer.length).toBeGreaterThan(0);
    expect(payload.highlights.length).toBeGreaterThan(0);
  });
});
