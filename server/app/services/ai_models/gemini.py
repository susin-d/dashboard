import json
from typing import Any

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.services.ai_models._shared import (
    AIServiceError,
    ProviderClient,
    ProviderResponse,
    ToolCall,
)


def _convert_tool(tool: dict[str, Any]) -> types.Tool:
    """Convert an OpenAI-style tool definition to a Gemini Tool."""
    function = types.FunctionDeclaration(
        name=tool["name"],
        description=tool.get("description", ""),
        parameters=tool.get("parameters"),
    )
    return types.Tool(function_declarations=[function])


class GeminiProviderClient(ProviderClient):
    """Google Gemini provider adapter using the google-genai SDK."""

    def build_client(self, client_options: dict[str, Any]) -> genai.Client:
        options = dict(client_options)
        api_key = options.pop("api_key")
        base_url = options.pop("base_url", None)
        if base_url:
            return genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(base_url=base_url),
            )
        return genai.Client(api_key=api_key)

    def normalize_messages(self, messages: list[dict[str, str]]) -> list[types.Content]:
        contents = []
        for message in messages:
            role = "model" if message["role"] == "assistant" else "user"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=message["content"])],
                )
            )
        return contents

    def call(
        self,
        model: str,
        instructions: str,
        conversation: Any,
        tools: list[dict[str, Any]],
    ) -> ProviderResponse:
        config = types.GenerateContentConfig(
            system_instruction=instructions,
            tools=[_convert_tool(tool) for tool in tools],
        )
        try:
            response = self.client.models.generate_content(
                model=model,
                contents=conversation,
                config=config,
            )
        except APIError as error:
            raise AIServiceError(str(error)) from error

        text_parts: list[str] = []
        tool_calls: list[ToolCall] = []
        if response.candidates:
            parts = response.candidates[0].content.parts
            for part in parts:
                if getattr(part, "text", None):
                    text_parts.append(part.text)
                elif part.function_call:
                    tool_calls.append(
                        ToolCall(
                            call_id=part.function_call.id or part.function_call.name,
                            name=part.function_call.name,
                            arguments=dict(part.function_call.args or {}),
                        )
                    )
        return ProviderResponse(
            text="".join(text_parts) or None,
            tool_calls=tool_calls,
            raw=response,
        )

    def continuation(self, response: ProviderResponse) -> list[Any]:
        return [response.raw.candidates[0].content]

    def tool_result_blocks(self, call: ToolCall, output: str) -> list[Any]:
        try:
            payload = json.loads(output)
        except (json.JSONDecodeError, TypeError):
            payload = {"output": output}
        return [
            types.Content(
                role="user",
                parts=[
                    types.Part(
                        function_response=types.FunctionResponse(
                            name=call.name,
                            response=payload,
                        )
                    )
                ],
            )
        ]
