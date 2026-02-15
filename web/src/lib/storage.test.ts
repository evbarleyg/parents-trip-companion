import { describe, expect, it } from 'vitest';
import {
  loadAppViewTab,
  loadDayViewModes,
  loadMobilePanel,
  saveAppViewTab,
  saveDayViewModes,
  saveMobilePanel,
} from './storage';

describe('day view mode persistence', () => {
  it('stores and restores same-day summary/detail preference', () => {
    localStorage.clear();
    saveDayViewModes({ '2026-02-18': 'detail', '2026-03-10': 'summary' });
    const loaded = loadDayViewModes();
    expect(loaded['2026-02-18']).toBe('detail');
    expect(loaded['2026-03-10']).toBe('summary');
  });

  it('stores and restores top-level app tab', () => {
    localStorage.clear();
    saveAppViewTab('trip_overview');
    expect(loadAppViewTab()).toBe('trip_overview');
  });

  it('stores and restores mobile panel selection', () => {
    localStorage.clear();
    saveMobilePanel('map');
    expect(loadMobilePanel()).toBe('map');
  });
});
