"""Lean Redis-backed cache with local fallback for e2-micro (1-10 users).

If REDIS_URL is set (VM docker-compose includes redis:7-alpine 96M), use Redis SETEX/GET.
Otherwise fallback to in-memory dict with TTL + LRU 1000 bound.
Keeps 1GB host lean: no external Redis cost, no pgbouncer needed.
"""
import asyncio
import contextvars
import hashlib
import json as _json
import time as _time
from functools import wraps
from typing import Any, Callable

try:
    import redis as _redis  # type: ignore
except Exception:  # pragma: no cover
    _redis = None

from app.core.config import settings

_local_cache: dict[str, tuple[float, Any]] = {}
_MAX_LOCAL = 1000
_refresh_tasks: dict[str, asyncio.Task] = {}
_local_refresh_locks: dict[str, float] = {}
_cache_status = contextvars.ContextVar("cache_status", default="-")
_refresh_status = contextvars.ContextVar("refresh_status", default="-")

_redis_client = None

# TTL presets for simple GET caching (kept short to avoid stale UX while still
# absorbing hot-read bursts from dashboards / navigation).
CACHE_TTL_SHORT = 30
CACHE_TTL_MEDIUM = 60
CACHE_TTL_LONG = 300

# Keys that hold per-user GET caches must never leak across users — every
# key helper forces a user_id segment when a user is present.


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not getattr(settings, "redis_url", None) or _redis is None:
        return None
    try:
        _redis_client = _redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2, decode_responses=False)
        _redis_client.ping()
        return _redis_client
    except Exception:
        return None


def cache_get(key: str) -> Any | None:
    r = _get_redis()
    if r is not None:
        try:
            import json

            raw = r.get(key)
            if raw is None:
                return None
            if isinstance(raw, bytes):
                raw = raw.decode()
            return json.loads(raw)
        except Exception:
            pass
    # local fallback
    entry = _local_cache.get(key)
    if not entry:
        return None
    expires, val = entry
    if expires < _time.monotonic():
        _local_cache.pop(key, None)
        return None
    return val


def _to_jsonable(value: Any) -> Any:
    """Recursively convert Pydantic models and other non-JSON types to plain dicts."""
    if isinstance(value, list):
        return [_to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: _to_jsonable(v) for k, v in value.items()}
    if hasattr(value, "model_dump"):
        try:
            return _to_jsonable(value.model_dump(mode="json"))  # type: ignore[attr-defined]
        except Exception:
            pass
    if hasattr(value, "dict"):
        try:
            return _to_jsonable(value.dict())  # type: ignore[attr-defined]
        except Exception:
            pass
    return value


def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    storable = _to_jsonable(value)
    r = _get_redis()
    if r is not None:
        try:
            import json

            r.setex(key, ttl, json.dumps(storable, default=str))
            return
        except Exception:
            pass
    # local with LRU bound — store the jsonable form so Redis/local parity holds
    if len(_local_cache) >= _MAX_LOCAL:
        # evict oldest (first)
        oldest = next(iter(_local_cache))
        _local_cache.pop(oldest, None)
    _local_cache[key] = (_time.monotonic() + ttl, storable)


def cache_delete(key: str) -> None:
    r = _get_redis()
    if r is not None:
        try:
            r.delete(key)
        except Exception:
            pass
    _local_cache.pop(key, None)


def cache_invalidate_prefix(prefix: str) -> None:
    if not prefix:
        return
    r = _get_redis()
    if r is not None:
        try:
            for k in r.scan_iter(match=f"{prefix}*"):
                r.delete(k)
            for k in r.scan_iter(match=f"swr:{prefix}*"):
                r.delete(k)
        except Exception:
            pass
    for k in list(_local_cache.keys()):
        if k.startswith(prefix) or k.startswith(f"swr:{prefix}"):
            _local_cache.pop(k, None)


def cache_clear() -> None:
    """Clear all local entries; Redis keys are left untouched (tests use local only)."""
    _local_cache.clear()


def get_cache_status() -> str:
    return _cache_status.get()


def get_refresh_status() -> str:
    return _refresh_status.get()


def stale_cache_get(key: str) -> tuple[str, Any | None]:
    """Return ``fresh``, ``stale``, or ``miss`` for a SWR cache entry."""
    now = _time.time()
    r = _get_redis()
    raw = None
    if r is not None:
        try:
            raw = r.get(f"swr:{key}")
            if isinstance(raw, bytes):
                raw = raw.decode()
            raw = _json.loads(raw) if raw else None
        except Exception:
            raw = None
    if raw is None:
        entry = _local_cache.get(f"swr:{key}")
        if entry:
            expires, raw = entry
            if expires < _time.monotonic():
                _local_cache.pop(f"swr:{key}", None)
                raw = None
    if not isinstance(raw, dict) or "value" not in raw:
        _cache_status.set("MISS")
        return "miss", None
    if raw.get("fresh_until", 0) > now:
        _cache_status.set("HIT")
        return "fresh", raw["value"]
    if raw.get("stale_until", 0) > now:
        _cache_status.set("STALE")
        return "stale", raw["value"]
    _cache_status.set("MISS")
    return "miss", None


def stale_cache_set(key: str, value: Any, fresh_ttl: int, stale_ttl: int) -> None:
    """Store a value for fresh reads and a longer stale fallback window."""
    now = _time.time()
    payload = {
        "value": _to_jsonable(value),
        "fresh_until": now + fresh_ttl,
        "stale_until": now + stale_ttl,
    }
    redis_key = f"swr:{key}"
    r = _get_redis()
    if r is not None:
        try:
            r.setex(redis_key, max(stale_ttl, fresh_ttl), _json.dumps(payload, default=str))
            return
        except Exception:
            pass
    if len(_local_cache) >= _MAX_LOCAL:
        _local_cache.pop(next(iter(_local_cache)), None)
    _local_cache[redis_key] = (_time.monotonic() + max(stale_ttl, fresh_ttl), payload)


def _try_refresh_lock(key: str, ttl: int = 60) -> bool:
    lock_key = f"swr-lock:{key}"
    r = _get_redis()
    if r is not None:
        try:
            return bool(r.set(lock_key, "1", nx=True, ex=ttl))
        except Exception:
            pass
    now = _time.monotonic()
    if _local_refresh_locks.get(lock_key, 0) > now:
        return False
    _local_refresh_locks[lock_key] = now + ttl
    return True


def _release_refresh_lock(key: str) -> None:
    lock_key = f"swr-lock:{key}"
    r = _get_redis()
    if r is not None:
        try:
            r.delete(lock_key)
        except Exception:
            pass
    _local_refresh_locks.pop(lock_key, None)


def _schedule_refresh(key: str, loader: Callable[[], Any], fresh_ttl: int, stale_ttl: int) -> None:
    if key in _refresh_tasks or not _try_refresh_lock(key):
        return
    _refresh_status.set("scheduled")

    async def refresh() -> None:
        try:
            result = loader()
            if asyncio.iscoroutine(result):
                result = await result
            if result is not None:
                stale_cache_set(key, result, fresh_ttl, stale_ttl)
        except Exception:
            # The stale snapshot remains available until its stale window ends.
            pass
        finally:
            _release_refresh_lock(key)
            _refresh_tasks.pop(key, None)

    task = asyncio.create_task(refresh())
    _refresh_tasks[key] = task


async def snapshot_read(
    key: str,
    loader: Callable[[], Any],
    empty: Any,
    *,
    fresh_ttl: int = CACHE_TTL_SHORT,
    stale_ttl: int = CACHE_TTL_LONG,
) -> Any:
    """Read a snapshot immediately and refresh it outside the request path."""
    status, value = stale_cache_get(key)
    if status in {"fresh", "stale"}:
        if status == "stale":
            _schedule_refresh(key, loader, fresh_ttl, stale_ttl)
        return value
    _schedule_refresh(key, loader, fresh_ttl, stale_ttl)
    return empty


# ---------------------------------------------------------------------------
# Response-cache helpers for simple GET endpoints
# ---------------------------------------------------------------------------

_EXCLUDED_KEY_PARAMS = {"database", "db", "request", "response"}


def _extract_user_id(kwargs: dict[str, Any]) -> str | None:
    user = kwargs.get("user")
    if isinstance(user, dict) and user.get("uid"):
        return str(user["uid"])
    for key in ("user_id", "current_user_id", "uid"):
        val = kwargs.get(key)
        if isinstance(val, str) and val:
            return val
    return None


def build_cache_key(prefix: str, user_id: str | None = None, **params: Any) -> str:
    """Deterministic cache key with mandatory user scoping when present.

    Example:
        build_cache_key("todos:list", user_id="user-1", cursor="abc", limit=20)
        -> "todos:list:user-1:8f3a..."
    """
    filtered: dict[str, Any] = {}
    for k, v in params.items():
        if k in _EXCLUDED_KEY_PARAMS:
            continue
        if v is None:
            continue
        filtered[k] = v
    if not filtered:
        if user_id:
            return f"{prefix}:{user_id}"
        return prefix
    # Stable JSON + short hash keeps Redis keys bounded even for paginated cursors
    payload = _json.dumps(filtered, sort_keys=True, default=str, separators=(",", ":"))
    digest = hashlib.sha256(payload.encode()).hexdigest()[:12]
    if user_id:
        return f"{prefix}:{user_id}:{digest}"
    return f"{prefix}:anon:{digest}"


def cache_invalidate_user_prefix(prefix: str, user_id: str | None) -> None:
    """Invalidate a user-scoped prefix, e.g. ``todos:user-1`` wipes list+detail."""
    if not prefix:
        return
    if user_id:
        cache_invalidate_prefix(f"{prefix}:{user_id}")
    else:
        cache_invalidate_prefix(prefix)


def cached(ttl: int = CACHE_TTL_SHORT, prefix: str | None = None):
    """Decorator for simple GET handlers — caches JSON-serializable returns.

    The key is ``{prefix}:{user_id}:{hash(query_params)}`` when a ``user`` or
    ``user_id`` kwarg is present, otherwise ``{prefix}:anon:{hash}``. ``None``
    and exceptions bypass the cache to avoid persisting 404s or empty mutations.
    """

    def decorator(func: Callable):
        cache_prefix = prefix or func.__name__

        if asyncio.iscoroutinefunction(func):

            @wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any):
                uid = _extract_user_id(kwargs)
                params = {k: v for k, v in kwargs.items() if k not in _EXCLUDED_KEY_PARAMS and k != "user"}
                for alias in ("user_id", "current_user_id", "uid"):
                    params.pop(alias, None)
                # Include positional args that look like identifiers in the key
                if args:
                    for idx, val in enumerate(args):
                        if isinstance(val, (str, int, float)):
                            params[f"arg{idx}"] = val
                key = build_cache_key(cache_prefix, uid, **params) if params else build_cache_key(cache_prefix, uid)
                hit = cache_get(key)
                if hit is not None:
                    _cache_status.set("HIT")
                    return hit
                _cache_status.set("MISS")
                result = await func(*args, **kwargs)
                if result is not None:
                    cache_set(key, result, ttl=ttl)
                return result

            return async_wrapper

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any):
            uid = _extract_user_id(kwargs)
            params = {k: v for k, v in kwargs.items() if k not in _EXCLUDED_KEY_PARAMS and k != "user"}
            for alias in ("user_id", "current_user_id", "uid"):
                params.pop(alias, None)
            if args:
                for idx, val in enumerate(args):
                    if isinstance(val, (str, int, float)):
                        params[f"arg{idx}"] = val
            key = build_cache_key(cache_prefix, uid, **params) if params else build_cache_key(cache_prefix, uid)
            hit = cache_get(key)
            if hit is not None:
                _cache_status.set("HIT")
                return hit
            _cache_status.set("MISS")
            result = func(*args, **kwargs)
            if result is not None:
                cache_set(key, result, ttl=ttl)
            return result

        return sync_wrapper

    return decorator
