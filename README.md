# Parents Trip Companion

Standalone family travel companion app for the itinerary window **February 3, 2026** through **April 5, 2026**.

- `web/`: Vite + React + TypeScript + Leaflet (GitHub Pages target)
- `api/`: Cloudflare Workers + Hono + TypeScript
- Passcode gate with JWT session
- Document upload + review-before-merge flow (`PDF`, `DOCX`, `DOC`, `TXT`)
- Today-first dashboard with map, location scoring, live recommendations, and chat

## Architecture

- Frontend stores merged itinerary and view preferences in browser storage.
- API stores no long-lived user state; it returns extraction/recommendation/chat payloads.
- CORS is restricted to configured origins.
- Upload parsing is local-first from raw file text; OpenAI extraction is optional when key is present.

## Run Locally

```bash
cd /Users/evanbarley-greenfield/Downloads/untitled\ folder/parents-trip-companion
npm install
npm run dev       # web on Vite default port
npm run dev:api   # Worker local dev
```

## Validate

```bash
cd /Users/evanbarley-greenfield/Downloads/untitled\ folder/parents-trip-companion
npm run lint
npm test
npm run typecheck
npm run build
```

## Environment Variables

### Web (`web/.env`)

- `VITE_API_BASE_URL` (default `http://127.0.0.1:8787`)
- `VITE_BASE_PATH` (set to `/parents-trip-companion/` for GitHub Pages)

### API (`api/.dev.vars` for local)

- `JWT_SECRET`
- `PASSCODE_HASH` (SHA-256 hex of your passcode)
- `ALLOWED_ORIGIN`
- `GOOGLE_PLACES_API_KEY` (optional, fallback recommendations otherwise)
- `OPENAI_API_KEY` (optional, fallback chat/extraction otherwise)
- `OPENAI_MODEL` (optional; default `gpt-4.1-mini`)

Default fallback passcode (if `PASSCODE_HASH` is not set) is:

- `parents2026`

To generate passcode hash quickly in Node:

```bash
node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode(process.argv[1])).then(d=>console.log([...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')))" "your-passcode"
```

## Deployment Notes

- Web deploy target: GitHub Pages (set `VITE_BASE_PATH=/parents-trip-companion/` at build).
- API deploy target: Cloudflare Workers (`wrangler deploy`).
- Set production CORS origin to your Pages origin.

## Favicon

Global EBG favicon files are included in `web/public/`:
- `favicon.ico`
- `favicon.svg`

HTML head snippet:

```html
<link rel="icon" type="image/x-icon" href="./favicon.ico" />
<link rel="icon" type="image/svg+xml" sizes="any" href="./favicon.svg" />
<link rel="shortcut icon" href="./favicon.ico" />
```

## Review

- Local web URL: [http://localhost:5173](http://localhost:5173)
- Planned production web URL: [https://evbarleyg.github.io/parents-trip-companion/](https://evbarleyg.github.io/parents-trip-companion/)
