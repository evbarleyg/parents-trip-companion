import type {
  ChatContext,
  ExtractResponse,
  RecommendationItem,
  RecCategory,
  UnlockResponse,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
const FALLBACK_PASSCODE = 'parents2026';

function fallbackRecommendations(
  lat: number,
  lng: number,
  category: RecCategory,
): RecommendationItem[] {
  const label = category[0].toUpperCase() + category.slice(1);
  return Array.from({ length: 4 }).map((_, index) => {
    const placeLat = lat + (index + 1) * 0.0015;
    const placeLng = lng + (index + 1) * 0.0012;
    return {
      placeId: `fallback-${category}-${index + 1}`,
      name: `${label} Option ${index + 1}`,
      category,
      distanceMeters: 200 * (index + 1),
      rating: null,
      openNow: null,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${label} @${placeLat},${placeLng}`)}`,
    } as RecommendationItem;
  });
}

function hasApiBaseUrl(): boolean {
  return Boolean(API_BASE_URL.trim());
}

async function requestJson<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  if (!hasApiBaseUrl()) {
    throw new Error('API base URL is not configured.');
  }

  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl(): string {
  return hasApiBaseUrl() ? API_BASE_URL : 'fallback-mode (no backend)';
}

export async function unlockPasscode(passcode: string): Promise<UnlockResponse> {
  if (!hasApiBaseUrl()) {
    if (passcode !== FALLBACK_PASSCODE) {
      throw new Error('Invalid passcode.');
    }
    return {
      token: `local-fallback-${Date.now()}`,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };
  }

  return requestJson<UnlockResponse>('/v1/auth/unlock', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
}

export async function extractDocument(file: File, token: string): Promise<ExtractResponse> {
  if (!hasApiBaseUrl()) {
    return {
      documentId: `local-${Date.now()}`,
      tripPatch: {
        daysAdded: [],
        daysUpdated: [],
        conflicts: [],
        parseConfidence: 0.2,
      },
      warnings: [
        'Upload parsing requires backend API. Configure VITE_API_BASE_URL to enable extraction and merge.',
        `Received file: ${file.name}`,
      ],
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  return requestJson<ExtractResponse>(
    '/v1/documents/extract',
    {
      method: 'POST',
      body: formData,
    },
    token,
  );
}

export async function getNearbyRecommendations(
  params: {
    lat: number;
    lng: number;
    date: string;
    timeLocal: string;
    category: RecCategory;
    radiusMeters: number;
  },
  token: string,
): Promise<RecommendationItem[]> {
  if (!hasApiBaseUrl()) {
    return fallbackRecommendations(params.lat, params.lng, params.category);
  }

  const response = await requestJson<{ items: RecommendationItem[] }>(
    '/v1/recommendations/nearby',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    token,
  );
  return response.items;
}

export async function askRecommendationChat(
  input: {
    question: string;
    context: ChatContext;
    nearby: RecommendationItem[];
  },
  token: string,
): Promise<{ answer: string; highlights: RecommendationItem[] }> {
  if (!hasApiBaseUrl()) {
    const highlights = input.nearby.length > 0 ? input.nearby.slice(0, 4) : [];
    const regionText = input.context.region || 'your current area';
    const lead =
      highlights.length > 0
        ? `Try these first: ${highlights.map((item) => item.name).join(', ')}.`
        : 'Load quick recommendations first so I can prioritize nearby options.';
    return {
      answer: `Fallback chat mode is active (no backend). For ${regionText}, ${lead}`,
      highlights,
    };
  }

  return requestJson<{ answer: string; highlights: RecommendationItem[] }>(
    '/v1/chat/recommendations',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}
