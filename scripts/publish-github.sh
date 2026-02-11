#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: ./scripts/publish-github.sh --repo <owner/name> [--public|--private]

Examples:
  ./scripts/publish-github.sh --repo your-name/Nexa --public
  ./scripts/publish-github.sh --repo your-org/Nexa --private
EOF
}

REPO=""
VISIBILITY="public"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --public)
      VISIBILITY="public"
      shift
      ;;
    --private)
      VISIBILITY="private"
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

if [[ -z "$REPO" ]]; then
  echo "--repo is required."
  usage
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required but not found."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login"
  exit 1
fi

cd "$PROJECT_ROOT"

if [[ -z "$(git remote)" ]]; then
  gh repo create "$REPO" "--$VISIBILITY" --source . --remote origin --push
else
  git push -u origin "$(git branch --show-current)"
fi

echo "Repository published to GitHub: https://github.com/$REPO"
