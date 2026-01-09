#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KIT_ROOT="${KIT_ROOT:-${OMNI_KIT_ROOT:-}}"
KIT_APP=""

if [[ "${1:-}" == "--container" ]]; then
  shift
  "$ROOT_DIR/scripts/run-sim-container.sh" "$@"
  exit 0
fi

find_kit_app() {
  local search_root="$1"
  if [[ -d "$search_root" ]]; then
    local found
    found="$(find "$search_root" -maxdepth 4 -type f \\( -name 'kit' -o -name 'kit.sh' \\) 2>/dev/null | sort -r | head -n 1)"
    if [[ -n "$found" && -x "$found" ]]; then
      echo "$found"
      return 0
    fi
  fi
  return 1
}

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
  if [[ "$(uname -s)" == "Darwin" ]]; then
    KIT_APP="$(find_kit_app "$HOME/Library/Application Support/ov/pkg" || true)"
  else
    KIT_APP="$(find_kit_app "$HOME/.local/share/ov/pkg" || true)"
  fi
fi

if [[ -z "$KIT_APP" ]]; then
  echo "Kit app not found. Set KIT_ROOT to your Kit SDK install." >&2
  echo "Example: export KIT_ROOT=/path/to/kit-sdk" >&2
  echo "Tip: run with --container to use Isaac Sim container instead." >&2
  exit 1
fi

"$KIT_APP" "$ROOT_DIR/sim/app/mkrbox.app.kit" "$@"
