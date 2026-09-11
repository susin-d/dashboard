"""Unit tests for core.cache — local and stale-while-revalidate behavior."""

import asyncio

import pytest

from app.core import cache


@pytest.fixture(autouse=True)
def _local_only(monkeypatch):
    """Force the in-memory path and reset cache state around each test."""
    monkeypatch.setattr(cache, "_get_redis", lambda: None)
    cache._local_cache.clear()
    cache._refresh_tasks.clear()
    cache._local_refresh_locks.clear()
    yield
    cache._local_cache.clear()
    cache._refresh_tasks.clear()
    cache._local_refresh_locks.clear()


class TestCacheGetSet:
    def test_set_then_get_round_trip(self):
        cache.cache_set("k", {"a": 1}, ttl=60)
        assert cache.cache_get("k") == {"a": 1}

    def test_get_missing_returns_none(self):
        assert cache.cache_get("nope") is None

    def test_expired_entry_returns_none(self, monkeypatch):
        cache.cache_set("k", "v", ttl=1)
        real_monotonic = cache._time.monotonic
        monkeypatch.setattr(cache._time, "monotonic", lambda: real_monotonic() + 10)
        assert cache.cache_get("k") is None

    def test_expired_entry_is_evicted(self, monkeypatch):
        cache.cache_set("k", "v", ttl=1)
        real_monotonic = cache._time.monotonic
        monkeypatch.setattr(cache._time, "monotonic", lambda: real_monotonic() + 10)
        cache.cache_get("k")
        assert "k" not in cache._local_cache

    def test_unexpired_entry_still_readable(self):
        cache.cache_set("k", 42, ttl=100)
        assert cache.cache_get("k") == 42


class TestCacheDelete:
    def test_delete_removes_entry(self):
        cache.cache_set("k", "v", ttl=60)
        cache.cache_delete("k")
        assert cache.cache_get("k") is None

    def test_delete_missing_key_is_noop(self):
        cache.cache_delete("never-set")


class TestLruBound:
    def test_oldest_entry_evicted_at_capacity(self):
        for i in range(cache._MAX_LOCAL):
            cache.cache_set(f"k{i}", i, ttl=60)
        # capacity reached: inserting one more evicts the oldest key
        cache.cache_set("overflow", "x", ttl=60)
        keys = set(cache._local_cache.keys())
        assert "overflow" in keys
        assert "k0" not in keys
        assert len(keys) <= cache._MAX_LOCAL


class TestInvalidatePrefix:
    def test_only_matching_prefixes_removed(self):
        cache.cache_set("eve:mem:user-1", 1, ttl=60)
        cache.cache_set("eve:mem:user-2", 2, ttl=60)
        cache.cache_set("other:key", 3, ttl=60)

        cache.cache_invalidate_prefix("eve:mem:")

        assert cache.cache_get("eve:mem:user-1") is None
        assert cache.cache_get("eve:mem:user-2") is None
        assert cache.cache_get("other:key") == 3


@pytest.mark.asyncio
async def test_snapshot_miss_returns_empty_and_refreshes_in_background():
    loaded = []

    async def loader():
        loaded.append(True)
        return {"value": 1}

    result = await cache.snapshot_read("snapshot", loader, {"value": 0})
    assert result == {"value": 0}
    await asyncio.sleep(0)
    assert loaded == [True]
    assert await cache.snapshot_read("snapshot", loader, {"value": 0}) == {"value": 1}


@pytest.mark.asyncio
async def test_snapshot_stale_returns_immediately_and_refreshes_once():
    calls = 0

    async def loader():
        nonlocal calls
        calls += 1
        return {"value": 2}

    cache.stale_cache_set("stale", {"value": 1}, fresh_ttl=0, stale_ttl=60)
    assert await cache.snapshot_read("stale", loader, {"value": 0}) == {"value": 1}
    assert await cache.snapshot_read("stale", loader, {"value": 0}) == {"value": 1}
    await asyncio.sleep(0)
    assert calls == 1
