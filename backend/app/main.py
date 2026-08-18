from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .core.pg_notify_listener import listen_for_doc_updates
from .core.realtime import manager
from .middleware.security_middleware import SecurityMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger: logging.Logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async def on_doc_change(message: dict[str, object]) -> None:
        case_id = str(message.get("case_id", ""))
        if not case_id:
            return
        await manager.broadcast_to_case(
            case_id,
            {
                "event": "DOCUMENT_CHANGED",
                "data": message,
            },
        )

    listener_task = asyncio.create_task(
        listen_for_doc_updates(settings.DATABASE_URL, on_doc_change)
    )
    try:
        yield
    finally:
        listener_task.cancel()


app: FastAPI = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityMiddleware)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "module": "http",
            "error": exc.detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "module": "server",
            "error": "Internal server error",
            "detail": str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Sovereign Legal System initialized")
    logger.info("Version: %s", settings.APP_VERSION)
    logger.info("Database: %s", settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "configured")


_routers: list[tuple[str, Any]] = []

try:
    from app.modules.m06_smart_case.router import router as m06_router
    _routers.append(("m06_smart_case", m06_router))
except ImportError:
    logger.warning("Module m06_smart_case not yet available — skipping router import")

try:
    from app.modules.m54_editor_financial.router import router as m54_router
    _routers.append(("m54_editor_financial", m54_router))
except ImportError:
    logger.warning("Module m54_editor_financial not yet available — skipping router import")

try:
    from app.modules.shared.router import router as shared_router
    _routers.append(("shared", shared_router))
except ImportError:
    logger.warning("Module shared not yet available — skipping router import")

for name, router in _routers:
    app.include_router(router)
    logger.info("Router '%s' included", name)


@app.get("/api/health")
async def health_check() -> dict[str, Any]:
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.websocket("/ws/cases/{case_id}")
async def websocket_case_updates(websocket: WebSocket, case_id: str) -> None:
    await manager.connect(case_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(case_id, websocket)
