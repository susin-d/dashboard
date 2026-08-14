import json
from dataclasses import dataclass
from typing import Any, Callable

from google.cloud.firestore_v1 import Client
from pydantic import ValidationError

from app.core.config import settings

MAX_TOOL_ROUNDS = 6
DEFAULT_PROVIDER = "openai"
AI_MODELS_SETTINGS_DOC = "ai-models"

# Curated catalog of AI providers and their supported models. The server must
# have an API key configured for a provider before it can be used (env vars),
# but the catalog itself is always returned to the frontend for display.
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

    def continuation(self, response: ProviderResponse) -> list[Any]:
        raise NotImplementedError

    def tool_result_blocks(self, call: ToolCall, output: str) -> list[Any]:
        raise NotImplementedError


def _provider_key_set(provider: str) -> bool:
    if provider == "openai":
        return bool(settings.openai_api_key)
    if provider == "anthropic":
        return bool(settings.anthropic_api_key)
    if provider == "gemini":
        return bool(settings.gemini_api_key)
    return False


def _client_options(provider: str, user_api_key: str | None = None) -> dict[str, Any]:
    api_key = user_api_key
    if not api_key:
        if provider == "openai":
            api_key = settings.openai_api_key
        elif provider == "anthropic":
            api_key = settings.anthropic_api_key
        elif provider == "gemini":
            api_key = settings.gemini_api_key

    if not api_key:
        return {}

    options: dict[str, Any] = {"api_key": api_key}
    if provider == "openai" and settings.openai_url:
        options["base_url"] = settings.openai_url
    elif provider == "anthropic" and settings.anthropic_url:
        options["base_url"] = settings.anthropic_url
    elif provider == "gemini" and settings.gemini_url:
        options["base_url"] = settings.gemini_url
    return options


def any_provider_available() -> bool:
    return any(_provider_key_set(provider) for provider in AI_PROVIDERS)


def provider_catalog(user_api_keys: dict[str, str] | None = None) -> list[dict[str, Any]]:
    keys = user_api_keys or {}
    return [
        {
            "id": provider_id,
            "label": descriptor["label"],
            "available": _provider_key_set(provider_id) or bool(keys.get(provider_id)),
            "env_configured": _provider_key_set(provider_id),
            "is_default": provider_id == DEFAULT_PROVIDER,
            "has_user_key": bool(keys.get(provider_id)),
            "default_model": descriptor["default_model"],
            "models": [
                {
                    "id": item["id"],
                    "label": item["label"],
                    "is_default": item["id"] == descriptor["default_model"],
                }
                for item in descriptor["models"]
            ],
        }
        for provider_id, descriptor in AI_PROVIDERS.items()
    ]


def validate_preference(provider: str, model: str) -> bool:
    descriptor = AI_PROVIDERS.get(provider)
    if not descriptor:
        return False
    return any(item["id"] == model for item in descriptor["models"])


def build_ai_config(
    provider: str = DEFAULT_PROVIDER,
    model: str | None = None,
    user_api_key: str | None = None,
) -> AiConfig:
    if provider not in AI_PROVIDERS or (not _provider_key_set(provider) and not user_api_key):
        provider = DEFAULT_PROVIDER
        user_api_key = None
    descriptor = AI_PROVIDERS[provider]
    if not model or not any(item["id"] == model for item in descriptor["models"]):
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


def resolve_ai_config(database: Client, user_uid: str) -> AiConfig:
    """Resolve a user's AI provider/model choice, falling back to the server default."""
    provider = DEFAULT_PROVIDER
    model = None
    user_api_key = None
    preference = load_ai_preference(database, user_uid)
    if preference:
        chosen_provider = preference.get("provider") or DEFAULT_PROVIDER
        model = preference.get("model")
        api_keys = preference.get("api_keys") or {}
        if isinstance(api_keys, dict) and chosen_provider in api_keys:
            user_api_key = api_keys.get(chosen_provider)
        elif preference.get("api_key") and preference.get("provider") == chosen_provider:
            user_api_key = preference.get("api_key")
        provider = chosen_provider
    return build_ai_config(provider, model, user_api_key=user_api_key)


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
    for _ in range(MAX_TOOL_ROUNDS):
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
                result = {"error": str(error)}
            conversation.extend(
                client.tool_result_blocks(call, json.dumps(result, default=str))
            )
    raise AIServiceError("The AI request exceeded the maximum number of tool rounds.")
