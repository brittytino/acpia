"""
Main FastAPI application entry point.
Starts on port 8765 (hackathon unique port).
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import create_tables, init_minio

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(f"ACPIA Backend starting on port {settings.BACKEND_PORT}")
    logger.info(f"Connecting to Postgres at {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
    logger.info(f"Connecting to Neo4j at {settings.NEO4J_URI}")
    logger.info(f"Ollama AI server at {settings.OLLAMA_BASE_URL}")

    # Initialize DB tables
    try:
        await create_tables()
        logger.info("✅ Database tables ready")
    except Exception as e:
        logger.error(f"❌ Database init failed: {e}")

    # Initialize MinIO bucket
    try:
        await init_minio()
        logger.info("✅ MinIO ready")
    except Exception as e:
        logger.warning(f"MinIO init: {e}")

    yield

    logger.info("ACPIA Backend shutting down.")


app = FastAPI(
    title="ACPIA — Agentic Child Protection Investigation Assistant",
    description="AI-assisted digital evidence intelligence platform for authorized law enforcement.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],   # wide open for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "acpia-backend", "port": settings.BACKEND_PORT}


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "ACPIA API",
        "version": "1.0.0",
        "docs": "/docs",
        "team": "SRCAS Hackathon 2024",
        "host": "192.168.11.209",
        "port": settings.BACKEND_PORT,
    }


# ── Register API routers ──────────────────────────────────────────────────────
try:
    from app.api.v1 import cases, evidence, leads, graph, streaming, reports
    app.include_router(cases.router, prefix="/api/v1", tags=["Cases"])
    app.include_router(evidence.router, prefix="/api/v1", tags=["Evidence"])
    app.include_router(leads.router, prefix="/api/v1", tags=["Leads"])
    app.include_router(graph.router, prefix="/api/v1", tags=["Knowledge Graph"])
    app.include_router(streaming.router, prefix="/api/v1", tags=["Streaming"])
    app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])
    logger.info("✅ All API routers registered")
except ImportError as e:
    logger.warning(f"Some routers not loaded yet: {e}")

