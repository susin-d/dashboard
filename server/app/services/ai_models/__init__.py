from app.services.ai_models._shared import (
    AI_MODELS_SETTINGS_DOC,
    AIServiceError,
    AiConfig,
    DEFAULT_PROVIDER,
    MAX_TOOL_ROUNDS,
    ProviderClient,
    any_provider_available,
    build_ai_config,
    load_ai_preference,
    provider_catalog,
    resolve_ai_config,
    run_tool_loop,
    validate_preference,
)
from app.services.ai_models.anthropic import AnthropicProviderClient
from app.services.ai_models.gemini import GeminiProviderClient
from app.services.ai_models.openai import OpenAiProviderClient

PROVIDER_CLIENTS = {
    "openai": OpenAiProviderClient,
    "anthropic": AnthropicProviderClient,
    "gemini": GeminiProviderClient,
}

__all__ = [
    "AI_MODELS_SETTINGS_DOC",
    "AIServiceError",
    "AiConfig",
    "DEFAULT_PROVIDER",
    "MAX_TOOL_ROUNDS",
    "PROVIDER_CLIENTS",
    "ProviderClient",
    "any_provider_available",
    "build_ai_config",
    "load_ai_preference",
    "provider_catalog",
    "resolve_ai_config",
    "run_tool_loop",
    "validate_preference",
]
