import { describe, expect, it } from 'vitest';
import { allocateDadIntakeBatch, allocateDadIntakeItem, type DadTripDayReference } from './dadAllocation';

const TRIP_DAYS: DadTripDayReference[] = [
  { date: '2026-02-07', region: 'Dubai' },
  { date: '2026-02-12', region: 'Oman - Salalah' },
  { date: '2026-02-13', region: 'Oman - Salalah' },
  { date: '2026-02-24', region: 'Maldives' },
];

describe('dad intake allocation', () => {
  it('assigns by explicit date first', () => {
    const decision = allocateDadIntakeItem(
      {
        id: 'dad-1',
        text: 'Great coastline day today.',
        dateHint: '2026-02-12',
      },
      TRIP_DAYS,
    );

    expect(decision.status).toBe('assigned');
    expect(decision.strategy).toBe('explicit_date');
    expect(decision.assignedDate).toBe('2026-02-12');
  });

  it('assigns by region cue only when unambiguous', () => {
    const decision = allocateDadIntakeItem(
      {
        id: 'dad-2',
        text: 'Resort beach lunch was excellent.',
        placeHint: 'Machchafushi Maldives',
      },
      TRIP_DAYS,
      {
        regionAliases: {
          '2026-02-24': ['machchafushi', 'resort'],
        },
      },
    );

    expect(decision.status).toBe('assigned');
    expect(decision.strategy).toBe('region_keyword');
    expect(decision.assignedDate).toBe('2026-02-24');
  });

  it('assigns by metadata timestamp when close enough', () => {
    const decision = allocateDadIntakeItem(
      {
        id: 'dad-3',
        text: 'Quick morning update.',
        capturedAt: '2026-02-13T08:30:00Z',
      },
      TRIP_DAYS,
    );

    expect(decision.status).toBe('assigned');
    expect(decision.strategy).toBe('metadata_timestamp');
    expect(decision.assignedDate).toBe('2026-02-13');
  });

  it('flags ambiguous region hints for manual review', () => {
    const decision = allocateDadIntakeItem(
      {
        id: 'dad-4',
        text: 'Oman day with great views.',
      },
      TRIP_DAYS,
    );

    expect(decision.status).toBe('needs_review');
    expect(decision.assignedDate).toBeNull();
  });

  it('partitions assigned and review items', () => {
    const result = allocateDadIntakeBatch(
      [
        { id: 'dad-5', text: 'Date hint test', dateHint: '2026-02-07' },
        { id: 'dad-6', text: 'No usable cues here' },
      ],
      TRIP_DAYS,
    );

    expect(result.assigned.map((entry) => entry.itemId)).toEqual(['dad-5']);
    expect(result.needsReview.map((entry) => entry.itemId)).toEqual(['dad-6']);
  });
});
