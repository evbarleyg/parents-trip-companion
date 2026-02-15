import { describe, expect, it } from 'vitest';
import { resolveAppViewTab, resolveMobilePanel } from './view-state';

describe('view state resolvers', () => {
  it('resolves app tab with fallback', () => {
    expect(resolveAppViewTab('trip_overview')).toBe('trip_overview');
    expect(resolveAppViewTab('day_detail')).toBe('day_detail');
    expect(resolveAppViewTab('unknown')).toBe('day_detail');
  });

  it('resolves mobile panel with fallback', () => {
    expect(resolveMobilePanel('map')).toBe('map');
    expect(resolveMobilePanel('now')).toBe('now');
    expect(resolveMobilePanel('other')).toBe('now');
  });
});
