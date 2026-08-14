"""
ACPIA Backend Configuration
Reads from environment variables / .env file
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "acpia-super-secret-jwt-key-2024-hackathon-srcas"
    BACKEND_PORT: int = 8765
    MAX_UPLOAD_SIZE_MB: int = 500

    # ── Database ─────────────────────────────────────────
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 54327
    POSTGRES_DB: str = "acpia"
    POSTGRES_USER: str = "acpia_user"
    POSTGRES_PASSWORD: str = "acpia$3cret2024!"
    DATABASE_URL: str = "postgresql+asyncpg://acpia_user:acpia$3cret2024!@localhost:54327/acpia"
    DATABASE_URL_SYNC: str = "postgresql://acpia_user:acpia$3cret2024!@localhost:54327/acpia"

    # ── Neo4j ─────────────────────────────────────────────
    NEO4J_URI: str = "bolt://localhost:7688"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "acpiaGraph!2024"

    # ── Redis ─────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:63799/0"
    CELERY_BROKER_URL: str = "redis://localhost:63799/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:63799/2"

    # ── MinIO ─────────────────────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9200"
    MINIO_ACCESS_KEY: str = "acpiaMinio"
    MINIO_SECRET_KEY: str = "acpiaMinioSec2024!"
    MINIO_BUCKET_NAME: str = "acpia-evidence"
    MINIO_SECURE: bool = False

    # ── Keycloak ──────────────────────────────────────────
    KEYCLOAK_SERVER_URL: str = "http://localhost:8180"
    KEYCLOAK_REALM: str = "acpia"
    KEYCLOAK_CLIENT_ID: str = "acpia-backend"
    KEYCLOAK_CLIENT_SECRET: str = "acpia-backend-secret"

    # ── Ollama (AI Inference on Tino's GPU) ──────────────
    OLLAMA_BASE_URL: str = "http://localhost:11535"
    LLM_MODEL: str = "llama3.1:8b"
    VISION_MODEL: str = "llava:13b"
    EMBED_MODEL: str = "nomic-embed-text"

    # ── CORS ──────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3737",
        "http://192.168.11.209:3737",
        "http://localhost:3000",
        "http://127.0.0.1:3737",
    ]

    class Config:
        env_file = "/mnt/Data/SRCAS HACKATHON/acpia/.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
