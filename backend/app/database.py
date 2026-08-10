"""
Database connections: PostgreSQL (async SQLAlchemy), Neo4j, Redis, MinIO, OpenSearch
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from neo4j import AsyncGraphDatabase, AsyncDriver
from minio import Minio
from redis.asyncio import Redis
from opensearchpy import AsyncOpenSearch
from contextlib import asynccontextmanager
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

# ─────────────────────────────────────────────
# PostgreSQL
# ─────────────────────────────────────────────

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=40,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─────────────────────────────────────────────
# Neo4j
# ─────────────────────────────────────────────

_neo4j_driver: AsyncDriver | None = None


async def get_neo4j_driver() -> AsyncDriver:
    global _neo4j_driver
    if _neo4j_driver is None:
        _neo4j_driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
    return _neo4j_driver


async def close_neo4j_driver():
    global _neo4j_driver
    if _neo4j_driver:
        await _neo4j_driver.close()
        _neo4j_driver = None


@asynccontextmanager
async def neo4j_session():
    """Async context manager for Neo4j sessions."""
    driver = await get_neo4j_driver()
    async with driver.session() as session:
        yield session


# ─────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────

_redis_client: Redis | None = None


async def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


# ─────────────────────────────────────────────
# MinIO
# ─────────────────────────────────────────────

_minio_client: Minio | None = None


def get_minio_client() -> Minio:
    global _minio_client
    if _minio_client is None:
        _minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        # Ensure evidence bucket exists
        if not _minio_client.bucket_exists(settings.MINIO_BUCKET):
            _minio_client.make_bucket(settings.MINIO_BUCKET)
            logger.info("Created MinIO bucket", bucket=settings.MINIO_BUCKET)
    return _minio_client


# ─────────────────────────────────────────────
# OpenSearch
# ─────────────────────────────────────────────

_opensearch_client: AsyncOpenSearch | None = None


def get_opensearch_client() -> AsyncOpenSearch:
    global _opensearch_client
    if _opensearch_client is None:
        _opensearch_client = AsyncOpenSearch(
            hosts=[{"host": settings.OPENSEARCH_HOST, "port": settings.OPENSEARCH_PORT}],
            http_auth=(settings.OPENSEARCH_USER, settings.OPENSEARCH_PASSWORD),
            use_ssl=True,
            verify_certs=False,
            ssl_show_warn=False,
        )
    return _opensearch_client


# ─────────────────────────────────────────────
# Startup / Shutdown lifecycle
# ─────────────────────────────────────────────

async def init_databases():
    """Initialize all database connections on startup."""
    logger.info("Initializing database connections")

    # Test PostgreSQL
    async with engine.connect() as conn:
        await conn.execute("SELECT 1")
    logger.info("PostgreSQL connected")

    # Test Neo4j
    driver = await get_neo4j_driver()
    async with driver.session() as session:
        await session.run("RETURN 1")
    logger.info("Neo4j connected")

    # Initialize MinIO bucket
    get_minio_client()
    logger.info("MinIO connected")

    # Test Redis
    redis = await get_redis()
    await redis.ping()
    logger.info("Redis connected")

    logger.info("All database connections initialized")


async def close_databases():
    """Close all database connections on shutdown."""
    await close_neo4j_driver()
    await close_redis()
    await engine.dispose()
    logger.info("All database connections closed")
