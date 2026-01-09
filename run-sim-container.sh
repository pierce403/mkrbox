#!/usr/bin/env bash
set -euo pipefail

IMAGE=""
PULL_IMAGE=0
EXTRA_ARGS=()
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sim-container-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "MKRBOX sim container log: $LOG_FILE"
echo "Stage 1/3: Checking prerequisites..."

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --pull)
      PULL_IMAGE=1
      shift
      ;;
    --)
      shift
      EXTRA_ARGS+=("$@")
      break
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$IMAGE" ]]; then
  IMAGE="${ISAAC_SIM_IMAGE:-}"
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
  echo "" >&2
  echo "Next steps:" >&2
  echo "1) NVIDIA NGC (NVIDIA GPU Cloud) is NVIDIA's container registry/catalog." >&2
  echo "   Sign in: https://ngc.nvidia.com/signin" >&2
  echo "2) Generate an NGC API key:" >&2
  echo "   https://org.ngc.nvidia.com/setup/api-key" >&2
  echo "3) Login to the registry:" >&2
  echo "   docker login nvcr.io" >&2
  echo "   # username: \$oauthtoken" >&2
  echo "   # password: <your NGC API key>" >&2
  echo "4) Open the Isaac Sim container page and choose a tag (no 'latest'):" >&2
  echo "   https://catalog.ngc.nvidia.com/orgs/nvidia/containers/isaac-sim/tags" >&2
  echo "   A tag is the version after the colon, e.g. ':5.1.0'." >&2
  echo "   Example tag shown in NVIDIA docs: nvcr.io/nvidia/isaac-sim:5.1.0" >&2
  echo "5) Run with an explicit tag, for example:" >&2
  echo "   ./run-sim-container.sh --pull --image nvcr.io/nvidia/isaac-sim:5.1.0" >&2
  exit 1
fi

if [[ "$PULL_IMAGE" -eq 1 ]]; then
  if docker image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "Stage 2/3: Image already present, skipping pull."
  else
    echo "Stage 2/3: Pulling image $IMAGE (this can take a while) ..."
    if docker pull --progress=plain "$IMAGE"; then
      echo "Pull complete."
    else
      echo "docker pull --progress not supported, retrying without progress flag..." >&2
      if docker pull "$IMAGE"; then
        echo "Pull complete."
      else
        echo "Image pull failed. Check credentials (docker login nvcr.io) and tag." >&2
        exit 1
      fi
    fi
  fi
fi

echo "Stage 3/3: Starting container..."
docker run --gpus all --rm \
  -e "ACCEPT_EULA=Y" \
  "$IMAGE" "${EXTRA_ARGS[@]}"
