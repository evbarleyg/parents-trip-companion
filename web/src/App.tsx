import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import {
  askRecommendationChat,
  extractDocument,
  getRuntimeCapabilities,
  getNearbyRecommendations,
  unlockPasscode,
} from './lib/api';
import { VERIFIED_ACTUAL_PHOTO_SRCS } from './data/actualPhotoManifest';
import { buildSeedTripPlan, seedTripPlan } from './data/seedTrip';
import { formatDateLabel, slugify, toInputClock } from './lib/format';
import { getTodayInTripRange } from './lib/date';
import { dayHasPhotos, dayOptionLabel, dayPhotoCount } from './lib/day';
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
import type {
  AppViewTab,
  CapabilitiesResponse,
  ChatContext,
  MapStatus,
  MobilePanel,
  RecommendationItem,
  RecCategory,
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

const CATEGORY_LABEL: Record<RecCategory, string> = {
  sights: 'Sights',
  food: 'Food',
  coffee: 'Coffee',
  rest: 'Rest',
};

const APP_TAB_LABEL: Record<AppViewTab, string> = {
  trip_overview: 'Trip Overview',
  day_detail: 'Day Detail',
  photo_gallery: 'Photo Gallery',
};

const MOBILE_PANEL_LABEL: Record<MobilePanel, string> = {
  now: 'Now',
  map: 'Map',
  plan: 'Plan',
  recs: 'Recs',
};

type MapScope = 'day' | 'trip';
type MapStyle = 'road' | 'satellite';
type LeafletModule = typeof import('leaflet');

const MAP_SCOPE_LABEL: Record<MapScope, string> = {
  day: 'Selected Day',
  trip: 'Full Trip',
};

const MAP_STYLE_LABEL: Record<MapStyle, string> = {
  road: 'Road',
  satellite: 'Satellite',
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

function toPublicAssetUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;

  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const normalized = path.replace(/^\/+/, '');
  return `${base}/${normalized}`;
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

      const dayHasCoords = [...day.summaryItems, ...day.detailItems].some(
        (item) => typeof item.lat === 'number' && typeof item.lng === 'number',
      );

      return {
        ...day,
        summaryItems: !dayHasCoords && seedDay ? seedDay.summaryItems : day.summaryItems,
        detailItems: !dayHasCoords && seedDay ? seedDay.detailItems : day.detailItems,
        actualMoments: seedDay?.actualMoments || day.actualMoments || [],
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
    const hydrated = applyStoredViewModes(basePlan, viewModes);

    if (!Array.isArray(hydrated.days) || hydrated.days.length === 0) {
      return seedPlan;
    }

    return hydrated;
  }, []);

  const [tripPlan, setTripPlan] = useState<TripPlan>(initialPlan || seedTripPlan);
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayInTripRange(initialPlan));
  const [whereAmI, setWhereAmI] = useState<WhereAmIState>(() => defaultWhereAmI(selectedDate));
  const [autoLocateEnabled, setAutoLocateEnabled] = useState(false);
  const [manualDayId, setManualDayId] = useState<string>('');
  const [manualItemId, setManualItemId] = useState<string>('');

  const initialAppTab = useMemo(() => loadAppViewTab(), []);
  const [activeAppTab, setActiveAppTabState] = useState<AppViewTab>(initialAppTab);
  const [activeMobilePanel, setActiveMobilePanelState] = useState<MobilePanel>(() => loadMobilePanel());
  const [mapScope, setMapScope] = useState<MapScope>(() => (initialAppTab === 'trip_overview' ? 'trip' : 'day'));
  const [mapStyle, setMapStyle] = useState<MapStyle>('road');
  const [overviewPanelsCollapsed, setOverviewPanelsCollapsed] = useState({
    timeline: true,
    regions: true,
  });
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  });

  const [mapStatus, setMapStatus] = useState<MapStatus>('initializing');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapMountVersion, setMapMountVersion] = useState(0);
  const [leafletModule, setLeafletModule] = useState<LeafletModule | null>(null);

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<RecCategory>('sights');
  const [lastRecommendationCategory, setLastRecommendationCategory] = useState<RecCategory | null>(null);

  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastChatQuestion, setLastChatQuestion] = useState<string | null>(null);

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
  const roadTileLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const satelliteTileLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const hasAppliedInitialRegionLockRef = useRef(false);
  const lastViewportFitKeyRef = useRef<string | null>(null);
  const recommendationCacheRef = useRef<Record<string, RecommendationItem[]>>({});

  const selectedDateExists = useMemo(
    () => tripPlan.days.some((day) => day.date === selectedDate),
    [tripPlan.days, selectedDate],
  );

  const selectedDay = useMemo(
    () =>
      tripPlan.days.find((day) => day.date === selectedDate) ||
      tripPlan.days[0] ||
      seedTripPlan.days[0],
    [tripPlan.days, selectedDate],
  );
  const selectedItems = useMemo(() => getActiveItems(selectedDay), [selectedDay]);
  const selectedDayHasCoords = useMemo(
    () => selectedItems.some((item) => typeof item.lat === 'number' && typeof item.lng === 'number'),
    [selectedItems],
  );
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
  const extractEnabled = runtimeCapabilities.features.extract;
  const recommendationsEnabled = runtimeCapabilities.features.recommendations;
  const chatEnabled = runtimeCapabilities.features.chat;
  const dayModeLabel = selectedDay.activeView === 'detail' ? 'Detailed Plan' : 'Trip Summary';
  const selectedActualMoments = selectedDay.actualMoments || [];
  const selectedDayHasPhotos = dayHasPhotos(selectedDay);
  const selectedDayPhotoCount = dayPhotoCount(selectedDay);
  const photoDates = useMemo(
    () => new Set(tripPlan.days.filter((day) => dayHasPhotos(day)).map((day) => day.date)),
    [tripPlan.days],
  );

  const photoGalleryRows = useMemo(() => {
    const mapped = tripPlan.days.flatMap((day) =>
      (day.actualMoments || []).flatMap((moment) =>
        moment.photos.map((photo) => ({
          src: photo.src,
          caption: photo.caption,
          alt: photo.alt,
          date: day.date,
          region: day.region,
          moment: moment.whenLabel,
        })),
      ),
    );

    const mappedBySrc = new Map(mapped.map((row) => [row.src, row]));

    return VERIFIED_ACTUAL_PHOTO_SRCS.map((src) => {
      const match = mappedBySrc.get(src);
      return {
        src,
        date: match?.date || 'UNMAPPED',
        region: match?.region || 'Unmapped',
        moment: match?.moment || 'Unmapped',
        caption: match?.caption || 'No caption mapped',
        alt: match?.alt || 'No alt mapped',
        mapped: Boolean(match),
      };
    });
  }, [tripPlan.days]);

  const mapStops = useMemo<MapStop[]>(() => {
    if (mapScope === 'day') {
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
  }, [mapScope, selectedItems, selectedDay.date, selectedDay.region, tripPlan.days]);

  useEffect(() => {
    if (mapScope !== 'day') return;
    if (selectedDayHasCoords) return;
    setMapScope('trip');
    setStatusMessage(`No map coordinates on ${formatDateLabel(selectedDate)}. Switched map to Full Trip.`);
  }, [mapScope, selectedDayHasCoords, selectedDate]);


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

  function goToToday() {
    selectDateForDayMap(todayDate);
    postAlert('info', `Jumped to ${formatDateLabel(todayDate)}.`);
  }

  function retryMapInit() {
    setMapError(null);
    setMapStatus('initializing');
    setMapMountVersion((prev) => prev + 1);
  }

  function focusMapStop(stop: MapStop) {
    selectDateForDayMap(stop.date);
    if (isMobile) setMobilePanel('map');

    if (!mapRef.current) return;

    mapRef.current.setView([stop.lat, stop.lng], mapScope === 'trip' ? 8 : 11, {
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
    if (selectedDateExists) return;
    const fallbackDate = tripPlan.days[0]?.date;
    if (fallbackDate) {
      setSelectedDate(fallbackDate);
    }
  }, [selectedDateExists, tripPlan.days]);

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
          preferCanvas: true,
        }).setView([26, 20], 3);

        const roadLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        });
        const satelliteLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles &copy; Esri',
          },
        );

        roadTileLayerRef.current = roadLayer;
        satelliteTileLayerRef.current = satelliteLayer;

        if (mapStyle === 'satellite') {
          satelliteLayer.addTo(map);
        } else {
          roadLayer.addTo(map);
        }

        const markerLayer = L.layerGroup().addTo(map);
        mapRef.current = map;
        markerLayerRef.current = markerLayer;

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
      roadTileLayerRef.current = null;
      satelliteTileLayerRef.current = null;
    };
  }, [leafletModule, mapMountVersion, invalidateMap]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current) return;

    const map = mapRef.current;
    const road = roadTileLayerRef.current;
    const satellite = satelliteTileLayerRef.current;

    if (!road || !satellite) return;

    if (mapStyle === 'satellite') {
      if (map.hasLayer(road)) map.removeLayer(road);
      if (!map.hasLayer(satellite)) map.addLayer(satellite);
    } else {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (!map.hasLayer(road)) map.addLayer(road);
    }
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
          selectedDayCoords.push(coord);
        }
      });

      if (coords.length >= 2) {
        if (mapScope === 'trip') {
          markerLayerRef.current.addLayer(
            L.polyline(coords, {
              color,
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
        const fitKey = mapScope === 'day' ? `day:${selectedDate}` : 'trip';
        if (lastViewportFitKeyRef.current !== fitKey) {
          mapRef.current.stop();

          if (mapScope === 'day' && selectedDayBounds.isValid()) {
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
    mapScope,
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
    postAlert('info', `Manual location override applied for ${formatDateLabel(day.date)}.`);
    trackEvent('manual_override_apply');
  }

  function clearManualOverride() {
    setManualDayId('');
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

  function recommendationCacheKey(category: RecCategory, anchor: [number, number]): string {
    const roundedLat = anchor[0].toFixed(4);
    const roundedLng = anchor[1].toFixed(4);
    return `${selectedDay.date}:${category}:${roundedLat},${roundedLng}`;
  }

  async function fetchRecommendations(category: RecCategory) {
    if (!recommendationsEnabled) return;

    const anchor = getRecommendationAnchor();
    if (!anchor) {
      const message = 'No location available. Use Locate or select a stop with coordinates.';
      setRecommendationError(message);
      postAlert('warn', message);
      return;
    }

    const cacheKey = recommendationCacheKey(category, anchor);
    const cached = recommendationCacheRef.current[cacheKey];
    if (cached) {
      setRecommendations(cached);
      setActiveCategory(category);
      setRecommendationError(null);
      setLastRecommendationCategory(category);
      setStatusMessage(`Loaded ${cached.length} cached ${CATEGORY_LABEL[category].toLowerCase()} recommendations.`);
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError(null);
    setActiveCategory(category);
    setLastRecommendationCategory(category);

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
      recommendationCacheRef.current[cacheKey] = items;
      setStatusMessage(`Loaded ${items.length} ${CATEGORY_LABEL[category].toLowerCase()} recommendations.`);
      postAlert('success', `Loaded ${items.length} ${CATEGORY_LABEL[category].toLowerCase()} recommendations.`);
      trackEvent('recommendations_success');
    } catch (error) {
      const message = (error as Error).message || 'Recommendation lookup failed';
      setRecommendationError(message);
      postAlert('error', message);
      trackEvent('recommendations_failure');
    } finally {
      setRecommendationLoading(false);
    }
  }

  async function requestChat(question: string, clearInput = false) {
    if (!chatEnabled || !question.trim()) return;

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
    setLastChatQuestion(question);

    try {
      const response = await askRecommendationChat(
        {
          question,
          context,
          nearby: recommendations,
        },
        session.token,
      );

      setChatAnswer(response.answer);
      if (response.highlights.length > 0) {
        setRecommendations(response.highlights);
      }
      if (clearInput) {
        setChatQuestion('');
      }
      postAlert('success', 'Chat suggestions updated.');
      trackEvent('chat_success');
    } catch (error) {
      const message = (error as Error).message || 'Chat request failed';
      setChatError(message);
      postAlert('error', message);
      trackEvent('chat_failure');
    } finally {
      setChatLoading(false);
    }
  }

  async function submitChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestChat(chatQuestion.trim(), true);
  }

  function retryRecommendationRequest() {
    if (!lastRecommendationCategory) return;
    void fetchRecommendations(lastRecommendationCategory);
  }

  function retryChatRequest() {
    if (!lastChatQuestion) return;
    void requestChat(lastChatQuestion, false);
  }

  function renderActualMomentsCard(className = '') {
    return (
      <article className={`card ${className}`.trim()}>
        <h2>Actual Moments</h2>
        <p className="hint">Pulled from the B-G-M Fam iMessage export and anchored to this day.</p>
        {selectedActualMoments.length === 0 ? (
          <p className="hint">No extracted moments saved for this day yet.</p>
        ) : (
          <ul className="actual-moment-list">
            {selectedActualMoments.map((moment) => (
              <li key={moment.id} className="actual-moment">
                <div className="pill-row compact">
                  <span className="pill">{moment.whenLabel}</span>
                  <span className="pill">{moment.source}</span>
                </div>
                <p>{moment.text}</p>
                {moment.photos.length > 0 ? (
                  <div className="actual-photo-grid">
                    {moment.photos.map((photo) => (
                      <figure key={photo.id} className="actual-photo-card">
                        <img src={toPublicAssetUrl(photo.src)} alt={photo.alt} loading="lazy" />
                        <figcaption>{photo.caption}</figcaption>
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
        <h2>Trip Map</h2>
        <div className="map-scope-toggle" role="group" aria-label="Map scope">
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
        <div className="map-scope-toggle" role="group" aria-label="Map style">
          {(['road', 'satellite'] as MapStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              className={mapStyle === style ? 'active' : ''}
              onClick={() => setMapStyle(style)}
              aria-pressed={mapStyle === style}
            >
              {MAP_STYLE_LABEL[style]}
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

        <div className="map-stop-shell">
          <h3>Keyboard Stop List</h3>
          <p className="hint">
            Use these buttons to move map focus without dragging.{' '}
            {mapScope === 'trip' ? 'Showing first stop per day.' : 'Showing stops for selected day.'}
          </p>
          <ul className="map-stop-list">
            {mapStops.length === 0 ? (
              <li>
                <span className="hint">No map stops with coordinates are available for this scope.</span>
              </li>
            ) : (
              mapStops.slice(0, mapScope === 'trip' ? 20 : 12).map((stop) => (
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
                    Focus Map
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    );
  }

  function renderPhotoGalleryCard(className = '') {
    return (
      <section className={`card ${className}`.trim()}>
        <h2>Photo Debug Gallery</h2>
        <p className="hint">All whitelisted photos, including unmapped ones, with current date/region/caption bindings.</p>
        <p className="hint">
          Total: {photoGalleryRows.length} | Mapped: {photoGalleryRows.filter((row) => row.mapped).length} | Unmapped:{' '}
          {photoGalleryRows.filter((row) => !row.mapped).length}
        </p>
        <ul className="actual-photo-grid">
          {photoGalleryRows.map((row) => (
            <li key={row.src} className="actual-photo-card gallery-card">
              <img src={toPublicAssetUrl(row.src)} alt={row.alt} loading="lazy" />
              <figcaption>
                <div><strong>{row.date}</strong> · {row.region}</div>
                <div>{row.moment}</div>
                <div>{row.caption}</div>
              </figcaption>
            </li>
          ))}
        </ul>
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
          <button onClick={() => setAutoLocateEnabled((prev) => !prev)}>
            {autoLocateEnabled ? 'Pause Auto Locate' : 'Locate + Auto Refresh'}
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
          {activeAppTab === 'day_detail' ? (
            <>
              <details className="toolbar-popover">
                <summary>{formatDateLabel(selectedDate)}</summary>
                <div className="toolbar-popover-body">
                  <label htmlFor="toolbar-day-select">Date</label>
                  <select
                    id="toolbar-day-select"
                    value={selectedDate}
                    onChange={(event) => selectDateForDayMap(event.target.value)}
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
              </details>

              <button type="button" className="secondary-btn" onClick={() => setDayViewMode(selectedDay.date, selectedDay.activeView === 'detail' ? 'summary' : 'detail')}>
                {dayModeLabel}
              </button>

              {selectedDayHasPhotos ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setAppTab('day_detail');
                    if (isMobile) setMobilePanel('plan');
                  }}
                >
                  Photos ({selectedDayPhotoCount})
                </button>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            className="secondary-btn"
            onClick={() => setMapScope((prev) => (prev === 'day' ? 'trip' : 'day'))}
          >
            Map: {MAP_SCOPE_LABEL[mapScope]}
          </button>

          <button type="button" className="secondary-btn" onClick={goToToday} disabled={selectedDate === todayDate}>
            Back to Today
          </button>

          <details className={`toolbar-popover runtime ${runtimeCapabilities.mode}`}>
            <summary>{runtimeCapabilities.mode === 'live' ? 'Live mode' : 'Fallback mode'}</summary>
            <div className="toolbar-popover-body">
              <p>
                Features: Extract {extractEnabled ? 'on' : 'off'} | Recs {recommendationsEnabled ? 'on' : 'off'} | Chat{' '}
                {chatEnabled ? 'on' : 'off'}
              </p>
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
            <span>Where am I: {whereAmI.confidence}</span>
            <span>Mode: {whereAmI.mode}</span>
          </div>
        ) : null}
      </section>

      <section id="primary-content">
        {activeAppTab === 'trip_overview' ? (
          <>
          {renderMapCard(panelHiddenClass('map'))}
          <section className="trip-overview-grid">
          <article className="card">
            <div className="card-header-row">
              <h2>Trip Timeline</h2>
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setOverviewPanelsCollapsed((prev) => ({
                    ...prev,
                    timeline: !prev.timeline,
                  }))
                }
              >
                {overviewPanelsCollapsed.timeline ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!overviewPanelsCollapsed.timeline ? (
              <>
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

            <ul className="day-overview-list">
              {tripPlan.days.map((day) => (
                <li
                  key={`overview-day-${day.date}`}
                  className={`day-row ${day.date === todayDate ? 'is-today' : ''} ${day.date === selectedDate ? 'is-selected' : ''}`}
                >
                  <button type="button" className="day-row-button" onClick={() => setSelectedDate(day.date)}>
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
              </>
            ) : null}
          </article>

          <article className="card">
            <div className="card-header-row">
              <h2>Region Legs</h2>
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setOverviewPanelsCollapsed((prev) => ({
                    ...prev,
                    regions: !prev.regions,
                  }))
                }
              >
                {overviewPanelsCollapsed.regions ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!overviewPanelsCollapsed.regions ? (
              <>
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
                    {todayDate >= segment.startDate && todayDate <= segment.endDate ? <span className="today-tag">Current Region</span> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      selectDateForDayMap(segment.startDate);
                      setAppTab('day_detail');
                      if (isMobile) setMobilePanel('plan');
                    }}
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
              </>
            ) : null}
          </article>
          </section>
          </>
        ) : activeAppTab === 'photo_gallery' ? (
          <>
            {renderPhotoGalleryCard()}
          </>
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

          <section className="day-focus-grid">
            {renderMapCard(`focus-map ${panelHiddenClass('map')}`)}
            {renderActualMomentsCard(`focus-moments ${panelHiddenClass('plan')}`)}
          </section>

          <section className="dashboard-grid secondary-grid">
            <article className={`card ${panelHiddenClass('now')}`}>
              <h2>Today</h2>
              <p className="hint">Use the title bar controls to change date, region, and plan mode.</p>

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
              {!autoLocateEnabled ? (
                <p className="hint">Tip: enable “Locate + Auto Refresh” in the header for automatic updates every 5 minutes.</p>
              ) : null}
              <div className="row">
                <label htmlFor="manual-day">Day</label>
                <select id="manual-day" value={manualDayId} onChange={(event) => setManualDayId(event.target.value)}>
                  <option value="">Select day</option>
                  {tripPlan.days.map((day) => (
                    <option key={day.date} value={day.date}>
                      {dayOptionLabel(day, todayDate)}
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
              {!recommendationsEnabled ? (
                <p className="hint">Recommendations are unavailable in the current runtime mode.</p>
              ) : null}
              <div className="button-row">
                {(['sights', 'food', 'coffee', 'rest'] as RecCategory[]).map((category) => (
                  <button
                    key={category}
                    className={activeCategory === category ? 'active' : ''}
                    onClick={() => fetchRecommendations(category)}
                    disabled={recommendationLoading || !recommendationsEnabled}
                  >
                    {CATEGORY_LABEL[category]}
                  </button>
                ))}
              </div>
              {recommendationLoading ? <p className="hint">Loading recommendations...</p> : null}
              {recommendationError ? (
                <div className="inline-error-actions">
                  <p className="error-text" role="alert">
                    {recommendationError}
                  </p>
                  <button type="button" className="secondary-btn" onClick={retryRecommendationRequest} disabled={!lastRecommendationCategory}>
                    Retry
                  </button>
                </div>
              ) : null}
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
              {!chatEnabled ? <p className="hint">Chat is unavailable in the current runtime mode.</p> : null}
              <form onSubmit={submitChat} className="chat-form">
                <label htmlFor="chat-question">Question</label>
                <textarea
                  id="chat-question"
                  value={chatQuestion}
                  onChange={(event) => setChatQuestion(event.target.value)}
                  placeholder="Ask: What should we see nearby for the next 2 hours?"
                  disabled={!chatEnabled}
                  required
                />
                <button type="submit" disabled={chatLoading || !chatEnabled}>
                  {chatLoading ? 'Thinking...' : 'Ask'}
                </button>
              </form>
              {chatError ? (
                <div className="inline-error-actions">
                  <p className="error-text" role="alert">
                    {chatError}
                  </p>
                  <button type="button" className="secondary-btn" onClick={retryChatRequest} disabled={!lastChatQuestion || chatLoading}>
                    Retry
                  </button>
                </div>
              ) : null}
              {chatAnswer ? <p className="chat-answer">{chatAnswer}</p> : null}
            </article>

            <article className={`card ${panelHiddenClass('plan')}`}>
              <h2>Upload Detailed Itinerary</h2>
              <p>Upload -&gt; Review -&gt; Apply. Supported: PDF, DOCX, DOC, TXT.</p>
              <div className="row">
                <label htmlFor="itinerary-upload">Upload itinerary file</label>
                <input
                  id="itinerary-upload"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleExtractUpload}
                  disabled={extracting || !extractEnabled}
                  aria-describedby="itinerary-upload-help"
                />
                <small id="itinerary-upload-help">
                  {extractEnabled
                    ? 'Detailed files are parsed into a review patch before anything is saved.'
                    : 'Upload parsing requires backend mode. Configure VITE_API_BASE_URL to enable extraction.'}
                </small>
              </div>
              {extracting ? <p>Parsing document...</p> : null}
              {uploadError ? (
                <div className="inline-error-actions">
                  <p className="error-text" role="alert">
                    {uploadError}
                  </p>
                  <button type="button" className="secondary-btn" onClick={() => setUploadError(null)}>
                    Try Another File
                  </button>
                </div>
              ) : null}

              {pendingPatch ? (
                <div className="review-box">
                  <p>
                    <strong>{pendingPatch.fileName}</strong> ({pendingPatch.documentId})
                  </p>
                  <p>
                    Confidence: {Math.round(pendingPatch.patch.parseConfidence * 100)}% | Days added:{' '}
                    {pendingPatch.patch.daysAdded.length} | Days updated: {pendingPatch.patch.daysUpdated.length}
                  </p>
                  <p className="hint">
                    Impacted dates:{' '}
                    {[...pendingPatch.patch.daysAdded, ...pendingPatch.patch.daysUpdated]
                      .map((day) => day.date)
                      .slice(0, 6)
                      .join(', ') || 'None'}
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

            <article className={`card ${panelHiddenClass('plan')}`}>
              <h2>Source Documents</h2>
              {tripPlan.sources.length === 0 ? (
                <p className="hint">No source documents merged yet.</p>
              ) : (
                <ul className="source-list">
                  {tripPlan.sources.slice(0, 8).map((source) => (
                    <li key={source.id}>
                      <strong>{source.name}</strong>
                      <span>
                        {new Date(source.uploadedAt).toLocaleDateString()} | {source.status} | {source.coversDates.length} day(s)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
          </>
        )}

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
