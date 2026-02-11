#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not found."
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required but not found."
  exit 1
fi

TITLE="${1:-chore: automated verified commit}"

echo "[1/3] Running tests..."
npm test

echo "[2/3] Running web build..."
npm run build

echo "[3/3] Running tauri build check..."
(
  cd src-tauri
  cargo build
)

git add -A

if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

STAT_SUMMARY="$(git diff --cached --shortstat || true)"
FILE_LINES="$(git diff --cached --name-status)"

COMMIT_MSG_FILE="$(mktemp)"
{
  echo "$TITLE"
  echo
  echo "Auto-generated comments:"
  echo "- Verification: npm test, npm run build, cargo build (all passed)"
  if [[ -n "$STAT_SUMMARY" ]]; then
    echo "- Diff summary: $STAT_SUMMARY"
  fi
  echo "- Changed files:"
  while IFS=$'\t' read -r status path extra; do
    case "$status" in
      A) label="added" ;;
      M) label="modified" ;;
      D) label="deleted" ;;
      R*) label="renamed" ;;
      *) label="updated" ;;
    esac

    if [[ "$label" == "renamed" && -n "${extra:-}" ]]; then
      echo "  - [$label] $path -> $extra"
    else
      echo "  - [$label] $path"
    fi
  done <<< "$FILE_LINES"
} > "$COMMIT_MSG_FILE"

git commit -F "$COMMIT_MSG_FILE"
rm -f "$COMMIT_MSG_FILE"

echo "Commit completed."
