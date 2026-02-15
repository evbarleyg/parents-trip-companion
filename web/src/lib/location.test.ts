import { describe, expect, it } from 'vitest';
import { scoreActiveItem } from './location';

describe('active itinerary scoring', () => {
  it('prefers nearest in-time item and returns confidence', () => {
    const day = {
      date: '2026-03-08',
      region: 'Portugal - Lisbon',
      activeView: 'detail' as const,
      summaryItems: [],
      detailItems: [
        {
          id: 'morning',
          title: 'Morning walk',
          startTime: '09:00',
          endTime: '10:30',
          location: 'Alfama',
          notes: '',
          category: 'sights' as const,
          lat: 38.711,
          lng: -9.129,
        },
        {
          id: 'lunch',
          title: 'Lunch',
          startTime: '12:00',
          endTime: '13:00',
          location: 'Baixa',
          notes: '',
          category: 'food' as const,
          lat: 38.709,
          lng: -9.138,
        },
      ],
    };

    const result = scoreActiveItem(day, [38.7112, -9.1291], new Date('2026-03-08T09:30:00'));
    expect(result.item?.id).toBe('morning');
    expect(['high', 'medium']).toContain(result.confidence);
  });
});
