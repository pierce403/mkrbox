#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sim-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "MKRBOX sim launch log: $LOG_FILE"
KIT_ROOT="${KIT_ROOT:-${OMNI_KIT_ROOT:-}}"
KIT_APP=""

if [[ "${1:-}" == "--container" ]]; then
  shift
  "$ROOT_DIR/run-sim-container.sh" "$@"
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
  echo "" >&2
  echo "If you are new to Kit/Omniverse, use container mode instead:" >&2
  echo "  ./run-sim.sh --container --image nvcr.io/nvidia/isaac-sim:<version>" >&2
  exit 1
fi

"$KIT_APP" "$ROOT_DIR/sim/app/mkrbox.app.kit" "$@"
