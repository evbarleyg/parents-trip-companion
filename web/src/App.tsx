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
import { dayHasPhotos } from './lib/day';
import { applyTripPatch } from './lib/merge';
import { getActualPhotoMapPointsForDay, isPhotoPointNearItinerary } from './lib/media-map';
import { ensureOpenSession } from './lib/session';
import { trackEvent } from './lib/telemetry';
import {
  loadDayViewModes,
  loadSession,
  loadTripPlanState,
  saveDayViewModes,
  saveSession,
  saveSourceDocument,
  saveTripPlanState,
} from './lib/storage';
import { getCurrentAndNext } from './lib/time';
import { type MapScope } from './lib/view-state';
import type {
  CapabilitiesResponse,
  ItineraryItem,
  TripActualMoment,
  TripActualPhoto,
  TripActualVideo,
  MapStatus,
  SourceDocument,
  TripDay,
  TripPatch,
  TripPlan,
  UiAlert,
  UnlockResponse,
  ViewMode,
} from './types';

const MOBILE_BREAKPOINT = 980;

type LeafletModule = typeof import('leaflet');

const MAP_SCOPE_LABEL: Record<MapScope, string> = {
  day: 'Day',
  trip: 'Trip',
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
  location: string;
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
const MACHINE_MEDIA_TEXT_PATTERNS = [
  /\bimg[_-]\d+/i,
  /\bexif\b/i,
  /uuid=/i,
  /\bfile[_-]\d+/i,
  /\bcode=\d+\b/i,
  /\blibrary=\d+\b/i,
  /\bmode=\d+\b/i,
  /&loc=true/i,
  /&cap=true/i,
  /converted from heic/i,
  /\.(heic|jpeg|jpg|png|mov|mp4)\b/i,
];
const GENERIC_MEDIA_TEXT_PATTERNS = [
  /\bcaptured during the trip\.?$/i,
  /^dad trip photo\b/i,
  /^trip photo\b/i,
  /^trip video\b/i,
];
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

function normalizeVideoSrc(src: string): string {
  return src.trim().toLowerCase();
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

function isJsdomEnvironment(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /jsdom/i.test(navigator.userAgent || '');
}

function shouldUseCanvasRenderer(): boolean {
  return !isJsdomEnvironment();
}

function annotationTagFromSource(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized.includes('dad updates')) return 'Dad note';
  if (normalized.includes('mom updates')) return 'Mom note';
  if (normalized.includes('guide updates')) return 'Guide note';
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

function mergePhoto(existing: TripActualPhoto, incoming: TripActualPhoto): TripActualPhoto {
  return {
    ...existing,
    ...incoming,
    src: incoming.src || existing.src,
    alt: incoming.alt || existing.alt,
    caption: incoming.caption || existing.caption,
    lat: incoming.lat ?? existing.lat,
    lng: incoming.lng ?? existing.lng,
  };
}

function mergePhotos(existingPhotos: TripActualPhoto[], incomingPhotos: TripActualPhoto[]): TripActualPhoto[] {
  const byKey = new Map<string, TripActualPhoto>();

  for (const photo of existingPhotos) {
    const key = photo.src ? normalizePhotoSrc(photo.src) : photo.id || '';
    if (!key) continue;
    byKey.set(key, { ...photo });
  }

  for (const photo of incomingPhotos) {
    const key = photo.src ? normalizePhotoSrc(photo.src) : photo.id || '';
    if (!key) continue;

    const existing = byKey.get(key);
    byKey.set(key, existing ? mergePhoto(existing, photo) : { ...photo });
  }

  return [...byKey.values()];
}

function mergeVideo(existing: TripActualVideo, incoming: TripActualVideo): TripActualVideo {
  return {
    ...existing,
    ...incoming,
    src: incoming.src || existing.src,
    caption: incoming.caption || existing.caption,
    poster: incoming.poster || existing.poster,
  };
}

function mergeVideos(existingVideos: TripActualVideo[], incomingVideos: TripActualVideo[]): TripActualVideo[] {
  const byKey = new Map<string, TripActualVideo>();

  for (const video of existingVideos) {
    const key = video.src ? normalizeVideoSrc(video.src) : video.id || '';
    if (!key) continue;
    byKey.set(key, { ...video });
  }

  for (const video of incomingVideos) {
    const key = video.src ? normalizeVideoSrc(video.src) : video.id || '';
    if (!key) continue;

    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeVideo(existing, video) : { ...video });
  }

  return [...byKey.values()];
}

function looksMachineGeneratedMediaText(value: string | undefined): boolean {
  const text = value?.trim();
  if (!text) return false;
  return MACHINE_MEDIA_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function isMeaningfulMediaText(value: string | undefined): value is string {
  const text = value?.trim();
  if (!text) return false;
  if (looksMachineGeneratedMediaText(text)) return false;
  return !GENERIC_MEDIA_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

export function mediaDisplayCaption(caption: string | undefined, alt: string | undefined): string | null {
  if (isMeaningfulMediaText(caption)) return caption.trim();
  if (isMeaningfulMediaText(alt)) return alt.trim();
  return null;
}

function mergeSourceDocuments(restoredSources: SourceDocument[], seedSources: SourceDocument[]): SourceDocument[] {
  const merged = new Map<string, SourceDocument>();

  for (const source of seedSources) {
    merged.set(source.id, { ...source });
  }

  for (const source of restoredSources) {
    const existing = merged.get(source.id);
    merged.set(source.id, existing ? { ...existing, ...source } : { ...source });
  }

  return [...merged.values()].sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
}

function mergeHydratedItem(restored: ItineraryItem, seed: ItineraryItem): ItineraryItem {
  const restoredNotes = restored.notes?.trim() || '';
  const seedNotes = seed.notes?.trim() || '';

  return {
    ...restored,
    ...seed,
    title: seed.title || restored.title,
    startTime: seed.startTime || restored.startTime,
    endTime: seed.endTime ?? restored.endTime,
    location: seed.location || restored.location,
    notes: seedNotes.length >= restoredNotes.length ? seedNotes || restoredNotes : restoredNotes,
    category: seed.category || restored.category,
    lat: seed.lat ?? restored.lat,
    lng: seed.lng ?? restored.lng,
  };
}

function mergeHydratedItems(restoredItems: ItineraryItem[], seedItems: ItineraryItem[]): ItineraryItem[] {
  const merged = new Map<string, ItineraryItem>();

  for (const item of seedItems) {
    merged.set(item.id, { ...item });
  }

  for (const item of restoredItems) {
    const existing = item.id ? merged.get(item.id) : undefined;
    if (!existing) {
      merged.set(item.id, { ...item });
      continue;
    }

    merged.set(item.id, mergeHydratedItem(item, existing));
  }

  return [...merged.values()].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
}

function hydrateDayWithSeed(restoredDay: TripDay | undefined, seedDay: TripDay | undefined): TripDay | undefined {
  if (!seedDay) return restoredDay;
  if (!restoredDay) {
    return {
      ...seedDay,
      summaryItems: seedDay.summaryItems.map((item) => ({ ...item })),
      detailItems: seedDay.detailItems.map((item) => ({ ...item })),
      actualMoments: mergeActualMoments(undefined, seedDay.actualMoments),
    };
  }

  const summaryItems = mergeHydratedItems(restoredDay.summaryItems, seedDay.summaryItems);
  const detailItems = mergeHydratedItems(restoredDay.detailItems, seedDay.detailItems);

  return {
    ...restoredDay,
    ...seedDay,
    region: seedDay.region || restoredDay.region,
    summaryItems,
    detailItems,
    activeView: restoredDay.activeView || seedDay.activeView,
    actualMoments: mergeActualMoments(restoredDay.actualMoments, seedDay.actualMoments),
  };
}

export function mergeActualMoments(
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
      photos: mergePhotos(existing.photos, moment.photos),
      videos: mergeVideos(existing.videos || [], moment.videos || []),
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

function mapMarkerPlace(day: TripDay, item: ItineraryItem | undefined): string {
  return item?.location?.trim() || day.region;
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

export function hydratePlanWithSeedData(plan: TripPlan, seed: TripPlan): TripPlan {
  const restoredDaysByDate = new Map(plan.days.map((day) => [day.date, day]));
  const seedDaysByDate = new Map(seed.days.map((day) => [day.date, day]));
  const allDates = [...new Set([...seed.days.map((day) => day.date), ...plan.days.map((day) => day.date)])].sort();

  return {
    ...seed,
    ...plan,
    tripName: seed.tripName,
    startDate: seed.startDate,
    endDate: seed.endDate,
    timezone: plan.timezone || seed.timezone,
    sources: mergeSourceDocuments(plan.sources, seed.sources),
    days: allDates
      .map((date) => hydrateDayWithSeed(restoredDaysByDate.get(date), seedDaysByDate.get(date)))
      .filter((day): day is TripDay => Boolean(day)),
  };
}

function getActiveItems(day: TripDay): TripDay['summaryItems'] {
  return day.activeView === 'detail' && day.detailItems.length > 0 ? day.detailItems : day.summaryItems;
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

function segmentContainsDate(segment: RegionSegment, date: string): boolean {
  return date >= segment.startDate && date <= segment.endDate;
}

export function sortActualMomentRowsAscending(rows: ActualMomentRow[]): ActualMomentRow[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.moment.whenLabel.localeCompare(b.moment.whenLabel);
  });
}

function momentNarrativeText(moment: TripActualMoment): string | null {
  const text = moment.text.trim();
  if (!text) return null;
  return text;
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
  const [photoScope, setPhotoScope] = useState<PhotoScope>('selected_day');
  const [activeMapScope, setActiveMapScope] = useState<MapScope>('day');
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
  const dayPickerRef = useRef<HTMLDetailsElement | null>(null);
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
  const selectedRegionSegment = useMemo(
    () => regionSegments.find((segment) => segmentContainsDate(segment, selectedDate)) || regionSegments[0] || null,
    [regionSegments, selectedDate],
  );
  const extractEnabled = runtimeCapabilities.features.extract;
  const dayModeLabel = selectedDay.activeView === 'detail' ? 'Detailed plan' : 'Trip summary';
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
      sortActualMomentRowsAscending(
        tripPlan.days.flatMap((day) =>
          (day.actualMoments || [])
            .filter((moment) => hasMomentMedia(moment))
            .map((moment) => ({ date: day.date, moment })),
        ),
      ),
    [tripPlan.days],
  );
  const fullTripPhotoRows = useMemo(() => tripPhotoMomentRows, [tripPhotoMomentRows]);
  const nearbyTripPhotoRows = useMemo(() => {
    const hasSelectedTimestamp = Number.isFinite(selectedDateMs);

    const nearbyRows = tripPhotoMomentRows
      .filter((row) => row.date !== selectedDate)
      .sort((a, b) => {
        if (!hasSelectedTimestamp) return b.date.localeCompare(a.date);

        const aDistance = Math.abs(parseTripDateMs(a.date) - selectedDateMs);
        const bDistance = Math.abs(parseTripDateMs(b.date) - selectedDateMs);
        if (aDistance === bDistance) return b.date.localeCompare(a.date);
        return aDistance - bDistance;
      });

    return sortActualMomentRowsAscending(nearbyRows.slice(0, 20));
  }, [selectedDate, selectedDateMs, tripPhotoMomentRows]);
  const mainPagePhotoRows = useMemo(
    () => (selectedDayPhotoRows.length > 0 ? sortActualMomentRowsAscending(selectedDayPhotoRows) : nearbyTripPhotoRows),
    [nearbyTripPhotoRows, selectedDayPhotoRows],
  );
  const mainPageUsesNearbyFallback = selectedDayPhotoRows.length === 0 && mainPagePhotoRows.length > 0;
  const visiblePhotoRows = useMemo(
    () => (photoScope === 'selected_day' ? mainPagePhotoRows : fullTripPhotoRows),
    [fullTripPhotoRows, mainPagePhotoRows, photoScope],
  );
  const selectedDayMediaCount = useMemo(
    () =>
      selectedDayPhotoRows.reduce(
        (count, row) => count + row.moment.photos.length + (row.moment.videos?.length ?? 0),
        0,
      ),
    [selectedDayPhotoRows],
  );
  const selectedDayHasPhotos = dayHasPhotos(selectedDay);
  const currentItemId = nowAndNext.current?.id ?? null;

  const mapStops = useMemo<MapStop[]>(() => {
    if (activeMapScope === 'day') {
      return selectedItems
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        .map((item) => ({
          id: item.id,
          date: selectedDay.date,
          label: item.title,
          location: item.location,
          region: selectedDay.region,
          lat: item.lat as number,
          lng: item.lng as number,
        }));
    }

    return tripPlan.days
      .map((day) => {
        const firstWithCoords = getActiveItems(day).find(
          (item) => Number.isFinite(item.lat) && Number.isFinite(item.lng),
        );
        if (!firstWithCoords) return null;
        return {
          id: `${day.date}-${firstWithCoords.id}`,
          date: day.date,
          label: firstWithCoords.title,
          location: firstWithCoords.location,
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

  function closeDayPicker() {
    if (dayPickerRef.current) {
      dayPickerRef.current.open = false;
    }
  }

  function selectDate(date: string, status = `Showing ${formatDateLabel(date)}.`) {
    setSelectedDate(date);
    setStatusMessage(status);
    closeDayPicker();
  }

  function selectRegion(segment: RegionSegment) {
    selectDate(segment.startDate, `Jumped to ${segment.region}.`);
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

  function goToToday() {
    selectDate(todayDate, `Jumped to ${formatDateLabel(todayDate)}.`);
  }

  function retryMapInit() {
    setMapError(null);
    setMapStatus('initializing');
    setMapMountVersion((prev) => prev + 1);
  }

  function focusMapStop(stop: MapStop) {
    selectDate(stop.date, `Focused map on ${stop.label}.`);
    setActiveMapScope('day');

    if (!mapRef.current) return;

    mapRef.current.setView([stop.lat, stop.lng], 11, {
      animate: true,
    });
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
    if (isJsdomEnvironment()) {
      setMapStatus('ready');
      setMapError(null);
      return;
    }

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
  }, [isMobile, mapStatus, invalidateMap]);

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
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        .map((item) => [item.lat as number, item.lng as number] as [number, number]);
      const photoPoints = getActualPhotoMapPointsForDay(day);
      const selectedDayPhotoPoints =
        coords.length === 0 ? photoPoints : photoPoints.filter((point) => isPhotoPointNearItinerary(point, coords));

      coords.forEach((coord, idx) => {
        const marker = L.circleMarker(coord, {
          radius: isSelectedDate ? 7 : isTodayDate ? 6 : 4,
          color: '#ffffff',
          weight: isSelectedDate || isTodayDate ? 2 : 1,
          fillColor: isTodayDate ? '#d0722b' : color,
          fillOpacity: isSelectedDate ? 0.97 : isTodayDate ? 0.9 : 0.55,
        });

        marker.bindPopup(
          `<b>${formatDateLabel(day.date)}</b>${isTodayDate ? ' (Today)' : ''}${hasPhotos ? ' (Photos)' : ''}<br/>${mapMarkerPlace(day, items[idx])}<br/>${items[idx]?.title || 'Itinerary stop'}`,
        );
        marker.bindTooltip(
          `<strong>${formatDateLabel(day.date)}${isTodayDate ? ' - Today' : ''}${hasPhotos ? ' - Photos' : ''}</strong><br/>${mapMarkerPlace(day, items[idx])}<br/>${items[idx]?.title || 'Itinerary stop'}`,
          {
            direction: 'top',
            sticky: true,
            opacity: 0.95,
            className: 'map-tooltip',
          },
        );

        marker.on('click', () => {
          selectDate(day.date);
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

      photoPoints
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .forEach((point) => {
        const photoMarker = L.circleMarker([point.lat, point.lng], {
          radius: isSelectedDate ? 5 : isTodayDate ? 4.5 : 4,
          color: '#ffffff',
          weight: 1.5,
          fillColor: '#d97706',
          fillOpacity: isSelectedDate ? 0.95 : 0.82,
        });

        photoMarker.bindPopup(
          `<b>${formatDateLabel(day.date)}</b> - Photo${isTodayDate ? ' (Today)' : ''}<br/>${day.region}<br/>${point.caption}`,
        );
        photoMarker.bindTooltip(
          `<strong>${formatDateLabel(day.date)} - Photo</strong><br/>${point.whenLabel}`,
          {
            direction: 'top',
            sticky: true,
            opacity: 0.95,
            className: 'map-tooltip',
          },
        );
        photoMarker.on('click', () => {
          selectDate(day.date);
        });

        markerLayerRef.current?.addLayer(photoMarker);
        bounds.extend([point.lat, point.lng]);
        if (day.region === todayRegion) {
          todayRegionBounds.extend([point.lat, point.lng]);
        }
      });

      if (isSelectedDate) {
        selectedDayPhotoPoints
          .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
          .forEach((point) => {
            selectedDayBounds.extend([point.lat, point.lng]);
            selectedDayCoords.push([point.lat, point.lng]);
          });
      }

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
    activeMapScope,
    mapStatus,
    invalidateMap,
    leafletModule,
    todayDate,
    todayRegion,
  ]);

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
    rows: ActualMomentRow[] = [],
    _showRecentFallback = false,
  ) {
    const mediaContext =
      photoScope === 'selected_day'
        ? `${formatDateLabel(selectedDate)} · ${selectedDay.region}`
        : `${fullTripPhotoRows.length} collected trip moments`;

    return (
      <article className="card trip-media-card" data-testid="trip-media-card">
        <div className="card-header-row trip-media-header">
          <div className="trip-media-heading">
            <h2>Trip Media</h2>
            <p className="trip-media-context">{mediaContext}</p>
          </div>
          <div className="toggle-row media-scope-toggle" role="group" aria-label="Trip media scope">
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
        </div>
        {rows.length === 0 ? (
          <p className="hint">No media yet.</p>
        ) : (
          <ul className="actual-moment-list">
            {rows.map((row) => (
              <li key={`${row.date}-${row.moment.id}`} className="actual-moment">
                <div className="pill-row compact">
                  <span className="pill">{row.moment.whenLabel}</span>
                  <span className="pill">{row.moment.source}</span>
                  {photoScope === 'full_trip' || row.date !== selectedDate ? (
                    <span className="pill">{formatDateLabel(row.date)}</span>
                  ) : null}
                </div>
                {momentNarrativeText(row.moment) ? (
                  <p className="actual-moment-copy">{momentNarrativeText(row.moment)}</p>
                ) : null}
                {hasMomentMedia(row.moment) ? (
                  <div className="actual-photo-strip" data-testid="actual-photo-strip">
                    {row.moment.photos.map((photo) => {
                      const displayCaption = mediaDisplayCaption(photo.caption, photo.alt);

                      return (
                        <figure key={photo.id} className="actual-photo-card">
                          <div className="actual-photo-media">
                            <img
                              src={resolvePublicAssetUrl(canonicalPhotoSrc(photo.src), import.meta.env.BASE_URL)}
                              alt={photo.alt}
                              loading="lazy"
                            />
                          </div>
                          {displayCaption ? <figcaption>{displayCaption}</figcaption> : null}
                        </figure>
                      );
                    })}
                    {(row.moment.videos || []).map((video) => {
                      const displayCaption = mediaDisplayCaption(video.caption, undefined);

                      return (
                        <figure key={video.id} className="actual-photo-card">
                          <div className="actual-photo-media">
                            <video
                              controls
                              preload="metadata"
                              playsInline
                              poster={video.poster ? resolvePublicAssetUrl(video.poster, import.meta.env.BASE_URL) : undefined}
                            >
                              <source src={resolvePublicAssetUrl(video.src, import.meta.env.BASE_URL)} />
                            </video>
                          </div>
                          {displayCaption ? <figcaption>{displayCaption}</figcaption> : null}
                        </figure>
                      );
                    })}
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
      <section className={`map-shell card ${className}`.trim()} data-testid="map-card" id="trip-map">
        <div className="card-header-row trip-section-header">
          <div>
            <h2>Map</h2>
            <p className="hint">
              {formatDateLabel(selectedDate)} · {selectedDay.region}
            </p>
          </div>
          <div className="map-scope-toggle" role="group" aria-label="Map scope">
            {(['day', 'trip'] as MapScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                className={activeMapScope === scope ? 'active' : ''}
                onClick={() => setActiveMapScope(scope)}
                aria-pressed={activeMapScope === scope}
              >
                {MAP_SCOPE_LABEL[scope]}
              </button>
            ))}
          </div>
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
                      {formatDateLabel(stop.date)} - {stop.location}
                      {stop.location !== stop.region ? ` (${stop.region})` : ''}
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
        <div className="topbar-copy">
          <h1>{tripPlan.tripName}</h1>
          <p>{formatDateLabel(tripPlan.startDate)} to {formatDateLabel(tripPlan.endDate)}</p>
          <p className="topbar-selected-day">
            {formatDateLabel(selectedDate)} · {selectedDay.region}
          </p>
        </div>
        <div className="topbar-actions">
          <details className="header-day-picker" data-testid="header-day-picker" ref={dayPickerRef}>
            <summary>
              <span>{formatDateLabel(selectedDate)}</span>
              <small>{selectedDay.region}</small>
            </summary>
            <div className="header-day-picker-panel">
              {regionSegments.map((segment) => (
                <section key={segment.id} className="header-day-picker-section">
                  <button
                    type="button"
                    className={`header-day-picker-region ${selectedRegionSegment?.id === segment.id ? 'active' : ''}`}
                    onClick={() => selectRegion(segment)}
                  >
                    {segment.region}
                  </button>
                  <div className="header-day-picker-days">
                    {tripPlan.days
                      .filter((day) => segmentContainsDate(segment, day.date))
                      .map((day) => (
                        <button
                          key={day.date}
                          type="button"
                          className={`header-day-option ${day.date === selectedDate ? 'active' : ''}`}
                          onClick={() => selectDate(day.date)}
                        >
                          <span>{formatDateLabel(day.date)}</span>
                          <span className="header-day-option-tags">
                            {day.date === todayDate ? <span className="today-tag">Today</span> : null}
                            {dayHasPhotos(day) ? <span className="photo-tag">Pics</span> : null}
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          </details>
          <button type="button" className="secondary-btn" onClick={goToToday} disabled={selectedDate === todayDate}>
            Today
          </button>
        </div>
      </header>
      <p className="sr-only-status" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      {uiAlert ? (
        <section className={`ui-alert ${uiAlert.level}`} role="status" aria-live="polite">
          <span>{uiAlert.message}</span>
          <button type="button" className="secondary-btn" onClick={() => setUiAlert(null)}>
            Dismiss
          </button>
        </section>
      ) : null}

      <section id="primary-content">
        <section className="trip-workspace" data-testid="trip-workspace">
          <div className="trip-main">
            <section className="day-summary-strip card" data-testid="day-summary-strip">
              <div className="pill-row compact day-overview-pills">
                {selectedDate === todayDate ? <span className="today-tag">Today</span> : null}
                {selectedDayHasPhotos ? <span className="photo-tag">Pics</span> : null}
                <span className="pill">{selectedItems.length} stops</span>
                <span className="pill">{selectedDayAnnotations.length} updates</span>
                <span className="pill">{selectedDayMediaCount} media</span>
              </div>
              <p className="day-context-now">
                {selectedDate === todayDate
                  ? nowAndNext.current
                    ? `Now: ${nowAndNext.current.title}`
                    : 'Nothing is scheduled right now.'
                  : nowAndNext.current
                    ? `At this point in the day: ${nowAndNext.current.title}`
                    : 'Nothing is scheduled around this time of day.'}
                {'  '}
                {nowAndNext.next
                  ? selectedDate === todayDate
                    ? `Next: ${nowAndNext.next.title}`
                    : `Coming up next: ${nowAndNext.next.title}`
                  : 'No next stop scheduled.'}
              </p>
            </section>

            <nav className="section-jump-row" aria-label="Section jump links" data-testid="section-jump-row">
              <a href="#trip-map">Map</a>
              <a href="#day-plan">Plan</a>
              <a href="#trip-updates">Updates</a>
              <a href="#trip-media">Media</a>
            </nav>

            {renderMapCard('primary-map')}

            <section className="day-story-grid">
              <article className="card" data-testid="day-timeline-card" id="day-plan">
                <div className="card-header-row trip-section-header">
                  <div>
                    <h2>Day Timeline</h2>
                    <p className="hint">Switch between the fuller itinerary and the lighter trip summary.</p>
                  </div>
                  <div className="toggle-row" role="group" aria-label="Day timeline mode">
                    <button
                      type="button"
                      className={selectedDay.activeView === 'summary' ? 'active' : ''}
                      onClick={() => setDayViewMode(selectedDay.date, 'summary')}
                    >
                      Trip Summary
                    </button>
                    <button
                      type="button"
                      className={selectedDay.activeView === 'detail' ? 'active' : ''}
                      disabled={selectedDay.detailItems.length === 0}
                      onClick={() => setDayViewMode(selectedDay.date, 'detail')}
                    >
                      Detailed Plan
                    </button>
                  </div>
                </div>
                <p className="hint">Currently viewing the {dayModeLabel.toLowerCase()}.</p>
                <ol className="timeline-list">
                  {selectedItems.map((item) => (
                    <li key={item.id} className={item.id === currentItemId ? 'is-current' : ''}>
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

              <section
                className={`day-annotations ${selectedDayAnnotations.length === 0 ? 'is-empty' : ''}`}
                aria-label="Trip updates"
                data-testid="trip-updates-card"
                id="trip-updates"
              >
                <div className="day-annotations-header">
                  <h2>Trip Updates</h2>
                  <span className="day-annotations-count">{selectedDayAnnotations.length}</span>
                </div>
                <p className="day-annotations-subtitle">Family thread, travelogue notes, and guide updates.</p>
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
            </section>

            <section id="trip-media" className="day-media-block">
              {renderActualMomentsCard(visiblePhotoRows, photoScope === 'selected_day' && mainPageUsesNearbyFallback)}
            </section>
          </div>
        </section>
      </section>

      <footer className="status-row">
        <span>{statusMessage}</span>
        <span>
          {runtimeCapabilities.mode === 'live'
            ? `Live services connected${extractEnabled ? ' and ready for imports' : ''}`
            : 'Fallback services active'}
        </span>
      </footer>
    </main>
  );
}

export function sourceDocumentIdFromName(fileName: string) {
  return `${slugify(fileName)}-${Date.now()}`;
}
