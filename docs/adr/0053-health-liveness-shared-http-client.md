# ADR 0053 — Health liveness/readiness split + shared HTTP keepalive client

## Status

Accepted

- Date: 2026-09-11
- Deciders: @susindran
- Tags: `health`, `transport`, `performance`

## Context

`GET /health` (and the root `/health` alias) ran all four dependency probes
(database, cache, whatsapp-worker, workspace) plus a route-inventory walk on
every call, and is polled every 15s by the docker healthcheck plus load
balancers and CI. Locally it took ~650ms despite every dependency being local.

Measurement showed two compounding root causes. First, the whatsapp probe
built a fresh `httpx.AsyncClient` per call (~300ms transport init on Windows,
2–4ms on a reused keepalive connection), and that synchronous construction
blocked the event loop so the concurrent sqlite probe inflated from 4ms to
~270–660ms as well. Second, the "lightweight" path still walked all 255 routes
for `endpoint_count` (`aggregator.py`). Liveness must never depend on
downstream I/O.

## Decision

- Liveness/readiness split: `GET /health` + root `/health` return a zero-I/O
  `build_liveness()` payload (`services/health/liveness.py`) — status, uptime,
  timestamp only. Deep probes stay on `/health/detailed` + `/health/checks*`.
- Shared transport: `core/http.py` gains `get_shared_async_client()` — one
  keepalive client per running event loop (loop-keyed so pytest's per-test
  loops stay correct). The whatsapp probe uses it with a per-request
  `timeout=2.0`. Per-call `create_async_client()` remains for custom configs.
- `collect_health(detailed=False)` no longer walks the endpoint inventory.
- Liveness logs at debug; shape (`status: ok`, `checks: null`) keeps docker
  healthcheck, CI curl, and existing tests green.

## Consequences

- **Positive:** `/health` ~650ms → ~1ms; `/health/detailed` whatsapp probe
  ~300ms → ~5ms warm; docker/CI probes stop hammering DB + worker; tests no
  longer touch the network for liveness (ADR 0052).
- **Negative / Cost:** `/health` no longer reports per-service status —
  dashboards must use `/health/detailed` or `/health/checks`.
- **Follow-up:** migrate other hot `create_async_client()` call sites
  (`services/whatsapp.py`, `oauth/google.py`) to the shared client.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Cache probe results with TTL | Still pays 300–650ms on every cold hit; hides outages instead of separating concerns |
| `to_thread` for client construction | Unblocks the loop but keeps the 300ms wall time per probe |
| Timeout-only tuning | Timeouts cap failure, they don't remove the per-request build cost |

## References

- `server/app/core/http.py` (`get_shared_async_client`)
- `server/app/services/health/liveness.py`
- `server/app/api/routes/health/main.py`
- `server/app/main.py` (root `/health`)
