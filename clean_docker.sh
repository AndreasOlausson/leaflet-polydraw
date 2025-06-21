#!/bin/sh

echo "🧹 AGGRESSIVE Docker cleanup - removing ALL build artifacts"
echo "=========================================================="
echo "⚠️  This will remove ALL Docker images, containers, networks, and build cache"
echo ""

# Stop and remove all containers
echo "Stopping and removing all containers..."
docker stop $(docker ps -aq) 2>/dev/null || echo "No containers to stop"
docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"

# Remove all images (including intermediate layers)
echo "Removing all Docker images..."
docker rmi $(docker images -aq) --force 2>/dev/null || echo "No images to remove"

# Clean all build cache
echo "Cleaning all build cache..."
docker builder prune -af

# System prune with volumes
echo "Cleaning system (containers, networks, images, volumes)..."
docker system prune -af --volumes

# Clean buildx cache if it exists
echo "Cleaning buildx cache..."
docker buildx prune -af 2>/dev/null || echo "No buildx cache to clean"

echo ""
echo "✅ COMPLETE Docker cleanup finished!"
echo "All Docker data has been removed. Next build will be completely fresh."
