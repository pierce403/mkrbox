#!/usr/bin/env bash
set -euo pipefail

IMAGE="${ISAAC_SIM_IMAGE:-nvcr.io/nvidia/isaac-sim:latest}"
PULL_IMAGE=0

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

if [[ "$PULL_IMAGE" -eq 1 ]]; then
  docker pull "$IMAGE"
fi

docker run --gpus all --rm \
  -e "ACCEPT_EULA=Y" \
  "$IMAGE" "$@"
