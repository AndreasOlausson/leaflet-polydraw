#!/bin/sh

# Run only if the argument is "wipe"
if [ "$1" != "wipe" ]; then
  echo "🛑 Skipping Docker cleanup — this script only runs with argument: wipe"
  echo "Usage: ./aggressive_docker_cleanup.sh run"
  exit 0
fi

echo "🧹 AGGRESSIVE Docker cleanup - removing ALL Docker data"
echo "======================================================="
echo "⚠️  This will permanently remove ALL Docker containers, images, volumes, networks, and build caches"
echo ""

# Stop and remove all running/stopped containers
echo "Stopping and removing all containers..."
docker stop $(docker ps -aq) 2>/dev/null || echo "No containers to stop"
docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"

# Remove all images including intermediate layers
echo "Removing all Docker images..."
docker rmi $(docker images -aq) --force 2>/dev/null || echo "No images to remove"

# Prune all builder caches
echo "Cleaning builder cache..."
docker builder prune -af

# Remove all unused Docker data including volumes
echo "Running system prune (includes volumes)..."
docker system prune -af --volumes

# Clean buildx cache if it exists
echo "Cleaning buildx cache..."
docker buildx prune -af 2>/dev/null || echo "No buildx cache to clean"

echo ""
echo "✅ COMPLETE: Docker cleanup finished"
echo "Next Docker build will be from a fully clean slate."