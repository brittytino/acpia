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
    SECRET_KEY: str = "supersecretjwtkeythatshouldbemuchlonger"
    BACKEND_PORT: int = 47802
    MAX_UPLOAD_SIZE_MB: int = 500
    STORAGE_PATH: str = "./storage"

    # ── Database (Postgres + pgvector only) ──────────────
    DATABASE_URL: str = "postgresql+asyncpg://acpia:password@localhost:47800/acpia"
    DATABASE_URL_SYNC: str = "postgresql://acpia:password@localhost:47800/acpia"

    # ── Ollama — three small resident models ─────────────
    OLLAMA_BASE_URL: str = "http://localhost:47801"
    VISION_MODEL: str = "moondream"
    LLM_MODEL: str = "qwen2.5:3b"
    EMBED_MODEL: str = "nomic-embed-text"

    # ── JWT ───────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480  # 8-hour shift

    # ── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:47803",   # seal
        "http://localhost:47804",   # console
        "http://127.0.0.1:47803",
        "http://127.0.0.1:47804",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    # Aliases to map my new code to existing settings
    @property
    def jwt_secret(self) -> str:
        return self.SECRET_KEY

    @property
    def ollama_url(self) -> str:
        return self.OLLAMA_BASE_URL
        
    @property
    def model_vision(self) -> str:
        return self.VISION_MODEL
        
    @property
    def model_text(self) -> str:
        return self.LLM_MODEL
        
    @property
    def model_embed(self) -> str:
        return self.EMBED_MODEL

    @property
    def database_url_sync(self) -> str:
        return self.DATABASE_URL_SYNC

@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
