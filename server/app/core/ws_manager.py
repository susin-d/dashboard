"""In-process WebSocket connection manager for call signaling.

Keeps a mapping of uid → WebSocket. When the server pushes a call event
(incoming_call, call_signal, call_updated) it calls ``call_ws_manager.send``;
the manager silently skips users who are offline (no socket registered).

This in-process store works correctly for a single Uvicorn worker process.
If you later need multi-replica scaling, swap the dict for a Redis Pub/Sub
adapter behind the same interface.
"""

import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class CallWSManager:
    """Manages one active WebSocket connection per authenticated user."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, uid: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[uid] = websocket
        logger.debug("WS connect: uid=%s  total=%d", uid, len(self._connections))

    def disconnect(self, uid: str) -> None:
        self._connections.pop(uid, None)
        logger.debug("WS disconnect: uid=%s  total=%d", uid, len(self._connections))

    async def send(self, uid: str, event: dict[str, Any]) -> None:
        """Push an event to a connected user. Silently skips if user is offline."""
        websocket = self._connections.get(uid)
        if websocket is None:
            return
        try:
            await websocket.send_json(event)
        except Exception:
            # Broken connection — remove stale entry so it doesn't block future pushes.
            self.disconnect(uid)


call_ws_manager = CallWSManager()
