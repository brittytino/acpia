"""
ACPIA v3 — Main FastAPI application.
Three services: Postgres, Ollama, this app.
Full cold boot in under a minute.
"""
import logging
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables

log = logging.getLogger("acpia")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def _warm_models():
    """
    Pin all three models resident in Ollama memory (keep_alive: -1).
    ~4 GB total — fits 6 GB VRAM with headroom. No eviction, ever.
    """
    models = (settings.VISION_MODEL, settings.LLM_MODEL, settings.EMBED_MODEL)
    async with httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=300) as c:
        for model in models:
            try:
                await c.post("/api/generate", json={
                    "model": model,
                    "prompt": "ready",
                    "stream": False,
                    "keep_alive": -1,
                })
                log.info(f"✅ Model warm: {model}")
            except Exception as e:
                log.warning(f"⚠ Model warm failed ({model}): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("ACPIA v3 starting — Postgres + Ollama + this app")

    # Create DB tables
    try:
        await create_tables()
        log.info("✅ Database ready")
    except Exception as e:
        log.error(f"❌ Database init failed: {e}")

    # Create storage directory
    import os
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)

    # Warm models asynchronously so server starts immediately
    import asyncio
    asyncio.create_task(_warm_models())

    log.info(f"✅ ACPIA ready on port {settings.BACKEND_PORT}")
    yield
    log.info("ACPIA shutting down")


app = FastAPI(
    title="ACPIA — Agentic Child Protection Intelligence Architecture",
    description="v3 — From the first screenshot to the courtroom: one unbroken chain.",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "3.0.0", "service": "acpia-backend"}


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "ACPIA v3",
        "tagline": "From the first screenshot to the courtroom: one unbroken chain.",
        "docs": "/docs",
    }


# ── Register all routers ──────────────────────────────────────────────────────
from app.api.v1 import auth, seal, inbound, cases, evidence, leads, stream, reports

app.include_router(auth.router, prefix="/api/v1")
app.include_router(seal.router, prefix="/api/v1")
app.include_router(inbound.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(leads.router, prefix="/api/v1")
app.include_router(stream.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

log.info("✅ All v3 routers registered")
