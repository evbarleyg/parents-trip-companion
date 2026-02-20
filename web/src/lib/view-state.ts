import type { AppViewTab, MobilePanel } from '../types';

export type MapScope = 'day' | 'trip';

export const APP_VIEW_TABS: AppViewTab[] = ['trip_overview', 'day_detail'];
export const MOBILE_PANELS: MobilePanel[] = ['map', 'plan'];
export const MAP_SCOPE_BY_TAB: Record<AppViewTab, MapScope> = {
  trip_overview: 'trip',
  day_detail: 'day',
} as const;
export const MAP_SCOPES: MapScope[] = ['trip', 'day'];

type MapScopeResolverOptions = {
  fallback?: MapScope;
};

export type MapScopeByTab = Record<AppViewTab, MapScope>;

export function resolveAppViewTab(value: string | null | undefined, fallback: AppViewTab = 'day_detail'): AppViewTab {
  if (!value) return fallback;
  return APP_VIEW_TABS.includes(value as AppViewTab) ? (value as AppViewTab) : fallback;
}

export function resolveMapScope(value: string | null | undefined, options: MapScopeResolverOptions = {}): MapScope {
  const fallback = options.fallback ?? 'trip';
  if (!value) return fallback;
  return MAP_SCOPES.includes(value as MapScope) ? (value as MapScope) : fallback;
}

export function resolveMapScopeForTab(tab: AppViewTab, overrides: Partial<MapScopeByTab>): MapScope {
  return overrides[tab] ?? MAP_SCOPE_BY_TAB[tab];
}

export function getDefaultMapScopes(): MapScopeByTab {
  return { ...MAP_SCOPE_BY_TAB };
}

export function resolveMobilePanel(
  value: string | null | undefined,
  fallback: MobilePanel = 'plan',
): MobilePanel {
  if (!value) return fallback;
  return MOBILE_PANELS.includes(value as MobilePanel) ? (value as MobilePanel) : fallback;
}
