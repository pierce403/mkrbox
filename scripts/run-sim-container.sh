#!/usr/bin/env bash
set -euo pipefail

IMAGE="${ISAAC_SIM_IMAGE:-nvcr.io/nvidia/isaac-sim:latest}"

if [[ "${1:-}" == "--image" && -n "${2:-}" ]]; then
  IMAGE="$2"
  shift 2
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

docker run --gpus all --rm \
  -e "ACCEPT_EULA=Y" \
  "$IMAGE" "$@"
