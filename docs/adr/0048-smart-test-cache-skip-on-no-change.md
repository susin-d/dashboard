# ADR 0048 — Smart test cache: skip suites when content is unchanged

## Status

Accepted

- Date: 2026-09-10
- Deciders: Starwaves maintainer
- Tags: `testing`, `dx`, `infra`

## Context

Full suites (`python -m pytest tests -q` over 47 backend files, `vitest run` over 7 frontend files, `go test ./...`) run on every invocation even when nothing they depend on changed. `pytest --lf/--ff` still collects and boots; `vitest --changed` is brittle on Windows. There is no test workflow cache — only Docker layer cache. We need a local-first skip that is fail-closed: a false run wastes minutes, a false skip hides regressions.

## Decision

Content-hash skip cache with per-scope records in `.cache/test-smart/<scope>.json` (gitignored):

- Hasher `scripts/lib/test-hash.py` (stdlib only): sorted POSIX relpaths, CRLF-normalized text bytes, `path+size+bytes` into SHA-256 plus toolchain markers (`python`, `node`, `go` versions). Inputs: `server` → `server/app, server/tests, pytest.ini, requirements.txt, sql`; `website` → `src, package.json, lockfile, vite/vitest configs`; `worker` → `services/whatsapp-worker`.
- Runners `scripts/test-smart.ps1` (primary) + `scripts/test-smart.sh` (parity): skip only on schema `v=1` + `result=pass` + sha match. Miss, corrupt, prior `fail`, or `-Force/--force` always runs the real suite. Atomic write (tmp + rename) so kills never poison the cache. Untracked files via `git ls-files --others` force a run; missing `git` falls back to a walk (still fail-closed).
- CI stays `--Force` until the local cache proves out; no `actions/cache` wiring in this change.

## Consequences

- **Positive:** repeat no-change runs skip in <2s per scope; per-scope granularity (website edit doesn't rerun server); no new deps; Windows/Linux parity.
- **Negative / Cost:** first run still full; toolchain bumps cause one extra full run (safe direction); `.cache/` is machine-local, not shared.
- **Follow-up:** optional CI `actions/cache` on `.cache/test-smart/`; consider splitting `server` e2e into its own scope if e2e dominates runtime.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| `pytest-testmon` / `nx` / `turborepo` | New deps need approval (§7.5), brittle cross-platform, overkill for 3 scopes |
| `pytest --lf` + `vitest --changed` only | Still collects/boots, doesn't answer "no change → skip" |
| Single monolithic hash | Website edit would force server rerun; per-scope is strictly more precise |
| Do nothing | Keeps paying full suite cost on every no-op invocation |

## References

- `scripts/lib/test-hash.py`
- `scripts/test-smart.ps1`, `scripts/test-smart.sh`
- `server/tests/conftest.py` (deterministic SQLite env the cache preserves)
