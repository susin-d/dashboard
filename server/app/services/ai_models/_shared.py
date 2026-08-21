import json
import logging
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any, Callable

from google.cloud.firestore_v1 import Client
from pydantic import ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 6
DEFAULT_PROVIDER = "openai"
AI_MODELS_SETTINGS_DOC = "ai-models"

# Curated catalog of AI providers and their supported models. The server must
# have an API key configured for a provider before it can be used (env vars),
# but the catalog itself is always returned to the frontend for display.
# Providers using an OpenAI-compatible /chat/completions API are marked
# "openai_compatible" and share OpenAiProviderClient.
AI_PROVIDERS: dict[str, dict[str, Any]] = {
    "openai": {
        "label": "OpenAI",
        "default_model": settings.openai_model,
        "models": [
            {"id": "gpt-5-mini", "label": "GPT-5 mini"},
            {"id": "gpt-5", "label": "GPT-5"},
            {"id": "gpt-4o", "label": "GPT-4o"},
            {"id": "gpt-4o-mini", "label": "GPT-4o mini"},
            {"id": "o3-mini", "label": "o3 mini"},
        ],
    },
    "anthropic": {
        "label": "Anthropic",
        "default_model": settings.anthropic_model,
        "models": [
            {"id": "claude-sonnet-4-5", "label": "Claude Sonnet 4.5"},
            {"id": "claude-opus-4-1", "label": "Claude Opus 4.1"},
            {"id": "claude-haiku-4-5", "label": "Claude Haiku 4.5"},
        ],
    },
    "gemini": {
        "label": "Google Gemini",
        "default_model": settings.gemini_model,
        "models": [
            {"id": "gemini-2.5-flash", "label": "Gemini 2.5 Flash"},
            {"id": "gemini-2.5-pro", "label": "Gemini 2.5 Pro"},
            {"id": "gemini-2.0-flash", "label": "Gemini 2.0 Flash"},
        ],
    },
    "openrouter": {
        "label": "OpenRouter",
        "default_model": settings.openrouter_model,
        "openai_compatible": True,
        "requires_base_url": True,
        "models": [
            {"id": "openai/gpt-4o", "label": "GPT-4o (via OpenRouter)"},
            {"id": "anthropic/claude-sonnet-4.5", "label": "Claude Sonnet 4.5 (via OpenRouter)"},
            {"id": "google/gemini-2.5-flash", "label": "Gemini 2.5 Flash (via OpenRouter)"},
            {"id": "meta-llama/llama-3.1-70b-instruct", "label": "Llama 3.1 70B (via OpenRouter)"},
        ],
    },
    "ollama": {
        "label": "Ollama (local)",
        "default_model": settings.ollama_model,
        "openai_compatible": True,
        "requires_base_url": True,
        "models": [
            {"id": "llama3.1", "label": "Llama 3.1"},
            {"id": "llama3.2", "label": "Llama 3.2"},
            {"id": "qwen2.5", "label": "Qwen 2.5"},
            {"id": "mistral", "label": "Mistral"},
        ],
    },
    "opencode": {
        "label": "OpenCode",
        "default_model": settings.opencode_model,
        "openai_compatible": True,
        "requires_base_url": True,
        "models": [
            {"id": "opencode/gpt-5-mini", "label": "GPT-5 mini (via OpenCode)"},
            {"id": "opencode/claude-sonnet-4-5", "label": "Claude Sonnet 4.5 (via OpenCode)"},
        ],
    },
}


class AIServiceError(RuntimeError):
    """Raised when an AI provider cannot complete a request."""


@dataclass
class AiConfig:
    provider: str
    model: str
    client_options: dict[str, Any]


@dataclass
class ToolCall:
    call_id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class ProviderResponse:
    text: str | None
    tool_calls: list[ToolCall]
    raw: Any = None


@dataclass
class StreamChunk:
    """One streamed provider event: incremental text or the complete response.

    Providers yield zero or more ``text_delta`` chunks followed by exactly one
    ``final`` chunk carrying the same ProviderResponse shape as a non-streaming
    call, so the shared tool loop stays provider-agnostic.
    """

    kind: str  # "text_delta" | "final"
    text: str = ""
    response: ProviderResponse | None = None


class ProviderClient:
    """Adapter interface for an AI provider's tool-calling SDK.

    Subclasses implement build_client, normalize_messages, call,
    continuation, and tool_result_blocks so the shared tool loop in
    run_tool_loop stays provider-agnostic.
    """

    def __init__(self, client_options: dict[str, Any]):
        self.client = self.build_client(client_options)

    def build_client(self, client_options: dict[str, Any]) -> Any:
        raise NotImplementedError

    def normalize_messages(self, messages: list[dict[str, str]]) -> Any:
        raise NotImplementedError

    def call(
        self,
        model: str,
        instructions: str,
        conversation: Any,
        tools: list[dict[str, Any]],
    ) -> ProviderResponse:
        raise NotImplementedError

    def call_stream(
        self,
        model: str,
        instructions: str,
        conversation: Any,
        tools: list[dict[str, Any]],
    ) -> Iterator[StreamChunk]:
        raise NotImplementedError

    def continuation(self, response: ProviderResponse) -> list[Any]:
        raise NotImplementedError

    def tool_result_blocks(self, call: ToolCall, output: str) -> list[Any]:
        raise NotImplementedError


# Default base URLs for OpenAI-compatible providers
PROVIDER_DEFAULT_BASE_URLS: dict[str, str] = {
    "openai": "https://api.openai.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "ollama": "http://127.0.0.1:11434/v1",
    "opencode": "https://opencode.ai/api/v1",
}


def _provider_key_set(provider: str) -> bool:
    if provider == "openai":
        return bool(settings.openai_api_key)
    if provider == "anthropic":
        return bool(settings.anthropic_api_key)
    if provider == "gemini":
        return bool(settings.gemini_api_key)
    if provider == "openrouter":
        return bool(settings.openrouter_api_key)
    if provider == "ollama":
        # Ollama is local — available when a URL is configured (key optional)
        return bool(settings.ollama_url)
    if provider == "opencode":
        return bool(settings.opencode_api_key)
    return False


def _client_options(provider: str, user_api_key: str | None = None) -> dict[str, Any]:
    api_key = user_api_key
    if not api_key:
        api_key = _effective_api_key(provider, {})

    options: dict[str, Any] = {}
    if api_key:
        options["api_key"] = api_key
    elif provider == "ollama":
        # Ollama needs a placeholder key for the OpenAI SDK
        options["api_key"] = "ollama"

    base_url = _effective_base_url(provider)
    if base_url:
        options["base_url"] = base_url
    return options


def _effective_api_key(provider: str, user_keys: dict[str, str]) -> str | None:
    if user_keys.get(provider):
        return user_keys[provider]
    if provider == "openai":
        return settings.openai_api_key
    if provider == "anthropic":
        return settings.anthropic_api_key
    if provider == "gemini":
        return settings.gemini_api_key
    if provider == "openrouter":
        return settings.openrouter_api_key
    if provider == "ollama":
        return settings.ollama_api_key or "ollama"
    if provider == "opencode":
        return settings.opencode_api_key
    return None


def _effective_base_url(provider: str) -> str | None:
    if provider == "openai":
        return settings.openai_url or PROVIDER_DEFAULT_BASE_URLS["openai"]
    if provider == "anthropic":
        return settings.anthropic_url
    if provider == "gemini":
        return settings.gemini_url
    if provider == "openrouter":
        return settings.openrouter_url or PROVIDER_DEFAULT_BASE_URLS["openrouter"]
    if provider == "ollama":
        return settings.ollama_url or PROVIDER_DEFAULT_BASE_URLS["ollama"]
    if provider == "opencode":
        return settings.opencode_url or PROVIDER_DEFAULT_BASE_URLS["opencode"]
    return None


def _format_model_label(model_id: str) -> str:
    raw = model_id.replace("models/", "")
    parts = raw.replace("-", " ").replace("_", " ").split()
    return " ".join(word.capitalize() if word.isalpha() else word for word in parts)


# Cache for live model listings to avoid hammering provider APIs
_live_model_cache: dict[str, tuple[float, list[dict[str, str]]]] = {}
_LIVE_MODEL_TTL = 300  # seconds


def _live_cache_get(provider: str, api_key: str) -> list[dict[str, str]] | None:
    import time
    key = f"{provider}:{api_key[:8]}"
    entry = _live_model_cache.get(key)
    if entry and entry[0] > time.monotonic():
        return entry[1]
    return None


def _live_cache_set(provider: str, api_key: str, models: list[dict[str, str]]) -> None:
    import time
    key = f"{provider}:{api_key[:8]}"
    _live_model_cache[key] = (time.monotonic() + _LIVE_MODEL_TTL, models)


async def _fetch_openai_models(api_key: str, base_url: str | None = None) -> list[dict[str, str]]:
    import httpx
    url = f"{(base_url or 'https://api.openai.com/v1').rstrip('/')}/models"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(6.0, connect=3.0)) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"})
            if resp.status_code != 200:
                logger.warning(f"[AI Models] OpenAI list models failed {resp.status_code}: {resp.text[:200]}")
                return []
            data = resp.json()
            items = data.get("data") or []
            models: list[dict[str, str]] = []
            for it in items:
                mid = it.get("id") or ""
                if not mid:
                    continue
                # Filter to chat/completion models only
                low = mid.lower()
                if any(x in low for x in ("embedding", "whisper", "tts", "dall", "audio", "realtime", "transcribe", "moderation")):
                    continue
                if not (low.startswith("gpt-") or low.startswith("o1") or low.startswith("o3") or low.startswith("o4") or low.startswith("chatgpt")):
                    continue
                models.append({"id": mid, "label": _format_model_label(mid)})
            # Sort: prefer newest gpt-5, gpt-4o etc.
            models.sort(key=lambda x: x["id"])
            return models
    except Exception as e:
        logger.warning(f"[AI Models] OpenAI list exception: {e}")
        return []


async def _fetch_gemini_models(api_key: str) -> list[dict[str, str]]:
    import httpx
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(6.0, connect=3.0)) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning(f"[AI Models] Gemini list models failed {resp.status_code}: {resp.text[:200]}")
                return []
            data = resp.json()
            items = data.get("models") or []
            models: list[dict[str, str]] = []
            for it in items:
                name = it.get("name") or ""  # e.g. models/gemini-2.5-flash
                mid = name.replace("models/", "")
                if not mid or "gemini" not in mid.lower():
                    continue
                methods = it.get("supportedGenerationMethods") or []
                if "generateContent" not in methods:
                    continue
                label = it.get("displayName") or _format_model_label(mid)
                models.append({"id": mid, "label": label})
            models.sort(key=lambda x: x["id"])
            return models
    except Exception as e:
        logger.warning(f"[AI Models] Gemini list exception: {e}")
        return []


async def _fetch_anthropic_models(api_key: str) -> list[dict[str, str]]:
    import httpx
    url = "https://api.anthropic.com/v1/models"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(6.0, connect=3.0)) as client:
            resp = await client.get(
                url,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
            )
            if resp.status_code != 200:
                logger.warning(f"[AI Models] Anthropic list models failed {resp.status_code}: {resp.text[:200]}")
                return []
            data = resp.json()
            items = data.get("data") or []
            models: list[dict[str, str]] = []
            for it in items:
                mid = it.get("id") or it.get("name") or ""
                if not mid or "claude" not in mid.lower():
                    continue
                label = it.get("display_name") or _format_model_label(mid)
                models.append({"id": mid, "label": label})
            models.sort(key=lambda x: x["id"])
            return models
    except Exception as e:
        logger.warning(f"[AI Models] Anthropic list exception: {e}")
        return []


async def _fetch_openai_compatible_models(api_key: str, base_url: str, provider: str) -> list[dict[str, str]]:
    """List models from any OpenAI-compatible /v1/models endpoint (OpenRouter, Ollama, OpenCode)."""
    import httpx
    url = f"{base_url.rstrip('/')}/models"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=4.0)) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.warning(f"[AI Models] {provider} list models failed {resp.status_code}: {resp.text[:200]}")
                return []
            data = resp.json()
            items = data.get("data") or []
            models: list[dict[str, str]] = []
            for it in items:
                mid = it.get("id") or ""
                if not mid:
                    continue
                low = mid.lower()
                # Filter out non-chat endpoints
                if any(x in low for x in ("embed", "whisper", "tts", "dall", "audio", "realtime", "transcribe", "moderation", "rerank")):
                    continue
                label = it.get("name") or _format_model_label(mid)
                models.append({"id": mid, "label": label})
            models.sort(key=lambda x: x["id"])
            return models
    except Exception as e:
        logger.warning(f"[AI Models] {provider} list exception: {e}")
        return []


async def fetch_provider_models(provider: str, api_key: str | None = None, user_keys: dict[str, str] | None = None) -> list[dict[str, str]]:
    effective = api_key or _effective_api_key(provider, user_keys or {})
    if not effective:
        return []
    cached = _live_cache_get(provider, effective)
    if cached is not None:
        return cached
    base_url = _effective_base_url(provider)
    if provider == "openai":
        models = await _fetch_openai_models(effective, base_url)
    elif provider == "gemini":
        models = await _fetch_gemini_models(effective)
    elif provider == "anthropic":
        models = await _fetch_anthropic_models(effective)
    elif provider in ("openrouter", "ollama", "opencode"):
        models = await _fetch_openai_compatible_models(effective, base_url or PROVIDER_DEFAULT_BASE_URLS[provider], provider)
    else:
        return []
    if models:
        _live_cache_set(provider, effective, models)
    return models


def any_provider_available() -> bool:
    return any(_provider_key_set(provider) for provider in AI_PROVIDERS)


async def provider_catalog(user_api_keys: dict[str, str] | None = None) -> list[dict[str, Any]]:
    keys = user_api_keys or {}
    catalog = [
        {
            "id": "default",
            "label": "Default",
            "available": any_provider_available(),
            "env_configured": True,
            "is_default": True,
            "has_user_key": False,
            "default_model": "default",
            "models": [
                {
                    "id": "default",
                    "label": "Default",
                    "is_default": True,
                }
            ],
        }
    ]
    for provider_id, descriptor in AI_PROVIDERS.items():
        # Try live API list if key available, fallback to static catalog
        live_models: list[dict[str, str]] = []
        effective_key = _effective_api_key(provider_id, keys)
        if effective_key:
            try:
                live_models = await fetch_provider_models(provider_id, effective_key, keys)
            except Exception:
                live_models = []
        static_models = descriptor["models"]
        chosen_models = live_models if live_models else static_models
        # Map to catalog shape with is_default flag
        default_id = descriptor["default_model"]
        models_payload = []
        for item in chosen_models:
            # live_models already are {id,label}, static are same shape
            mid = item["id"]
            lbl = item.get("label") or _format_model_label(mid)
            models_payload.append({
                "id": mid,
                "label": lbl,
                "is_default": mid == default_id,
            })
        # Ensure default still present even if live list missed it
        if live_models and not any(m["id"] == default_id for m in models_payload):
            # Add static default as fallback entry
            static_default = next((m for m in static_models if m["id"] == default_id), None)
            if static_default:
                models_payload.insert(0, {
                    "id": static_default["id"],
                    "label": static_default["label"],
                    "is_default": True,
                })
        catalog.append({
            "id": provider_id,
            "label": descriptor["label"],
            "available": bool(keys.get(provider_id)) or _provider_key_set(provider_id),
            "env_configured": _provider_key_set(provider_id),
            "is_default": False,
            "has_user_key": bool(keys.get(provider_id)),
            "default_model": descriptor["default_model"],
            "models": models_payload,
        })
    return catalog


def validate_preference(provider: str, model: str) -> bool:
    if provider == "default":
        return model in ("default", "", None)
    descriptor = AI_PROVIDERS.get(provider)
    if not descriptor:
        return False
    # Allow any non-empty model id for known provider (live API may expose models beyond static catalog)
    return isinstance(model, str) and len(model.strip()) > 0


def build_ai_config(
    provider: str = DEFAULT_PROVIDER,
    model: str | None = None,
    user_api_key: str | None = None,
) -> AiConfig:
    if provider in ("default", "", None) or provider not in AI_PROVIDERS:
        provider = DEFAULT_PROVIDER
        user_api_key = None
    elif not user_api_key and not _provider_key_set(provider):
        provider = DEFAULT_PROVIDER
        user_api_key = None

    descriptor = AI_PROVIDERS[provider]
    # Accept any live model id; only fallback when empty/default
    if not model or model == "default":
        model = descriptor["default_model"]
    return AiConfig(
        provider=provider,
        model=model,
        client_options=_client_options(provider, user_api_key=user_api_key),
    )


def _preference_reference(database: Client, user_uid: str):
    return (
        database.collection("users")
        .document(user_uid)
        .collection("settings")
        .document(AI_MODELS_SETTINGS_DOC)
    )


def load_ai_preference(database: Client, user_uid: str) -> dict[str, Any] | None:
    snapshot = _preference_reference(database, user_uid).get()
    if not snapshot.exists:
        return None
    return snapshot.to_dict() or None

_ai_config_cache: dict[str, tuple[float, AiConfig]] = {}
_AI_CACHE_TTL = 60  # seconds

def _ai_cache_get(user_uid: str) -> AiConfig | None:
    import time
    entry = _ai_config_cache.get(user_uid)
    if entry and entry[0] > time.monotonic():
        return entry[1]
    return None

def _ai_cache_set(user_uid: str, config: AiConfig) -> None:
    import time
    _ai_config_cache[user_uid] = (time.monotonic() + _AI_CACHE_TTL, config)

def invalidate_ai_config_cache(user_uid: str) -> None:
    _ai_config_cache.pop(user_uid, None)


def resolve_ai_config(database: Client, user_uid: str) -> AiConfig:
    """Resolve a user's AI provider/model choice, falling back to the server default."""
    cached = _ai_cache_get(user_uid)
    if cached is not None:
        return cached
    preference = load_ai_preference(database, user_uid)
    if not preference:
        cfg = build_ai_config("default")
        _ai_cache_set(user_uid, cfg)
        return cfg

    chosen_provider = preference.get("provider") or "default"
    if chosen_provider == "default":
        cfg = build_ai_config("default")
        _ai_cache_set(user_uid, cfg)
        return cfg

    model = preference.get("model")
    user_api_key = None
    api_keys = preference.get("api_keys") or {}
    if isinstance(api_keys, dict) and chosen_provider in api_keys:
        user_api_key = api_keys.get(chosen_provider)
    elif preference.get("api_key") and preference.get("provider") == chosen_provider:
        user_api_key = preference.get("api_key")

    cfg = build_ai_config(chosen_provider, model, user_api_key=user_api_key)
    _ai_cache_set(user_uid, cfg)
    return cfg


def run_tool_loop(
    client: ProviderClient,
    config: AiConfig,
    instructions: str,
    conversation: list[dict[str, str]],
    tools: list[dict[str, Any]],
    run_tool: Callable[[str, dict[str, Any]], tuple[Any, str | None, dict[str, Any] | None]],
) -> tuple[str, list[str], list[dict[str, Any]]]:
    """Run the provider tool-calling loop until the model stops calling tools."""
    conversation = client.normalize_messages(conversation)
    changed_resources: list[str] = []
    actions: list[dict[str, Any]] = []
    for round_idx in range(MAX_TOOL_ROUNDS):
        response = client.call(config.model, instructions, conversation, tools)
        if not response.tool_calls:
            return (
                response.text or "I could not generate a response. Please try again.",
                changed_resources,
                actions,
            )
        conversation.extend(client.continuation(response))
        for call in response.tool_calls:
            try:
                result, changed_resource, action = run_tool(call.name, call.arguments)
                if changed_resource and changed_resource not in changed_resources:
                    changed_resources.append(changed_resource)
                if action:
                    actions.append(action)
            except (KeyError, TypeError, ValueError, ValidationError) as error:
                logger.warning(f"[AI Tool Loop] Tool '{call.name}' returned error: {error}")
                result = {"error": str(error)}
            except Exception as error:
                logger.error(f"[AI Tool Loop] Unexpected failure in tool '{call.name}': {type(error).__name__}: {error}", exc_info=True)
                result = {"error": f"Tool execution failed: {type(error).__name__}: {error}"}
            conversation.extend(
                client.tool_result_blocks(call, json.dumps(result, default=str))
            )
    logger.error(f"[AI Tool Loop] Exceeded maximum tool rounds ({MAX_TOOL_ROUNDS}) for {config.provider}/{config.model}")
    raise AIServiceError(f"The AI request exceeded the maximum number of tool rounds ({MAX_TOOL_ROUNDS}).")


def run_tool_loop_stream(
    client: ProviderClient,
    config: AiConfig,
    instructions: str,
    conversation: list[dict[str, str]],
    tools: list[dict[str, Any]],
    run_tool: Callable[[str, dict[str, Any]], tuple[Any, str | None, dict[str, Any] | None]],
) -> Iterator[dict[str, Any]]:
    """Run the provider tool-calling loop with streamed text deltas.

    Yields event dicts:
    - {"type": "delta", "text": str}            — incremental assistant text
    - {"type": "tool_start", "name": str}       — a workspace tool begins executing
    - {"type": "tool_end", "name": str}         — the tool finished
    - {"type": "done", "message": str, "changed_resources": [...], "actions": [...]}
    """
    conversation = client.normalize_messages(conversation)
    changed_resources: list[str] = []
    actions: list[dict[str, Any]] = []
    for _round_idx in range(MAX_TOOL_ROUNDS):
        final_response: ProviderResponse | None = None
        for chunk in client.call_stream(config.model, instructions, conversation, tools):
            if chunk.kind == "text_delta":
                yield {"type": "delta", "text": chunk.text}
            elif chunk.kind == "final" and chunk.response is not None:
                final_response = chunk.response
        if final_response is None:
            raise AIServiceError("Provider stream ended without a final response.")
        response = final_response
        if not response.tool_calls:
            yield {
                "type": "done",
                "message": response.text or "I could not generate a response. Please try again.",
                "changed_resources": changed_resources,
                "actions": actions,
            }
            return
        conversation.extend(client.continuation(response))
        for call in response.tool_calls:
            yield {"type": "tool_start", "name": call.name}
            try:
                result, changed_resource, action = run_tool(call.name, call.arguments)
                if changed_resource and changed_resource not in changed_resources:
                    changed_resources.append(changed_resource)
                if action:
                    actions.append(action)
            except (KeyError, TypeError, ValueError, ValidationError) as error:
                logger.warning(f"[AI Tool Loop] Tool '{call.name}' returned error: {error}")
                result = {"error": str(error)}
            except Exception as error:
                logger.error(f"[AI Tool Loop] Unexpected failure in tool '{call.name}': {type(error).__name__}: {error}", exc_info=True)
                result = {"error": f"Tool execution failed: {type(error).__name__}: {error}"}
            yield {"type": "tool_end", "name": call.name}
            conversation.extend(
                client.tool_result_blocks(call, json.dumps(result, default=str))
            )
    logger.error(f"[AI Tool Loop] Exceeded maximum tool rounds ({MAX_TOOL_ROUNDS}) for {config.provider}/{config.model}")
    raise AIServiceError(f"The AI request exceeded the maximum number of tool rounds ({MAX_TOOL_ROUNDS}).")
