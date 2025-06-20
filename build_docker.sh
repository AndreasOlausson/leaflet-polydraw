#!/bin/sh

DOCKER_TAG=${1:-my-app}
DOCKER_DEFAULT_PLATFORM=${2:-linux/amd64}

echo "Building Docker image: $DOCKER_TAG"
echo "Platform: $DOCKER_DEFAULT_PLATFORM"
echo ""

# Build Docker image from project root context (so it can access Leaflet.Polydraw)
echo "Building Docker image from project root context..."
docker build --platform $DOCKER_DEFAULT_PLATFORM -f Polydraw_Docker/Dockerfile -t $DOCKER_TAG .
