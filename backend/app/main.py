"""
VERITAS — Main FastAPI application.
Evidence you can trust. Investigation you can defend.
Three services: Postgres, Ollama, this app.
"""
import logging
import sys
import os
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables

log = logging.getLogger("veritas")
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
    log.info("VERITAS starting — Postgres + Ollama + this app")

    try:
        await create_tables()
        log.info("✅ Database ready — tables created, append-only role provisioned")

        # Auto-seed demo users — dev/staging convenience only. Never run this
        # against a production database: it creates well-known credentials
        # (see backend/scripts/seed.py) and resets them on every restart.
        if settings.ENVIRONMENT == "production":
            log.info("ENVIRONMENT=production — skipping demo user seeding")
        else:
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from scripts.seed import seed_users
            await seed_users()
            log.warning("⚠️  Seeded demo users with known passwords — dev/staging only, never production")
    except Exception as e:
        log.error(f"❌ Database init/seed failed: {e}")

    import os
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)

    import asyncio
    asyncio.create_task(_warm_models())

    log.info(f"✅ VERITAS ready on port {settings.BACKEND_PORT}")
    yield
    log.info("VERITAS shutting down")


app = FastAPI(
    title="VERITAS — Evidence you can trust. Investigation you can defend.",
    description="Truth coheres. Fabrication doesn't. We don't decide who's lying — we make lying visible.",
    version="6.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "6.0.0", "service": "veritas-backend"}


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "VERITAS",
        "tagline": "Evidence you can trust. Investigation you can defend.",
        "docs": "/docs",
    }


# ── Register all routers ──────────────────────────────────────────────────────
from app.api.v1 import auth, seal, inbound, cases, evidence, leads, stream, reports, veritas

app.include_router(auth.router, prefix="/api/v1")
app.include_router(seal.router, prefix="/api/v1")
app.include_router(inbound.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(leads.router, prefix="/api/v1")
app.include_router(stream.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(veritas.router, prefix="/api/v1")

log.info("✅ All routers registered")
