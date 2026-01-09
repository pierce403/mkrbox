#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
AUTO_INSTALL=0
MODE="auto"
SKIP_APP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto|--yes)
      AUTO_INSTALL=1
      shift
      ;;
    --mode=kit|--mode=container)
      MODE="${1#*=}"
      shift
      ;;
    --skip-app)
      SKIP_APP=1
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

prompt_install() {
  local prompt="$1"
  if [[ "$AUTO_INSTALL" -eq 1 ]]; then
    return 0
  fi
  if [[ -t 0 ]]; then
    read -r -p "$prompt [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]]
    return $?
  fi
  return 1
}

detect_pkg_mgr() {
  if command -v apt-get >/dev/null 2>&1; then
    echo "apt"
  elif command -v dnf >/dev/null 2>&1; then
    echo "dnf"
  elif command -v yum >/dev/null 2>&1; then
    echo "yum"
  elif command -v pacman >/dev/null 2>&1; then
    echo "pacman"
  elif command -v brew >/dev/null 2>&1; then
    echo "brew"
  else
    echo ""
  fi
}

install_pkgs() {
  local pkg_mgr="$1"
  shift
  case "$pkg_mgr" in
    apt)
      sudo apt-get update
      sudo apt-get install -y "$@"
      ;;
    dnf)
      sudo dnf install -y "$@"
      ;;
    yum)
      sudo yum install -y "$@"
      ;;
    pacman)
      sudo pacman -Sy --noconfirm "$@"
      ;;
    brew)
      brew install "$@"
      ;;
    *)
      return 1
      ;;
  esac
}

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

if ! command -v git-lfs >/dev/null 2>&1; then
  PKG_MGR="$(detect_pkg_mgr)"
  if [[ -n "$PKG_MGR" ]] && prompt_install "Install git-lfs via $PKG_MGR?"; then
    install_pkgs "$PKG_MGR" git-lfs
  else
    echo "Git LFS is required. Install it and run: git lfs install" >&2
    exit 1
  fi
fi

git lfs install

if ! command -v node >/dev/null 2>&1; then
  PKG_MGR="$(detect_pkg_mgr)"
  if [[ -n "$PKG_MGR" ]] && prompt_install "Install Node.js via $PKG_MGR?"; then
    case "$PKG_MGR" in
      apt|dnf|yum|pacman)
        install_pkgs "$PKG_MGR" nodejs npm
        ;;
      brew)
        install_pkgs "$PKG_MGR" node
        ;;
    esac
  else
    echo "Node.js v18+ required. Install Node and npm, then re-run bootstrap." >&2
    exit 1
  fi
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if (( NODE_MAJOR < 18 )); then
  echo "Node.js v18+ required. Detected: $(node -v)" >&2
  echo "Install Node 18+ (nvm is recommended) and re-run bootstrap." >&2
  exit 1
fi

if [[ -d "$APP_DIR" && "$SKIP_APP" -eq 0 ]]; then
  cd "$APP_DIR"
  if [[ -f package-lock.json || -f npm-shrinkwrap.json ]]; then
    npm ci
  else
    npm install
  fi
fi

if [[ "$MODE" == "container" || "$MODE" == "auto" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required for container-based sim runs." >&2
    echo "Install Docker and NVIDIA Container Toolkit, then re-run bootstrap." >&2
  fi
  if ! command -v nvidia-smi >/dev/null 2>&1; then
    echo "NVIDIA driver not detected (nvidia-smi missing)." >&2
    echo "Install NVIDIA drivers and NVIDIA Container Toolkit for streaming." >&2
  fi
fi

echo "Bootstrap complete."
