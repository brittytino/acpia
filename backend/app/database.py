"""
Database engine + session management.
Uses asyncpg for async operations and psycopg2 for Alembic migrations.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)

# ── Async Engine (for FastAPI routes) ────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency: yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Creates all tables from models. Called at app startup."""
    from app.models import models  # noqa: import triggers model registration
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified.")


async def init_minio():
    """Initialize MinIO bucket on startup."""
    try:
        from minio import Minio
        from minio.error import S3Error
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        if not client.bucket_exists(settings.MINIO_BUCKET_NAME):
            client.make_bucket(settings.MINIO_BUCKET_NAME)
            logger.info(f"MinIO bucket '{settings.MINIO_BUCKET_NAME}' created.")
        else:
            logger.info(f"MinIO bucket '{settings.MINIO_BUCKET_NAME}' already exists.")
    except Exception as e:
        logger.warning(f"MinIO init failed (non-fatal): {e}")


def get_minio_client():
    """Return a ready-to-use MinIO client. Import this wherever you need file storage."""
    from minio import Minio
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )
