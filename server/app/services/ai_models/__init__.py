from app.services.ai_models._shared import (
    AI_MODELS_SETTINGS_DOC,
    AI_PROVIDERS,
    AIServiceError,
    AiConfig,
    DEFAULT_PROVIDER,
    MAX_TOOL_ROUNDS,
    ProviderClient,
    _provider_key_set,
    any_provider_available,
    build_ai_config,
    invalidate_ai_config_cache,
    load_ai_preference,
    provider_catalog,
    resolve_ai_config,
    run_tool_loop,
    validate_preference,
)
from app.services.ai_models.anthropic import AnthropicProviderClient
from app.services.ai_models.gemini import GeminiProviderClient
from app.services.ai_models.openai import OpenAiProviderClient
from app.services.ai_models.openai_compat import OpenAiCompatibleClient

PROVIDER_CLIENTS = {
    "openai": OpenAiProviderClient,
    "anthropic": AnthropicProviderClient,
    "gemini": GeminiProviderClient,
    "openrouter": OpenAiCompatibleClient,
    "ollama": OpenAiCompatibleClient,
    "opencode": OpenAiCompatibleClient,
}

__all__ = [
    "AI_MODELS_SETTINGS_DOC",
    "AI_PROVIDERS",
    "AIServiceError",
    "AiConfig",
    "DEFAULT_PROVIDER",
    "MAX_TOOL_ROUNDS",
    "PROVIDER_CLIENTS",
    "ProviderClient",
    "_provider_key_set",
    "any_provider_available",
    "build_ai_config",
    "invalidate_ai_config_cache",
    "load_ai_preference",
    "provider_catalog",
    "resolve_ai_config",
    "run_tool_loop",
    "validate_preference",
]
