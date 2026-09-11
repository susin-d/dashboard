"""Reusable HTTP client factory — single source for httpx usage.

Eliminates ~15 ad-hoc AsyncClient(timeout=...) constructions across
routes/services with inconsistent timeouts and no shared retry/limits.
"""

import asyncio

import httpx

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36 Starwaves/1.0"
)

DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
DEFAULT_LIMITS = httpx.Limits(max_keepalive_connections=10, max_connections=20)

_shared_async_client: httpx.AsyncClient | None = None
_shared_async_client_loop: asyncio.AbstractEventLoop | None = None


def _default_client_kwargs(
    *,
    timeout: float | httpx.Timeout | None,
    base_url: str | None,
    headers: dict[str, str] | None,
    follow_redirects: bool,
) -> dict:
    resolved_timeout = timeout if isinstance(timeout, httpx.Timeout) else httpx.Timeout(timeout) if timeout is not None else DEFAULT_TIMEOUT
    resolved_headers = {"User-Agent": DEFAULT_USER_AGENT}
    if headers:
        resolved_headers.update(headers)
    kwargs: dict = {
        "timeout": resolved_timeout,
        "headers": resolved_headers,
        "limits": DEFAULT_LIMITS,
        "follow_redirects": follow_redirects,
    }
    if base_url:
        kwargs["base_url"] = base_url
    return kwargs


def create_async_client(
    *,
    timeout: float | httpx.Timeout | None = None,
    base_url: str | None = None,
    headers: dict[str, str] | None = None,
    follow_redirects: bool = True,
) -> httpx.AsyncClient:
    """Create an AsyncClient with shared defaults (limits, User-Agent)."""
    return httpx.AsyncClient(
        **_default_client_kwargs(timeout=timeout, base_url=base_url, headers=headers, follow_redirects=follow_redirects)
    )


def get_shared_async_client() -> httpx.AsyncClient:
    """Return the process-wide keepalive AsyncClient for the running event loop.

    Building a fresh AsyncClient costs ~300ms on Windows (transport init) and
    runs synchronously, so per-request construction blocked the event loop and
    inflated every concurrent probe on hot paths (health checks, docker
    healthcheck every 15s). The instance is keyed on the running loop so
    pytest's per-test loops each get a correctly-bound client. Pass
    per-request timeouts on the request call itself; callers needing custom
    config must use create_async_client() instead.
    """
    global _shared_async_client, _shared_async_client_loop
    running_loop = asyncio.get_running_loop()
    if _shared_async_client is None or _shared_async_client_loop is not running_loop:
        # Previous loop-bound instance (if any) is left for GC — it cannot be
        # awaited-closed from a different loop.
        _shared_async_client = httpx.AsyncClient(
            **_default_client_kwargs(timeout=None, base_url=None, headers=None, follow_redirects=True)
        )
        _shared_async_client_loop = running_loop
    return _shared_async_client


def create_sync_client(
    *,
    timeout: float | httpx.Timeout | None = None,
    base_url: str | None = None,
    headers: dict[str, str] | None = None,
    follow_redirects: bool = True,
) -> httpx.Client:
    """Sync counterpart for web_browsing / discovery helpers."""
    return httpx.Client(
        **_default_client_kwargs(timeout=timeout, base_url=base_url, headers=headers, follow_redirects=follow_redirects)
    )
