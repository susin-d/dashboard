# PC → GHCR → VM  (Windows PowerShell)
# Build on your PC and push to GHCR, then VM pulls.
# 1) Create PAT: GitHub → Settings → Developer settings → PAT classic → write:packages, read:packages
# 2) Run this from repo root:  .\scripts\pc-build-push.ps1 -Tag latest
param(
  [string]$Tag = "latest",
  [string]$Image = "ghcr.io/susin-d/dashboard-backend",
  [string]$VmHost = "",   # optional: e.g. "34.47.1.2" or "personal-vm" (gcloud alias)
  [string]$VmZone = "us-central1-a"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "== GHCR login ==" -ForegroundColor Cyan
# will prompt for PAT if not logged in
docker login ghcr.io -u susin-d
if ($LASTEXITCODE -ne 0) { throw "docker login failed" }

Write-Host "== Build backend (server) ==" -ForegroundColor Cyan
# uses server/Dockerfile, no website
docker build -f server/Dockerfile -t "${Image}:${Tag}" -t "${Image}:latest" ./server
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }

Write-Host "== Push to GHCR ==" -ForegroundColor Cyan
docker push "${Image}:${Tag}"
if ($Tag -ne "latest") { docker push "${Image}:latest" }

Write-Host ""
Write-Host "Pushed ${Image}:${Tag}" -ForegroundColor Green
Write-Host "GHCR: https://github.com/susin-d/dashboard/pkgs/container/dashboard-backend"

if ($VmHost) {
  Write-Host ""
  Write-Host "== Pull on VM ($VmHost) ==" -ForegroundColor Cyan
  $vmCmd = "cd ~/starwaves 2>/dev/null || git clone https://github.com/susin-d/dashboard.git ~/starwaves; cd ~/starwaves; git pull; echo 'pulling ${Image}:${Tag}'; docker pull ${Image}:${Tag}; docker tag ${Image}:${Tag} ${Image}:latest; docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d; docker compose -f docker-compose.yml -f docker-compose.backend.yml ps; curl -fsS http://localhost:8000/api/v1/health && echo 'health ok'"
  if ($VmHost -match "^\d+\.\d+") {
    ssh "${VmHost}" $vmCmd
  } else {
    gcloud compute ssh $VmHost --zone=$VmZone --command="$vmCmd"
  }
}

Write-Host ""
Write-Host "On VM, run:" -ForegroundColor Yellow
Write-Host "  docker pull ${Image}:${Tag}"
Write-Host "  docker compose -f docker-compose.yml -f docker-compose.backend.yml -f docker-compose.ghcr.backend.yml up -d"
Write-Host "  curl -i http://localhost:8000/api/v1/health"
