# Where in the World Are Susan and Jim?

Standalone family travel companion app for the itinerary window **February 3, 2026** through **April 5, 2026**.

- `web/`: Vite + React + TypeScript + Leaflet (GitHub Pages target)
- `api/`: Cloudflare Workers + Hono + TypeScript
- No manual lock screen; frontend auto-initializes a local session and attempts backend auto-unlock
- Document upload + review-before-merge flow (`PDF`, `DOCX`, `DOC`, `TXT`)
- Today-first dashboard with map, location scoring, live recommendations, and chat
- Day-level "Actual Moments" cards enriched from the `B-G-M Fam` iMessage export (text snippets + photos + videos)
- Dad content enrichment workflow for raw text + photo drops (review-gated publishing)

## Architecture

- Frontend stores merged itinerary and view preferences in browser storage.
- API stores no long-lived user state; it returns extraction/recommendation/chat payloads.
- CORS is restricted to configured origins.
- Upload parsing is local-first from raw file text; OpenAI extraction is optional when key is present.
- Runtime capability endpoint (`GET /v1/capabilities`) allows the web app to display `live` vs `fallback` status.

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

## Guardrails (Recommended Workflow)

Use this when working across multiple branches so you do not miss new commits from `origin/main`.

```bash
cd /Users/evanbarley-greenfield/Downloads/untitled\ folder/parents-trip-companion
npm run guardrails:install-hooks   # one-time: installs pre-push checks
git switch -c codex/<task-name> origin/main
npm run guardrails:sync            # fetch + rebase on origin/main + full checks
```

Before opening a PR or pushing a follow-up commit:

```bash
cd /Users/evanbarley-greenfield/Downloads/untitled\ folder/parents-trip-companion
npm run guardrails:check
git push -u origin codex/<task-name>
```

Available scripts:

- `npm run guardrails:sync` fetches latest `origin/main`, rebases your branch if needed, then runs lint/typecheck/tests/build.
- `npm run guardrails:check` verifies you are not behind `origin/main` and runs lint/typecheck/tests/build.
- `npm run guardrails:prepush` runs lint/typecheck/tests (used by the pre-push hook).
- `npm run guardrails:install-hooks` installs `.githooks/pre-push` and points git to that hooks path.

Notes:

- Guardrails intentionally block `main` by default so day-to-day work happens on `codex/*` branches.
- If you truly need an emergency `main` fix, you can override once with `ALLOW_MAIN=1 npm run guardrails:check`.
- If you are temporarily offline, run `SKIP_FETCH=1 npm run guardrails:check` to validate against your locally cached `origin/main`.

## Environment Variables

### Web (`web/.env`)

- `VITE_API_BASE_URL` (optional; when omitted app uses frontend fallback mode)
- `VITE_BASE_PATH` (set to `/parents-trip-companion/` for GitHub Pages)

If `VITE_API_BASE_URL` is omitted, web runs in fallback mode:
- app loads directly with local fallback session
- recommendations/chat use local fallback responses
- document extraction requires backend API
- runtime banner will show `Fallback mode` with feature availability

### API (`api/.dev.vars` for local)

- `JWT_SECRET`
- `PASSCODE_HASH` (SHA-256 hex of your passcode)
- `ALLOWED_ORIGIN`
- `GOOGLE_PLACES_API_KEY` (optional, fallback recommendations otherwise)
- `OPENAI_API_KEY` (optional, fallback chat/extraction otherwise)
- `OPENAI_MODEL` (optional; default `gpt-4.1-mini`)

Default backend passcode (if `PASSCODE_HASH` is not set) is:

- `SusanJim2026`

Frontend auto-unlock uses that same default so users are not prompted for passcode on load.

To generate passcode hash quickly in Node:

```bash
node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode(process.argv[1])).then(d=>console.log([...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')))" "your-passcode"
```

## Deployment Notes

- Web deploy target: GitHub Pages (set `VITE_BASE_PATH=/parents-trip-companion/` at build).
- API deploy target: Cloudflare Workers (`wrangler deploy`).
- Set production CORS origin to your Pages origin.

## Dad Content Workflow

- Intake guide: `docs/dad-content-intake.md`
- Unresolved queue: `docs/dad-content-review.md`
- EXIF allocation report (latest drop): `docs/dad-content-exif-allocation-2026-02-20.md`
- Inbox template: `content/dad-inbox/template/`

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
