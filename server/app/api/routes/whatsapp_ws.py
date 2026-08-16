import asyncio
import logging
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.auth import get_current_user_from_token
from app.core.whatsapp_ws_manager import whatsapp_ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()

PING_INTERVAL_S = 25


@router.websocket("/ws/whatsapp")
async def whatsapp_websocket(
    websocket: WebSocket,
    token: str = Query(..., description="Starwaves auth token"),
) -> None:
    """Persistent WebSocket connection for WhatsApp live updates."""
    try:
        user = get_current_user_from_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    uid = user["uid"]
    await whatsapp_ws_manager.connect(uid, websocket)

    async def _keepalive() -> None:
        while True:
            await asyncio.sleep(PING_INTERVAL_S)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    keepalive_task = asyncio.create_task(_keepalive())

    try:
        while True:
            # Client can send actions or typing state
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "pong":
                continue
            elif msg_type == "typing":
                # Broadcast typing indicator
                await whatsapp_ws_manager.broadcast_to_user(
                    uid,
                    {"type": "user_typing", "chat_id": data.get("chat_id"), "typing": data.get("typing", True)},
                )
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("WhatsApp WS error for uid=%s: %s", uid, exc)
    finally:
        keepalive_task.cancel()
        whatsapp_ws_manager.disconnect(uid, websocket)
