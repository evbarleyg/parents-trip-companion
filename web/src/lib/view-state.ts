import type { AppViewTab, MobilePanel } from '../types';

export const APP_VIEW_TABS: AppViewTab[] = ['trip_overview', 'day_detail'];
export const MOBILE_PANELS: MobilePanel[] = ['now', 'map', 'plan', 'recs'];

export function resolveAppViewTab(value: string | null | undefined, fallback: AppViewTab = 'day_detail'): AppViewTab {
  if (!value) return fallback;
  return APP_VIEW_TABS.includes(value as AppViewTab) ? (value as AppViewTab) : fallback;
}

export function resolveMobilePanel(
  value: string | null | undefined,
  fallback: MobilePanel = 'now',
): MobilePanel {
  if (!value) return fallback;
  return MOBILE_PANELS.includes(value as MobilePanel) ? (value as MobilePanel) : fallback;
}
