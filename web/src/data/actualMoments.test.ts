import { describe, expect, it } from 'vitest';
import { getActualMomentsForDate } from './actualMoments';
import { isVerifiedActualPhotoSrc } from './actualPhotoManifest';
import { seedTripPlan } from './seedTrip';

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

  it('returns empty list for dates without seeded actuals', () => {
    expect(getActualMomentsForDate('2026-03-25')).toEqual([]);
  });

  it('returns cloned data so callers cannot mutate seed state', () => {
    const first = getActualMomentsForDate('2026-02-12');
    const second = getActualMomentsForDate('2026-02-12');
    first[0].photos[0].caption = 'edited';
    expect(second[0].photos[0].caption).not.toBe('edited');
  });

  it('only uses verified actual photo src entries from the manifest whitelist', () => {
    const allPhotos = seedTripPlan.days.flatMap((day) => day.actualMoments?.flatMap((moment) => moment.photos) ?? []);
    expect(allPhotos.length).toBeGreaterThan(0);
    allPhotos.forEach((photo) => {
      expect(isVerifiedActualPhotoSrc(photo.src)).toBe(true);
    });
  });

  it('keeps explicit alt/caption attribution for each photo', () => {
    const allPhotos = seedTripPlan.days.flatMap((day) => day.actualMoments?.flatMap((moment) => moment.photos) ?? []);
    allPhotos.forEach((photo) => {
      expect(photo.alt.trim().length).toBeGreaterThan(10);
      expect(photo.caption.trim().length).toBeGreaterThan(10);
      expect(`${photo.alt} ${photo.caption}`).toMatch(/Susan\/Jim|Susan and Jim/i);
    });
  });
});
