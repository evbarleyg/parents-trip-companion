import { describe, expect, it } from 'vitest';
import { getActualMomentsForDate } from './actualMoments';

describe('actual moments seed data', () => {
  it('returns known moments for Dubai day', () => {
    const moments = getActualMomentsForDate('2026-02-07');
    expect(moments.length).toBeGreaterThan(0);
    expect(moments.some((moment) => moment.text.includes('Dubai Mall'))).toBe(true);
    expect(moments.some((moment) => moment.photos.length > 0)).toBe(true);
  });

  it('returns enriched Oman moments for Feb 18 with family photo context', () => {
    const moments = getActualMomentsForDate('2026-02-18');
    expect(moments.length).toBeGreaterThan(0);
    expect(moments.some((moment) => /Susan|Jim/.test(moment.text))).toBe(true);
    expect(moments.some((moment) => moment.photos.length > 0)).toBe(true);
  });

  it('keeps only Susan/Jim-attributed photos in seeded moments', () => {
    const dates = ['2026-02-07', '2026-02-12', '2026-02-13', '2026-02-18'];

    const photos = dates.flatMap((date) =>
      getActualMomentsForDate(date).flatMap((moment) => moment.photos),
    );

    expect(photos.length).toBeGreaterThan(0);
    for (const photo of photos) {
      expect(`${photo.alt} ${photo.caption}`.toLowerCase()).toMatch(/susan|jim/);
    }
  });

  it('returns empty list for dates without seeded actuals', () => {
    expect(getActualMomentsForDate('2026-03-25')).toEqual([]);
  });

  it('returns cloned data so callers cannot mutate seed state', () => {
    const first = getActualMomentsForDate('2026-02-12');
    const second = getActualMomentsForDate('2026-02-12');
    first[0].photos[0].caption = 'edited';
    expect(second[0].photos[0].caption).not.toBe('edited');
  });
});
