import type {
  ChatContext,
  ExtractResponse,
  RecommendationItem,
  RecCategory,
  UnlockResponse,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8787';

async function requestJson<T>(path: string, init: RequestInit, token?: string): Promise<T> {
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
  return API_BASE_URL;
}

export async function unlockPasscode(passcode: string): Promise<UnlockResponse> {
  return requestJson<UnlockResponse>('/v1/auth/unlock', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
}

export async function extractDocument(file: File, token: string): Promise<ExtractResponse> {
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
  return requestJson<{ answer: string; highlights: RecommendationItem[] }>(
    '/v1/chat/recommendations',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}
