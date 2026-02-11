#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_DIR_DEFAULT="$PROJECT_ROOT/src-tauri/target/release/bundle"
RELEASE_MANIFEST_DEFAULT="$PROJECT_ROOT/dist/releases/macos/latest.json"

usage() {
  cat <<'EOF'
Usage: ./scripts/build-macos.sh [options]

Options:
  --proxy <url>           Set HTTP(S)_PROXY for dependency/build network calls.
  --skip-install          Skip npm dependency installation.
  --skip-tests            Skip npm test.
  --bundle-dir <path>     Override Tauri bundle output dir.
  --manifest-out <path>   Override release manifest output path.
  -h, --help              Show this help.
EOF
}

PROXY="${NEXA_PROXY:-}"
SKIP_INSTALL=0
SKIP_TESTS=0
BUNDLE_DIR="$BUNDLE_DIR_DEFAULT"
RELEASE_MANIFEST="$RELEASE_MANIFEST_DEFAULT"

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
    --skip-tests)
      SKIP_TESTS=1
      shift
      ;;
    --bundle-dir)
      BUNDLE_DIR="${2:-}"
      shift 2
      ;;
    --manifest-out)
      RELEASE_MANIFEST="${2:-}"
      shift 2
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
  echo "cargo is required but not found."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required but not found."
  exit 1
fi

if [[ -n "$PROXY" ]]; then
  export HTTP_PROXY="$PROXY"
  export HTTPS_PROXY="$PROXY"
  echo "Using proxy: $PROXY"
fi

cd "$PROJECT_ROOT"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  if [[ -d node_modules ]]; then
    echo "[1/5] Installing/updating npm dependencies..."
    npm install
  else
    echo "[1/5] Installing npm dependencies (clean)..."
    npm install
  fi
else
  echo "[1/5] Skipping dependency installation."
fi

if [[ "$SKIP_TESTS" -eq 0 ]]; then
  echo "[2/5] Running test suite..."
  npm test
else
  echo "[2/5] Skipping test suite."
fi

echo "[3/5] Running web production build..."
npm run build

echo "[4/5] Building macOS app bundle (Tauri)..."
npm run build:mac

echo "[5/5] Collecting release artifacts..."
APP_VERSION="$(node -e "const cfg=require('./src-tauri/tauri.conf.json'); process.stdout.write(cfg.package.version)")"
MANIFEST_PATH="$(node ./scripts/collect-macos-artifacts.cjs --project-root "$PROJECT_ROOT" --bundle-dir "$BUNDLE_DIR" --out "$RELEASE_MANIFEST" --version "$APP_VERSION")"

echo "macOS release manifest:"
cat "$MANIFEST_PATH"
