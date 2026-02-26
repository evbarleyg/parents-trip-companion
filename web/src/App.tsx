import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import {
  extractDocument,
  getRuntimeCapabilities,
  unlockPasscode,
} from './lib/api';
import { resolvePublicAssetUrl } from './lib/asset-url';
import { buildSeedTripPlan, seedTripPlan } from './data/seedTrip';
import { formatDateLabel, slugify } from './lib/format';
import { getTodayInTripRange } from './lib/date';
import { dayHasPhotos, dayOptionLabel } from './lib/day';
import { detectWhereAmI } from './lib/location';
import { applyTripPatch } from './lib/merge';
import { ensureOpenSession } from './lib/session';
import { trackEvent } from './lib/telemetry';
import {
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
import {
  getDefaultMapScopes,
  MAP_SCOPE_BY_TAB,
  type MapScopeByTab,
  type MapScope,
  resolveMapScopeForTab,
} from './lib/view-state';
import {
  resolveActiveMapScope,
  transitionMapScopeFromControl,
  transitionToDate,
  transitionToDayDetails,
  transitionToTab,
  transitionToToday,
} from './lib/navigation';
import type {
  AppViewTab,
  CapabilitiesResponse,
  TripActualMoment,
  TripActualPhoto,
  TripActualVideo,
  MapStatus,
  MobilePanel,
  SourceDocument,
  TripDay,
  TripPatch,
  TripPlan,
  UiAlert,
  UnlockResponse,
  ViewMode,
  WhereAmIState,
} from './types';

const GEO_REFRESH_MS = 5 * 60 * 1000;
const MOBILE_BREAKPOINT = 980;

const APP_TAB_LABEL: Record<AppViewTab, string> = {
  trip_overview: 'Full Trip',
  day_detail: 'Day Details',
  photo_gallery: 'Photo Gallery',
};

const MOBILE_PANEL_LABEL: Record<MobilePanel, string> = {
  map: 'Map',
  plan: 'Plan',
};

type LeafletModule = typeof import('leaflet');

const MAP_SCOPE_LABEL: Record<MapScope, string> = {
  day: 'Day Focus',
  trip: 'Route Overview',
};

interface RegionSegment {
  id: string;
  region: string;
  startDate: string;
  endDate: string;
  days: number;
}

interface MapStop {
  id: string;
  date: string;
  label: string;
  region: string;
  lat: number;
  lng: number;
}

interface ActualMomentRow {
  date: string;
  moment: TripActualMoment;
}

interface DayAnnotationRow {
  id: string;
  tag: string;
  source: string;
  whenLabel: string;
  text: string;
}

type PhotoScope = 'selected_day' | 'full_trip';

const REMOVED_PHOTO_FILE_MARKERS = ['img_4017.jpeg', 'img_4024.jpeg', 'img_4041.jpeg'];
const PHOTO_SRC_CANONICAL_ALIASES: Record<string, string> = {
  '/actuals/img-1126-2.jpeg': '/actuals/img-1126.jpeg',
};

function normalizePhotoSrc(src: string): string {
  const normalized = src.trim().toLowerCase();
  return PHOTO_SRC_CANONICAL_ALIASES[normalized] || normalized;
}

function canonicalPhotoSrc(src: string): string {
  const normalized = src.trim().toLowerCase();
  return PHOTO_SRC_CANONICAL_ALIASES[normalized] || src;
}

function shouldRemovePhotoByMarker(photo: { src: string; alt: string; caption: string }): boolean {
  const search = `${photo.src} ${photo.alt} ${photo.caption}`.toLowerCase();
  return REMOVED_PHOTO_FILE_MARKERS.some((marker) => search.includes(marker));
}

function hasMomentMedia(moment: TripActualMoment): boolean {
  return moment.photos.length > 0 || (moment.videos?.length ?? 0) > 0;
}

function mapScopeStopLimit(scope: MapScope): number {
  return scope === 'trip' ? 20 : 12;
}

function shouldUseCanvasRenderer(): boolean {
  if (typeof navigator === 'undefined') return true;
  return !/jsdom/i.test(navigator.userAgent || '');
}

function annotationTagFromSource(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized.includes('dad updates')) return 'Dad note';
  if (normalized.includes('mom updates')) return 'Mom note';
  return 'Family note';
}

function sanitizeActualMoments(moments: TripActualMoment[] | undefined): TripActualMoment[] {
  if (!moments || moments.length === 0) return [];

  return moments
    .map((moment) => ({
      ...moment,
      photos: dedupePhotos(moment.photos.filter((photo) => !shouldRemovePhotoByMarker(photo))),
      videos: dedupeVideos(moment.videos || []),
    }))
    .filter((moment) => {
      if (hasMomentMedia(moment)) return true;
      const searchable = `${moment.text} ${moment.whenLabel} ${moment.source}`.toLowerCase();
      return !REMOVED_PHOTO_FILE_MARKERS.some((marker) => searchable.includes(marker));
    });
}

function dedupePhotos(photos: TripActualPhoto[]): TripActualPhoto[] {
  const seen = new Set<string>();
  const deduped: TripActualPhoto[] = [];

  for (const photo of photos) {
    const key = photo.src ? normalizePhotoSrc(photo.src) : photo.id || '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(photo);
  }

  return deduped;
}

function dedupeVideos(videos: TripActualVideo[]): TripActualVideo[] {
  const seen = new Set<string>();
  const deduped: TripActualVideo[] = [];

  for (const video of videos) {
    const key = video.src ? video.src.trim().toLowerCase() : video.id || '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(video);
  }

  return deduped;
}

function mergeActualMoments(
  restoredMoments: TripActualMoment[] | undefined,
  seedMoments: TripActualMoment[] | undefined,
): TripActualMoment[] {
  const mergedById = new Map<string, TripActualMoment>();

  // Restore first, then fold in seed so stale local cache cannot hide newer shipped photos.
  for (const moment of [...sanitizeActualMoments(restoredMoments), ...sanitizeActualMoments(seedMoments)]) {
    const existing = mergedById.get(moment.id);
    if (!existing) {
      mergedById.set(moment.id, moment);
      continue;
    }

    mergedById.set(moment.id, {
      ...existing,
      ...moment,
      photos: dedupePhotos([...existing.photos, ...moment.photos]),
      videos: dedupeVideos([...(existing.videos || []), ...(moment.videos || [])]),
    });
  }

  return [...mergedById.values()];
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

function parseTripDateMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function blendHexColors(startHex: string, endHex: string, ratio: number): string {
  const t = clamp01(ratio);
  const start = Number.parseInt(startHex.slice(1), 16);
  const end = Number.parseInt(endHex.slice(1), 16);

  const sr = (start >> 16) & 0xff;
  const sg = (start >> 8) & 0xff;
  const sb = start & 0xff;

  const er = (end >> 16) & 0xff;
  const eg = (end >> 8) & 0xff;
  const eb = end & 0xff;

  const r = Math.round(sr + (er - sr) * t);
  const g = Math.round(sg + (eg - sg) * t);
  const b = Math.round(sb + (eb - sb) * t);

  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function seasonalTripLineColor(date: string, startDate: string, endDate: string): string {
  const winter = '#5e7fb4';
  const thaw = '#5aa7ba';
  const spring = '#78c56f';

  const startMs = parseTripDateMs(startDate);
  const endMs = parseTripDateMs(endDate);
  const dateMs = parseTripDateMs(date);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || !Number.isFinite(dateMs) || endMs <= startMs) {
    return thaw;
  }

  const progress = clamp01((dateMs - startMs) / (endMs - startMs));
  if (progress <= 0.5) {
    return blendHexColors(winter, thaw, progress / 0.5);
  }

  return blendHexColors(thaw, spring, (progress - 0.5) / 0.5);
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

function hydratePlanWithSeedData(plan: TripPlan, seed: TripPlan): TripPlan {
  const seedDaysByDate = new Map(seed.days.map((day) => [day.date, day]));

  return {
    ...plan,
    tripName: seed.tripName,
    startDate: seed.startDate,
    endDate: seed.endDate,
    timezone: plan.timezone || seed.timezone,
    days: plan.days.map((day) => {
      const seedDay = seedDaysByDate.get(day.date);
      return {
        ...day,
        actualMoments: mergeActualMoments(day.actualMoments, seedDay?.actualMoments),
      };
    }),
  };
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

const AUTO_UNLOCK_PASSCODE = 'SusanJim2026';
export function App() {
  const [session, setSession] = useState<UnlockResponse>(() => ensureOpenSession(loadSession, saveSession));
  const [runtimeCapabilities, setRuntimeCapabilities] = useState<CapabilitiesResponse>({
    mode: 'fallback',
    features: {
      extract: false,
      recommendations: true,
      chat: true,
    },
  });
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [uiAlert, setUiAlert] = useState<UiAlert | null>(null);

  const initialPlan = useMemo(() => {
    const seedPlan = buildSeedTripPlan();
    const restored = loadTripPlanState();
    const viewModes = loadDayViewModes();
    const basePlan = restored ? hydratePlanWithSeedData(restored, seedPlan) : seedPlan;
    return applyStoredViewModes(basePlan, viewModes);
  }, []);

  const [tripPlan, setTripPlan] = useState<TripPlan>(initialPlan || seedTripPlan);
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayInTripRange(initialPlan));
  const [whereAmI, setWhereAmI] = useState<WhereAmIState>(() => defaultWhereAmI(selectedDate));
  const [autoLocateEnabled, setAutoLocateEnabled] = useState(false);
  const [manualDayId, setManualDayId] = useState<string>(selectedDate);
  const [manualItemId, setManualItemId] = useState<string>('');

  const initialAppTab = useMemo(() => loadAppViewTab(), []);
  const [activeAppTab, setActiveAppTabState] = useState<AppViewTab>(initialAppTab);
  const [photoScope, setPhotoScope] = useState<PhotoScope>('selected_day');
  const [activeMobilePanel, setActiveMobilePanelState] = useState<MobilePanel>(() => loadMobilePanel());
  const [mapScopeByTab, setMapScopeByTab] = useState<MapScopeByTab>(() => {
    const defaults = getDefaultMapScopes();
    defaults[initialAppTab] = resolveMapScopeForTab(initialAppTab, {});
    return defaults;
  });
  const activeMapScope = resolveActiveMapScope(activeAppTab, mapScopeByTab);
  const mapStyle = 'hybrid';
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  });

  const [mapStatus, setMapStatus] = useState<MapStatus>('initializing');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapMountVersion, setMapMountVersion] = useState(0);
  const [leafletModule, setLeafletModule] = useState<LeafletModule | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingPatch, setPendingPatch] = useState<{
    documentId: string;
    fileName: string;
    warnings: string[];
    patch: TripPatch;
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<string>('Ready');

  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const roadBaseLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const satelliteLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const roadOverlayLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
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

  const manualDay = useMemo(() => tripPlan.days.find((day) => day.date === manualDayId), [tripPlan.days, manualDayId]);
  const itemOptionsForManual = manualDay ? [...manualDay.summaryItems, ...manualDay.detailItems] : [];
  const extractEnabled = runtimeCapabilities.features.extract;
  const dayModeLabel = selectedDay.activeView === 'detail' ? 'Detailed Plan' : 'Trip Summary';
  const locateButtonLabel = isMobile
    ? autoLocateEnabled
      ? 'Pause Locate'
      : 'Locate'
    : autoLocateEnabled
      ? 'Pause Auto Locate'
      : 'Locate + Auto Refresh';
  const selectedActualMoments = selectedDay.actualMoments || [];
  const selectedDayAnnotations = useMemo<DayAnnotationRow[]>(
    () =>
      selectedActualMoments
        .filter((moment) => moment.source.toLowerCase().includes('updates') && moment.text.trim().length > 0)
        .map((moment) => ({
          id: moment.id,
          tag: annotationTagFromSource(moment.source),
          source: moment.source,
          whenLabel: moment.whenLabel,
          text: moment.text,
        })),
    [selectedActualMoments],
  );
  const selectedActualMomentRows = useMemo(
    () => selectedActualMoments.map((moment) => ({ date: selectedDate, moment })),
    [selectedDate, selectedActualMoments],
  );
  const selectedDayPhotoRows = useMemo(
    () => selectedActualMomentRows.filter((row) => hasMomentMedia(row.moment)),
    [selectedActualMomentRows],
  );
  const selectedDateMs = useMemo(() => parseTripDateMs(selectedDate), [selectedDate]);
  const photoDates = useMemo(
    () => new Set(tripPlan.days.filter((day) => dayHasPhotos(day)).map((day) => day.date)),
    [tripPlan.days],
  );
  const tripPhotoMomentRows = useMemo(
    () =>
      tripPlan.days
        .flatMap((day) =>
          (day.actualMoments || [])
            .filter((moment) => hasMomentMedia(moment))
            .map((moment) => ({ date: day.date, moment })),
        )
      .sort((a, b) => b.date.localeCompare(a.date)),
    [tripPlan.days],
  );
  const fullTripPhotoRows = useMemo(() => tripPhotoMomentRows, [tripPhotoMomentRows]);
  const nearbyTripPhotoRows = useMemo(() => {
    const hasSelectedTimestamp = Number.isFinite(selectedDateMs);

    return tripPhotoMomentRows
      .filter((row) => row.date !== selectedDate)
      .sort((a, b) => {
        if (!hasSelectedTimestamp) return b.date.localeCompare(a.date);

        const aDistance = Math.abs(parseTripDateMs(a.date) - selectedDateMs);
        const bDistance = Math.abs(parseTripDateMs(b.date) - selectedDateMs);
        if (aDistance === bDistance) return b.date.localeCompare(a.date);
        return aDistance - bDistance;
      });
  }, [selectedDate, selectedDateMs, tripPhotoMomentRows]);
  const mainPagePhotoRows = useMemo(
    () => (selectedDayPhotoRows.length > 0 ? selectedDayPhotoRows : nearbyTripPhotoRows.slice(0, 20)),
    [nearbyTripPhotoRows, selectedDayPhotoRows],
  );
  const mainPageUsesNearbyFallback = selectedDayPhotoRows.length === 0 && mainPagePhotoRows.length > 0;
  const galleryPhotoRows = useMemo(
    () => (photoScope === 'selected_day' ? selectedDayPhotoRows : fullTripPhotoRows),
    [fullTripPhotoRows, photoScope, selectedDayPhotoRows],
  );

  const mapStops = useMemo<MapStop[]>(() => {
    if (activeMapScope === 'day') {
      return selectedItems
        .filter((item) => typeof item.lat === 'number' && typeof item.lng === 'number')
        .map((item) => ({
          id: item.id,
          date: selectedDay.date,
          label: item.title,
          region: selectedDay.region,
          lat: item.lat as number,
          lng: item.lng as number,
        }));
    }

    return tripPlan.days
      .map((day) => {
        const firstWithCoords = getActiveItems(day).find(
          (item) => typeof item.lat === 'number' && typeof item.lng === 'number',
        );
        if (!firstWithCoords) return null;
        return {
          id: `${day.date}-${firstWithCoords.id}`,
          date: day.date,
          label: firstWithCoords.title,
          region: day.region,
          lat: firstWithCoords.lat as number,
          lng: firstWithCoords.lng as number,
        } satisfies MapStop;
      })
      .filter((stop): stop is MapStop => Boolean(stop));
  }, [activeMapScope, selectedItems, selectedDay.date, selectedDay.region, tripPlan.days]);

  function postAlert(level: UiAlert['level'], message: string, scope?: string) {
    setUiAlert({ level, message, scope });
    setStatusMessage(message);
  }

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

  function applyNavigation(next: ReturnType<typeof transitionToDate>) {
    if (next.selectedDate !== selectedDate) setSelectedDate(next.selectedDate);
    if (next.activeAppTab !== activeAppTab) {
      setActiveAppTabState(next.activeAppTab);
      saveAppViewTab(next.activeAppTab);
    }

    if (next.mapScopeByTab !== mapScopeByTab) {
      setMapScopeByTab(next.mapScopeByTab);
    }
  }

  function setAppTab(tab: AppViewTab) {
    const next = transitionToTab(
      {
        activeAppTab,
        selectedDate,
        mapScopeByTab,
      },
      tab,
    );
    applyNavigation(next);
  }

  function setMobilePanel(panel: MobilePanel) {
    setActiveMobilePanelState(panel);
    saveMobilePanel(panel);
  }

  function setDateOnly(date: string) {
    const next = transitionToDate(
      {
        activeAppTab,
        selectedDate,
        mapScopeByTab,
      },
      date,
    );
    applyNavigation(next);
  }

  function setDateAndOpenDayDetail(date: string, mobilePanelOnMobile: MobilePanel = 'plan') {
    const next = transitionToDayDetails(
      {
        activeAppTab,
        selectedDate,
        mapScopeByTab,
      },
      date,
    );
    applyNavigation(next);
    const nextScope = resolveActiveMapScope(next.activeAppTab, next.mapScopeByTab);
    if (isMobile) {
      setMobilePanel(mobilePanelOnMobile);
    }
    return nextScope;
  }

  function goToToday() {
    const next = transitionToToday(
      {
        activeAppTab,
        selectedDate,
        mapScopeByTab,
      },
      todayDate,
    );
    applyNavigation(next);
    postAlert('info', `Jumped to ${formatDateLabel(todayDate)}.`);
  }

  function setMapScopeForActiveTab(scope: MapScope) {
    const next = transitionMapScopeFromControl(
      {
        activeAppTab,
        selectedDate,
        mapScopeByTab,
      },
      scope,
    );
    applyNavigation(next);
  }

  function retryMapInit() {
    setMapError(null);
    setMapStatus('initializing');
    setMapMountVersion((prev) => prev + 1);
  }

  function focusMapStop(stop: MapStop) {
    const scope = setDateAndOpenDayDetail(stop.date, 'map');

    if (!mapRef.current) return;

    mapRef.current.setView([stop.lat, stop.lng], scope === 'trip' ? 8 : 11, {
      animate: true,
    });
    setStatusMessage(`Focused map on ${stop.label}.`);
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

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', apply);
      return () => {
        media.removeEventListener('change', apply);
      };
    }

    // Safari legacy fallback (pre-addEventListener on MediaQueryList)
    const legacyMedia = media as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    legacyMedia.addListener?.(apply as (event: MediaQueryListEvent) => void);
    return () => {
      legacyMedia.removeListener?.(apply as (event: MediaQueryListEvent) => void);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCapabilities() {
      setRuntimeLoading(true);
      const next = await getRuntimeCapabilities();
      if (cancelled) return;
      setRuntimeCapabilities(next);
      setRuntimeLoading(false);
    }

    void loadCapabilities();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshSessionToken() {
      try {
        const next = await unlockPasscode(AUTO_UNLOCK_PASSCODE);
        if (cancelled) return;
        setSession(next);
        saveSession(next);
        trackEvent('auto_unlock_success');
      } catch (error) {
        if (cancelled) return;
        const message = (error as Error).message || 'Automatic unlock failed.';
        postAlert('warn', `Automatic live auth is unavailable: ${message}`);
        trackEvent('auto_unlock_failure');
      }
    }

    void refreshSessionToken();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (leafletModule) return;

    let cancelled = false;
    setMapStatus('initializing');
    setMapError(null);

    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      .then(([module]) => {
        if (cancelled) return;
        const normalized =
          ((module as unknown as { default?: LeafletModule }).default as LeafletModule | undefined) || module;
        setLeafletModule(normalized);
      })
      .catch(() => {
        if (cancelled) return;
        setMapStatus('error');
        setMapError('Unable to load map library.');
        postAlert('error', 'Unable to load map library.');
        trackEvent('map_error');
      });

    return () => {
      cancelled = true;
    };
  }, [leafletModule]);

  useEffect(() => {
    if (!leafletModule) return;
    const container = mapElementRef.current;
    if (!container) {
      return;
    }

    if (mapRef.current && mapContainerRef.current === container) {
      return;
    }

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    }

    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;

    mapContainerRef.current = container;

    const L = leafletModule;
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
          // JSDOM test runs cannot provide a full canvas context for Leaflet vector layers.
          preferCanvas: shouldUseCanvasRenderer(),
        }).setView([26, 20], 3);

        const roadBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        });
        const satelliteLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles &copy; Esri',
          },
        );
        const roadOverlayLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          opacity: 0.38,
        });

        roadBaseLayer.addTo(map);

        const markerLayer = L.layerGroup().addTo(map);
        mapRef.current = map;
        markerLayerRef.current = markerLayer;
        roadBaseLayerRef.current = roadBaseLayer;
        satelliteLayerRef.current = satelliteLayer;
        roadOverlayLayerRef.current = roadOverlayLayer;

        settleRafId = window.requestAnimationFrame(() => {
          if (cancelled) return;
          invalidateMap();
          setMapStatus('ready');
          trackEvent('map_ready');
        });
      } catch (error) {
        setMapStatus('error');
        setMapError((error as Error).message || 'Unable to initialize map.');
        postAlert('error', 'Unable to initialize map.');
        trackEvent('map_error');
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
      roadBaseLayerRef.current = null;
      satelliteLayerRef.current = null;
      roadOverlayLayerRef.current = null;
      if (mapContainerRef.current === container) {
        mapContainerRef.current = null;
      }
    };
  }, [leafletModule, mapMountVersion, invalidateMap]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current) return;

    const map = mapRef.current;
    const roadBaseLayer = roadBaseLayerRef.current;
    const satelliteLayer = satelliteLayerRef.current;
    const roadOverlayLayer = roadOverlayLayerRef.current;
    if (!roadBaseLayer || !satelliteLayer || !roadOverlayLayer) return;

    if (map.hasLayer(roadBaseLayer)) map.removeLayer(roadBaseLayer);
    if (!map.hasLayer(satelliteLayer)) map.addLayer(satelliteLayer);
    if (!map.hasLayer(roadOverlayLayer)) map.addLayer(roadOverlayLayer);
  }, [mapStatus, mapStyle]);

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
    if (!leafletModule || mapStatus !== 'ready' || !mapRef.current || !markerLayerRef.current) return;
    const L = leafletModule;

    markerLayerRef.current.clearLayers();

    const bounds = L.latLngBounds([]);
    const todayRegionBounds = L.latLngBounds([]);
    const selectedDayBounds = L.latLngBounds([]);
    const selectedDayCoords: [number, number][] = [];

    for (const day of tripPlan.days) {
      const items = getActiveItems(day);
      const color = regionColor(day.region);
      const fullTripLineColor = seasonalTripLineColor(day.date, tripPlan.startDate, tripPlan.endDate);
      const isSelectedDate = day.date === selectedDate;
      const isTodayDate = day.date === todayDate;
      const hasPhotos = dayHasPhotos(day);

      const coords = items
        .filter((item) => typeof item.lat === 'number' && typeof item.lng === 'number')
        .map((item) => [item.lat as number, item.lng as number] as [number, number]);

      coords.forEach((coord, idx) => {
        const marker = L.circleMarker(coord, {
          radius: isSelectedDate ? 7 : isTodayDate ? 6 : 4,
          color: '#ffffff',
          weight: isSelectedDate || isTodayDate ? 2 : 1,
          fillColor: isTodayDate ? '#d0722b' : color,
          fillOpacity: isSelectedDate ? 0.97 : isTodayDate ? 0.9 : 0.55,
        });

        marker.bindPopup(
          `<b>${formatDateLabel(day.date)}</b>${isTodayDate ? ' (Today)' : ''}${hasPhotos ? ' (Photos)' : ''}<br/>${day.region}<br/>${items[idx]?.title || 'Itinerary stop'}`,
        );
        marker.bindTooltip(
          `<strong>${formatDateLabel(day.date)}${isTodayDate ? ' - Today' : ''}${hasPhotos ? ' - Photos' : ''}</strong><br/>${day.region}<br/>${items[idx]?.title || 'Itinerary stop'}`,
          {
            direction: 'top',
            sticky: true,
            opacity: 0.95,
            className: 'map-tooltip',
          },
        );

        marker.on('click', () => {
          setDateAndOpenDayDetail(day.date);
        });

        markerLayerRef.current?.addLayer(marker);
        bounds.extend(coord);
        if (day.region === todayRegion) {
          todayRegionBounds.extend(coord);
        }
        if (day.date === selectedDate) {
          selectedDayBounds.extend(coord);
          selectedDayCoords.push(coord);
        }
      });

      if (coords.length >= 2) {
        if (activeMapScope === 'trip') {
          markerLayerRef.current.addLayer(
            L.polyline(coords, {
              color: fullTripLineColor,
              weight: isSelectedDate || isTodayDate ? 3.2 : 2,
              opacity: isSelectedDate || isTodayDate ? 0.9 : 0.33,
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
        const fitKey = activeMapScope === 'day' ? `day:${selectedDate}` : 'trip';
        if (lastViewportFitKeyRef.current !== fitKey) {
          mapRef.current.stop();

          if (activeMapScope === 'day' && selectedDayBounds.isValid()) {
            if (selectedDayCoords.length === 1) {
              const [lat, lng] = selectedDayCoords[0];
              const currentZoom = mapRef.current.getZoom();
              mapRef.current.flyTo([lat, lng], Math.max(10, Math.min(13, currentZoom)), {
                animate: true,
                duration: 0.75,
              });
            } else {
              mapRef.current.flyToBounds(selectedDayBounds.pad(0.36), {
                padding: [20, 20],
                maxZoom: 12,
              });
            }
            setStatusMessage(`Map focused on ${formatDateLabel(selectedDate)} in ${selectedDay.region}.`);
          } else {
            mapRef.current.flyToBounds(bounds.pad(0.24), {
              padding: [20, 20],
              maxZoom: 5,
            });
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
    activeMapScope,
    isMobile,
    mapStatus,
    invalidateMap,
    leafletModule,
    todayDate,
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

  useEffect(() => {
    if (tripPlan.days.length === 0) return;
    if (manualDayId && tripPlan.days.some((day) => day.date === manualDayId)) return;
    setManualDayId(selectedDate);
  }, [manualDayId, selectedDate, tripPlan.days]);

  useEffect(() => {
    if (!manualDay || itemOptionsForManual.length === 0) {
      if (manualItemId) setManualItemId('');
      return;
    }

    if (!manualItemId || !itemOptionsForManual.some((item) => item.id === manualItemId)) {
      setManualItemId(itemOptionsForManual[0].id);
    }
  }, [itemOptionsForManual, manualDay, manualItemId]);

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

    setDateOnly(day.date);
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
    postAlert('info', `Manual location override applied for ${formatDateLabel(day.date)}.`);
    trackEvent('manual_override_apply');
  }

  function clearManualOverride() {
    setManualDayId(selectedDate);
    setManualItemId('');
    setWhereAmI((prev) => ({ ...prev, mode: prev.currentLatLng ? 'auto' : 'unknown' }));
    postAlert('info', 'Switched back to automatic location detection.');
    trackEvent('manual_override_clear');
  }

  async function handleExtractUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !extractEnabled) return;

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
      if (extracted.warnings.length > 0) {
        postAlert('warn', `Parsed ${file.name} with warnings. Review before applying.`);
      } else {
        postAlert('success', `Parsed ${file.name}. Review changes before applying.`);
      }
      trackEvent('extract_success');
    } catch (error) {
      const message = (error as Error).message || 'Upload parse failed';
      setUploadError(message);
      postAlert('error', message);
      trackEvent('extract_failure');
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
    postAlert('success', `Merged ${source.name}. Detailed days now default to detail view.`);
    trackEvent('merge_apply');

    try {
      await saveSourceDocument(source, JSON.stringify(pendingPatch.patch));
    } catch {
      // Local IndexedDB storage is best-effort only.
    }
  }

  function discardPendingPatch() {
    setPendingPatch(null);
    postAlert('info', 'Import review discarded.');
    trackEvent('merge_discard');
  }

  function renderActualMomentsCard(
    className = '',
    rows: ActualMomentRow[] = [],
    showRecentFallback = false,
  ) {
    return (
      <article className={`card ${className}`.trim()}>
        <h2>Family Photos & Videos</h2>
        <p className="hint">From the B-G-M family thread.</p>
        {showRecentFallback && rows.length > 0 ? (
          <p className="hint">No day media yet. Showing nearby day media.</p>
        ) : null}
        {rows.length === 0 ? (
          <p className="hint">No media yet.</p>
        ) : (
          <ul className="actual-moment-list">
          {rows.map((row) => (
            <li key={`${row.date}-${row.moment.id}`} className="actual-moment">
              <div className="pill-row compact">
                <span className="pill">{row.moment.whenLabel}</span>
                <span className="pill">{row.moment.source}</span>
                {row.date !== selectedDate ? <span className="pill">{formatDateLabel(row.date)}</span> : null}
              </div>
                <p>{row.moment.text}</p>
                {hasMomentMedia(row.moment) ? (
                  <div className="actual-photo-grid">
                    {row.moment.photos.map((photo) => (
                      <figure key={photo.id} className="actual-photo-card">
                        <img
                          src={resolvePublicAssetUrl(canonicalPhotoSrc(photo.src), import.meta.env.BASE_URL)}
                          alt={photo.alt}
                          loading="lazy"
                        />
                        <figcaption>{photo.caption}</figcaption>
                      </figure>
                    ))}
                    {(row.moment.videos || []).map((video) => (
                      <figure key={video.id} className="actual-photo-card">
                        <video
                          controls
                          preload="metadata"
                          playsInline
                          poster={video.poster ? resolvePublicAssetUrl(video.poster, import.meta.env.BASE_URL) : undefined}
                        >
                          <source src={resolvePublicAssetUrl(video.src, import.meta.env.BASE_URL)} />
                        </video>
                        <figcaption>{video.caption}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : null}
            </li>
          ))}
          </ul>
        )}
      </article>
    );
  }

  function renderMapCard(className = '') {
    return (
      <section className={`map-shell card ${className}`.trim()}>
        <h2>Map</h2>
        <div className="map-scope-toggle" role="group" aria-label="Map scope">
          {(['day', 'trip'] as MapScope[]).map((scope) => (
            <button
              key={scope}
              type="button"
              className={activeMapScope === scope ? 'active' : ''}
              onClick={() => setMapScopeForActiveTab(scope)}
              aria-pressed={activeMapScope === scope}
            >
              {MAP_SCOPE_LABEL[scope]}
            </button>
          ))}
        </div>
        <p className="map-meta">
          {activeMapScope === 'trip'
            ? 'Showing all trip days.'
            : `Focused on ${formatDateLabel(selectedDate)} (${selectedDay.region}).`}
        </p>

        <div className="map-status" role="status" aria-live="polite">
          {mapStatus === 'initializing' ? <span>Loading map...</span> : null}
        </div>

        {mapStatus === 'error' ? (
          <div className="map-error">
            <p role="alert">{mapError || 'Map failed to load.'}</p>
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

        <details className="map-stop-shell">
          <summary>Quick map jump ({Math.min(mapStops.length, mapScopeStopLimit(activeMapScope))})</summary>
          <ul className="map-stop-list">
            {mapStops.length === 0 ? (
              <li>
                <span className="hint">No coordinates are mapped for this view.</span>
              </li>
            ) : (
              mapStops.slice(0, mapScopeStopLimit(activeMapScope)).map((stop) => (
                <li key={stop.id}>
                  <div>
                    <strong>{stop.label}</strong>
                    <small>
                      {formatDateLabel(stop.date)} - {stop.region}
                      {stop.date === todayDate ? ' (Today)' : ''}
                      {photoDates.has(stop.date) ? ' (Photos)' : ''}
                    </small>
                  </div>
                  <button type="button" className="secondary-btn" onClick={() => focusMapStop(stop)}>
                    Focus
                  </button>
                </li>
              ))
            )}
          </ul>
        </details>
      </section>
    );
  }

  return (
    <main className="layout">
      <a className="skip-link" href="#primary-content">
        Skip to main content
      </a>
      <header className="topbar">
        <div>
          <h1>{tripPlan.tripName}</h1>
          <p>
            {tripPlan.startDate} to {tripPlan.endDate}
          </p>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            onClick={() => setAutoLocateEnabled((prev) => !prev)}
          >
            {locateButtonLabel}
          </button>
        </div>
      </header>
      <p className="sr-only-status" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      <section className="title-toolbar" aria-label="Trip controls">
        <nav className="toolbar-tabs" aria-label="Primary view tabs">
          {(['trip_overview', 'day_detail', 'photo_gallery'] as AppViewTab[]).map((tab) => (
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

        <div className="toolbar-pill-row">
          {activeAppTab === 'day_detail' || activeAppTab === 'photo_gallery' ? (
            <>
              <details className="toolbar-popover">
                <summary>{formatDateLabel(selectedDate)}</summary>
                <div className="toolbar-popover-body">
                  <label htmlFor="toolbar-day-select">Date</label>
                  <select
                    id="toolbar-day-select"
                    value={selectedDate}
                    onChange={(event) => setDateOnly(event.target.value)}
                  >
                    {tripPlan.days.map((day) => (
                      <option key={day.date} value={day.date}>
                        {dayOptionLabel(day, todayDate)}
                      </option>
                    ))}
                  </select>
                </div>
              </details>

              <details className="toolbar-popover">
                <summary>{selectedDay.region}</summary>
                <div className="toolbar-popover-body">
                  <label htmlFor="toolbar-region-select">Region</label>
                  <select
                    id="toolbar-region-select"
                    value={selectedDay.region}
                    onChange={(event) => {
                      const next = tripPlan.days.find((day) => day.region === event.target.value);
                      if (next) setDateOnly(next.date);
                    }}
                  >
                    {[...new Set(tripPlan.days.map((day) => day.region))].map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
              </details>

              {activeAppTab === 'day_detail' ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setDayViewMode(selectedDay.date, selectedDay.activeView === 'detail' ? 'summary' : 'detail')}
                >
                  {dayModeLabel}
                </button>
              ) : null}
            </>
          ) : null}

          <button type="button" className="secondary-btn" onClick={goToToday} disabled={selectedDate === todayDate}>
            Back to Today
          </button>

          <details className={`toolbar-popover runtime ${runtimeCapabilities.mode}`}>
            <summary>{runtimeCapabilities.mode === 'live' ? 'Live mode' : 'Fallback mode'}</summary>
            <div className="toolbar-popover-body">
              <p>Uploads: {extractEnabled ? 'on' : 'off'}.</p>
            </div>
          </details>

          {uiAlert ? (
            <details className={`toolbar-popover alert ${uiAlert.level}`}>
              <summary>{uiAlert.message}</summary>
              <div className="toolbar-popover-body">
                <button type="button" className="secondary-btn" onClick={() => setUiAlert(null)}>
                  Dismiss
                </button>
              </div>
            </details>
          ) : null}
        </div>

        {activeAppTab === 'day_detail' ? (
          <div className="toolbar-now-row">
            <span>Now: {nowAndNext.current ? nowAndNext.current.title : 'No active block'}</span>
            <span>Next: {nowAndNext.next ? nowAndNext.next.title : 'No upcoming block'}</span>
            <span>Location confidence: {whereAmI.confidence}</span>
          </div>
        ) : null}
      </section>

      <section id="primary-content">
        {activeAppTab === 'day_detail' && isMobile ? (
          <nav className="mobile-panel-strip" aria-label="Mobile quick tabs">
            {(['map', 'plan'] as MobilePanel[]).map((panel) => (
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

        <section className="primary-layout">
          {renderMapCard(`primary-map ${activeAppTab === 'day_detail' ? panelHiddenClass('map') : ''}`)}

          {activeAppTab === 'trip_overview' ? (
            <>
              <section className="trip-overview-grid">
                <article className="card">
                  <h2>Trip Timeline</h2>
                  <p>Jump by date or region.</p>
                  <div className="row">
                    <label htmlFor="overview-day-select">Date jump</label>
                    <select
                      id="overview-day-select"
                      value={selectedDate}
                      onChange={(event) => setDateOnly(event.target.value)}
                    >
                      {tripPlan.days.map((day) => (
                        <option key={day.date} value={day.date}>
                          {dayOptionLabel(day, todayDate)}
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
                        if (next) setDateOnly(next.date);
                      }}
                    >
                      {[...new Set(tripPlan.days.map((day) => day.region))].map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ul className="day-overview-list">
                    {tripPlan.days.map((day) => (
                      <li
                        key={`overview-day-${day.date}`}
                        className={`day-row ${day.date === todayDate ? 'is-today' : ''} ${day.date === selectedDate ? 'is-selected' : ''}`}
                      >
                        <button type="button" className="day-row-button" onClick={() => setDateAndOpenDayDetail(day.date)}>
                          <span>{formatDateLabel(day.date)}</span>
                          <small>{day.region}</small>
                        </button>
                        <div className="day-row-tags">
                          {dayHasPhotos(day) ? <span className="photo-tag">Pics</span> : null}
                          {day.date === todayDate ? <span className="today-tag">Today</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="card">
                  <h2>Region Legs</h2>
                  <ul className="region-overview-list">
                    {regionSegments.map((segment) => (
                      <li
                        key={segment.id}
                        className={`region-row ${todayDate >= segment.startDate && todayDate <= segment.endDate ? 'is-today' : ''}`}
                      >
                        <div>
                          <strong>{segment.region}</strong>
                          <p>
                            {formatDateLabel(segment.startDate)} to {formatDateLabel(segment.endDate)} ({segment.days}{' '}
                            {segment.days === 1 ? 'day' : 'days'})
                          </p>
                          {todayDate >= segment.startDate && todayDate <= segment.endDate ? (
                            <span className="today-tag">Current Region</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDateAndOpenDayDetail(segment.startDate);
                          }}
                        >
                          Open Day
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              </section>
            </>
          ) : activeAppTab === 'photo_gallery' ? (
            <>
              <section className="dashboard-grid secondary-grid single-column">
                <article className="card">
                  <h2>Gallery View</h2>
                  <div className="toggle-row top-photo-scope" role="group" aria-label="Gallery media scope">
                    <button
                      type="button"
                      className={photoScope === 'selected_day' ? 'active' : ''}
                      onClick={() => setPhotoScope('selected_day')}
                    >
                      Selected Day ({selectedDayPhotoRows.length})
                    </button>
                    <button
                      type="button"
                      className={photoScope === 'full_trip' ? 'active' : ''}
                      onClick={() => setPhotoScope('full_trip')}
                    >
                      Full Trip ({fullTripPhotoRows.length})
                    </button>
                  </div>
                  <p className="hint">
                    {photoScope === 'selected_day'
                      ? `${formatDateLabel(selectedDate)} (${selectedDay.region}).`
                      : 'All trip media.'}
                  </p>
                </article>

                {renderActualMomentsCard('', galleryPhotoRows)}
              </section>
            </>
          ) : (
            <>
              <section className="dashboard-grid secondary-grid">
                <article className={`card ${panelHiddenClass('plan')}`}>
                  <h2>Day Timeline</h2>
                  <div className="toggle-row">
                    <button
                      type="button"
                      className={selectedDay.activeView === 'detail' ? 'active' : ''}
                      disabled={selectedDay.detailItems.length === 0}
                      onClick={() => setDayViewMode(selectedDay.date, 'detail')}
                    >
                      Detailed Plan
                    </button>
                    <button
                      type="button"
                      className={selectedDay.activeView === 'summary' ? 'active' : ''}
                      onClick={() => setDayViewMode(selectedDay.date, 'summary')}
                    >
                      Trip Summary
                    </button>
                  </div>
                  <section
                    className={`day-annotations ${selectedDayAnnotations.length === 0 ? 'is-empty' : ''}`}
                    aria-label="Family updates"
                  >
                    <div className="day-annotations-header">
                      <h3>Family Updates</h3>
                      <span className="day-annotations-count">{selectedDayAnnotations.length}</span>
                    </div>
                    <p className="day-annotations-subtitle">Family thread notes.</p>
                    {selectedDayAnnotations.length > 0 ? (
                      <ul className="day-annotation-list">
                        {selectedDayAnnotations.map((annotation) => (
                          <li key={annotation.id}>
                            <div className="day-annotation-meta">
                              <span className="day-annotation-tag">{annotation.tag}</span>
                              <span className="pill">{annotation.whenLabel}</span>
                            </div>
                            <p>{annotation.text}</p>
                            <small>{annotation.source}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="day-annotations-empty">No updates for {formatDateLabel(selectedDate)}.</p>
                    )}
                  </section>
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

                {renderActualMomentsCard(
                  `focus-moments ${panelHiddenClass('plan')}`,
                  mainPagePhotoRows,
                  mainPageUsesNearbyFallback,
                )}
              </section>
            </>
          )}
        </section>

      </section>

      <footer className="status-row">
        <span>{statusMessage}</span>
        <span>{runtimeCapabilities.mode === 'live' ? 'Live services connected' : 'Fallback services active'}</span>
      </footer>
    </main>
  );
}

export function sourceDocumentIdFromName(fileName: string) {
  return `${slugify(fileName)}-${Date.now()}`;
}
