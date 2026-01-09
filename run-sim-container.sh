#!/usr/bin/env bash
set -euo pipefail

IMAGE="${ISAAC_SIM_IMAGE:-}"
PULL_IMAGE=0
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sim-container-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "MKRBOX sim container log: $LOG_FILE"

if [[ "${1:-}" == "--image" && -n "${2:-}" ]]; then
  IMAGE="$2"
  shift 2
fi
if [[ "${1:-}" == "--pull" ]]; then
  PULL_IMAGE=1
  shift
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for container mode." >&2
  exit 1
fi

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "NVIDIA driver not detected (nvidia-smi missing)." >&2
  echo "Install NVIDIA drivers and NVIDIA Container Toolkit first." >&2
  exit 1
fi

if [[ -z "$IMAGE" || "$IMAGE" == *":latest" ]]; then
  echo "Isaac Sim image tag is required (no :latest tag exists on NGC)." >&2
  echo "Set ISAAC_SIM_IMAGE or pass --image, for example:" >&2
  echo "  ./run-sim-container.sh --pull --image nvcr.io/nvidia/isaac-sim:<version>" >&2
  echo "Make sure you can pull from NGC (docker login nvcr.io)." >&2
  exit 1
fi

if [[ "$PULL_IMAGE" -eq 1 ]]; then
  docker pull "$IMAGE"
fi

docker run --gpus all --rm \
  -e "ACCEPT_EULA=Y" \
  "$IMAGE" "$@"
