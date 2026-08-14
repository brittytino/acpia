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
    # DATABASE_URL — the table-owning role. Used only for DDL: migrations
    # and initial table/role provisioning at startup.
    DATABASE_URL: str = "postgresql+asyncpg://acpia:password@localhost:47800/acpia"
    DATABASE_URL_SYNC: str = "postgresql://acpia:password@localhost:47800/acpia"

    # DATABASE_URL_APP — the least-privilege runtime role every request
    # actually connects as (VERITAS §6.2). It is granted broad DML but has
    # UPDATE/DELETE explicitly revoked on custody_log — enforced by
    # Postgres itself, not by application code, and not bypassable by an
    # owner-privilege loophole because this role never owns the table.
    DATABASE_URL_APP: str = "postgresql+asyncpg://veritas_app:veritas_app_dev_pw@localhost:47800/acpia"
    DB_APP_ROLE: str = "veritas_app"
    DB_APP_PASSWORD: str = "veritas_app_dev_pw"

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
        "*",
        "http://localhost:47803",
        "http://localhost:47804",
        "http://127.0.0.1:47803",
        "http://127.0.0.1:47804",
        "http://192.168.11.65:47803",
        "http://192.168.11.65:47804",
    ]

    # ── VERITAS frontends (QR pairing / dispute links) ────
    SEAL_URL: str = "http://localhost:47803"
    CONSOLE_URL: str = "http://localhost:47804"

    # ── SMTP Email (Gmail App Password) ──────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "barathvikraman.clovertech@gmail.com"
    SMTP_PASSWORD: str = "ldqjpvtigidttnqz"
    SMTP_FROM: str = "VERITAS ACPIA <barathvikraman.clovertech@gmail.com>"
    SMTP_ENABLED: bool = True

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
