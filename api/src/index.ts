import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { issueToken, verifyPasscode, verifyToken } from './auth';
import { generateRecommendationChat } from './chat';
import { extractTextFromFile } from './extract';
import { extractTripPatchFromText } from './parser';
import { checkRateLimit } from './rate-limit';
import { fetchNearbyRecommendations } from './recommendations';
import type { AuthPayload, EnvBindings, RecCategory } from './types';

type AppEnv = {
  Bindings: EnvBindings;
  Variables: {
    auth: AuthPayload;
  };
};

function allowedOrigins(env: EnvBindings): Set<string> {
  const set = new Set<string>(['http://localhost:5173', 'https://evbarleyg.github.io']);
  if (env.ALLOWED_ORIGIN) set.add(env.ALLOWED_ORIGIN);
  return set;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function requireAuth(c: Context<AppEnv>): Promise<AuthPayload | null> {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) return null;

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set('auth', payload);
    return payload;
  } catch {
    return null;
  }
}

export const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'anon';
  const key = `${ip}:${c.req.path}`;

  if (!checkRateLimit(key, 120, 60_000)) {
    return c.json({ error: 'Rate limit exceeded. Try again shortly.' }, 429);
  }

  await next();
});

app.use('*', async (c, next) => {
  const middleware = cors({
    origin: (origin, ctx) => {
      if (!origin) return '';
      const allowed = allowedOrigins(ctx.env);
      return allowed.has(origin) ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  return middleware(c, next);
});

app.get('/v1/health', (c) => c.json({ ok: true }));

app.post('/v1/auth/unlock', async (c) => {
  const payload = await c.req.json<{ passcode?: string }>().catch(() => null);
  const passcode = payload?.passcode?.trim() || '';

  if (!passcode) {
    return c.json({ error: 'Passcode is required.' }, 400);
  }

  if (!c.env.JWT_SECRET) {
    return c.json({ error: 'JWT secret is not configured.' }, 500);
  }

  const valid = await verifyPasscode(passcode, c.env);
  if (!valid) {
    return c.json({ error: 'Invalid passcode.' }, 401);
  }

  const token = await issueToken(c.env.JWT_SECRET);
  return c.json(token);
});

app.post('/v1/documents/extract', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized.' }, 401);
  }

  const form = await c.req.parseBody();
  const value = form.file;
  const file = Array.isArray(value) ? value[0] : value;

  if (!(file instanceof File)) {
    return c.json({ error: 'A file field is required.' }, 400);
  }

  const { text, warnings: extractWarnings } = await extractTextFromFile(file);
  const { tripPatch, warnings: parserWarnings } = await extractTripPatchFromText(text, file.name, c.env);

  return c.json({
    documentId: `${Date.now()}-${slugify(file.name || 'upload')}`,
    tripPatch,
    warnings: [...extractWarnings, ...parserWarnings],
  });
});

app.post('/v1/recommendations/nearby', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized.' }, 401);
  }

  const body = await c.req
    .json<{
      lat?: number;
      lng?: number;
      date?: string;
      timeLocal?: string;
      category?: RecCategory;
      radiusMeters?: number;
    }>()
    .catch(() => null);

  if (!body) {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const radiusMeters = Number(body.radiusMeters || 2500);
  const category = body.category;

  const validCategory = category === 'sights' || category === 'food' || category === 'coffee' || category === 'rest';

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !validCategory) {
    return c.json({ error: 'lat, lng, and valid category are required.' }, 400);
  }

  const items = await fetchNearbyRecommendations({
    lat,
    lng,
    category,
    radiusMeters,
    apiKey: c.env.GOOGLE_PLACES_API_KEY,
  });

  return c.json({ items });
});

app.post('/v1/chat/recommendations', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized.' }, 401);
  }

  const body = await c.req
    .json<{
      question?: string;
      context?: {
        date?: string;
        region?: string;
        activeItemTitle?: string | null;
        activeItemLocation?: string | null;
        lat?: number | null;
        lng?: number | null;
      };
      nearby?: Array<{
        placeId: string;
        name: string;
        category: RecCategory;
        distanceMeters: number;
        rating: number | null;
        openNow: boolean | null;
        mapsUrl: string;
      }>;
    }>()
    .catch(() => null);

  const question = body?.question?.trim() || '';
  if (!question) {
    return c.json({ error: 'question is required.' }, 400);
  }

  const context = {
    date: body?.context?.date || '',
    region: body?.context?.region || 'Current region',
    activeItemTitle: body?.context?.activeItemTitle || null,
    activeItemLocation: body?.context?.activeItemLocation || null,
    lat: body?.context?.lat ?? null,
    lng: body?.context?.lng ?? null,
  };

  const nearby = Array.isArray(body?.nearby) ? body?.nearby : [];

  const response = await generateRecommendationChat({
    question,
    context,
    nearby,
    openAiApiKey: c.env.OPENAI_API_KEY,
    model: c.env.OPENAI_MODEL,
  });

  return c.json(response);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
