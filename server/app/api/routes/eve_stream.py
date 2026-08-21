"""Eve chat SSE streaming endpoint — single responsibility: stream
stream_chat_with_eve events to the client as server-sent events."""

import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.schemas.eve import EveChatRequest
from app.services.eve import stream_chat_with_eve

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/eve")

SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.post("/chat/stream")
async def chat_stream(
    payload: EveChatRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    """Stream an Eve chat response as server-sent events.

    Emits `data: {json event}\\n\\n` frames (delta / tool_start / tool_end /
    done / error) terminated by a final `data: [DONE]` frame.
    """

    def event_source():
        try:
            for event in stream_chat_with_eve(
                database,
                user,
                [item.model_dump() for item in payload.messages],
                payload.session_id,
            ):
                yield f"data: {json.dumps(event, default=str)}\n\n"
        except Exception as error:
            # Never terminate the stream without an in-band error frame.
            logger.error(f"[Eve Chat Stream] Unhandled stream failure: {type(error).__name__}: {error}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'detail': 'Eve stream failed unexpectedly.'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_source(), media_type="text/event-stream", headers=SSE_HEADERS)
