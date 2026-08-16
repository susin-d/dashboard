import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WhatsAppWSManager:
    """Manages active WebSocket connections for WhatsApp real-time updates."""

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, uid: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if uid not in self._connections:
            self._connections[uid] = set()
        self._connections[uid].add(websocket)
        logger.debug("WhatsApp WS connected: uid=%s, sockets=%d", uid, len(self._connections[uid]))

    def disconnect(self, uid: str, websocket: WebSocket) -> None:
        if uid in self._connections:
            self._connections[uid].discard(websocket)
            if not self._connections[uid]:
                self._connections.pop(uid, None)
        logger.debug("WhatsApp WS disconnected: uid=%s", uid)

    async def broadcast_to_user(self, uid: str, event: dict[str, Any]) -> None:
        """Send event payload to all open sockets for this user."""
        sockets = list(self._connections.get(uid, []))
        for ws in sockets:
            try:
                await ws.send_json(event)
            except Exception:
                self.disconnect(uid, ws)


whatsapp_ws_manager = WhatsAppWSManager()
