#!/bin/sh

DOCKER_TAG=${1:-my-app}
DOCKER_DEFAULT_PLATFORM=${2:-linux/amd64}

echo "Building Docker image: $DOCKER_TAG"
echo "Platform: $DOCKER_DEFAULT_PLATFORM"
echo ""

# Build the Leaflet.Polydraw plugin first
echo "Building Leaflet.Polydraw plugin..."
cd Leaflet.Polydraw && npm run build
cd ..

# Build Docker image from Polydraw_Docker context
echo "Building Docker image from Polydraw_Docker context..."
cd Polydraw_Docker
docker build --platform $DOCKER_DEFAULT_PLATFORM -t $DOCKER_TAG .
