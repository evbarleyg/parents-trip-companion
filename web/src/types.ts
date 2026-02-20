export type RecCategory = 'sights' | 'food' | 'coffee' | 'rest';

export type ViewMode = 'summary' | 'detail';
export type AppViewTab = 'trip_overview' | 'day_detail' | 'photo_gallery';
export type MobilePanel = 'map' | 'plan';
export type MapStatus = 'initializing' | 'ready' | 'error';
export type RuntimeMode = 'live' | 'fallback';

export interface ItineraryItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string | null;
  location: string;
  notes: string;
  category: RecCategory;
  lat?: number;
  lng?: number;
}

export interface TripActualPhoto {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

export interface TripActualMoment {
  id: string;
  source: string;
  whenLabel: string;
  text: string;
  photos: TripActualPhoto[];
}

export interface TripDay {
  date: string;
  region: string;
  summaryItems: ItineraryItem[];
  detailItems: ItineraryItem[];
  activeView: ViewMode;
  actualMoments?: TripActualMoment[];
}

export interface SourceDocument {
  id: string;
  name: string;
  kind: 'pdf' | 'docx' | 'doc' | 'txt' | 'unknown';
  uploadedAt: string;
  coversDates: string[];
  status: 'parsed' | 'warning' | 'failed';
}

export interface TripPlan {
  tripName: string;
  startDate: string;
  endDate: string;
  timezone: string;
  days: TripDay[];
  sources: SourceDocument[];
}

export interface TripConflict {
  date: string;
  reason: string;
}

export interface TripPatch {
  daysAdded: TripDay[];
  daysUpdated: TripDay[];
  conflicts: TripConflict[];
  parseConfidence: number;
}

export interface RecommendationItem {
  placeId: string;
  name: string;
  category: RecCategory;
  distanceMeters: number;
  rating: number | null;
  openNow: boolean | null;
  mapsUrl: string;
}

export interface WhereAmIState {
  mode: 'auto' | 'manual' | 'unknown';
  currentLatLng: [number, number] | null;
  activeDayId: string | null;
  activeItemId: string | null;
  confidence: 'high' | 'medium' | 'low';
  lastUpdated: string | null;
}

export interface ChatContext {
  date: string;
  region: string;
  activeItemTitle: string | null;
  activeItemLocation: string | null;
  lat: number | null;
  lng: number | null;
}

export interface UnlockResponse {
  token: string;
  expiresAt: string;
}

export interface ExtractResponse {
  documentId: string;
  tripPatch: TripPatch;
  warnings: string[];
}

export interface FeatureCapabilities {
  extract: boolean;
  recommendations: boolean;
  chat: boolean;
}

export interface CapabilitiesResponse {
  mode: RuntimeMode;
  features: FeatureCapabilities;
}

export interface UiAlert {
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  scope?: string;
}
