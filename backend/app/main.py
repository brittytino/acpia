"""
ACPIA FastAPI Main Application
Registers all routers, middleware, observability, and lifecycle events.
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from datetime import datetime, timezone

from app.config import settings
from app.database import init_databases, close_databases, get_redis
from app.api.v1 import cases, evidence, leads, graph, stream
from app.services.ingest import ingest_service

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("ACPIA Backend starting up", version=settings.APP_VERSION)

    # Initialize all database connections
    try:
        await init_databases()
    except Exception as e:
        logger.error("Database initialization failed", error=str(e))

    # Load known hash list
    ingest_service.load_known_hash_list()

    # Initialize Neo4j schema (idempotent)
    await _init_neo4j_schema()

    # Initialize MinIO buckets
    await _init_minio()

    # Initialize OpenSearch indices
    await _init_opensearch_indices()

    logger.info("ACPIA Backend ready")
    yield

    # Shutdown
    await close_databases()
    logger.info("ACPIA Backend shut down cleanly")


def create_app() -> FastAPI:
    app = FastAPI(
        title="ACPIA — Agentic Child Protection Investigation Assistant",
        description=(
            "AI-assisted digital evidence intelligence system for authorized law enforcement. "
            "All AI-generated leads require mandatory human review before entering the case record."
        ),
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ─── CORS ───────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS_LIST,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Prometheus metrics ──────────────────────
    Instrumentator(
        should_group_status_codes=False,
        excluded_handlers=["/health", "/metrics"],
    ).instrument(app).expose(app, endpoint="/metrics")

    # ─── OpenTelemetry tracing ───────────────────
    if not settings.DEBUG:
        provider = TracerProvider()
        otlp_exporter = OTLPSpanExporter(
            endpoint=f"http://{settings.JAEGER_HOST}:{settings.JAEGER_PORT}",
            insecure=True,
        )
        provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        trace.set_tracer_provider(provider)
        FastAPIInstrumentor.instrument_app(app)

    # ─── Routes ─────────────────────────────────
    prefix = settings.API_PREFIX
    app.include_router(cases.router, prefix=prefix)
    app.include_router(evidence.router, prefix=prefix)
    app.include_router(leads.router, prefix=prefix)
    app.include_router(graph.router, prefix=prefix)
    app.include_router(stream.router, prefix=prefix)

    # ─── Health endpoint ─────────────────────────
    @app.get("/health", tags=["Health"])
    async def health_check():
        services = {}
        try:
            redis = await get_redis()
            await redis.ping()
            services["redis"] = True
        except Exception:
            services["redis"] = False

        # Add more service health checks
        all_healthy = all(services.values())
        return JSONResponse(
            status_code=200 if all_healthy else 503,
            content={
                "status": "healthy" if all_healthy else "degraded",
                "version": settings.APP_VERSION,
                "environment": settings.ENVIRONMENT,
                "services": services,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    # ─── Global exception handler ────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception", path=request.url.path, error=str(exc))
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


async def _init_neo4j_schema():
    """Create Neo4j constraints and indexes (idempotent)."""
    from app.database import neo4j_session
    try:
        async with neo4j_session() as session:
            constraints = [
                "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.person_id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Device) REQUIRE d.device_id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (pl:Platform) REQUIRE pl.platform_id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Case) REQUIRE c.case_id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (f:FileEvidence) REQUIRE f.evidence_id IS UNIQUE",
                "CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.display_alias)",
                "CREATE INDEX IF NOT EXISTS FOR (d:Device) ON (d.device_fingerprint)",
            ]
            for constraint in constraints:
                await session.run(constraint)
        logger.info("Neo4j schema initialized")
    except Exception as e:
        logger.warning("Neo4j schema init failed (may not be available yet)", error=str(e))


async def _init_minio():
    """Ensure required MinIO buckets exist."""
    try:
        from app.database import get_minio_client
        minio = get_minio_client()
        for bucket in [settings.MINIO_BUCKET, f"{settings.MINIO_BUCKET}-reports"]:
            if not minio.bucket_exists(bucket):
                minio.make_bucket(bucket)
                logger.info("Created MinIO bucket", bucket=bucket)
    except Exception as e:
        logger.warning("MinIO init failed", error=str(e))


async def _init_opensearch_indices():
    """Create OpenSearch index templates."""
    try:
        from app.database import get_opensearch_client
        client = get_opensearch_client()
        index_body = {
            "mappings": {
                "properties": {
                    "evidence_id": {"type": "keyword"},
                    "case_id": {"type": "keyword"},
                    "content": {"type": "text", "analyzer": "english"},
                    "mime_type": {"type": "keyword"},
                    "ingested_at": {"type": "date"},
                }
            }
        }
        if not await client.indices.exists(index="acpia-evidence"):
            await client.indices.create(index="acpia-evidence", body=index_body)
            logger.info("Created OpenSearch index: acpia-evidence")
    except Exception as e:
        logger.warning("OpenSearch init failed", error=str(e))


app = create_app()
