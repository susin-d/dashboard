"""Lean Redis-backed cache with local fallback for e2-micro (1-10 users).

If REDIS_URL is set (VM docker-compose includes redis:7-alpine 96M), use Redis SETEX/GET.
Otherwise fallback to in-memory dict with TTL + LRU 1000 bound.
Keeps 1GB host lean: no external Redis cost, no pgbouncer needed.
"""
import time as _time
from typing import Any

try:
    import redis as _redis  # type: ignore
except Exception:  # pragma: no cover
    _redis = None

from app.core.config import settings

_local_cache: dict[str, tuple[float, Any]] = {}
_MAX_LOCAL = 1000

_redis_client = None


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
            import pickle

            raw = r.get(key)
            if raw is None:
                return None
            return pickle.loads(raw)
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


def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    r = _get_redis()
    if r is not None:
        try:
            import pickle

            r.setex(key, ttl, pickle.dumps(value))
            return
        except Exception:
            pass
    # local with LRU bound
    if len(_local_cache) >= _MAX_LOCAL:
        # evict oldest (first)
        oldest = next(iter(_local_cache))
        _local_cache.pop(oldest, None)
    _local_cache[key] = (_time.monotonic() + ttl, value)


def cache_delete(key: str) -> None:
    r = _get_redis()
    if r is not None:
        try:
            r.delete(key)
        except Exception:
            pass
    _local_cache.pop(key, None)


def cache_invalidate_prefix(prefix: str) -> None:
    r = _get_redis()
    if r is not None:
        try:
            for k in r.scan_iter(match=f"{prefix}*"):
                r.delete(k)
        except Exception:
            pass
    for k in list(_local_cache.keys()):
        if k.startswith(prefix):
            _local_cache.pop(k, None)
