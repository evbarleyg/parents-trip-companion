import { describe, expect, it } from 'vitest';
import { dateKeyInTimeZone, getTodayInTripRange } from './date';
import type { TripDay } from '../types';

function makeDay(date: string): TripDay {
  return {
    date,
    region: 'Test Region',
    summaryItems: [],
    detailItems: [],
    activeView: 'summary',
  };
}

describe('date utilities', () => {
  it('formats date key in a requested timezone', () => {
    const key = dateKeyInTimeZone(new Date('2026-02-03T02:30:00.000Z'), 'America/Los_Angeles');
    expect(key).toBe('2026-02-02');
  });

  it('returns in-range day when timezone day exists in trip', () => {
    const selected = getTodayInTripRange(
      {
        startDate: '2026-02-03',
        timezone: 'America/Los_Angeles',
        days: [makeDay('2026-02-02'), makeDay('2026-02-03')],
      },
      new Date('2026-02-03T02:30:00.000Z'),
    );

    expect(selected).toBe('2026-02-02');
  });

  it('falls back to trip start when current date is outside trip range', () => {
    const selected = getTodayInTripRange(
      {
        startDate: '2026-02-03',
        timezone: 'America/Los_Angeles',
        days: [makeDay('2026-02-03'), makeDay('2026-02-04')],
      },
      new Date('2026-01-25T18:00:00.000Z'),
    );

    expect(selected).toBe('2026-02-03');
  });
});
