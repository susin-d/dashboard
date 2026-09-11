"""HTTP access logging — one detailed line per request (ADR 0050).

Logs method, path (no query string, so tokens in URLs never hit disk),
status, latency, client IP and device id. Health probes log at DEBUG to
avoid spamming the 7-day files from the 15s Docker healthcheck.
"""

import logging
import time as _time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.app_logging import get_request_id, set_request_id
from app.core.cache import get_cache_status, get_refresh_status

logger = logging.getLogger(__name__)

HEALTH_PREFIXES = ("/health", "/api/v1/health", "/openapi.json", "/docs", "/redoc")


def _is_health_path(path: str) -> bool:
    return path == "/health" or path.startswith(HEALTH_PREFIXES[1:])


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:8]
        set_request_id(request_id)
        start = _time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            elapsed_ms = (_time.perf_counter() - start) * 1000
            logger.error(
                "%s %s -> ERR %.1fms ip=%s rid=%s: %s",
                request.method,
                request.url.path,
                elapsed_ms,
                request.client.host if request.client else "unknown",
                request_id,
                exc,
                exc_info=True,
            )
            raise
        elapsed_ms = (_time.perf_counter() - start) * 1000
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        device_id = request.headers.get("X-Device-Id", "-")
        line = "%s %s -> %s %.1fms ip=%s device=%s rid=%s"
        args = (
            request.method,
            path,
            response.status_code,
            elapsed_ms,
            client_ip,
            device_id,
            request_id,
        )
        if _is_health_path(path):
            logger.debug(line, *args)
        else:
            logger.info(
                line + " cache=%s refresh=%s",
                *args,
                get_cache_status(),
                get_refresh_status(),
            )
        response.headers["X-Request-ID"] = request_id
        response.headers["Server-Timing"] = f"app;dur={elapsed_ms:.1f}"
        cache_status = get_cache_status()
        if cache_status != "-":
            response.headers["X-Cache"] = cache_status
        refresh_status = get_refresh_status()
        if refresh_status != "-":
            response.headers["X-Provider-Refresh"] = refresh_status
        return response


__all__ = ["RequestLoggingMiddleware", "get_request_id", "set_request_id"]
