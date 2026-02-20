import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getActualMomentsForDate, getAllSeedActualMoments } from './actualMoments';
import { DAD_ACTUAL_MOMENTS_BY_DATE, DAD_ITINERARY_TEXT_UPDATE_DATES } from './actualMomentsDad';

const DATA_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_PUBLIC_DIR = path.resolve(DATA_DIR, '../../public');

function resolvePhotoPath(src: string): string {
  const relative = src.startsWith('/') ? src.slice(1) : src;
  return path.resolve(WEB_PUBLIC_DIR, relative);
}

describe('actual moments seed data', () => {
  it('returns known moments for Dubai day', () => {
    const moments = getActualMomentsForDate('2026-02-07');
    expect(moments.length).toBeGreaterThan(0);
    expect(moments.some((moment) => moment.text.toLowerCase().includes('dubai'))).toBe(true);
    expect(moments.some((moment) => moment.photos.length > 0)).toBe(true);
  });

  it('returns empty list for dates without seeded actuals', () => {
    expect(getActualMomentsForDate('2026-03-25')).toEqual([]);
  });

  it('merges dad-specific entries into day lookups', () => {
    const dadDate = Object.keys(DAD_ACTUAL_MOMENTS_BY_DATE)[0];
    const dadMomentId = DAD_ACTUAL_MOMENTS_BY_DATE[dadDate]?.[0]?.id;
    const moments = getActualMomentsForDate(dadDate);
    expect(dadMomentId).toBeTruthy();
    expect(moments.some((moment) => moment.id === dadMomentId)).toBe(true);
  });

  it('pins dad numbered text updates to itinerary dates', () => {
    for (const [updateNumber, date] of Object.entries(DAD_ITINERARY_TEXT_UPDATE_DATES)) {
      const moments = getActualMomentsForDate(date);
      expect(
        moments.some((moment) => moment.id.endsWith(`number-${updateNumber}`) && moment.source.toLowerCase().includes('dad updates')),
      ).toBe(true);
    }
  });

  it('keeps moment and photo IDs unique across merged datasets', () => {
    const allMoments = getAllSeedActualMoments();
    const momentIds = new Set<string>();
    const photoIds = new Set<string>();

    for (const moment of allMoments) {
      expect(momentIds.has(moment.id)).toBe(false);
      momentIds.add(moment.id);

      for (const photo of moment.photos) {
        expect(photoIds.has(photo.id)).toBe(false);
        photoIds.add(photo.id);
      }
    }
  });

  it('references only photo files that exist under web/public', () => {
    const allMoments = getAllSeedActualMoments();
    for (const moment of allMoments) {
      for (const photo of moment.photos) {
        expect(existsSync(resolvePhotoPath(photo.src))).toBe(true);
      }
    }
  });

  it('returns cloned data so callers cannot mutate seed state', () => {
    const first = getActualMomentsForDate('2026-02-12');
    const second = getActualMomentsForDate('2026-02-12');
    first[0].photos[0].caption = 'edited';
    expect(second[0].photos[0].caption).not.toBe('edited');
  });
});
