"""
ACPIA v3 Backend Configuration — stripped to essentials per master spec.
Three services: Postgres (Neon), OpenRouter/Gemini (AI), this app.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "insecure-dev-only-secret-set-a-real-one-in-.env"
    BACKEND_PORT: int = 47802
    MAX_UPLOAD_SIZE_MB: int = 500
    # Explicit opt-in only. Creates well-known demo accounts (see
    # scripts/seed.py) and RESETS their passwords on every restart.
    # Never enable this against a database holding real cases.
    SEED_DEMO_USERS: bool = True

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
    # Neon (and most managed Postgres) requires SSL. asyncpg needs this
    # passed via connect_args, not a "?ssl=require" query string on the URL
    # — that's a libpq/psycopg convention asyncpg's DSN parser doesn't
    # reliably honor. Use Neon's *direct* (non-pooled) connection string
    # here, not the "-pooler" one — asyncpg's server-side prepared
    # statements are incompatible with PgBouncer transaction pooling.
    DB_SSL_REQUIRE: bool = False

    # ── OpenRouter — text + vision, ordered fallback chains ──────────────
    # Comma-separated model IDs, tried in order until one succeeds. Free
    # models on OpenRouter come and go — re-check
    # https://openrouter.ai/models?max_price=0 before deploying and update
    # these via the Render dashboard env var, no code change/redeploy needed.
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_TEXT_MODELS: str = (
        "nvidia/nemotron-3-ultra-550b-a55b:free,"
        "poolside/laguna-s-2.1:free,"
        "nvidia/nemotron-3.5-lightning:free,"
        "nvidia/nemotron-3-super-120b-a12b:free,"
        "poolside/laguna-xs-2.1:free,"
        "google/gemma-4-26b-a4b-it:free,"
        "openai/gpt-oss-20b:free"
    )
    OPENROUTER_VISION_MODELS: str = (
        "google/gemma-4-26b-a4b-it:free,"
        "google/gemma-4-31b-it:free,"
        "nvidia/nemotron-nano-12b-v2-vl:free,"
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    )

    # ── Google Gemini — embeddings only (OpenRouter has no embeddings API) ─
    GEMINI_API_KEY: str = ""

    # ── Cloudinary — evidence file storage (Render free tier has no disk) ─
    CLOUDINARY_URL: str = ""

    # ── JWT ───────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480  # 8-hour shift

    # ── CORS ─────────────────────────────────────────────
    # NEVER include "*" here: allow_credentials=True is set on the
    # CORSMiddleware below, and Starlette responds to a wildcard-with-
    # credentials config by reflecting whatever Origin the caller sends —
    # i.e. any website can make authenticated cross-origin requests.
    CORS_ORIGINS: List[str] = [
        "http://localhost:48803",
        "http://localhost:48804",
        "http://127.0.0.1:48803",
        "http://127.0.0.1:48804",
    ]

    # ── VERITAS frontends (QR pairing / dispute links) ────
    SEAL_URL: str = "http://192.168.11.209:48803"
    CONSOLE_URL: str = "http://192.168.11.209:48804"

    # ── SMTP Email (Gmail App Password) ───────────────────
    # Set real values in backend/.env (gitignored). Never hardcode
    # credentials here — this file is committed to source control.
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "VERITAS ACPIA <noreply@acpia.gov.in>"
    SMTP_ENABLED: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    # Aliases to map my new code to existing settings
    @property
    def jwt_secret(self) -> str:
        return self.SECRET_KEY

    @property
    def database_url_sync(self) -> str:
        return self.DATABASE_URL_SYNC

_INSECURE_DEFAULTS = {
    "SECRET_KEY": "insecure-dev-only-secret-set-a-real-one-in-.env",
    "DB_APP_PASSWORD": "veritas_app_dev_pw",
}


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    if s.ENVIRONMENT == "production":
        bad = [name for name, default in _INSECURE_DEFAULTS.items() if getattr(s, name) == default]
        if "password" in s.DATABASE_URL:
            bad.append("DATABASE_URL")
        # A real deployment (Render or otherwise) that still
        # points at localhost means CORS will reject every real frontend
        # request, and every QR/dispute link emailed to a citizen or
        # officer will point at a URL nobody outside this container can
        # reach. Loud failure beats a silently broken deployment.
        if all("localhost" in o or "127.0.0.1" in o for o in s.CORS_ORIGINS):
            bad.append("CORS_ORIGINS")
        if "localhost" in s.SEAL_URL or "127.0.0.1" in s.SEAL_URL:
            bad.append("SEAL_URL")
        if "localhost" in s.CONSOLE_URL or "127.0.0.1" in s.CONSOLE_URL:
            bad.append("CONSOLE_URL")
        if s.SMTP_ENABLED and not (s.SMTP_USER and s.SMTP_PASSWORD):
            bad.append("SMTP_USER/SMTP_PASSWORD (SMTP_ENABLED=true but credentials are empty)")
        if not s.OPENROUTER_API_KEY:
            bad.append("OPENROUTER_API_KEY")
        if not s.GEMINI_API_KEY:
            bad.append("GEMINI_API_KEY")
        if not s.CLOUDINARY_URL:
            bad.append("CLOUDINARY_URL")
        if bad:
            raise RuntimeError(
                f"Refusing to start in production with insecure/unset value(s): "
                f"{', '.join(bad)}. Set real values via the environment "
                f"(Render → Environment tab, or backend/.env locally) "
                f"before deploying."
            )
    return s


settings = get_settings()
