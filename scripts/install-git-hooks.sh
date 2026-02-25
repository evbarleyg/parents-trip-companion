#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT_DIR/.githooks"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

fail() {
  printf "[guardrails] ERROR: %s\n" "$1" >&2
  exit 1
}

if [[ ! -f "$PRE_PUSH_HOOK" ]]; then
  fail "Missing $PRE_PUSH_HOOK. Pull latest repo files before installing hooks."
fi

chmod +x "$PRE_PUSH_HOOK"
git config core.hooksPath .githooks

echo "[guardrails] Activated pre-push hook at .githooks/pre-push"
echo "[guardrails] Git hooks path set to .githooks"
