#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$ROOT_DIR/web"

if [[ ! -d "$WEB_DIR" ]]; then
  echo "Missing web app directory: $WEB_DIR" >&2
  echo "Create the React app in ./web (e.g. Vite/CRA) and try again." >&2
  exit 1
fi

if [[ ! -f "$WEB_DIR/package.json" ]]; then
  echo "Missing package.json in $WEB_DIR" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js v18+ and try again." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if (( NODE_MAJOR < 18 )); then
  echo "Node.js v18+ required. Detected: $(node -v)" >&2
  exit 1
fi

cd "$WEB_DIR"

if [[ ! -d node_modules ]]; then
  if [[ -f package-lock.json || -f npm-shrinkwrap.json ]]; then
    npm ci
  else
    npm install
  fi
fi

if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.dev ? 0 : 1)"; then
  npm run dev
else
  npm run start
fi
