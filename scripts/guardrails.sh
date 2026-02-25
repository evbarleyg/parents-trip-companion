#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-check}"
BASE_REF="${BASE_REF:-origin/main}"
ALLOW_MAIN="${ALLOW_MAIN:-0}"
SKIP_VALIDATION="${SKIP_VALIDATION:-0}"
SKIP_FETCH="${SKIP_FETCH:-0}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf "[guardrails] %s\n" "$1"
}

fail() {
  printf "[guardrails] ERROR: %s\n" "$1" >&2
  exit 1
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail "This command must be run from a git repository."
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == "main" && "$ALLOW_MAIN" != "1" ]]; then
  fail "You are on main. Create a task branch first: git switch -c codex/<task> origin/main"
fi

if [[ "$MODE" != "check" && "$MODE" != "sync" && "$MODE" != "prepush" ]]; then
  fail "Unsupported mode '$MODE'. Use: check | sync | prepush"
fi

if [[ "$SKIP_FETCH" == "1" ]]; then
  log "Skipping fetch (SKIP_FETCH=1). Using current local $BASE_REF reference."
else
  log "Fetching latest main from origin"
  if ! git fetch origin main; then
    fail "Unable to fetch origin/main. Check network/auth, or rerun with SKIP_FETCH=1 to use cached refs."
  fi
fi

read -r BEHIND AHEAD <<<"$(git rev-list --left-right --count "$BASE_REF"...HEAD)"

if [[ "$MODE" == "sync" && "$BEHIND" -gt 0 ]]; then
  log "Branch is behind $BASE_REF by $BEHIND commit(s). Rebasing with autostash."
  git rebase --autostash "$BASE_REF"
  read -r BEHIND AHEAD <<<"$(git rev-list --left-right --count "$BASE_REF"...HEAD)"
fi

if [[ "$BEHIND" -gt 0 ]]; then
  fail "Branch is behind $BASE_REF by $BEHIND commit(s). Run: npm run guardrails:sync"
fi

if [[ "$AHEAD" -eq 0 ]]; then
  log "No local commits yet on $CURRENT_BRANCH."
else
  log "Branch is ahead of $BASE_REF by $AHEAD commit(s)."
fi

if [[ "$SKIP_VALIDATION" == "1" ]]; then
  log "Skipping validation checks (SKIP_VALIDATION=1)."
  exit 0
fi

if [[ "$MODE" == "prepush" ]]; then
  log "Running pre-push checks (lint, typecheck, test)."
  npm run lint
  npm run typecheck
  npm test
  exit 0
fi

log "Running full checks (lint, typecheck, test, build)."
npm run lint
npm run typecheck
npm test
npm run build

log "Guardrails passed."
