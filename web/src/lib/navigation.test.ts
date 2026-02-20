import { describe, expect, it } from 'vitest';
import {
  getDefaultMapScopes,
  MAP_SCOPE_BY_TAB,
  type MapScopeByTab,
} from './view-state';
import {
  type NavigationState,
  resolveActiveMapScope,
  transitionToDate,
  transitionToDayDetails,
  transitionToFullTrip,
  transitionToTab,
  transitionToToday,
  transitionMapScopeFromControl,
} from './navigation';

const base: MapScopeByTab = getDefaultMapScopes();

function withState(overrides: Partial<NavigationState>): NavigationState {
  return {
    activeAppTab: 'trip_overview',
    selectedDate: '2026-02-18',
    mapScopeByTab: base,
    ...overrides,
  };
}

describe('navigation transitions', () => {
  it('keeps per-tab map scope defaults unless overridden by map controls', () => {
    const withOverride = transitionMapScopeFromControl(
      {
        activeAppTab: 'trip_overview',
        selectedDate: '2026-02-18',
        mapScopeByTab: base,
      },
      'day',
    );

    expect(resolveActiveMapScope('trip_overview', withOverride.mapScopeByTab)).toBe('day');
    expect(resolveActiveMapScope('day_detail', withOverride.mapScopeByTab)).toBe('day');
  });

  it('forces day scope when entering day details', () => {
    const next = transitionToDayDetails(
      withState({
        mapScopeByTab: {
          ...base,
          day_detail: 'trip',
        },
      }),
      '2026-02-19',
    );

    expect(next.activeAppTab).toBe('day_detail');
    expect(next.selectedDate).toBe('2026-02-19');
    expect(next.mapScopeByTab.day_detail).toBe('day');
  });

  it('transitions back to today with day-scope contract in day details', () => {
    const inDay: NavigationState = withState({
      activeAppTab: 'day_detail',
      selectedDate: '2026-02-18',
      mapScopeByTab: {
        ...base,
        day_detail: 'trip',
      },
    });

    expect(transitionToToday(inDay, '2026-02-19').mapScopeByTab.day_detail).toBe('day');
  });

  it('transitions back to today without forcing scope in full trip', () => {
    const inTrip: NavigationState = withState({
      activeAppTab: 'trip_overview',
      selectedDate: '2026-02-18',
      mapScopeByTab: {
        ...base,
        trip_overview: 'day',
      },
    });

    const next = transitionToToday(inTrip, '2026-02-19');
    expect(next.selectedDate).toBe('2026-02-19');
    expect(next.mapScopeByTab).toEqual(inTrip.mapScopeByTab);
  });

  it('preserves tab/date transition intent', () => {
    const start: NavigationState = withState({
      selectedDate: '2026-02-18',
      mapScopeByTab: base,
    });

    const switched = transitionToTab(start, 'day_detail');
    const dated = transitionToDate(switched, '2026-02-19');

    expect(dated.activeAppTab).toBe('day_detail');
    expect(dated.selectedDate).toBe('2026-02-19');
    expect(dated.mapScopeByTab).toEqual(MAP_SCOPE_BY_TAB);
  });

  it('returns to full trip with prior trip tab override intact', () => {
    const withOverride: NavigationState = withState({
      activeAppTab: 'day_detail',
      selectedDate: '2026-02-19',
      mapScopeByTab: {
        ...base,
        trip_overview: 'day',
      },
    });

    const next = transitionToFullTrip(withOverride);
    expect(next.activeAppTab).toBe('trip_overview');
    expect(next.mapScopeByTab.trip_overview).toBe('day');
  });
});
