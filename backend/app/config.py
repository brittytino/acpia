"""
ACPIA v3 Backend Configuration — stripped to essentials per master spec.
Three services: Postgres, Ollama, this app.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-acpia-jwt-2026"
    BACKEND_PORT: int = 8765
    MAX_UPLOAD_SIZE_MB: int = 500
    STORAGE_PATH: str = "/tmp/acpia_evidence"

    # ── Database (Postgres + pgvector only) ──────────────
    DATABASE_URL: str = "postgresql+asyncpg://acpia_user:acpia_secret_2026@localhost:5432/acpia"
    DATABASE_URL_SYNC: str = "postgresql://acpia_user:acpia_secret_2026@localhost:5432/acpia"

    # ── Ollama — three small resident models ─────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    VISION_MODEL: str = "moondream"
    LLM_MODEL: str = "llama3.2:3b"
    EMBED_MODEL: str = "nomic-embed-text"

    # ── JWT ───────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480  # 8-hour shift

    # ── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",   # seal
        "http://localhost:3001",   # console
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    class Config:
        env_file = "/mnt/Data/SRCAS HACKATHON/acpia/.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
