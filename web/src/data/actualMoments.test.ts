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
  const rawMediaCaptionPatterns = [
    /\bIMG_[\w.-]*/i,
    /\bEXIF\b/i,
    /uuid=/i,
    /\bfile_[\w-]*/i,
    /\.(heic|jpeg|jpg|png|mov|mp4)\b/i,
    /converted from HEIC/i,
  ];

  it('returns known moments for Dubai day', () => {
    const moments = getActualMomentsForDate('2026-02-07');
    expect(moments.length).toBeGreaterThan(0);
    expect(moments.some((moment) => moment.text.toLowerCase().includes('dubai'))).toBe(true);
    expect(moments.some((moment) => moment.photos.length > 0)).toBe(true);
  });

  it('returns empty list for dates without seeded actuals', () => {
    expect(getActualMomentsForDate('2026-04-04')).toEqual([]);
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

  it('adds guide-company updates across the Dubai and Oman leg', () => {
    const expectedByDate = {
      '2026-02-11': ['actual-2026-02-11-guide-dubai-culture-day', 'cultural understanding'],
      '2026-02-13': ['actual-2026-02-13-guide-dhofar-safari', 'bonelli'],
      '2026-02-15': ['actual-2026-02-15-guide-snorkel-day', 'octopus'],
      '2026-02-19': ['actual-2026-02-19-guide-inland-forts', 'jabreen'],
      '2026-02-21': ['actual-2026-02-21-guide-grand-mosque-opera', 'opera house'],
    } as const;

    for (const [date, [id, keyword]] of Object.entries(expectedByDate)) {
      const moment = getActualMomentsForDate(date).find((entry) => entry.id === id);
      expect(moment?.source.toLowerCase()).toContain('guide updates');
      expect(moment?.text.toLowerCase()).toContain(keyword);
      expect(moment?.photos).toEqual([]);
    }
  });

  it('imports the Maldives and Istanbul photo-library sets with human-readable trip context', () => {
    const maldivesMoment = getActualMomentsForDate('2026-02-28').find(
      (entry) => entry.id === 'actual-2026-02-28-photo-library',
    );
    const istanbulMoment = getActualMomentsForDate('2026-03-02').find(
      (entry) => entry.id === 'actual-2026-03-02-photo-library',
    );
    const marchFiveMoment = getActualMomentsForDate('2026-03-05').find(
      (entry) => entry.id === 'actual-2026-03-05-photo-library',
    );

    expect(maldivesMoment?.source.toLowerCase()).toContain('family photo library');
    expect(maldivesMoment?.photos).toHaveLength(5);
    expect(maldivesMoment?.photos.every((photo) => typeof photo.lat === 'number' && typeof photo.lng === 'number')).toBe(
      true,
    );
    expect(maldivesMoment?.text.toLowerCase()).toContain('machchafushi');

    expect(istanbulMoment?.photos).toHaveLength(7);
    expect(istanbulMoment?.photos.some((photo) => typeof photo.lat === 'number' && typeof photo.lng === 'number')).toBe(
      true,
    );
    expect(istanbulMoment?.text.toLowerCase()).toContain('galataport');

    expect(marchFiveMoment?.text.toLowerCase()).toContain('museum-and-city-views');
    expect(marchFiveMoment?.photos).toHaveLength(6);
    expect(marchFiveMoment?.photos.some((photo) => photo.src.endsWith('.jpeg'))).toBe(true);
    expect(marchFiveMoment?.photos.some((photo) => typeof photo.lat === 'number' && typeof photo.lng === 'number')).toBe(true);
  });

  it('treats the later March 7 waterfront image as Lisbon, not Istanbul', () => {
    const marchSevenMoment = getActualMomentsForDate('2026-03-07').find(
      (entry) => entry.id === 'actual-2026-03-07-photo-library',
    );
    const lisbonPhoto = marchSevenMoment?.photos.find((photo) => photo.caption.toLowerCase().includes('lisbon'));

    expect(marchSevenMoment?.whenLabel).toContain('Lisbon arrival');
    expect(marchSevenMoment?.text.toLowerCase()).toContain('lisbon waterfront');
    expect(lisbonPhoto?.alt).toContain('Lisbon');
    expect(lisbonPhoto?.caption).toContain('Lisbon');
    expect(lisbonPhoto?.lat).toBeCloseTo(38.707889, 5);
    expect(lisbonPhoto?.lng).toBeCloseTo(-9.136592, 5);
  });

  it('imports the Madeira, Lisbon departure, and Morocco media dump with curated captions and selected videos', () => {
    const lisbonWalkMoment = getActualMomentsForDate('2026-03-08').find(
      (entry) => entry.id === 'actual-2026-03-08-photo-library',
    );
    const sintraMoment = getActualMomentsForDate('2026-03-10').find(
      (entry) => entry.id === 'actual-2026-03-10-photo-library',
    );
    const douroMoment = getActualMomentsForDate('2026-03-15').find(
      (entry) => entry.id === 'actual-2026-03-15-photo-library',
    );
    const madeiraArrivalMoment = getActualMomentsForDate('2026-03-16').find(
      (entry) => entry.id === 'actual-2026-03-16-photo-library',
    );
    const funchalMoment = getActualMomentsForDate('2026-03-17').find(
      (entry) => entry.id === 'actual-2026-03-17-photo-library',
    );
    const madeiraHikeMoment = getActualMomentsForDate('2026-03-18').find(
      (entry) => entry.id === 'actual-2026-03-18-photo-library',
    );
    const lisbonDepartureMoment = getActualMomentsForDate('2026-03-21').find(
      (entry) => entry.id === 'actual-2026-03-21-photo-library',
    );
    const moroccoTransferMoment = getActualMomentsForDate('2026-03-24').find(
      (entry) => entry.id === 'actual-2026-03-24-photo-library',
    );
    const marrakechFoothillsMoment = getActualMomentsForDate('2026-03-26').find(
      (entry) => entry.id === 'actual-2026-03-26-photo-library',
    );

    expect(lisbonWalkMoment?.text.toLowerCase()).toContain('lisbon');
    expect(lisbonWalkMoment?.photos).toHaveLength(4);
    expect(lisbonWalkMoment?.photos.some((photo) => photo.caption.includes('Praça'))).toBe(true);

    expect(sintraMoment?.text.toLowerCase()).toContain('sintra');
    expect(sintraMoment?.photos).toHaveLength(11);
    expect(sintraMoment?.photos.some((photo) => photo.caption.toLowerCase().includes('cloister'))).toBe(true);

    expect(douroMoment?.text.toLowerCase()).toContain('douro');
    expect(douroMoment?.photos).toHaveLength(9);
    expect(douroMoment?.photos.some((photo) => photo.caption.toLowerCase().includes('valley'))).toBe(true);

    expect(madeiraArrivalMoment?.photos).toHaveLength(1);
    expect(madeiraArrivalMoment?.videos).toHaveLength(6);
    expect(madeiraArrivalMoment?.videos?.[0]?.caption.toLowerCase()).toContain('sea view');

    expect(funchalMoment?.text.toLowerCase()).toContain('funchal');
    expect(funchalMoment?.photos).toHaveLength(8);
    expect(funchalMoment?.videos).toHaveLength(2);
    expect(funchalMoment?.photos[0]?.caption.toLowerCase()).toContain('cannon');

    expect(madeiraHikeMoment?.text.toLowerCase()).toContain('levada hike');
    expect(madeiraHikeMoment?.photos).toHaveLength(3);
    expect(madeiraHikeMoment?.videos).toHaveLength(1);
    expect(madeiraHikeMoment?.photos[0]?.caption).toContain('Waterfall');

    expect(lisbonDepartureMoment?.whenLabel).toContain('Lisbon departure');
    expect(lisbonDepartureMoment?.photos).toHaveLength(1);
    expect(lisbonDepartureMoment?.photos[0]?.caption).toContain('Lisbon');
    expect(lisbonDepartureMoment?.photos[0]?.lat).toBeCloseTo(38.77013, 5);
    expect(lisbonDepartureMoment?.photos[0]?.lng).toBeCloseTo(-9.12524, 5);

    expect(moroccoTransferMoment?.photos).toHaveLength(9);
    expect(moroccoTransferMoment?.photos.some((photo) => photo.caption.toLowerCase().includes('henna'))).toBe(true);

    expect(marrakechFoothillsMoment?.photos).toHaveLength(5);
    expect(marrakechFoothillsMoment?.videos).toHaveLength(3);
    expect(marrakechFoothillsMoment?.videos?.[0]?.caption.toLowerCase()).toContain('dinner-show');
  });

  it('maps the Istanbul travelogue across March 2 through March 6', () => {
    const expectedByDate = {
      '2026-03-02': ['actual-2026-03-02-mom-istanbul-cihangir', 'galataport'],
      '2026-03-03': ['actual-2026-03-03-mom-istanbul-sultanahmet', 'sultanahmet'],
      '2026-03-04': ['actual-2026-03-04-mom-istanbul-besiktas-uskudar', 'kuzguncuk'],
      '2026-03-05': ['actual-2026-03-05-mom-istanbul-tarabya-dinner', 'tarabya'],
      '2026-03-06': ['actual-2026-03-06-mom-istanbul-balat-fener', 'balat'],
    } as const;

    for (const [date, [id, keyword]] of Object.entries(expectedByDate)) {
      const moment = getActualMomentsForDate(date).find((entry) => entry.id === id);
      expect(moment?.source.toLowerCase()).toContain('mom updates');
      expect(moment?.text.toLowerCase()).toContain(keyword);
      expect(moment?.photos).toEqual([]);
    }
  });

  it('maps the Madeira and Morocco thread updates across March 16 through March 26', () => {
    const expectedByDate = {
      '2026-03-16': ['actual-2026-03-16-mom-madeira-arrival', 'storm'],
      '2026-03-18': ['actual-2026-03-18-mom-madeira-levada', 'snow'],
      '2026-03-21': ['actual-2026-03-21-mom-lisbon-departure', 'casablanca flight'],
      '2026-03-22': ['actual-2026-03-22-mom-sahara-arrival', 'atlas'],
      '2026-03-24': ['actual-2026-03-24-mom-ouarzazate-to-marrakech', 'henna'],
      '2026-03-26': ['actual-2026-03-26-mom-marrakech-wildflowers', 'wildflower'],
    } as const;

    for (const [date, [id, keyword]] of Object.entries(expectedByDate)) {
      const moment = getActualMomentsForDate(date).find((entry) => entry.id === id);
      expect(moment?.source.toLowerCase()).toContain('mom updates');
      expect(moment?.text.toLowerCase()).toContain(keyword);
      expect(moment?.photos).toEqual([]);
    }
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

  it('keeps dad media captions human readable instead of exposing raw EXIF filenames', () => {
    const salalahMedia = getActualMomentsForDate('2026-02-12').find((moment) =>
      moment.source.toLowerCase().includes('dad photos'),
    );
    const muscatFinaleMedia = getActualMomentsForDate('2026-02-21').find((moment) =>
      moment.source.toLowerCase().includes('dad photos'),
    );

    expect(salalahMedia?.text).not.toContain('EXIF');
    expect(salalahMedia?.photos[0].caption).toContain('Salalah arrival');
    expect(salalahMedia?.photos[0].caption).not.toContain('IMG_');
    expect(salalahMedia?.photos[0].caption).not.toContain('EXIF');

    expect(muscatFinaleMedia?.videos?.[0].caption).toContain('Muscat Grand Mosque finale');
    expect(muscatFinaleMedia?.videos?.[0].caption).not.toContain('file_');
  });

  it('keeps shipped media captions and alt text free of raw filename and EXIF strings', () => {
    for (const moment of getAllSeedActualMoments()) {
      for (const photo of moment.photos) {
        for (const value of [photo.caption, photo.alt]) {
          expect(rawMediaCaptionPatterns.some((pattern) => pattern.test(value))).toBe(false);
        }
      }

      for (const video of moment.videos || []) {
        expect(rawMediaCaptionPatterns.some((pattern) => pattern.test(video.caption))).toBe(false);
      }
    }
  });

  it('returns cloned data so callers cannot mutate seed state', () => {
    const first = getActualMomentsForDate('2026-02-12');
    const second = getActualMomentsForDate('2026-02-12');
    const firstPhotoMoment = first.find((moment) => moment.photos.length > 0);
    const secondPhotoMoment = second.find((moment) => moment.photos.length > 0);

    expect(firstPhotoMoment).toBeTruthy();
    expect(secondPhotoMoment).toBeTruthy();

    firstPhotoMoment!.photos[0].caption = 'edited';
    expect(secondPhotoMoment!.photos[0].caption).not.toBe('edited');
  });
});
