from __future__ import annotations

import logging
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, case_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(case_id, [])
        self.active_connections[case_id].append(websocket)
        logger.info("WebSocket client connected to case %s", case_id)

    def disconnect(self, case_id: str, websocket: WebSocket) -> None:
        if case_id not in self.active_connections:
            return

        self.active_connections[case_id] = [
            connection for connection in self.active_connections[case_id] if connection is not websocket
        ]
        if not self.active_connections[case_id]:
            del self.active_connections[case_id]
        logger.info("WebSocket client disconnected from case %s", case_id)

    async def broadcast_to_case(self, case_id: str, message: dict[str, Any]) -> None:
        if case_id not in self.active_connections:
            return

        dead_connections: list[WebSocket] = []
        for connection in self.active_connections[case_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for connection in dead_connections:
            self.disconnect(case_id, connection)


manager = ConnectionManager()
