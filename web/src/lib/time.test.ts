import { describe, expect, it } from 'vitest';
import { getCurrentAndNext, parseClockToMinutes } from './time';

const items = [
  {
    id: 'a',
    title: 'Breakfast',
    startTime: '09:00',
    endTime: '10:00',
    location: 'Hotel',
    notes: '',
    category: 'food' as const,
  },
  {
    id: 'b',
    title: 'Museum',
    startTime: '11:00',
    endTime: '13:00',
    location: 'Museum',
    notes: '',
    category: 'sights' as const,
  },
];

describe('time parsing', () => {
  it('normalizes HH:mm to minutes', () => {
    expect(parseClockToMinutes('09:15')).toBe(555);
    expect(parseClockToMinutes('23:59')).toBe(1439);
    expect(parseClockToMinutes('xx')).toBeNull();
  });

  it('finds current and next blocks', () => {
    const current = getCurrentAndNext(items, 9 * 60 + 30);
    expect(current.current?.id).toBe('a');
    expect(current.next?.id).toBe('b');

    const nextOnly = getCurrentAndNext(items, 8 * 60);
    expect(nextOnly.current).toBeNull();
    expect(nextOnly.next?.id).toBe('a');
  });
});
