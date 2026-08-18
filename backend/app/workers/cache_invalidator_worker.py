from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any
from uuid import UUID

import asyncpg
import numpy as np
import redis.asyncio as redis
from redis.commands.search.query import Query

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost:5432/legal_db")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
INDEX_NAME = os.environ.get("INDEX_NAME", "idx:semantic_cache")
INVALIDATION_THRESHOLD = float(os.environ.get("INVALIDATION_THRESHOLD", "0.22"))


class CacheInvalidatorWorker:
    def __init__(self) -> None:
        self.pg_conn: asyncpg.Connection | None = None
        self.redis_client: redis.Redis | None = None

    async def setup(self) -> None:
        self.pg_conn = await asyncpg.connect(DATABASE_URL)
        self.redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=False)
        logger.info("Worker connected to PostgreSQL and Redis")

    async def get_document_embedding(self, doc_id: str) -> list[float]:
        if self.pg_conn is None:
            return []

        row = await self.pg_conn.fetchrow(
            "SELECT embedding::text FROM legal_documents WHERE id = $1",
            UUID(doc_id),
        )
        if row and row["embedding"]:
            return json.loads(row["embedding"])
        return []

    async def invalidate_semantic_cache(self, case_id: str, doc_vector: list[float]) -> None:
        if not doc_vector or self.redis_client is None:
            return

        doc_vector_bytes = np.asarray(doc_vector, dtype=np.float32).tobytes()
        search_query = (
            Query(f"(@case_id:{{{case_id}}})=>[KNN 20 @vector $vec_param AS vector_distance]")
            .sort_by("vector_distance")
            .return_fields("vector_distance")
            .dialect(2)
        )

        try:
            search_res = await self.redis_client.ft(INDEX_NAME).search(
                search_query,
                query_params={"vec_param": doc_vector_bytes},
            )
            keys_to_delete = [
                doc.id for doc in search_res.docs if float(doc.vector_distance) <= INVALIDATION_THRESHOLD
            ]
            if keys_to_delete:
                await self.redis_client.delete(*keys_to_delete)
                logger.info("Invalidated %s semantic cache keys for case %s", len(keys_to_delete), case_id)
        except Exception as exc:
            logger.exception("Error during Redis invalidation: %s", exc)

    async def handle_notification(self, connection: asyncpg.Connection, pid: int, channel: str, payload: str) -> None:
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            logger.warning("Malformed payload received: %s", payload)
            return

        action = data.get("action")
        doc_id = data.get("doc_id")
        case_id = data.get("case_id")
        logger.info("Notification received: action=%s doc_id=%s case_id=%s", action, doc_id, case_id)

        if action in {"INSERT", "UPDATE"}:
            doc_vector = await self.get_document_embedding(str(doc_id)) if doc_id else []
            await self.invalidate_semantic_cache(str(case_id), doc_vector)
        elif action == "DELETE":
            if case_id and self.redis_client is not None:
                pattern = f"semantic_cache:{case_id}:*"
                async for key in self.redis_client.scan_iter(match=pattern):
                    await self.redis_client.delete(key)
                logger.info("Flushed semantic cache for deleted document in case %s", case_id)

    async def run(self) -> None:
        await self.setup()
        await self.pg_conn.add_listener("doc_changes", self.handle_notification)
        logger.info("Listening for PostgreSQL notifications on channel 'doc_changes'...")

        try:
            while True:
                await asyncio.sleep(3600)
        except asyncio.CancelledError:
            logger.info("Stopping cache invalidator worker")
            await self.pg_conn.close()
            await self.redis_client.close()


async def main() -> None:
    worker = CacheInvalidatorWorker()
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
