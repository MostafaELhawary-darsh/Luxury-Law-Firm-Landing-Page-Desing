from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable

import asyncpg

logger = logging.getLogger(__name__)


class PostgresNotificationListener:
    def __init__(self, database_url: str, channel: str = "doc_changes", callback: Callable[[dict[str, Any]], Awaitable[None]] | None = None) -> None:
        self.database_url = database_url
        self.channel = channel
        self.callback = callback
        self._connection: asyncpg.Connection | None = None

    async def start(self) -> None:
        self._connection = await asyncpg.connect(self.database_url)
        await self._connection.add_listener(self.channel, self._handle_notification)
        logger.info("Listening for PostgreSQL notifications on channel '%s'", self.channel)

    async def stop(self) -> None:
        if self._connection is not None:
            await self._connection.remove_listener(self.channel, self._handle_notification)
            await self._connection.close()
            self._connection = None

    async def _handle_notification(self, connection: asyncpg.Connection, pid: int, channel: str, payload: str) -> None:
        try:
            message = json.loads(payload)
        except json.JSONDecodeError:
            logger.warning("Received malformed notification payload on %s: %s", channel, payload)
            return

        if self.callback is not None:
            await self.callback(message)


async def listen_for_doc_updates(database_url: str, callback: Callable[[dict[str, Any]], Awaitable[None]]) -> asyncio.Task[None]:
    listener = PostgresNotificationListener(database_url=database_url, callback=callback)
    await listener.start()

    async def _keepalive() -> None:
        try:
            while True:
                await asyncio.sleep(300)
        except asyncio.CancelledError:
            await listener.stop()

    return asyncio.create_task(_keepalive())
