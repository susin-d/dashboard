import logging
from typing import Any

from anthropic import Anthropic, APIError

from app.services.ai_models._shared import (
    AIServiceError,
    ProviderClient,
    ProviderResponse,
    ToolCall,
)

logger = logging.getLogger(__name__)

MAX_TOKENS = 4096


def _convert_tool(tool: dict[str, Any]) -> dict[str, Any]:
    """Convert an OpenAI-style tool definition to Anthropic's input_schema format."""
    return {
        "name": tool["name"],
        "description": tool.get("description", ""),
        "input_schema": tool.get("parameters", {"type": "object", "properties": {}}),
    }


class AnthropicProviderClient(ProviderClient):
    """Anthropic (Claude) provider adapter using the Messages API."""

    def build_client(self, client_options: dict[str, Any]) -> Anthropic:
        try:
            return Anthropic(**client_options)
        except Exception as error:
            logger.error(f"[Anthropic Provider] Failed to initialize client: {type(error).__name__}: {error}", exc_info=True)
            raise AIServiceError(f"Anthropic client initialization failed: {type(error).__name__}: {error}") from error

    def normalize_messages(self, messages: list[dict[str, str]]) -> list[dict[str, Any]]:
        return [
            {
                "role": "assistant" if message["role"] == "assistant" else "user",
                "content": message["content"],
            }
            for message in messages
        ]

    def call(
        self,
        model: str,
        instructions: str,
        conversation: Any,
        tools: list[dict[str, Any]],
    ) -> ProviderResponse:
        try:
            response = self.client.messages.create(
                model=model,
                max_tokens=MAX_TOKENS,
                system=instructions,
                messages=conversation,
                tools=[_convert_tool(tool) for tool in tools],
            )
        except APIError as error:
            logger.error(f"[Anthropic Provider] API call failed for model '{model}': {type(error).__name__}: {error}", exc_info=True)
            raise AIServiceError(f"Anthropic API error ({type(error).__name__}): {error}") from error
        except Exception as error:
            logger.error(f"[Anthropic Provider] Unexpected failure calling model '{model}': {type(error).__name__}: {error}", exc_info=True)
            raise AIServiceError(f"Anthropic client error ({type(error).__name__}): {error}") from error

        text = "".join(block.text for block in response.content if block.type == "text") or None
        tool_calls = [
            ToolCall(
                call_id=block.id,
                name=block.name,
                arguments=dict(block.input or {}),
            )
            for block in response.content
            if block.type == "tool_use"
        ]
        return ProviderResponse(text=text, tool_calls=tool_calls, raw=response)

    def continuation(self, response: ProviderResponse) -> list[Any]:
        return [{"role": "assistant", "content": response.raw.content}]

    def tool_result_blocks(self, call: ToolCall, output: str) -> list[Any]:
        return [
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": call.call_id,
                        "content": output,
                    }
                ],
            }
        ]
