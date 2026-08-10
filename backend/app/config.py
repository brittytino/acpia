"""
ACPIA Backend Configuration
Reads from environment variables with sensible defaults.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "ACPIA"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "change-me-in-production-min-32-chars"
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:3000"

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "acpia"
    POSTGRES_USER: str = "acpia_user"
    POSTGRES_PASSWORD: str = "acpia_secret"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "acpia_neo4j_secret"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_BUCKET: str = "acpia-evidence"
    MINIO_SECURE: bool = False

    # OpenSearch
    OPENSEARCH_HOST: str = "localhost"
    OPENSEARCH_PORT: int = 9200
    OPENSEARCH_USER: str = "admin"
    OPENSEARCH_PASSWORD: str = "Acpia_0p3nS3arch!"

    # Keycloak
    KEYCLOAK_SERVER_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "acpia"
    KEYCLOAK_CLIENT_ID: str = "acpia-backend"
    KEYCLOAK_CLIENT_SECRET: str = "acpia-backend-secret"
    KEYCLOAK_ALGORITHM: str = "RS256"

    # Ollama / AI Models
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_LLM_MODEL: str = "llama3.1:8b"
    OLLAMA_VISION_MODEL: str = "llava:13b"

    # Whisper
    WHISPER_MODEL: str = "base"
    WHISPER_DEVICE: str = "cuda"
    WHISPER_COMPUTE_TYPE: str = "float16"

    # File Processing
    MAX_UPLOAD_SIZE_MB: int = 500
    TEMP_UPLOAD_PATH: str = "/tmp/uploads"
    HASH_LIST_PATH: str = "/data/known_hashes/hash_list.txt"

    # Observability
    JAEGER_HOST: str = "localhost"
    JAEGER_PORT: int = 4317
    OTEL_SERVICE_NAME: str = "acpia-backend"

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
