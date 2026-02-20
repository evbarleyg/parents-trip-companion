import { describe, expect, it } from 'vitest';
import { resolveAppViewTab, resolveMobilePanel } from './view-state';
import {
  getDefaultMapScopes,
  resolveMapScope,
  resolveMapScopeForTab,
  MAP_SCOPE_BY_TAB,
} from './view-state';

describe('view state resolvers', () => {
  it('resolves app tab with fallback', () => {
    expect(resolveAppViewTab('trip_overview')).toBe('trip_overview');
    expect(resolveAppViewTab('day_detail')).toBe('day_detail');
    expect(resolveAppViewTab('unknown')).toBe('day_detail');
  });

  it('resolves mobile panel with fallback', () => {
    expect(resolveMobilePanel('map')).toBe('map');
    expect(resolveMobilePanel('plan')).toBe('plan');
    expect(resolveMobilePanel('other')).toBe('plan');
  });

  it('resolves map scope with fallback', () => {
    expect(resolveMapScope('trip')).toBe('trip');
    expect(resolveMapScope('day')).toBe('day');
    expect(resolveMapScope('full')).toBe('trip');
  });

  it('returns tab-specific default map scope', () => {
    expect(resolveMapScopeForTab('trip_overview', {})).toBe(MAP_SCOPE_BY_TAB.trip_overview);
    expect(resolveMapScopeForTab('day_detail', {})).toBe(MAP_SCOPE_BY_TAB.day_detail);
  });

  it('preserves explicit map scope map overrides', () => {
    const defaults = getDefaultMapScopes();
    expect(resolveMapScopeForTab('trip_overview', { ...defaults, trip_overview: 'day' })).toBe('day');
    expect(resolveMapScopeForTab('day_detail', { ...defaults, day_detail: 'trip' })).toBe('trip');
  });
});
