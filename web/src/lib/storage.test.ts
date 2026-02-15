import { describe, expect, it } from 'vitest';
import { loadDayViewModes, saveDayViewModes } from './storage';

describe('day view mode persistence', () => {
  it('stores and restores same-day summary/detail preference', () => {
    localStorage.clear();
    saveDayViewModes({ '2026-02-18': 'detail', '2026-03-10': 'summary' });
    const loaded = loadDayViewModes();
    expect(loaded['2026-02-18']).toBe('detail');
    expect(loaded['2026-03-10']).toBe('summary');
  });
});
