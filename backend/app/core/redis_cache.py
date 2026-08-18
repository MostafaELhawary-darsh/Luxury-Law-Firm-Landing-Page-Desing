from __future__ import annotations

import hashlib
import json
from typing import Any

try:
    import redis.asyncio as redis
except ImportError:  # pragma: no cover - optional runtime dependency
    redis = None


class SemanticCache:
    def __init__(self, redis_url: str = "redis://localhost:6379/0", namespace: str = "legal-rerank") -> None:
        self.redis_url = redis_url
        self.namespace = namespace
        self.client = redis.from_url(redis_url, decode_responses=True) if redis is not None else None

    @staticmethod
    def make_cache_key(query: str, index_name: str, model_name: str = "bge-reranker-v2-m3") -> str:
        payload = json.dumps({"query": query, "index_name": index_name, "model_name": model_name}, ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    async def lookup(self, query: str, key: str, threshold: float = 0.78) -> dict[str, Any] | None:
        if self.client is None:
            return None
        try:
            cached = await self.client.get(f"{self.namespace}:{key}")
            if cached is None:
                return None

            parsed = json.loads(cached)
            score = float(parsed.get("score", 0.0))
            if score >= threshold:
                return parsed.get("payload") or parsed
            return None
        except Exception:
            return None

    async def store(self, key: str, score: float, payload: dict[str, Any], ttl_seconds: int = 1800) -> None:
        if self.client is None:
            return None
        try:
            await self.client.set(
                f"{self.namespace}:{key}",
                json.dumps({"score": score, "payload": payload}, ensure_ascii=False),
                ex=ttl_seconds,
            )
        except Exception:
            return None

    async def invalidate_namespace(self, namespace: str | None = None) -> None:
        if self.client is None:
            return None
        target = namespace or self.namespace
        try:
            keys = await self.client.keys(f"{target}:*")
            if keys:
                await self.client.delete(*keys)
        except Exception:
            return None

    async def close(self) -> None:
        if self.client is not None:
            await self.client.aclose()
