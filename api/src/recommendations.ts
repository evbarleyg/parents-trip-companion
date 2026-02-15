import type { RecCategory, RecommendationItem } from './types';

interface GooglePlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    currentOpeningHours?: { openNow?: boolean };
    googleMapsUri?: string;
  }>;
}

const TYPES_BY_CATEGORY: Record<RecCategory, string[]> = {
  sights: ['tourist_attraction', 'museum', 'park', 'point_of_interest'],
  food: ['restaurant'],
  coffee: ['cafe'],
  rest: ['lodging', 'spa'],
};

export function haversineMeters(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;

  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function mapPlacesResponse(
  payload: GooglePlacesSearchResponse,
  category: RecCategory,
  origin: [number, number],
): RecommendationItem[] {
  const places = Array.isArray(payload.places) ? payload.places : [];

  return places
    .map((place, index) => {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;

      const distanceMeters = Math.round(haversineMeters(origin, [lat, lng]));
      return {
        placeId: place.id || `generated-${index}`,
        name: place.displayName?.text || 'Unknown place',
        category,
        distanceMeters,
        rating: typeof place.rating === 'number' ? place.rating : null,
        openNow: typeof place.currentOpeningHours?.openNow === 'boolean' ? place.currentOpeningHours.openNow : null,
        mapsUrl:
          place.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.displayName?.text || 'place'} @${lat},${lng}`)}`,
      } as RecommendationItem;
    })
    .filter((item): item is RecommendationItem => Boolean(item))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

function fallbackRecommendations(origin: [number, number], category: RecCategory): RecommendationItem[] {
  const label = category[0].toUpperCase() + category.slice(1);

  return Array.from({ length: 4 }).map((_, index) => {
    const lat = origin[0] + (index + 1) * 0.002;
    const lng = origin[1] + (index + 1) * 0.0015;
    return {
      placeId: `fallback-${category}-${index}`,
      name: `${label} Pick ${index + 1}`,
      category,
      distanceMeters: 250 * (index + 1),
      rating: null,
      openNow: null,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${label} ${index + 1}`)}`,
    } satisfies RecommendationItem;
  });
}

export async function fetchNearbyRecommendations(params: {
  lat: number;
  lng: number;
  category: RecCategory;
  radiusMeters: number;
  apiKey?: string;
}): Promise<RecommendationItem[]> {
  const origin: [number, number] = [params.lat, params.lng];

  if (!params.apiKey) {
    return fallbackRecommendations(origin, params.category);
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': params.apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.location,places.rating,places.currentOpeningHours.openNow,places.googleMapsUri',
      },
      body: JSON.stringify({
        includedTypes: TYPES_BY_CATEGORY[params.category],
        maxResultCount: 8,
        locationRestriction: {
          circle: {
            center: {
              latitude: params.lat,
              longitude: params.lng,
            },
            radius: Math.max(300, Math.min(params.radiusMeters, 50000)),
          },
        },
      }),
    });

    if (!response.ok) {
      return fallbackRecommendations(origin, params.category);
    }

    const payload = (await response.json()) as GooglePlacesSearchResponse;
    const mapped = mapPlacesResponse(payload, params.category, origin);
    if (mapped.length === 0) return fallbackRecommendations(origin, params.category);
    return mapped;
  } catch {
    return fallbackRecommendations(origin, params.category);
  }
}
