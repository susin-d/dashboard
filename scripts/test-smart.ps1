<#
.SYNOPSIS
  Smart test runner: skip a suite when its content hash is unchanged.
.DESCRIPTION
  Content-addressed cache over scripts/lib/test-hash.py. Skips only when the
  stored record is schema v1, result=pass, and sha matches the current tree.
  Anything else (miss, corrupt, prior fail, -Force) runs the real suite.
  Fail-closed: any doubt runs the tests.
.EXAMPLE
  ./scripts/test-smart.ps1 -Scope server
  ./scripts/test-smart.ps1 -Scope all -Force
#>
[CmdletBinding()]
param(
  [ValidateSet("server", "website", "worker", "all")][string]$Scope = "all",
  [switch]$Force
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/lib/common.ps1"
$root = (Resolve-Path "$PSScriptRoot/..").Path
$cacheDir = Join-Path $root ".cache/test-smart"
$hashScript = Join-Path $root "scripts/lib/test-hash.py"
$CACHE_SCHEMA = 1

function Get-CurrentSha {
  param([string]$Name)
  Assert-Command "python" "Install Python 3.12+ and retry."
  $out = & python "$hashScript" "$Name" 2>&1
  if ($LASTEXITCODE -ne 0) { throw "test-hash.py failed for scope '$Name': $out" }
  $sha = ("$out" | Select-Object -Last 1).Trim().ToLowerInvariant()
  if ($sha -notmatch '^[0-9a-f]{64}$') { throw "Invalid hash for scope '$Name': $sha" }
  return $sha
}

function Get-GitInfo {
  $commit = "unknown"; $branch = "unknown"
  try {
    $c = & git rev-parse HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $c) { $commit = $c.Trim() }
    $b = & git rev-parse --abbrev-ref HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $b) { $branch = $b.Trim() }
  } catch { }
  return @{ commit = $commit; branch = $branch }
}

function Read-CacheRecord {
  param([string]$Name)
  $path = Join-Path $cacheDir "$Name.json"
  if (-not (Test-Path -LiteralPath $path)) { return $null }
  try {
    $rec = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ($rec.v -ne $CACHE_SCHEMA) { return $null }
    if ($rec.sha -notmatch '^[0-9a-f]{64}$') { return $null }
    if ($rec.result -ne "pass" -and $rec.result -ne "fail") { return $null }
    if (-not $rec.scope) { return $null }
    return $rec
  } catch {
    return $null
  }
}

function Write-CacheRecord {
  param([string]$Name, [string]$Sha, [string]$Result, [string]$Cmd, [long]$DurationS)
  if (-not (Test-Path -LiteralPath $root)) { throw "Repo root missing: $root" }
  if (-not (Test-Path -LiteralPath $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir | Out-Null
  }
  $info = Get-GitInfo
  $rec = [ordered]@{
    v = $CACHE_SCHEMA
    scope = $Name
    sha = $Sha
    result = $Result
    commit = $info.commit
    branch = $info.branch
    cmd = $Cmd
    updated_at = ([DateTime]::UtcNow.ToString("o"))
    duration_s = $DurationS
  }
  $target = Join-Path $cacheDir "$Name.json"
  $tmp = "$target.tmp.$PID"
  ($rec | ConvertTo-Json -Compress) | Set-Content -LiteralPath $tmp -Encoding utf8NoBOM
  Move-Item -LiteralPath $tmp -Destination $target -Force
}

function Invoke-ScopeSuite {
  param([string]$Name)
  $sha = Get-CurrentSha $Name
  $short = $sha.Substring(0, 12)
  $rec = Read-CacheRecord $Name

  if ($rec -eq $null -and (Test-Path -LiteralPath (Join-Path $cacheDir "$Name.json"))) {
    Write-Warn "Cache corrupt for '$Name' — running suite and healing."
  }

  if (-not $Force -and $rec -ne $null -and $rec.result -eq "pass" -and $rec.sha -eq $sha) {
    $saved = ""
    if ($rec.duration_s) { $saved = " (last run $($rec.duration_s)s)" }
    Write-Ok "SKIP $Name — unchanged $short$saved"
    return 0
  }
  if ($Force) { Write-Step "FORCED run $Name ($short)" }
  elseif ($rec -ne $null -and $rec.result -eq "fail") { Write-Step "Retrying $Name — prior run failed ($short)" }
  else { Write-Step "Running $Name tests ($short)" }

  $started = Get-Date
  $cmd = ""
  $code = 0
  try {
    if ($Name -eq "server") {
      $cmd = "python -m pytest tests -q"
      Assert-Command "python" "Install Python 3.12+ and retry."
      Push-Location -LiteralPath (Join-Path $root "server")
      try {
        & python -m pytest tests -q
        $code = $LASTEXITCODE
      } finally { Pop-Location }
    } elseif ($Name -eq "website") {
      $cmd = "npm test -- --run"
      Assert-Command "npm" "Install Node 20+ and retry."
      Push-Location -LiteralPath (Join-Path $root "website")
      try {
        & npm test -- --run
        $code = $LASTEXITCODE
      } finally { Pop-Location }
    } else {
      $cmd = "go test ./..."
      Assert-Command "go" "Install Go and retry, or run -Scope server."
      Push-Location -LiteralPath (Join-Path $root "services/whatsapp-worker")
      try {
        & go test ./...
        $code = $LASTEXITCODE
      } finally { Pop-Location }
    }
  } catch {
    $code = 1
    Write-Err "$Name suite error: $_"
  }
  $duration = [long]((Get-Date) - $started).TotalSeconds

  if ($code -eq 0) {
    Write-CacheRecord $Name $sha "pass" $cmd $duration
    Write-Ok "$Name passed in ${duration}s — cached $short"
    return 0
  }
  Write-CacheRecord $Name $sha "fail" $cmd $duration
  Write-Err "$Name FAILED in ${duration}s — cache marked fail (will rerun next time)"
  return $code
}

$targets = @()
if ($Scope -eq "all") { $targets = @("server", "website", "worker") } else { $targets = @($Scope) }

$failed = @()
foreach ($t in $targets) {
  $rc = Invoke-ScopeSuite $t
  if ($rc -ne 0) { $failed += $t }
}

if ($failed.Count -gt 0) {
  Write-Err "Smart tests failed: $($failed -join ', ')"
  exit 1
}
Write-Ok "Smart tests done ($Scope)"
