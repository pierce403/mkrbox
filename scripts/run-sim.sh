#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KIT_ROOT="${KIT_ROOT:-${OMNI_KIT_ROOT:-}}"
KIT_APP=""

if [[ -n "$KIT_ROOT" ]]; then
  if [[ -x "$KIT_ROOT/kit" ]]; then
    KIT_APP="$KIT_ROOT/kit"
  elif [[ -x "$KIT_ROOT/kit.sh" ]]; then
    KIT_APP="$KIT_ROOT/kit.sh"
  elif [[ -x "$KIT_ROOT/kit/kit.sh" ]]; then
    KIT_APP="$KIT_ROOT/kit/kit.sh"
  fi
fi

if [[ -z "$KIT_APP" ]]; then
  echo "Kit app not found. Set KIT_ROOT to your Kit SDK install." >&2
  echo "Example: export KIT_ROOT=/path/to/kit-sdk" >&2
  exit 1
fi

"$KIT_APP" "$ROOT_DIR/sim/app/mkrbox.app.kit" "$@"
