#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT_DIR/.githooks"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

mkdir -p "$HOOKS_DIR"

cat >"$PRE_PUSH_HOOK" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[pre-push] Running repository guardrails..."
npm run guardrails:prepush
HOOK

chmod +x "$PRE_PUSH_HOOK"
git config core.hooksPath .githooks

echo "[guardrails] Installed pre-push hook at .githooks/pre-push"
echo "[guardrails] Git hooks path set to .githooks"
