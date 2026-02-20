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

  it('falls back when stored app tab is invalid', () => {
    localStorage.clear();
    localStorage.setItem('ptc_app_tab_v1', 'timeline');
    expect(loadAppViewTab()).toBe('day_detail');
  });

  it('falls back when stored mobile panel is invalid', () => {
    localStorage.clear();
    localStorage.setItem('ptc_mobile_panel_v1', 'timeline');
    expect(loadMobilePanel()).toBe('plan');
  });

  it('retains persisted values without schema changes', () => {
    localStorage.clear();
    saveAppViewTab('trip_overview');
    saveMobilePanel('plan');
    saveDayViewModes({ '2026-02-18': 'summary' });

    expect(loadAppViewTab()).toBe('trip_overview');
    expect(loadMobilePanel()).toBe('plan');
    expect(loadDayViewModes()['2026-02-18']).toBe('summary');
  });
});
