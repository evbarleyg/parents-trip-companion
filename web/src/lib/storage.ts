import type { AppViewTab, MobilePanel, SourceDocument, TripPlan, UnlockResponse, ViewMode } from '../types';
import { resolveAppViewTab, resolveMobilePanel } from './view-state';

const TRIP_STATE_KEY = 'ptc_trip_plan_v2';
const DAY_VIEW_KEY = 'ptc_day_view_modes_v1';
const SESSION_KEY = 'ptc_session_v1';
const APP_TAB_KEY = 'ptc_app_tab_v1';
const MOBILE_PANEL_KEY = 'ptc_mobile_panel_v1';
const SOURCE_DB_NAME = 'ptc_sources_v1';
const SOURCE_STORE = 'docs';

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function loadTripPlanState(): TripPlan | null {
  if (typeof localStorage === 'undefined') return null;
  return safeParse<TripPlan>(localStorage.getItem(TRIP_STATE_KEY));
}

export function saveTripPlanState(plan: TripPlan): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TRIP_STATE_KEY, JSON.stringify(plan));
}

export function loadDayViewModes(): Record<string, ViewMode> {
  if (typeof localStorage === 'undefined') return {};
  return safeParse<Record<string, ViewMode>>(localStorage.getItem(DAY_VIEW_KEY)) || {};
}

export function saveDayViewModes(modes: Record<string, ViewMode>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DAY_VIEW_KEY, JSON.stringify(modes));
}

export function saveSession(session: UnlockResponse): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): UnlockResponse | null {
  if (typeof sessionStorage === 'undefined') return null;
  const session = safeParse<UnlockResponse>(sessionStorage.getItem(SESSION_KEY));
  if (!session) return null;

  const expires = Date.parse(session.expiresAt);
  if (Number.isNaN(expires) || Date.now() >= expires) {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }

  return session;
}

export function clearSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadAppViewTab(): AppViewTab {
  if (typeof localStorage === 'undefined') return 'day_detail';
  return resolveAppViewTab(localStorage.getItem(APP_TAB_KEY), 'day_detail');
}

export function saveAppViewTab(tab: AppViewTab): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(APP_TAB_KEY, tab);
}

export function loadMobilePanel(): MobilePanel {
  if (typeof localStorage === 'undefined') return 'now';
  return resolveMobilePanel(localStorage.getItem(MOBILE_PANEL_KEY), 'now');
}

export function saveMobilePanel(panel: MobilePanel): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MOBILE_PANEL_KEY, panel);
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SOURCE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SOURCE_STORE)) {
        db.createObjectStore(SOURCE_STORE, { keyPath: 'id' });
      }
    };

    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveSourceDocument(source: SourceDocument, rawText: string): Promise<void> {
  const db = await openDb();
  if (!db) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SOURCE_STORE, 'readwrite');
    tx.objectStore(SOURCE_STORE).put({ ...source, rawText });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
  });
}
