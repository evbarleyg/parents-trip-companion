import { describe, expect, it } from 'vitest';
import { buildSeedTripPlan } from '../data/seedTrip';
import { applyTripPatch } from './merge';

describe('applyTripPatch', () => {
  it('overrides matching day with detailed itinerary while preserving summary', () => {
    const base = buildSeedTripPlan();

    const next = applyTripPatch(base, {
      daysAdded: [],
      daysUpdated: [
        {
          date: '2026-02-12',
          region: 'Oman - Salalah',
          activeView: 'detail',
          summaryItems: [],
          detailItems: [
            {
              id: 'detail-1',
              title: 'Detailed Salalah day',
              startTime: '08:30',
              endTime: '17:00',
              location: 'Salalah',
              notes: 'Merged details',
              category: 'sights',
            },
          ],
        },
      ],
      conflicts: [],
      parseConfidence: 0.9,
    });

    const day = next.days.find((item) => item.date === '2026-02-12');
    expect(day).toBeTruthy();
    expect(day?.summaryItems.length).toBeGreaterThan(0);
    expect(day?.detailItems[0].title).toBe('Detailed Salalah day');
    expect(day?.activeView).toBe('detail');
  });

  it('preserves seeded actual moments when applying detail updates', () => {
    const base = buildSeedTripPlan();
    const before = base.days.find((item) => item.date === '2026-02-07');
    expect(before?.actualMoments?.length).toBeGreaterThan(0);

    const next = applyTripPatch(base, {
      daysAdded: [],
      daysUpdated: [
        {
          date: '2026-02-07',
          region: 'Dubai',
          activeView: 'detail',
          summaryItems: [],
          detailItems: [
            {
              id: 'detail-2',
              title: 'Updated Dubai detail',
              startTime: '10:00',
              endTime: null,
              location: 'Dubai Mall',
              notes: 'Imported details',
              category: 'sights',
            },
          ],
        },
      ],
      conflicts: [],
      parseConfidence: 0.8,
    });

    const after = next.days.find((item) => item.date === '2026-02-07');
    expect(after?.actualMoments?.length).toBe(before?.actualMoments?.length);
  });
});
