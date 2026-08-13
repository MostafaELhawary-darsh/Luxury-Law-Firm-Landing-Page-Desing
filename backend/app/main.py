from fastapi import FastAPI
from app.api.v1 import firm

app = FastAPI(title="Luxury Law Firm - Backend (prototype)")

app.include_router(firm.router, prefix="/api/v1/firm", tags=["firm"])

@app.get("/health")
async def health():
    return {"status": "ok"}
