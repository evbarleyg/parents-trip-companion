// @vitest-environment node

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getActualMomentsForDate, getAllSeedActualMoments } from './actualMoments';
import { DAD_ACTUAL_MOMENTS_BY_DATE, DAD_ITINERARY_TEXT_UPDATE_DATES } from './actualMomentsDad';

const DATA_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_PUBLIC_DIR = path.resolve(DATA_DIR, '../../public');

function resolveAssetPath(src: string): string {
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

  it('includes mom thread updates for Feb 25 Maldives day', () => {
    const moments = getActualMomentsForDate('2026-02-25');
    const morning = moments.find((moment) => moment.id === 'actual-2026-02-25-mom-speedboat-update');
    const sunset = moments.find((moment) => moment.id === 'actual-2026-02-25-mom-sunset-snorkel-update');

    expect(morning?.source.toLowerCase()).toContain('mom updates');
    expect(morning?.text.toLowerCase()).toContain('manta rays');
    expect(sunset?.source.toLowerCase()).toContain('mom updates');
    expect(sunset?.text.toLowerCase()).toContain('hawksbill');
    expect(sunset?.photos.map((photo) => photo.src)).toEqual(
      expect.arrayContaining(['/actuals/mom-2026-02-25-img-1372.jpeg', '/actuals/mom-2026-02-25-img-1373.jpeg']),
    );
  });

  it('keeps moment and photo IDs unique across merged datasets', () => {
    const allMoments = getAllSeedActualMoments();
    const momentIds = new Set<string>();
    const photoIds = new Set<string>();
    const videoIds = new Set<string>();

    for (const moment of allMoments) {
      expect(momentIds.has(moment.id)).toBe(false);
      momentIds.add(moment.id);

      for (const photo of moment.photos) {
        expect(photoIds.has(photo.id)).toBe(false);
        photoIds.add(photo.id);
      }

      for (const video of moment.videos || []) {
        expect(videoIds.has(video.id)).toBe(false);
        videoIds.add(video.id);
      }
    }
  });

  it('does not publish duplicate photo src entries across seeded moments', () => {
    const allMoments = getAllSeedActualMoments();
    const photoSrcs = new Set<string>();
    const videoSrcs = new Set<string>();

    for (const moment of allMoments) {
      for (const photo of moment.photos) {
        expect(photoSrcs.has(photo.src)).toBe(false);
        photoSrcs.add(photo.src);
      }

      for (const video of moment.videos || []) {
        expect(videoSrcs.has(video.src)).toBe(false);
        videoSrcs.add(video.src);
      }
    }
  });

  it('references only media files that exist under web/public', () => {
    const allMoments = getAllSeedActualMoments();
    for (const moment of allMoments) {
      for (const photo of moment.photos) {
        expect(existsSync(resolveAssetPath(photo.src))).toBe(true);
      }
      for (const video of moment.videos || []) {
        expect(existsSync(resolveAssetPath(video.src))).toBe(true);
      }
    }
  });

  it('maps dad telegram videos to the expected trip dates', () => {
    const muscatVideos = getActualMomentsForDate('2026-02-21')
      .flatMap((moment) => moment.videos || [])
      .map((video) => video.src);
    const maldivesVideos = getActualMomentsForDate('2026-02-24')
      .flatMap((moment) => moment.videos || [])
      .map((video) => video.src);

    expect(muscatVideos).toContain('/actuals/dad-2026-02-14-muscat-grand-mosque-walkthrough-01.mp4');
    expect(maldivesVideos).toContain('/actuals/dad-2026-02-14-muscat-grand-mosque-walkthrough-02.mp4');
    expect(maldivesVideos).toContain('/actuals/dad-2026-02-14-muscat-grand-mosque-walkthrough-03.mp4');
  });

  it('returns cloned data so callers cannot mutate seed state', () => {
    const first = getActualMomentsForDate('2026-02-12');
    const second = getActualMomentsForDate('2026-02-12');
    first[0].photos[0].caption = 'edited';
    expect(second[0].photos[0].caption).not.toBe('edited');
  });
});
