import type { SourceDocument, TripPlan, UnlockResponse, ViewMode } from '../types';

const TRIP_STATE_KEY = 'ptc_trip_plan_v1';
const DAY_VIEW_KEY = 'ptc_day_view_modes_v1';
const SESSION_KEY = 'ptc_session_v1';
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
