export type RecCategory = 'sights' | 'food' | 'coffee' | 'rest';
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

export interface TripDay {
  date: string;
  region: string;
  summaryItems: ItineraryItem[];
  detailItems: ItineraryItem[];
  activeView: 'summary' | 'detail';
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

export interface EnvBindings {
  JWT_SECRET: string;
  PASSCODE_HASH: string;
  ALLOWED_ORIGIN?: string;
  GOOGLE_PLACES_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

export interface AuthPayload {
  sub: string;
  scope: 'family';
  exp: number;
  iat: number;
}

export interface CapabilitiesResponse {
  mode: RuntimeMode;
  features: {
    extract: boolean;
    recommendations: boolean;
    chat: boolean;
  };
}
