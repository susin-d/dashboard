"""HTTP access logging — one detailed line per request (ADR 0050).

Logs method, path (no query string, so tokens in URLs never hit disk),
status, latency, client IP and device id. Health probes log at DEBUG to
avoid spamming the 7-day files from the 15s Docker healthcheck.
"""

import logging
import time as _time
import uuid

from fastapi import Request

from app.core.app_logging import get_request_id, set_request_id
from app.core.cache import get_cache_status, get_refresh_status

logger = logging.getLogger(__name__)

HEALTH_PREFIXES = ("/health", "/api/v1/health", "/openapi.json", "/docs", "/redoc")


def _is_health_path(path: str) -> bool:
    return path == "/health" or path.startswith(HEALTH_PREFIXES[1:])


class RequestLoggingMiddleware:
    """Pure ASGI middleware so route cache context survives response logging."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        request_id = uuid.uuid4().hex[:8]
        set_request_id(request_id)
        start = _time.perf_counter()
        status_code = 500

        async def send_with_metadata(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                cache_status = get_cache_status()
                refresh_status = get_refresh_status()
                headers = list(message.get("headers", []))
                headers.extend(
                    [
                        (b"x-request-id", request_id.encode()),
                        (b"server-timing", f"app;dur={(_time.perf_counter() - start) * 1000:.1f}".encode()),
                    ]
                )
                if cache_status != "-":
                    headers.append((b"x-cache", cache_status.encode()))
                if refresh_status != "-":
                    headers.append((b"x-provider-refresh", refresh_status.encode()))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_metadata)
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
            status_code,
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


__all__ = ["RequestLoggingMiddleware", "get_request_id", "set_request_id"]
