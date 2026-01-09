#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

if ! command -v git-lfs >/dev/null 2>&1; then
  echo "Git LFS is required. Install it and run: git lfs install" >&2
  exit 1
fi

git lfs install

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js v18+ required." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if (( NODE_MAJOR < 18 )); then
  echo "Node.js v18+ required. Detected: $(node -v)" >&2
  exit 1
fi

if [[ -d "$APP_DIR" ]]; then
  cd "$APP_DIR"
  if [[ -f package-lock.json || -f npm-shrinkwrap.json ]]; then
    npm ci
  else
    npm install
  fi
fi

echo "Bootstrap complete."
