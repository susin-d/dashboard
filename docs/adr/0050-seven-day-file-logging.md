# ADR 0050 — Seven-day server file logging

## Status

Accepted

- Date: 2026-09-10
- Deciders: @susindran
- Tags: `logging`, `observability`, `ops`

## Context

The API logged only to stdout via bare `logging.getLogger(__name__)` calls with no handler configuration (`server/app/main.py:24`, routes, `services/eve/*`). Local runs left ad-hoc `server/uvicorn.*.log` files with no rotation; Docker kept logs only in the container JSON driver. Debugging production issues older than a container restart was impossible, and there was no per-request line (method/path/status/latency) for audit.

Constraints: no new dependencies without approval (AGENTS.md §7.5), single-worker uvicorn, serverless (Vercel) has a read-only filesystem, `core/config.py` Settings is the config canonical (ADR 0045).

## Decision

- Chosen approach: stdlib `TimedRotatingFileHandler(when="midnight", backupCount=7)` in new `app/core/app_logging.py` `setup_logging()`, called once from `app.main.create_app()`.
- Scope: `app/core/app_logging.py` (setup + `request_id` ContextVar + secret redaction), `app/core/request_log.py` (`RequestLoggingMiddleware`), `app/core/config.py` (`LOG_DIR/LOG_LEVEL/LOG_RETENTION_DAYS`), `app/main.py` wiring, `docker-compose.yml` `server-logs:/app/logs` volume, `Dockerfile` `/app/logs`, `.gitignore`/`.dockerignore`, `.env.example`.
- Files: `starwaves.log` (INFO+: app + access lines) and `starwaves-error.log` (WARNING+: errors with tracebacks), format `timestamp | LEVEL | logger | req=id | message`. Health probes log at DEBUG. Paths log without query strings; `Authorization`/keys/secrets are masked.
- Serverless skips file handlers (stdout only). Uvicorn loggers propagate to the same handlers; stdout handler is always kept for `docker logs`.

## Consequences

- **Positive:** 7 days of detailed local/Docker logs survive restarts; one access line per request with correlation id (`X-Request-ID`); zero new deps; existing `logger.*` calls unchanged.
- **Negative / Cost:** single-worker file writes only — multi-worker would need `QueueHandler`; rotated names (`*.log.YYYY-MM-DD`) need the `logs/` dir ignore, not just `*.log`; disk use bounded by daily volume × 7.
- **Follow-up:** optional JSON format via `LOG_FORMAT`, log shipping (Loki/CloudWatch), admin log-tail endpoint (rejected for now — filesystem access from API).

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| loguru / structlog | New dependency, approval + migration of ~100 call sites for no rotation benefit stdlib lacks |
| Single file for all levels | Error triage slower; dual INFO/WARNING files is cheap with two handlers |
| Per-route logging calls | Duplication; one middleware covers all routes including 429s |
| Log to DB table | Write amplification on hot paths; files + stdout fit 1–10 user scale |
| Do nothing (stdout only) | Loses history on container recreate; fails the 7-day requirement |

## References

- `server/app/core/app_logging.py`
- `server/app/core/request_log.py`
- `server/app/main.py`
- `server/app/core/config.py`
