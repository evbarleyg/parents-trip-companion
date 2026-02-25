import { describe, expect, test } from 'vitest';
import type { TripDay } from '../types';
import { dayHasPhotos, dayOptionLabel, dayPhotoCount } from './day';

function makeDay(overrides: Partial<TripDay> = {}): TripDay {
  return {
    date: '2026-02-13',
    region: 'Oman - Salalah',
    summaryItems: [],
    detailItems: [],
    activeView: 'summary',
    actualMoments: [],
    ...overrides,
  };
}

describe('day helper functions', () => {
  test('detects days with at least one media item', () => {
    const withPhotos = makeDay({
      actualMoments: [
        {
          id: 'm1',
          source: 'iMessage',
          whenLabel: 'Morning',
          text: 'Beach walk',
          photos: [{ id: 'p1', src: '/img.png', alt: 'Beach', caption: 'At the beach' }],
        },
      ],
    });

    const withoutPhotos = makeDay({
      actualMoments: [
        {
          id: 'm2',
          source: 'iMessage',
          whenLabel: 'Evening',
          text: 'Dinner',
          photos: [],
        },
      ],
    });

    const withVideos = makeDay({
      actualMoments: [
        {
          id: 'm4',
          source: 'iMessage',
          whenLabel: 'Night',
          text: 'Walkthrough clip',
          photos: [],
          videos: [{ id: 'v1', src: '/clip.mp4', caption: 'Night market clip' }],
        },
      ],
    });

    expect(dayHasPhotos(withPhotos)).toBe(true);
    expect(dayHasPhotos(withoutPhotos)).toBe(false);
    expect(dayHasPhotos(withVideos)).toBe(true);
    expect(dayPhotoCount(withPhotos)).toBe(1);
    expect(dayPhotoCount(withoutPhotos)).toBe(0);
    expect(dayPhotoCount(withVideos)).toBe(1);
  });

  test('builds option labels with TODAY and MEDIA markers', () => {
    const day = makeDay({
      date: '2026-02-13',
      actualMoments: [
        {
          id: 'm3',
          source: 'iMessage',
          whenLabel: 'Noon',
          text: 'Viewpoint',
          photos: [{ id: 'p2', src: '/img-2.png', alt: 'View', caption: 'Cliff view' }],
        },
      ],
    });

    expect(dayOptionLabel(day, '2026-02-13')).toContain('TODAY');
    expect(dayOptionLabel(day, '2026-02-13')).toContain('MEDIA');
    expect(dayOptionLabel(day, '2026-02-12')).toContain('Fri, Feb 13');
  });
});
