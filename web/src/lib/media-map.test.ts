import { describe, expect, it } from 'vitest';
import type { TripDay } from '../types';
import { getActualPhotoMapPointsForDay, isPhotoPointNearItinerary } from './media-map';

function makeDay(overrides: Partial<TripDay> = {}): TripDay {
  return {
    date: '2026-03-02',
    region: 'Istanbul',
    summaryItems: [],
    detailItems: [],
    activeView: 'summary',
    actualMoments: [],
    ...overrides,
  };
}

describe('media map helpers', () => {
  it('extracts only GPS-tagged photos into map points', () => {
    const day = makeDay({
      actualMoments: [
        {
          id: 'm1',
          source: 'Photo library export',
          whenLabel: 'Morning',
          text: 'Library import',
          photos: [
            { id: 'p1', src: '/actuals/a.jpeg', alt: 'A', caption: 'A', lat: 41.02, lng: 28.97 },
            { id: 'p2', src: '/actuals/b.jpeg', alt: 'B', caption: 'B' },
          ],
        },
      ],
    });

    expect(getActualPhotoMapPointsForDay(day)).toEqual([
      {
        id: 'p1',
        date: '2026-03-02',
        lat: 41.02,
        lng: 28.97,
        source: 'Photo library export',
        whenLabel: 'Morning',
        alt: 'A',
        caption: 'A',
      },
    ]);
  });

  it('keeps nearby photo points in the selected-day map bounds logic', () => {
    const point = { lat: 41.033378, lng: 28.993189 };
    const itineraryCoords: Array<[number, number]> = [[41.0257, 28.9744]];

    expect(isPhotoPointNearItinerary(point, itineraryCoords)).toBe(true);
  });

  it('rejects photo points that are far from the seeded itinerary for that date', () => {
    const maldivesPoint = { lat: 3.591289, lng: 72.880736 };
    const lisbonCoords: Array<[number, number]> = [[38.7079, -9.1366]];

    expect(isPhotoPointNearItinerary(maldivesPoint, lisbonCoords)).toBe(false);
  });
});
