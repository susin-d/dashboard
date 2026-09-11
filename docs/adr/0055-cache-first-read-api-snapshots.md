# ADR 0055 — Cache-first read API snapshots

## Status

Accepted

- Date: 2026-09-11
- Deciders: Starwaves maintainers
- Tags: `performance`, `cache`, `integrations`

## Context

Dashboard startup reads were waiting on GitHub, contests, hackathons, Google
Calendar, and other provider calls. The server logs showed cold reads between
1 and 10 seconds, while subsequent reads of the same resources were generally
below 100 ms. Waiting for an external provider in an HTTP request makes the
dashboard latency depend on an unavailable system and causes duplicate refresh
work when several browser requests arrive together.

## Decision

Provider-backed GET routes use the canonical cache as a stale-while-revalidate
snapshot store. A fresh snapshot is returned immediately. An expired-but-valid
snapshot is returned immediately and schedules one refresh per key. A cold miss
returns the route's existing empty response shape immediately and schedules the
provider/database loader in the background. Redis stores shared snapshots and
refresh locks; the existing local cache remains the fallback for single-process
development and serverless execution.

Dashboard aggregation reads local database snapshots and never awaits live
contest or hackathon providers. Route-specific freshness windows and mutation
invalidation preserve user-owned data correctness. Request timing records the
route latency and cache/refresh state through response headers and logs.

## Consequences

- Warm and stale reads are independent of provider latency and can meet the
  server-side sub-100 ms target.
- A cold read can briefly show the existing empty state until refresh completes.
- Provider refresh failures no longer block reads; the last valid snapshot stays
  available through its stale window.
- Cache observability must use a middleware-safe request context so hit/miss
  status is not lost across Starlette task boundaries.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Await every provider on each request | Preserves the observed multi-second tail. |
| Cache only in process memory | Does not deduplicate refreshes across workers. |
| Increase provider timeouts | Makes the latency tail worse during outages. |

## References

- `server/app/core/cache.py`
- `server/app/core/request_log.py`
- `server/app/services/workspace_overview.py`
- `server/app/api/routes/github.py`
