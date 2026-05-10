# Claude Code Setup

## Project Snapshot

- `parents-trip-companion` — npm workspaces monorepo with `web/` and `api/` workspaces.
- Python virtualenv at `.venv/` (gitignored); do not commit Python deps.
- Git hooks under `.githooks/`; guardrail scripts under `scripts/` (install via `npm run guardrails:install-hooks`).
- Currently on branch `codex/memory-atlas-finish` with untracked photos and audit scripts — preserve all uncommitted work.

## Claude Workflow

- Make small, reviewable changes without asking first unless the change is architectural, destructive, security-sensitive, or > ~100 LOC across multiple files.
- Do not overwrite user or Codex changes in the worktree (currently dirty).
- Prefer `rg` / `rg --files` for search.
- Use existing patterns before adding abstractions or dependencies.

## Commands

- Dev (web): `npm run dev`
- Dev (api): `npm run dev:api`
- Lint (all workspaces): `npm run lint`
- Typecheck (all workspaces): `npm run typecheck`
- Test (all workspaces): `npm run test`
- Build (all workspaces): `npm run build`
- Guardrails check: `npm run guardrails:check`
- Guardrails sync: `npm run guardrails:sync`
- Guardrails prepush: `npm run guardrails:prepush`
- Install git hooks: `npm run guardrails:install-hooks`

## Sensitive / Generated

- Never read `.env` or `.env.*` (but `.env.example` is OK).
- Never read personal-content folders:
  - `content/photo-inbox/`
  - `content/imessage transcripst/` (typo preserved from gitignore)
  - `content/Instabul Pics/`
  - `content/dad-inbox/**` (personal photos)
- Generated: `.venv/`, `node_modules/`, `tmp/`, `.vite/`, `coverage/`, `.wrangler/`.
- `docs/photo-date-alignment-review.md` and `docs/photo-dedupe-review.md` are gitignored generated reviews — do not commit edits to those.

## Final Response Shape

After code changes, include: short changelog, validation commands run (or clearly state what was not run), risks/edge cases, suggested hardening follow-ups, manual verification steps, and a clickable preview/live URL when applicable.
