import { describe, expect, it } from 'vitest';
import { resolvePublicAssetUrl } from './asset-url';

describe('resolvePublicAssetUrl', () => {
  it('prefixes root-relative asset paths with base path', () => {
    expect(resolvePublicAssetUrl('/actuals/dad-2026-02-19-img-1304.jpeg', '/parents-trip-companion/')).toBe(
      '/parents-trip-companion/actuals/dad-2026-02-19-img-1304.jpeg',
    );
  });

  it('keeps assets at root when base path is root', () => {
    expect(resolvePublicAssetUrl('/actuals/dad-2026-02-19-img-1304.jpeg', '/')).toBe(
      '/actuals/dad-2026-02-19-img-1304.jpeg',
    );
  });

  it('does not double-prefix already-prefixed paths', () => {
    expect(
      resolvePublicAssetUrl('/parents-trip-companion/actuals/dad-2026-02-19-img-1304.jpeg', '/parents-trip-companion/'),
    ).toBe('/parents-trip-companion/actuals/dad-2026-02-19-img-1304.jpeg');
  });

  it('keeps absolute and data URLs unchanged', () => {
    expect(resolvePublicAssetUrl('https://example.com/photo.jpeg', '/parents-trip-companion/')).toBe(
      'https://example.com/photo.jpeg',
    );
    expect(resolvePublicAssetUrl('data:image/png;base64,abc', '/parents-trip-companion/')).toBe(
      'data:image/png;base64,abc',
    );
  });
});
