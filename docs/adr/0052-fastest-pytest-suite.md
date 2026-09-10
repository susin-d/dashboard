# ADR 0052 — Fastest pytest suite (parallel, truncate, no-network)

## Status

Accepted

- Date: 2026-09-10
- Deciders: @susindran
- Tags: `tests`, `pytest`, `performance`, `sqlite`, `xdist`

## Context

`python -m pytest tests -q` timed out. Static analysis found four compounding costs: every test paid `drop_all + create_all` DDL twice (before+after) on file-backed SQLite on Windows; every test built a new `TestClient` portal; `/ws/calls` parked teardown in a 25s `wait_for` while `/ws/whatsapp` blocked in `receive_json()` with no timeout at all; and `chat_with_eve` called `extract_and_save_memories` synchronously (real LLM round-trip, 10s timeout + quota retry). The suite also ran serially with no timeout guard, so one hang killed the whole run.

## Decision

- Parallel by default: `pytest-xdist` + `pytest-timeout` (`pytest.ini`: `addopts -n auto --dist loadfile`, `timeout 30 thread`). Per-worker SQLite files via `PYTEST_XDIST_WORKER` suffix in `tests/conftest.py`.
- Row truncate, not DDL: schema `create_all` once per worker; `db` fixture `DELETE FROM` all tables (reverse `sorted_tables`) before each test only. `clean_database` kept as a fast alias (single source: `tests/support/db.py`).
- No network in tests: autouse `_disable_eve_auto_memory` patches `eve.chat` + `eve.chat_stream` call-site symbols to `[]`. Direct `auto_memory` unit tests are unaffected (they import the module itself).
- Bounded sockets: `STARWAVES_WS_PING_INTERVAL_S` env override (prod default 25s, tests `0.1s`); `/ws/whatsapp` `receive_json` wrapped in `wait_for` with ping-on-timeout like `/ws/calls`; `test_calls_ws` closes explicitly; `test_twilio_relay._read_until_last` gains `timeout=10` + `max_frames` fail-fast.
- Scope: `server/pytest.ini`, `server/requirements.txt`, `tests/conftest.py`, `tests/support/{db,__init__}.py`, `app/api/routes/{calls_ws,whatsapp_ws}.py`, `tests/api/{test_calls_ws,test_twilio_relay}.py`.

## Consequences

- **Positive:** no more hangs (30s thread-timeout fail-closed); per-test DB cost drops from 2x DDL to 1x row delete; WS teardown milliseconds; Eve chat tests never touch the network; full suite shards across cores.
- **Negative / Cost:** two new dev deps (`pytest-xdist`, `pytest-timeout`); xdist can mask order-dependent `dependency_overrides` leaks — mitigated by existing save/restore in `test_ai_models`/`test_eve_stream` and `loadfile` distribution.
- **Follow-up:** record new baseline durations; consider session-scoped `TestClient` reuse and lazy `firebase_admin`/`google.genai` imports if collection still dominates.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Shared in-memory SQLite | Breaks xdist (each worker needs its own file); `TestClient` threads cannot share `:memory:` safely |
| Transaction savepoints per test | Leaks across `TestClient` portal threads; harder to reason about than truncate-before |
| Do nothing / raise tool timeout | Masks root causes (unbounded sockets, network in unit tests) and keeps CI slow |

## References

- `server/tests/conftest.py:38`
- `server/tests/support/db.py:19`
- `server/app/api/routes/calls_ws.py:33`
- `server/app/api/routes/whatsapp_ws.py:15`
- `server/app/services/eve/chat.py:197`
