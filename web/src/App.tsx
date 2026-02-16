import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  askRecommendationChat,
  extractDocument,
  getApiBaseUrl,
  getNearbyRecommendations,
  unlockPasscode,
} from './lib/api';
import { buildSeedTripPlan, seedTripPlan } from './data/seedTrip';
import { formatDateLabel, slugify, toInputClock } from './lib/format';
import { detectWhereAmI } from './lib/location';
import { applyTripPatch } from './lib/merge';
import {
  clearSession,
  loadAppViewTab,
  loadDayViewModes,
  loadMobilePanel,
  loadSession,
  loadTripPlanState,
  saveAppViewTab,
  saveDayViewModes,
  saveMobilePanel,
  saveSession,
  saveSourceDocument,
  saveTripPlanState,
} from './lib/storage';
import { getCurrentAndNext } from './lib/time';
import type {
  AppViewTab,
  ChatContext,
  MapStatus,
  MobilePanel,
  RecommendationItem,
  RecCategory,
  SourceDocument,
  TripDay,
  TripPatch,
  TripPlan,
  ViewMode,
  WhereAmIState,
} from './types';

const GEO_REFRESH_MS = 5 * 60 * 1000;
const MOBILE_BREAKPOINT = 980;

const CATEGORY_LABEL: Record<RecCategory, string> = {
  sights: 'Sights',
  food: 'Food',
  coffee: 'Coffee',
  rest: 'Rest',
};

const APP_TAB_LABEL: Record<AppViewTab, string> = {
  trip_overview: 'Trip Overview',
  day_detail: 'Day Detail',
};

const MOBILE_PANEL_LABEL: Record<MobilePanel, string> = {
  now: 'Now',
  map: 'Map',
  plan: 'Plan',
  recs: 'Recs',
};

type MapScope = 'day' | 'trip';

const MAP_SCOPE_LABEL: Record<MapScope, string> = {
  day: 'Selected Day',
  trip: 'Full Trip',
};

interface RegionSegment {
  id: string;
  region: string;
  startDate: string;
  endDate: string;
  days: number;
}

function regionColor(region: string): string {
  const key = region.toLowerCase();
  if (key.includes('oman')) return '#276f8f';
  if (key.includes('maldives')) return '#157a6e';
  if (key.includes('istanbul')) return '#8f3b76';
  if (key.includes('portugal')) return '#d0722b';
  if (key.includes('morocco')) return '#7b5d28';
  if (key.includes('travel') || key.includes('transit')) return '#516178';
  return '#365e8d';
}

function applyStoredViewModes(plan: TripPlan, viewModes: Record<string, ViewMode>): TripPlan {
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      activeView: viewModes[day.date] || day.activeView,
    })),
  };
}

function getTodayInTripRange(plan: TripPlan): string {
  const today = new Date().toISOString().slice(0, 10);
  if (plan.days.some((day) => day.date === today)) {
    return today;
  }
  return plan.startDate;
}

function getActiveItems(day: TripDay): TripDay['summaryItems'] {
  return day.activeView === 'detail' && day.detailItems.length > 0 ? day.detailItems : day.summaryItems;
}

function defaultWhereAmI(date: string): WhereAmIState {
  return {
    mode: 'unknown',
    currentLatLng: null,
    activeDayId: date,
    activeItemId: null,
    confidence: 'low',
    lastUpdated: null,
  };
}

function buildRegionSegments(days: TripDay[]): RegionSegment[] {
  if (days.length === 0) return [];

  const segments: RegionSegment[] = [];
  let cursor: RegionSegment = {
    id: `${days[0].region}-${days[0].date}`,
    region: days[0].region,
    startDate: days[0].date,
    endDate: days[0].date,
    days: 1,
  };

  for (let i = 1; i < days.length; i += 1) {
    const next = days[i];
    if (next.region === cursor.region) {
      cursor.endDate = next.date;
      cursor.days += 1;
      continue;
    }

    segments.push(cursor);
    cursor = {
      id: `${next.region}-${next.date}`,
      region: next.region,
      startDate: next.date,
      endDate: next.date,
      days: 1,
    };
  }

  segments.push(cursor);
  return segments;
}

export function App() {
  const [passcode, setPasscode] = useState('');
  const [session, setSession] = useState(loadSession());
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockPending, setUnlockPending] = useState(false);

  const initialPlan = useMemo(() => {
    const restored = loadTripPlanState();
    const viewModes = loadDayViewModes();
    return applyStoredViewModes(restored || buildSeedTripPlan(), viewModes);
  }, []);

  const [tripPlan, setTripPlan] = useState<TripPlan>(initialPlan || seedTripPlan);
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayInTripRange(initialPlan || seedTripPlan));
  const [whereAmI, setWhereAmI] = useState<WhereAmIState>(() => defaultWhereAmI(selectedDate));
  const [autoLocateEnabled, setAutoLocateEnabled] = useState(false);
  const [manualDayId, setManualDayId] = useState<string>('');
  const [manualItemId, setManualItemId] = useState<string>('');

  const initialAppTab = useMemo(() => loadAppViewTab(), []);
  const [activeAppTab, setActiveAppTabState] = useState<AppViewTab>(initialAppTab);
  const [activeMobilePanel, setActiveMobilePanelState] = useState<MobilePanel>(() => loadMobilePanel());
  const [mapScope, setMapScope] = useState<MapScope>(() => (initialAppTab === 'trip_overview' ? 'trip' : 'day'));
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  });

  const [mapStatus, setMapStatus] = useState<MapStatus>('initializing');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapMountVersion, setMapMountVersion] = useState(0);

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<RecCategory>('sights');

  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingPatch, setPendingPatch] = useState<{
    documentId: string;
    fileName: string;
    warnings: string[];
    patch: TripPatch;
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<string>('Ready');

  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const hasAppliedInitialRegionLockRef = useRef(false);
  const lastViewportFitKeyRef = useRef<string | null>(null);

  const selectedDay = useMemo(
    () => tripPlan.days.find((day) => day.date === selectedDate) || tripPlan.days[0],
    [tripPlan.days, selectedDate],
  );
  const selectedItems = useMemo(() => getActiveItems(selectedDay), [selectedDay]);
  const nowAndNext = useMemo(() => getCurrentAndNext(selectedItems), [selectedItems]);
  const regionSegments = useMemo(() => buildRegionSegments(tripPlan.days), [tripPlan.days]);
  const todayDate = useMemo(() => getTodayInTripRange(tripPlan), [tripPlan]);
  const todayRegion = useMemo(
    () => tripPlan.days.find((day) => day.date === todayDate)?.region || selectedDay.region,
    [tripPlan.days, todayDate, selectedDay.region],
  );

  const whereAmIItem = useMemo(() => {
    if (!whereAmI.activeItemId || !selectedDay) return null;
    return getActiveItems(selectedDay).find((item) => item.id === whereAmI.activeItemId) || null;
  }, [selectedDay, whereAmI.activeItemId]);

  const manualDay = useMemo(() => tripPlan.days.find((day) => day.date === manualDayId), [tripPlan.days, manualDayId]);
  const itemOptionsForManual = manualDay ? [...manualDay.summaryItems, ...manualDay.detailItems] : [];

  const invalidateMap = useCallback(() => {
    if (!mapRef.current) return;
    window.requestAnimationFrame(() => {
      try {
        mapRef.current?.invalidateSize({ pan: false, animate: false });
      } catch {
        // Ignore transient invalidate errors.
      }
    });
  }, []);

  function setAppTab(tab: AppViewTab) {
    setActiveAppTabState(tab);
    saveAppViewTab(tab);
    setMapScope(tab === 'trip_overview' ? 'trip' : 'day');
  }

  function setMobilePanel(panel: MobilePanel) {
    setActiveMobilePanelState(panel);
    saveMobilePanel(panel);
  }

  function selectDateForDayMap(date: string) {
    setSelectedDate(date);
    setMapScope('day');
  }

  function retryMapInit() {
    setMapError(null);
    setMapStatus('initializing');
    setMapMountVersion((prev) => prev + 1);
  }

  function panelHiddenClass(panel: MobilePanel): string {
    if (!isMobile || activeAppTab !== 'day_detail') return '';
    return activeMobilePanel === panel ? '' : 'panel-hidden-mobile';
  }

  useEffect(() => {
    saveTripPlanState(tripPlan);
  }, [tripPlan]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const apply = () => setIsMobile(media.matches);
    apply();

    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, []);

  useEffect(() => {
    const container = mapElementRef.current;
    if (!container) {
      setMapStatus('error');
      setMapError('Map container is unavailable.');
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let settleRafId = 0;

    setMapStatus('initializing');
    setMapError(null);
    hasAppliedInitialRegionLockRef.current = false;
    lastViewportFitKeyRef.current = null;

    rafId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      try {
        const map = L.map(container, {
          zoomControl: true,
          preferCanvas: true,
        }).setView([26, 20], 3);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const markerLayer = L.layerGroup().addTo(map);
        mapRef.current = map;
        markerLayerRef.current = markerLayer;

        settleRafId = window.requestAnimationFrame(() => {
          if (cancelled) return;
          invalidateMap();
          setMapStatus('ready');
        });
      } catch (error) {
        setMapStatus('error');
        setMapError((error as Error).message || 'Unable to initialize map.');
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      window.cancelAnimationFrame(settleRafId);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (mapRef.current) {
        mapRef.current.remove();
      }

      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, [mapMountVersion, invalidateMap]);

  useEffect(() => {
    if (mapStatus !== 'ready') return;

    const onResize = () => invalidateMap();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidateMap();
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    if (typeof ResizeObserver !== 'undefined' && mapElementRef.current) {
      const observer = new ResizeObserver(() => invalidateMap());
      observer.observe(mapElementRef.current);
      resizeObserverRef.current = observer;
    }

    invalidateMap();

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [mapStatus, invalidateMap]);

  useEffect(() => {
    if (mapStatus === 'ready') {
      invalidateMap();
    }
  }, [activeAppTab, activeMobilePanel, isMobile, mapStatus, invalidateMap]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current || !markerLayerRef.current) return;

    markerLayerRef.current.clearLayers();

    const bounds = L.latLngBounds([]);
    const todayRegionBounds = L.latLngBounds([]);
    const selectedDayBounds = L.latLngBounds([]);

    for (const day of tripPlan.days) {
      const items = getActiveItems(day);
      const color = regionColor(day.region);
      const isSelectedDate = day.date === selectedDate;

      const coords = items
        .filter((item) => typeof item.lat === 'number' && typeof item.lng === 'number')
        .map((item) => [item.lat as number, item.lng as number] as [number, number]);

      coords.forEach((coord, idx) => {
        const marker = L.circleMarker(coord, {
          radius: isSelectedDate ? 6 : 4,
          color: '#ffffff',
          weight: 1,
          fillColor: color,
          fillOpacity: isSelectedDate ? 0.95 : 0.55,
        });

        marker.bindPopup(
          `<b>${formatDateLabel(day.date)}</b><br/>${day.region}<br/>${items[idx]?.title || 'Itinerary stop'}`,
        );
        marker.bindTooltip(
          `<strong>${formatDateLabel(day.date)}</strong><br/>${day.region}<br/>${items[idx]?.title || 'Itinerary stop'}`,
          {
            direction: 'top',
            sticky: true,
            opacity: 0.95,
            className: 'map-tooltip',
          },
        );

        marker.on('click', () => {
          selectDateForDayMap(day.date);
          setAppTab('day_detail');
          if (isMobile) {
            setMobilePanel('plan');
          }
        });

        markerLayerRef.current?.addLayer(marker);
        bounds.extend(coord);
        if (day.region === todayRegion) {
          todayRegionBounds.extend(coord);
        }
        if (day.date === selectedDate) {
          selectedDayBounds.extend(coord);
        }
      });

      if (coords.length >= 2) {
        if (mapScope === 'trip') {
          markerLayerRef.current.addLayer(
            L.polyline(coords, {
              color,
              weight: isSelectedDate ? 3.2 : 2,
              opacity: isSelectedDate ? 0.9 : 0.33,
            }),
          );
        } else if (isSelectedDate) {
          markerLayerRef.current.addLayer(
            L.polyline(coords, {
              color,
              weight: 3,
              opacity: 0.82,
            }),
          );
        }
      }
    }

    if (whereAmI.currentLatLng) {
      const currentMarker = L.circleMarker(whereAmI.currentLatLng, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#d94841',
        fillOpacity: 1,
      });
      currentMarker.bindPopup('Current location');
      currentMarker.bindTooltip('Current location', {
        direction: 'top',
        sticky: true,
        opacity: 0.95,
        className: 'map-tooltip',
      });
      markerLayerRef.current.addLayer(currentMarker);
      bounds.extend(whereAmI.currentLatLng);
    }

    if (bounds.isValid()) {
      if (!hasAppliedInitialRegionLockRef.current) {
        if (todayRegionBounds.isValid()) {
          mapRef.current.fitBounds(todayRegionBounds.pad(0.28));
          setStatusMessage(`Map locked to today's region on load: ${todayRegion}.`);
        } else {
          mapRef.current.fitBounds(bounds.pad(0.24));
          setStatusMessage('Map loaded.');
        }

        hasAppliedInitialRegionLockRef.current = true;
        lastViewportFitKeyRef.current = 'initial';
      } else {
        const fitKey = mapScope === 'day' ? `day:${selectedDate}` : 'trip';
        if (lastViewportFitKeyRef.current !== fitKey) {
          if (mapScope === 'day' && selectedDayBounds.isValid()) {
            mapRef.current.fitBounds(selectedDayBounds.pad(0.36));
            setStatusMessage(`Map focused on ${formatDateLabel(selectedDate)} in ${selectedDay.region}.`);
          } else {
            mapRef.current.fitBounds(bounds.pad(0.24));
            setStatusMessage('Map showing full trip overview.');
          }

          lastViewportFitKeyRef.current = fitKey;
        }
      }
    }

    invalidateMap();
  }, [
    tripPlan,
    selectedDate,
    selectedDay.region,
    whereAmI.currentLatLng,
    mapScope,
    isMobile,
    mapStatus,
    invalidateMap,
    todayRegion,
  ]);

  useEffect(() => {
    const next = detectWhereAmI(tripPlan, selectedDate, whereAmI.currentLatLng, whereAmI.mode);

    if (whereAmI.mode === 'manual') {
      return;
    }

    setWhereAmI((prev) => ({
      ...next,
      currentLatLng: prev.currentLatLng,
      mode: prev.currentLatLng ? 'auto' : prev.mode,
    }));
  }, [tripPlan, selectedDate, whereAmI.currentLatLng, whereAmI.mode]);

  useEffect(() => {
    if (!autoLocateEnabled || typeof navigator === 'undefined' || !navigator.geolocation) return;

    let cancelled = false;

    const locate = () => {
      if (document.visibilityState !== 'visible') return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setWhereAmI({
            ...detectWhereAmI(tripPlan, selectedDate, coords, 'auto'),
            mode: 'auto',
          });
        },
        (error) => {
          if (cancelled) return;
          setStatusMessage(`Location unavailable: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 10_000,
        },
      );
    };

    locate();
    const interval = window.setInterval(locate, GEO_REFRESH_MS);
    const onVisibility = () => locate();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoLocateEnabled, selectedDate, tripPlan]);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlockError(null);
    setUnlockPending(true);

    try {
      const nextSession = await unlockPasscode(passcode);
      saveSession(nextSession);
      setSession(nextSession);
      setPasscode('');
    } catch (error) {
      setUnlockError((error as Error).message || 'Unlock failed');
    } finally {
      setUnlockPending(false);
    }
  }

  function logout() {
    clearSession();
    setSession(null);
    setRecommendations([]);
    setChatAnswer(null);
  }

  function setDayViewMode(date: string, mode: ViewMode) {
    setTripPlan((prev) => {
      const updated = {
        ...prev,
        days: prev.days.map((day) => (day.date === date ? { ...day, activeView: mode } : day)),
      };

      const existingModes = loadDayViewModes();
      const nextModes = { ...existingModes, [date]: mode };
      saveDayViewModes(nextModes);
      return updated;
    });
  }

  function setManualOverride() {
    const day = tripPlan.days.find((entry) => entry.date === manualDayId);
    if (!day) return;

    const items = getActiveItems(day);
    const selectedItem = items.find((entry) => entry.id === manualItemId) || items[0] || null;

    selectDateForDayMap(day.date);
    setWhereAmI({
      mode: 'manual',
      currentLatLng:
        selectedItem && typeof selectedItem.lat === 'number' && typeof selectedItem.lng === 'number'
          ? [selectedItem.lat, selectedItem.lng]
          : null,
      activeDayId: day.date,
      activeItemId: selectedItem?.id || null,
      confidence: 'medium',
      lastUpdated: new Date().toISOString(),
    });
  }

  function clearManualOverride() {
    setManualDayId('');
    setManualItemId('');
    setWhereAmI((prev) => ({ ...prev, mode: prev.currentLatLng ? 'auto' : 'unknown' }));
  }

  async function handleExtractUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !session) return;

    setExtracting(true);
    setUploadError(null);

    try {
      const extracted = await extractDocument(file, session.token);
      setPendingPatch({
        documentId: extracted.documentId,
        fileName: file.name,
        warnings: extracted.warnings,
        patch: extracted.tripPatch,
      });
      setStatusMessage(`Parsed ${file.name}. Review changes before applying.`);
    } catch (error) {
      setUploadError((error as Error).message || 'Upload parse failed');
    } finally {
      setExtracting(false);
      event.currentTarget.value = '';
    }
  }

  async function applyPendingPatch() {
    if (!pendingPatch) return;

    const merged = applyTripPatch(tripPlan, pendingPatch.patch);
    const source: SourceDocument = {
      id: pendingPatch.documentId,
      name: pendingPatch.fileName,
      kind: pendingPatch.fileName.toLowerCase().endsWith('.pdf')
        ? 'pdf'
        : pendingPatch.fileName.toLowerCase().endsWith('.docx')
          ? 'docx'
          : pendingPatch.fileName.toLowerCase().endsWith('.doc')
            ? 'doc'
            : pendingPatch.fileName.toLowerCase().endsWith('.txt')
              ? 'txt'
              : 'unknown',
      uploadedAt: new Date().toISOString(),
      coversDates: [
        ...pendingPatch.patch.daysAdded.map((day) => day.date),
        ...pendingPatch.patch.daysUpdated.map((day) => day.date),
      ],
      status: pendingPatch.warnings.length > 0 ? 'warning' : 'parsed',
    };

    const dedupedSources = [source, ...merged.sources.filter((entry) => entry.id !== source.id)];
    const nextPlan = { ...merged, sources: dedupedSources };
    setTripPlan(nextPlan);
    setPendingPatch(null);
    setStatusMessage(`Merged ${source.name}. Detailed days now default to detail view.`);

    try {
      await saveSourceDocument(source, JSON.stringify(pendingPatch.patch));
    } catch {
      // Local IndexedDB storage is best-effort only.
    }
  }

  function discardPendingPatch() {
    setPendingPatch(null);
    setStatusMessage('Import review discarded.');
  }

  function getRecommendationAnchor(): [number, number] | null {
    if (whereAmI.currentLatLng) return whereAmI.currentLatLng;

    const current = whereAmIItem;
    if (current && typeof current.lat === 'number' && typeof current.lng === 'number') {
      return [current.lat, current.lng];
    }

    const fallback = selectedItems.find((item) => typeof item.lat === 'number' && typeof item.lng === 'number');
    if (!fallback) return null;
    return [fallback.lat as number, fallback.lng as number];
  }

  async function fetchRecommendations(category: RecCategory) {
    if (!session) return;

    const anchor = getRecommendationAnchor();
    if (!anchor) {
      setRecommendationError('No location available. Use Locate or select a stop with coordinates.');
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError(null);
    setActiveCategory(category);

    try {
      const items = await getNearbyRecommendations(
        {
          lat: anchor[0],
          lng: anchor[1],
          date: selectedDay.date,
          timeLocal: toInputClock(),
          category,
          radiusMeters: 2500,
        },
        session.token,
      );

      setRecommendations(items);
      setStatusMessage(`Loaded ${items.length} ${CATEGORY_LABEL[category].toLowerCase()} recommendations.`);
    } catch (error) {
      setRecommendationError((error as Error).message || 'Recommendation lookup failed');
    } finally {
      setRecommendationLoading(false);
    }
  }

  async function submitChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !chatQuestion.trim()) return;

    const active = whereAmIItem;
    const context: ChatContext = {
      date: selectedDay.date,
      region: selectedDay.region,
      activeItemTitle: active?.title || null,
      activeItemLocation: active?.location || null,
      lat: whereAmI.currentLatLng?.[0] ?? null,
      lng: whereAmI.currentLatLng?.[1] ?? null,
    };

    setChatLoading(true);
    setChatError(null);

    try {
      const response = await askRecommendationChat(
        {
          question: chatQuestion.trim(),
          context,
          nearby: recommendations,
        },
        session.token,
      );

      setChatAnswer(response.answer);
      if (response.highlights.length > 0) {
        setRecommendations(response.highlights);
      }
      setChatQuestion('');
    } catch (error) {
      setChatError((error as Error).message || 'Chat request failed');
    } finally {
      setChatLoading(false);
    }
  }

  if (!session) {
    return (
      <main className="unlock-shell">
        <section className="unlock-card">
          <h1>Parents Trip Companion</h1>
          <p>Enter your family passcode to open the trip site.</p>
          <form onSubmit={handleUnlock}>
            <label htmlFor="passcode">Passcode</label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              required
            />
            <button type="submit" disabled={unlockPending}>
              {unlockPending ? 'Unlocking...' : 'Unlock'}
            </button>
            {unlockError ? <p className="error-text">{unlockError}</p> : null}
          </form>
          <p className="hint">API: {getApiBaseUrl()}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="layout">
      <header className="topbar">
        <div>
          <h1>{tripPlan.tripName}</h1>
          <p>
            {tripPlan.startDate} to {tripPlan.endDate} | Local-first itinerary companion
          </p>
        </div>
        <div className="topbar-actions">
          <button onClick={() => setAutoLocateEnabled((prev) => !prev)}>
            {autoLocateEnabled ? 'Pause Auto Locate' : 'Locate + Auto Refresh'}
          </button>
          <button onClick={logout}>Lock</button>
        </div>
      </header>

      <nav className="app-tab-strip" aria-label="Primary view tabs">
        {(['trip_overview', 'day_detail'] as AppViewTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`app-tab ${activeAppTab === tab ? 'active' : ''}`}
            onClick={() => setAppTab(tab)}
          >
            {APP_TAB_LABEL[tab]}
          </button>
        ))}
      </nav>

      {activeAppTab === 'trip_overview' ? (
        <section className="trip-overview-grid">
          <article className="card">
            <h2>Trip Timeline</h2>
            <p>Jump by date or region. The map shows the full trip path.</p>
            <div className="row">
              <label htmlFor="overview-day-select">Date jump</label>
              <select
                id="overview-day-select"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              >
                {tripPlan.days.map((day) => (
                  <option key={day.date} value={day.date}>
                    {formatDateLabel(day.date)} - {day.region}
                  </option>
                ))}
              </select>
            </div>
            <div className="row">
              <label htmlFor="overview-region-select">Region jump</label>
              <select
                id="overview-region-select"
                value={selectedDay.region}
                onChange={(event) => {
                  const next = tripPlan.days.find((day) => day.region === event.target.value);
                  if (next) setSelectedDate(next.date);
                }}
              >
                {[...new Set(tripPlan.days.map((day) => day.region))].map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </article>

          <article className="card">
            <h2>Region Legs</h2>
            <ul className="region-overview-list">
              {regionSegments.map((segment) => (
                <li key={segment.id} className="region-row">
                  <div>
                    <strong>{segment.region}</strong>
                    <p>
                      {formatDateLabel(segment.startDate)} to {formatDateLabel(segment.endDate)} ({segment.days}{' '}
                      {segment.days === 1 ? 'day' : 'days'})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(segment.startDate);
                      setAppTab('day_detail');
                      if (isMobile) setMobilePanel('plan');
                    }}
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : (
        <>
          {isMobile ? (
            <nav className="mobile-panel-strip" aria-label="Mobile quick tabs">
              {(['now', 'map', 'plan', 'recs'] as MobilePanel[]).map((panel) => (
                <button
                  key={panel}
                  type="button"
                  className={`mobile-panel-btn ${activeMobilePanel === panel ? 'active' : ''}`}
                  onClick={() => setMobilePanel(panel)}
                >
                  {MOBILE_PANEL_LABEL[panel]}
                </button>
              ))}
            </nav>
          ) : null}

          <section className="dashboard-grid">
            <article className={`card ${panelHiddenClass('now')}`}>
              <h2>Today</h2>
              <div className="row">
                <label htmlFor="day-select">Date</label>
                <select id="day-select" value={selectedDate} onChange={(event) => selectDateForDayMap(event.target.value)}>
                  {tripPlan.days.map((day) => (
                    <option key={day.date} value={day.date}>
                      {formatDateLabel(day.date)} - {day.region}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <label htmlFor="region-select">Region jump</label>
                <select
                  id="region-select"
                  value={selectedDay.region}
                  onChange={(event) => {
                    const next = tripPlan.days.find((day) => day.region === event.target.value);
                    if (next) selectDateForDayMap(next.date);
                  }}
                >
                  {[...new Set(tripPlan.days.map((day) => day.region))].map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pill-row">
                <span className={`pill ${whereAmI.confidence}`}>Where am I: {whereAmI.confidence}</span>
                <span className="pill">Mode: {whereAmI.mode}</span>
              </div>

              <h3>Now</h3>
              <p>{nowAndNext.current ? `${nowAndNext.current.title} (${nowAndNext.current.location})` : 'No active block'}</p>
              <h3>Next Up</h3>
              <p>{nowAndNext.next ? `${nowAndNext.next.title} (${nowAndNext.next.startTime})` : 'No upcoming block'}</p>
            </article>

            <article className={`card ${panelHiddenClass('plan')}`}>
              <h2>Day Timeline</h2>
              <div className="toggle-row">
                <button
                  className={selectedDay.activeView === 'detail' ? 'active' : ''}
                  disabled={selectedDay.detailItems.length === 0}
                  onClick={() => setDayViewMode(selectedDay.date, 'detail')}
                >
                  Detailed Plan
                </button>
                <button
                  className={selectedDay.activeView === 'summary' ? 'active' : ''}
                  onClick={() => setDayViewMode(selectedDay.date, 'summary')}
                >
                  Trip Summary
                </button>
              </div>
              <ol className="timeline-list">
                {selectedItems.map((item) => (
                  <li key={item.id} className={item.id === whereAmI.activeItemId ? 'is-current' : ''}>
                    <div className="time">
                      {item.startTime}
                      {item.endTime ? `-${item.endTime}` : '+'}
                    </div>
                    <div className="body">
                      <strong>{item.title}</strong>
                      <p>{item.location}</p>
                      <small>{item.notes}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </article>

            <article className={`card ${panelHiddenClass('now')}`}>
              <h2>Where Are They?</h2>
              <p>Use manual override if GPS is denied or inaccurate.</p>
              <div className="row">
                <label htmlFor="manual-day">Day</label>
                <select id="manual-day" value={manualDayId} onChange={(event) => setManualDayId(event.target.value)}>
                  <option value="">Select day</option>
                  {tripPlan.days.map((day) => (
                    <option key={day.date} value={day.date}>
                      {formatDateLabel(day.date)} - {day.region}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row">
                <label htmlFor="manual-item">Stop/Item</label>
                <select id="manual-item" value={manualItemId} onChange={(event) => setManualItemId(event.target.value)}>
                  <option value="">Auto choose</option>
                  {itemOptionsForManual.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.startTime} {item.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="button-row">
                <button onClick={setManualOverride} disabled={!manualDayId}>
                  Apply Manual Override
                </button>
                <button onClick={clearManualOverride}>Use Auto Detection</button>
              </div>
            </article>

            <article className={`card ${panelHiddenClass('recs')}`}>
              <h2>Quick Recommendations</h2>
              <div className="button-row">
                {(['sights', 'food', 'coffee', 'rest'] as RecCategory[]).map((category) => (
                  <button
                    key={category}
                    className={activeCategory === category ? 'active' : ''}
                    onClick={() => fetchRecommendations(category)}
                    disabled={recommendationLoading}
                  >
                    {CATEGORY_LABEL[category]}
                  </button>
                ))}
              </div>
              {recommendationError ? <p className="error-text">{recommendationError}</p> : null}
              <ul className="recommendation-list">
                {recommendations.map((item) => (
                  <li key={item.placeId}>
                    <strong>{item.name}</strong>
                    <span>
                      {item.distanceMeters}m | {item.rating ? `⭐ ${item.rating}` : 'No rating'} |{' '}
                      {item.openNow === null ? 'Hours unknown' : item.openNow ? 'Open now' : 'Closed now'}
                    </span>
                    <a href={item.mapsUrl} target="_blank" rel="noreferrer">
                      Open map
                    </a>
                  </li>
                ))}
              </ul>
            </article>

            <article className={`card ${panelHiddenClass('recs')}`}>
              <h2>Ask Live Suggestions</h2>
              <form onSubmit={submitChat} className="chat-form">
                <textarea
                  value={chatQuestion}
                  onChange={(event) => setChatQuestion(event.target.value)}
                  placeholder="Ask: What should we see nearby for the next 2 hours?"
                  required
                />
                <button type="submit" disabled={chatLoading}>
                  {chatLoading ? 'Thinking...' : 'Ask'}
                </button>
              </form>
              {chatError ? <p className="error-text">{chatError}</p> : null}
              {chatAnswer ? <p className="chat-answer">{chatAnswer}</p> : null}
            </article>

            <article className={`card ${panelHiddenClass('plan')}`}>
              <h2>Upload Detailed Itinerary</h2>
              <p>Supported: PDF, DOCX, DOC, TXT. Review before save is required.</p>
              <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleExtractUpload} disabled={extracting} />
              {extracting ? <p>Parsing document...</p> : null}
              {uploadError ? <p className="error-text">{uploadError}</p> : null}

              {pendingPatch ? (
                <div className="review-box">
                  <p>
                    <strong>{pendingPatch.fileName}</strong> ({pendingPatch.documentId})
                  </p>
                  <p>
                    Confidence: {Math.round(pendingPatch.patch.parseConfidence * 100)}% | Days added:{' '}
                    {pendingPatch.patch.daysAdded.length} | Days updated: {pendingPatch.patch.daysUpdated.length}
                  </p>
                  {pendingPatch.warnings.length > 0 ? (
                    <ul>
                      {pendingPatch.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="button-row">
                    <button onClick={applyPendingPatch}>Apply Merge</button>
                    <button onClick={discardPendingPatch}>Discard</button>
                  </div>
                </div>
              ) : null}
            </article>
          </section>
        </>
      )}

      <section className={`map-shell card ${panelHiddenClass('map')}`}>
        <h2>Trip Map</h2>
        <div className="map-scope-toggle" role="tablist" aria-label="Map scope">
          {(['day', 'trip'] as MapScope[]).map((scope) => (
            <button
              key={scope}
              type="button"
              className={mapScope === scope ? 'active' : ''}
              onClick={() => setMapScope(scope)}
              aria-pressed={mapScope === scope}
            >
              {MAP_SCOPE_LABEL[scope]}
            </button>
          ))}
        </div>
        <p className="map-meta">
          {mapScope === 'trip'
            ? 'Full-trip overview. Use Selected Day to zoom in quickly.'
            : `Focused on ${formatDateLabel(selectedDate)} (${selectedDay.region}).`}
        </p>

        <div className="map-status" role="status" aria-live="polite">
          {mapStatus === 'initializing' ? <span>Loading map...</span> : null}
          {mapStatus === 'ready' ? <span>Map ready</span> : null}
        </div>

        {mapStatus === 'error' ? (
          <div className="map-error">
            <p>{mapError || 'Map failed to load.'}</p>
            <button className="map-retry-btn" type="button" onClick={retryMapInit}>
              Retry Map
            </button>
          </div>
        ) : null}

        <div
          ref={mapElementRef}
          className={`map ${mapStatus === 'error' ? 'is-disabled' : ''}`}
          aria-label="Trip map"
        />
      </section>

      <footer className="status-row">
        <span>{statusMessage}</span>
        <span>Session expires: {new Date(session.expiresAt).toLocaleString()}</span>
      </footer>
    </main>
  );
}

export function sourceDocumentIdFromName(fileName: string) {
  return `${slugify(fileName)}-${Date.now()}`;
}
