#!/usr/bin/env bash
# PC -> GHCR -> VM  (Linux / macOS / WSL)
# Usage:  ./scripts/pc-build-push.sh [latest] [vm-host]
#   ./scripts/pc-build-push.sh latest
#   ./scripts/pc-build-push.sh latest personal-vm
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TAG="${1:-latest}"
IMAGE="ghcr.io/susin-d/dashboard-backend"
VM_HOST="${2:-}"

echo "== GHCR login =="
echo "Paste PAT with write:packages"
docker login ghcr.io -u susin-d

echo "== Build backend (server) =="
docker build -f server/Dockerfile -t "${IMAGE}:${TAG}" -t "${IMAGE}:latest" ./server

echo "== Push to GHCR =="
docker push "${IMAGE}:${TAG}"
if [ "$TAG" != "latest" ]; then docker push "${IMAGE}:latest"; fi

echo ""
echo "Pushed ${IMAGE}:${TAG}"
echo "GHCR: https://github.com/susin-d/dashboard/pkgs/container/dashboard-backend"

if [ -n "$VM_HOST" ]; then
  echo ""
  echo "== Pull on VM ($VM_HOST) =="
  if [[ "$VM_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ ]]; then
    ssh "$VM_HOST" "cd ~/starwaves 2>/dev/null || git clone https://github.com/susin-d/dashboard.git ~/starwaves; cd ~/starwaves; git pull; docker pull ${IMAGE}:${TAG}; docker tag ${IMAGE}:${TAG} ${IMAGE}:latest; docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d; docker compose -f docker-compose.yml -f docker-compose.backend.yml ps; curl -fsS http://localhost:8000/api/v1/health && echo 'health ok'"
  else
    gcloud compute ssh "$VM_HOST" --zone=us-central1-a --command="cd ~/starwaves 2>/dev/null || git clone https://github.com/susin-d/dashboard.git ~/starwaves; cd ~/starwaves; git pull; docker pull ${IMAGE}:${TAG}; docker tag ${IMAGE}:${TAG} ${IMAGE}:latest; docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d; docker compose -f docker-compose.yml -f docker-compose.backend.yml ps; curl -fsS http://localhost:8000/api/v1/health && echo 'health ok'"
  fi
fi

echo ""
echo "On VM, run:"
echo "  docker pull ${IMAGE}:${TAG}"
echo "  docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d"
