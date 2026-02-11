#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: ./scripts/dev-macos.sh [options]

Options:
  --proxy <url>      Set HTTP(S)_PROXY for install/dev network calls.
  --skip-install     Skip npm dependency installation.
  -h, --help         Show this help.
EOF
}

PROXY="${NEXA_PROXY:-}"
SKIP_INSTALL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --proxy)
      PROXY="${2:-}"
      shift 2
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not found."
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "Rust toolchain not found (cargo missing)."
  echo "Install Rust first: https://www.rust-lang.org/tools/install"
  exit 1
fi

if [[ -n "$PROXY" ]]; then
  export HTTP_PROXY="$PROXY"
  export HTTPS_PROXY="$PROXY"
  echo "Using proxy: $PROXY"
fi

cd "$PROJECT_ROOT"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "Installing/updating npm dependencies..."
  npm install
else
  echo "Skipping dependency installation."
fi

npm run dev:tauri
