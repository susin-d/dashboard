# pc-build-image.ps1 — Build backend image on LOCAL Windows PC and send to VM
# Two modes:
#   GHCR (default):  docker push → VM pulls via GHCR (needs PAT)
#   DIRECT: docker save → gcloud scp → VM docker load (no PAT, fastest)
#
# Usage:
#   .\scripts\pc-build-image.ps1                  # GHCR latest
#   .\scripts\pc-build-image.ps1 -Tag mytest      # GHCR mytest
#   .\scripts\pc-build-image.ps1 -Direct          # direct transfer
#   .\scripts\pc-build-image.ps1 -Direct -Tag mytest -Vm personal-vm -Zone us-central1-a
param(
  [string]$Tag = "latest",
  [switch]$Direct,
  [string]$Vm = "personal-vm",
  [string]$Zone = "us-central1-a",
  [string]$Image = "ghcr.io/susin-d/dashboard-backend"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
$mode = if ($Direct) { "direct" } else { "ghcr" }

Write-Host "== Build backend (server) -> ${Image}:${Tag}  [mode=$mode] ==" -ForegroundColor Cyan
docker build -f server/Dockerfile -t "${Image}:${Tag}" -t "${Image}:latest" ./server
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }
Write-Host "Built ${Image}:${Tag}" -ForegroundColor Green

if ($mode -eq "ghcr") {
  Write-Host "== Push to GHCR ==" -ForegroundColor Cyan
  docker login ghcr.io -u susin-d
  if ($LASTEXITCODE -ne 0) { throw "docker login failed" }
  docker push "${Image}:${Tag}"
  if ($Tag -ne "latest") { docker push "${Image}:latest" }
  Write-Host "Pushed ${Image}:${Tag}" -ForegroundColor Green
  Write-Host "Next on VM:" -ForegroundColor Yellow
  Write-Host "  gcloud compute ssh $Vm --zone=$Zone --command='bash ~/starwaves/scripts/vm-load-image.sh --tag $Tag'"
  Write-Host "  # or inside VM:  bash scripts/vm-load-image.sh --tag $Tag"
} else {
  Write-Host "== Direct transfer via gcloud scp ==" -ForegroundColor Cyan
  $tmpTar = Join-Path $env:TEMP "starwaves-backend-$Tag.tar.gz"
  Write-Host "Saving ${Image}:${Tag} -> $tmpTar ..."
  # docker save to stdout piped to gzip
  $saveProc = Start-Process -FilePath "docker" -ArgumentList "save","${Image}:${Tag}" -NoNewWindow -PassThru -RedirectStandardOutput "$tmpTar.tmp"
  $saveProc.WaitForExit()
  # Actually docker save outputs tar, we need to gzip it — simpler: docker save | gzip via bash if available, fallback to raw tar
  if (Get-Command gzip -ErrorAction SilentlyContinue) {
    docker save "${Image}:${Tag}" | gzip > $tmpTar
  } else {
    docker save -o $tmpTar "${Image}:${Tag}"
  }
  Get-Item $tmpTar | Format-List Length,Name
  Write-Host "Copy to ${Vm}:/tmp/backend-${Tag}.tar.gz ..."
  gcloud compute scp $tmpTar "${Vm}:/tmp/backend-${Tag}.tar.gz" --zone=$Zone
  if ($LASTEXITCODE -ne 0) { throw "gcloud scp failed" }
  Write-Host "Loading on VM and restarting stack ..."
  gcloud compute ssh $Vm --zone=$Zone --command="bash ~/starwaves/scripts/vm-load-image.sh --tar /tmp/backend-${Tag}.tar.gz --tag $Tag"
  Remove-Item $tmpTar -ErrorAction SilentlyContinue
  Write-Host "Done — direct image live on $Vm" -ForegroundColor Green
}
