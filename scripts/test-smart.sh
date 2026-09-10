#!/usr/bin/env bash
# Smart test runner (Linux/CI parity for test-smart.ps1).
# Skips a suite only on schema-v1 + result=pass + matching sha. Fail-closed.
set -euo pipefail

SCOPE="all"
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --scope=*) SCOPE="${arg#--scope=}" ;;
    server|website|worker|all) SCOPE="$arg" ;;
    --force|-f) FORCE=1 ;;
    --help|-h)
      echo "usage: test-smart.sh [--scope=server|website|worker|all] [--force]"
      exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="$ROOT/.cache/test-smart"
HASH_SCRIPT="$ROOT/scripts/lib/test-hash.py"

current_sha() {
  python3 "$HASH_SCRIPT" "$1"
}

read_cache_field() {
  python3 - "$CACHE_DIR/$1.json" "$2" <<'PY'
import json, sys
try:
    rec = json.load(open(sys.argv[1]))
    v = rec.get("v"); sha = rec.get("sha", ""); res = rec.get("result", "")
    import re
    if v != 1 or not re.fullmatch(r"[0-9a-f]{64}", sha or "") or res not in ("pass", "fail"):
        print("CORRUPT"); sys.exit(0)
    print(rec.get(sys.argv[2], ""))
except Exception:
    print("CORRUPT")
PY
}

write_cache() {
  local name="$1" sha="$2" result="$3" cmd="$4" dur="$5"
  mkdir -p "$CACHE_DIR"
  local commit="unknown" branch="unknown"
  commit="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  local tmp="$CACHE_DIR/$name.json.tmp.$$"
  python3 - "$tmp" "$name" "$sha" "$result" "$commit" "$branch" "$cmd" "$dur" <<'PY'
import json, sys, datetime
_, tmp, name, sha, result, commit, branch, cmd, dur = sys.argv
rec = {"v": 1, "scope": name, "sha": sha, "result": result,
       "commit": commit, "branch": branch, "cmd": cmd,
       "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
       "duration_s": int(dur)}
open(tmp, "w").write(json.dumps(rec))
PY
  mv -f "$tmp" "$CACHE_DIR/$name.json"
}

run_scope() {
  local name="$1"
  local sha; sha="$(current_sha "$name")"
  local short="${sha:0:12}"
  local cache_file="$CACHE_DIR/$name.json"
  local result="" cached_sha=""

  if [ -f "$cache_file" ]; then
    result="$(read_cache_field "$name" result)"
    cached_sha="$(read_cache_field "$name" sha)"
    if [ "$result" = "CORRUPT" ]; then
      echo "  ! Cache corrupt for '$name' — running suite and healing."
      result=""; cached_sha=""
    fi
  fi

  if [ "$FORCE" -eq 0 ] && [ "$result" = "pass" ] && [ "$cached_sha" = "$sha" ]; then
    echo "  ✓ SKIP $name — unchanged $short"
    return 0
  fi

  local cmd started ended dur code=0
  started=$(date +%s)
  if [ "$name" = "server" ]; then
    cmd="python3 -m pytest tests -q"
    (cd "$ROOT/server" && python3 -m pytest tests -q) || code=$?
  elif [ "$name" = "website" ]; then
    cmd="npm test -- --run"
    (cd "$ROOT/website" && npm test -- --run) || code=$?
  else
    cmd="go test ./..."
    (cd "$ROOT/services/whatsapp-worker" && go test ./...) || code=$?
  fi
  ended=$(date +%s); dur=$((ended - started))

  if [ "$code" -eq 0 ]; then
    write_cache "$name" "$sha" "pass" "$cmd" "$dur"
    echo "  ✓ $name passed in ${dur}s — cached $short"
    return 0
  fi
  write_cache "$name" "$sha" "fail" "$cmd" "$dur"
  echo "  ✗ $name FAILED in ${dur}s — cache marked fail (will rerun next time)" >&2
  return "$code"
}

targets=()
if [ "$SCOPE" = "all" ]; then targets=(server website worker); else targets=("$SCOPE"); fi

failed=()
for t in "${targets[@]}"; do
  if ! run_scope "$t"; then failed+=("$t"); fi
done

if [ "${#failed[@]}" -gt 0 ]; then
  echo "Smart tests failed: ${failed[*]}" >&2
  exit 1
fi
echo "Smart tests done ($SCOPE)"
