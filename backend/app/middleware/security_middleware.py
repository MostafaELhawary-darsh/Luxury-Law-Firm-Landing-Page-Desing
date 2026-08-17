from __future__ import annotations

import time
from collections import defaultdict

from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


class SecurityMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        max_requests: int = 100,
        window_seconds: int = 60,
    ) -> None:
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, scope: Scope) -> str:
        client = scope.get("client")
        if client:
            return client[0]
        forwarded = scope.get("headers", {})
        for key, value in forwarded:
            if key == b"x-forwarded-for":
                return value.decode("utf-8").split(",")[0].strip()
        return "unknown"

    def _is_rate_limited(self, ip: str) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        timestamps = self._requests[ip]
        while timestamps and timestamps[0] < cutoff:
            timestamps.pop(0)
        if len(timestamps) >= self.max_requests:
            return True
        timestamps.append(now)
        return False

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        ip = self._get_client_ip(scope)
        if self._is_rate_limited(ip):
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
