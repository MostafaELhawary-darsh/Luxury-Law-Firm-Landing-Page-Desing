from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = os.environ.get("APP_NAME", "Sovereign Legal System")
    APP_VERSION: str = os.environ.get("APP_VERSION", "1.0.0")

    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/sovereign_legal",
    )

    @property
    def normalized_database_url(self) -> str:
        """Normalize DATABASE_URL to include asyncpg if not present."""
        url = self.DATABASE_URL
        # If it's postgresql:// without a dialect, add +asyncpg
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    JWT_SECRET_KEY: str = os.environ.get(
        "JWT_SECRET_KEY",
        "dev-secret-key-change-in-production-32chars-minimum",
    )
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.environ.get("JWT_EXPIRE_MINUTES", "480"))

    AES_256_KEY: str = os.environ.get(
        "AES_256_KEY",
        "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
    )

    CORS_ORIGINS: list[str] = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:8000",
    ).split(",")

    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    BGE_RERANKER_MODEL_PATH: str = os.environ.get(
        "BGE_RERANKER_MODEL_PATH",
        "",
    )
    BGE_RERANKER_PROVIDER: str = os.environ.get(
        "BGE_RERANKER_PROVIDER",
        "CPUExecutionProvider",
    )

    @property
    def jwt_expire_delta_seconds(self) -> int:
        return self.JWT_EXPIRE_MINUTES * 60


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
