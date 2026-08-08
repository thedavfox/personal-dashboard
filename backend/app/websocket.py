import uuid

from fastapi import WebSocket


class ConnectionManager:
    """Tracks live WebSocket connections per user and fans out widget update
    events to whichever of that user's dashboards are currently open."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[WebSocket]] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        connections = self._connections.get(user_id)
        if connections:
            connections.discard(websocket)
            if not connections:
                self._connections.pop(user_id, None)

    async def send_widget_update(self, user_id: uuid.UUID, widget_id: uuid.UUID, data: dict) -> None:
        connections = self._connections.get(user_id, ())
        payload = {"type": "widget_update", "widget_id": str(widget_id), "data": data}
        for ws in list(connections):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(user_id, ws)


manager = ConnectionManager()
