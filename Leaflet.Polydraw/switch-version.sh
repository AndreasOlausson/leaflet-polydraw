#!/bin/bash

# Leaflet Version Switcher for Polydraw Demo
# Usage: ./switch-version.sh [v1|v2]

VERSION=${1:-v2}
DEMO_DIR="/Users/andreasolausson/dev/polydraw/Leaflet.Polydraw/demo"

echo "🔄 Switching to Leaflet $VERSION..."

case $VERSION in
  v1)
    echo "📦 Installing Leaflet v1.9.4..."
    cd "$DEMO_DIR"
    npm install leaflet@^1.9.4
    echo "✅ Switched to Leaflet v1.9.4"
    echo "🚀 Run 'npm run dev' to test with Leaflet v1"
    ;;
  v2)
    echo "📦 Installing Leaflet v2.0.0-alpha.1..."
    cd "$DEMO_DIR"
    npm install leaflet@^2.0.0-alpha.1
    echo "✅ Switched to Leaflet v2.0.0-alpha.1"
    echo "🚀 Run 'npm run dev' to test with Leaflet v2"
    ;;
  *)
    echo "❌ Invalid version. Use 'v1' or 'v2'"
    echo "Usage: $0 [v1|v2]"
    exit 1
    ;;
esac

echo ""
echo "📋 Current Leaflet version:"
npm list leaflet
