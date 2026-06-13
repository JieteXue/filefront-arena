#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
MIN_NODE_MAJOR=20

info() {
  printf '%s\n' "$1"
}

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

node_major() {
  node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf '0'
}

node_is_ready() {
  has_command node && has_command npm && [ "$(node_major)" -ge "$MIN_NODE_MAJOR" ]
}

install_node_macos() {
  has_command brew || fail "Homebrew is required for automatic Node.js install on macOS. Install Homebrew from https://brew.sh/ or install Node.js 20+ manually."
  info "Installing Node.js with Homebrew..."
  brew install node
}

install_node_linux() {
  if has_command apt-get; then
    info "Installing Node.js/npm with apt-get..."
    sudo apt-get update
    sudo apt-get install -y nodejs npm
  elif has_command dnf; then
    info "Installing Node.js/npm with dnf..."
    sudo dnf install -y nodejs npm
  elif has_command yum; then
    info "Installing Node.js/npm with yum..."
    sudo yum install -y nodejs npm
  elif has_command pacman; then
    info "Installing Node.js/npm with pacman..."
    sudo pacman -Sy --needed nodejs npm
  elif has_command zypper; then
    info "Installing Node.js/npm with zypper..."
    sudo zypper install -y nodejs npm
  else
    fail "No supported package manager found. Install Node.js 20+ from https://nodejs.org/ and run npm run setup."
  fi
}

ensure_node() {
  if node_is_ready; then
    info "OK Node.js $(node -v)"
    info "OK npm $(npm -v)"
    return
  fi

  info "Node.js 20+ and npm are required."
  if [ "$(uname -s)" = "Darwin" ]; then
    install_node_macos
  else
    install_node_linux
  fi

  node_is_ready || fail "Node.js is still missing or older than 20. Install Node.js 20+ manually, then run npm run setup."
}

info "filefront-arena bootstrap"
info "project: $ROOT_DIR"
ensure_node
cd "$ROOT_DIR"
npm run setup
