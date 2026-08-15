"""
VERITAS — Main FastAPI application.
Evidence you can trust. Investigation you can defend.
Three services: Postgres (Neon), OpenRouter/Gemini (AI), this app.
"""
import logging
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables

log = logging.getLogger("veritas")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("VERITAS starting — Postgres + OpenRouter/Gemini + this app")

    try:
        await create_tables()
    except Exception:
        # Table/role provisioning is load-bearing for every route — silently
        # swallowing this would leave a service that reports /health=200
        # while every DB-touching endpoint 500s. Fail the boot loudly so
        # Render surfaces a failed deploy instead of a falsely-green one.
        log.exception("❌ Database init failed — refusing to serve a broken deployment")
        raise
    log.info("✅ Database ready — tables created, append-only role provisioned")

    # Auto-seed demo users — dev/staging convenience only. Never run this
    # against a production database: it creates well-known credentials
    # (see backend/scripts/seed.py) and resets them on every restart.
    if settings.SEED_DEMO_USERS:
        try:
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from scripts.seed import seed_users
            await seed_users()
            log.warning("⚠️  Seeded demo users with known passwords — dev/staging only, never production")
        except Exception as e:
            log.error(f"❌ Demo user seeding failed: {e}")

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
    allow_origin_regex=".*",  # Bulletproof CORS for hackathon
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
app.include_router(reports.router, prefix="/api/v1/cases")
app.include_router(veritas.router, prefix="/api/v1")

log.info("✅ All routers registered")
