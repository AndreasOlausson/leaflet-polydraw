#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 [v1|v2]"
  exit 1
fi

case "$TARGET" in
  v1)
    LEAFLET_VERSION="1.9.4"
    TARGET_MAJOR="1"
    ;;
  v2)
    LEAFLET_VERSION="2.0.0-beta.2"
    TARGET_MAJOR="2"
    ;;
  *)
    echo "Invalid version: $TARGET"
    echo "Usage: $0 [v1|v2]"
    exit 1
    ;;
esac

shift || true

if [[ "${1:-}" == "--" ]]; then
  shift
fi

CUSTOM_COMMAND=()
if [[ "$#" -gt 0 ]]; then
  CUSTOM_COMMAND=("$@")
fi

echo "Switching test environment to Leaflet ${TARGET} (${LEAFLET_VERSION})..."

get_installed_leaflet_version() {
  local prefix="$1"
  node -e "const p = process.argv[1] + '/node_modules/leaflet/package.json'; try { console.log(require(p).version); } catch { process.exit(0); }" "$prefix"
}

ensure_leaflet_major() {
  local prefix="$1"
  local current_version
  local package_file
  local temp_dir
  current_version="$(get_installed_leaflet_version "$prefix")"

  if [[ "$current_version" == "$LEAFLET_VERSION" ]]; then
    echo "Leaflet ${current_version} already installed in ${prefix}; skipping install."
    return
  fi

  # Leaflet has no runtime dependencies. Extracting its package directly avoids
  # re-resolving the project's unrelated devDependencies during matrix runs.
  temp_dir="$(mktemp -d)"
  package_file="$(npm pack --silent --pack-destination "$temp_dir" "leaflet@${LEAFLET_VERSION}")"
  rm -rf "$prefix/node_modules/leaflet"
  mkdir -p "$prefix/node_modules/leaflet"
  tar -xzf "$temp_dir/$package_file" -C "$prefix/node_modules/leaflet" --strip-components=1
  rm -rf "$temp_dir"
}

ensure_leaflet_major "$ROOT_DIR"
ensure_leaflet_major "$ROOT_DIR/demo"

if [[ "${#CUSTOM_COMMAND[@]}" -gt 0 ]]; then
  echo "Running command for Leaflet ${TARGET}: ${CUSTOM_COMMAND[*]}"
  (cd "$ROOT_DIR" && "${CUSTOM_COMMAND[@]}")
  exit 0
fi

echo "Running type checks..."
npm --prefix "$ROOT_DIR" run test:types

echo "Running unit tests..."
npm --prefix "$ROOT_DIR" run test -- --run
