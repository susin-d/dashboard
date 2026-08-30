"""Detailed health probes for the StarWaves API.

Each probe is isolated, timed, and never raises — failures surface as
`DependencyStatus.status="error"` so the overall `/health` always returns 200
for healthy DB and 503 only when the database itself is unreachable (docker
healthcheck judges liveness, degraded redis/whatsapp still reports 200).

Endpoints are inventoried from the live FastAPI app to avoid drift.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone

from sqlalchemy import text

logger = logging.getLogger(__name__)

# Process start for uptime — set on first import, refreshed on lifespan start.
_START_TS = time.monotonic()

EXPECTED_TABLES = [
    "users",
    "jobs",
    "projects",
    "hackathons",
    "todos",
    "documents",
    "contacts",
    "notifications",
    "calls",
    "eve_sessions",
    "eve_memories",
    "eve_schedules",
    "user_settings",
    "workspace_files",
    "whatsapp_chats",
    "whatsapp_messages",
    "user_sessions",
    "ai_usage",
]


def _elapsed_ms(t0: float) -> int:
    return int((time.monotonic() - t0) * 1000)


async def _check_database() -> dict:
    t0 = time.monotonic()
    try:
        from app.db.session import engine, is_sqlite, sync_engine

        if is_sqlite:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return {"status": "ok", "latency_ms": _elapsed_ms(t0), "detail": "sqlite SELECT 1 ok"}

        # async ping
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        # table inventory (sync handle, short query)
        tables_detail = "ok"
        try:
            with sync_engine.connect() as conn:
                rows = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public'")).fetchall()
                present = {r[0] for r in rows}
                missing = [t for t in EXPECTED_TABLES if t not in present]
                if missing:
                    tables_detail = f"missing tables: {', '.join(missing)}"
                else:
                    tables_detail = f"{len(EXPECTED_TABLES)} tables present"
        except Exception as exc:  # pragma: no cover
            tables_detail = f"table inventory failed: {exc}"

        # pgvector
        vector_detail = ""
        try:
            with sync_engine.connect() as conn:
                row = conn.execute(text("SELECT extname FROM pg_extension WHERE extname='vector'")).fetchone()
                vector_detail = "vector extension present" if row else "vector extension missing (eve_memories will fail on fresh DB)"
        except Exception:
            pass
        detail = f"postgres SELECT 1 ok; {tables_detail}"
        if vector_detail:
            detail += f"; {vector_detail}"
        return {"status": "ok" if "missing" not in tables_detail else "degraded", "latency_ms": _elapsed_ms(t0), "detail": detail}
    except Exception as exc:
        return {"status": "error", "latency_ms": _elapsed_ms(t0), "detail": f"database unreachable: {exc}"}


async def _check_redis() -> dict:
    t0 = time.monotonic()
    try:
        from app.core.cache import _get_redis  # type: ignore

        client = _get_redis()
        if client is None:
            # local fallback active (e2-micro lean path or no REDIS_URL)
            from app.core.config import settings

            if not getattr(settings, "redis_url", None):
                return {"status": "ok", "latency_ms": _elapsed_ms(t0), "detail": "local in-memory cache (REDIS_URL not set)"}
            return {"status": "degraded", "latency_ms": _elapsed_ms(t0), "detail": "redis fallback to local cache"}

        # ping within 2s
        await asyncio.to_thread(client.ping)
        return {"status": "ok", "latency_ms": _elapsed_ms(t0), "detail": "redis PING ok"}
    except Exception as exc:
        return {"status": "degraded", "latency_ms": _elapsed_ms(t0), "detail": f"redis unavailable, fallback: {exc}"}


async def _check_whatsapp_worker() -> dict:
    t0 = time.monotonic()
    try:
        from app.core.config import settings
        from app.core.http import create_async_client

        url = (settings.whatsapp_gateway_url or "http://whatsapp-worker:3001").rstrip("/") + "/health"
        async with create_async_client(timeout=2.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return {"status": "ok", "latency_ms": _elapsed_ms(t0), "detail": f"whatsapp-worker {url} 200"}
            return {"status": "degraded", "latency_ms": _elapsed_ms(t0), "detail": f"whatsapp-worker {url} {resp.status_code}"}
    except Exception as exc:
        return {"status": "degraded", "latency_ms": _elapsed_ms(t0), "detail": f"whatsapp-worker unreachable: {exc}"}


async def _check_workspace_storage() -> dict:
    t0 = time.monotonic()
    try:
        import os
        import tempfile

        from app.core.config import settings

        base = settings.workspace_storage_path
        # In docker: /app/workspaces ; locally: workspaces/
        # Always try to ensure dir exists — missing workspaces folder is auto-created on health check.
        os.makedirs(base, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=base, delete=True) as tf:
            tf.write(b"health")
            tf.flush()
        return {"status": "ok", "latency_ms": _elapsed_ms(t0), "detail": f"workspace storage writable: {base}"}
    except Exception as exc:
        return {"status": "degraded", "latency_ms": _elapsed_ms(t0), "detail": f"workspace storage error: {exc}"}


def _collect_endpoints(app) -> list[dict]:
    endpoints: list[dict] = []
    try:
        # Prefer OpenAPI for accurate, prefix-aware inventory (handles
        # FastAPI's _IncludedRouter nesting without manual traversal).
        if app is not None:
            try:
                spec = app.openapi()
                for path, methods in spec.get("paths", {}).items():
                    for method, meta in methods.items():
                        if method.startswith("x-"):
                            continue
                        endpoints.append(
                            {
                                "path": path,
                                "methods": [method.upper()],
                                "tag": (meta.get("tags") or [None])[0],
                            }
                        )
                # WebSockets are not in OpenAPI — add known mounts explicitly
                # (mounted at root: /ws/calls, /ws/whatsapp, /ws/twilio-relay)
                ws_known = [
                    ("/ws/calls", "calls"),
                    ("/ws/whatsapp", "WhatsApp integration"),
                    ("/ws/twilio-relay", "calls"),
                ]
                seen_paths = {e["path"] for e in endpoints}
                for ws_path, tag in ws_known:
                    if ws_path not in seen_paths:
                        endpoints.append({"path": ws_path, "methods": ["WS"], "tag": tag})
                endpoints.sort(key=lambda e: (e["path"], e["methods"]))
                return endpoints
            except Exception:
                pass
        # Fallback: direct route scan (best-effort)
        for route in getattr(app, "routes", []) if app else []:
            path = getattr(route, "path", None)
            methods = getattr(route, "methods", None)
            if not path:
                continue
            if methods is None:
                methods = ["WS"] if "WebSocket" in type(route).__name__ else []
            else:
                methods = sorted(methods)
            tag = None
            if hasattr(route, "tags") and route.tags:
                tag = route.tags[0]
            endpoints.append({"path": path, "methods": methods, "tag": tag})
    except Exception:
        pass
    endpoints.sort(key=lambda e: e["path"])
    return endpoints


async def collect_health(app=None) -> dict:
    """Run all probes concurrently and build the health payload."""
    t0 = time.monotonic()
    # run independent checks concurrently (2s each best-effort)
    results = await asyncio.gather(
        _check_database(),
        _check_redis(),
        _check_whatsapp_worker(),
        _check_workspace_storage(),
        return_exceptions=False,
    )
    db, redis_stat, whatsapp, workspace = results

    # overall status — docker healthcheck expects "ok" when DB is reachable;
    # non-critical probes (redis/whatsapp/workspace) surface in checks/summary but
    # don't flip the top-level status so existing tests and `/health` contracts keep `ok`.
    if db["status"] == "error":
        overall = "error"
    elif db["status"] == "degraded":
        overall = "degraded"
    else:
        overall = "ok"

    checks = {
        "database": db,
        "cache": redis_stat,
        "whatsapp_worker": whatsapp,
        "workspace_storage": workspace,
    }

    # endpoints inventory (sync)
    endpoints = _collect_endpoints(app) if app is not None else None

    uptime = time.monotonic() - _START_TS
    timestamp = datetime.now(timezone.utc).isoformat()

    # structured log at INFO level for ops tail
    logger.info(
        "health detailed: status=%s db=%s/%sms redis=%s whatsapp=%s workspace=%s endpoints=%s uptime=%.1fs",
        overall,
        db["status"],
        db.get("latency_ms"),
        redis_stat["status"],
        whatsapp["status"],
        workspace["status"],
        len(endpoints) if endpoints is not None else "?",
        uptime,
    )
    # also log each dependency detail at DEBUG for triage
    for name, stat in checks.items():
        logger.debug("health[%s]=%s %sms detail=%s", name, stat["status"], stat.get("latency_ms"), stat.get("detail"))

    from app.core.config import settings

    summary = f"{overall}: db={db['status']} cache={redis_stat['status']} whatsapp={whatsapp['status']} workspace={workspace['status']}"

    return {
        "status": overall,
        "service": settings.app_name,
        "environment": settings.app_env,
        "version": "0.1.0",
        "uptime_seconds": round(uptime, 1),
        "timestamp": timestamp,
        "checks": checks,
        "endpoints": endpoints,
        "summary": summary,
        "took_ms": _elapsed_ms(t0),
    }
