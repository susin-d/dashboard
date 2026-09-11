"""Unit tests for core.http — shared httpx client factory defaults."""

import httpx
import pytest

import app.core.http as http_module
from app.core.http import (
    DEFAULT_LIMITS,
    DEFAULT_TIMEOUT,
    DEFAULT_USER_AGENT,
    create_async_client,
    create_sync_client,
    get_shared_async_client,
)


class TestAsyncClientFactory:
    @pytest.mark.asyncio
    async def test_client_is_async_with_defaults(self):
        client = create_async_client()
        try:
            assert isinstance(client, httpx.AsyncClient)
            assert client.headers["User-Agent"] == DEFAULT_USER_AGENT
            assert client.timeout == DEFAULT_TIMEOUT
        finally:
            await client.aclose()

    def test_custom_timeout_number(self):
        client = create_async_client(timeout=3.5)
        assert client.timeout.connect == pytest.approx(3.5)

    def test_custom_timeout_object(self):
        timeout = httpx.Timeout(20.0, connect=2.0)
        client = create_async_client(timeout=timeout)
        assert client.timeout == timeout

    def test_base_url_set_when_given(self):
        client = create_async_client(base_url="https://api.example.com")
        assert str(client.base_url) == "https://api.example.com"

    def test_no_base_url_by_default(self):
        client = create_async_client()
        assert str(client.base_url) == ""

    def test_extra_headers_merged_over_user_agent(self):
        client = create_async_client(headers={"Authorization": "Bearer x"})
        assert client.headers["Authorization"] == "Bearer x"
        assert client.headers["User-Agent"] == DEFAULT_USER_AGENT


class TestSharedAsyncClient:
    @pytest.mark.asyncio
    async def test_same_loop_returns_same_keepalive_instance(self):
        first = get_shared_async_client()
        second = get_shared_async_client()
        assert first is second
        assert isinstance(first, httpx.AsyncClient)
        assert first.headers["User-Agent"] == DEFAULT_USER_AGENT

    @pytest.mark.asyncio
    async def test_rebuilt_when_running_loop_changes(self, monkeypatch):
        first = get_shared_async_client()
        monkeypatch.setattr(http_module, "_shared_async_client_loop", object())
        second = get_shared_async_client()
        assert second is not first
        assert isinstance(second, httpx.AsyncClient)


class TestSyncClientFactory:
    def test_client_is_sync_with_defaults(self):
        client = create_sync_client()
        assert isinstance(client, httpx.Client)
        assert client.headers["User-Agent"] == DEFAULT_USER_AGENT
        assert client.timeout == DEFAULT_TIMEOUT

    def test_shared_limits_constant_shape(self):
        assert DEFAULT_LIMITS.max_keepalive_connections == 10
        assert DEFAULT_LIMITS.max_connections == 20
