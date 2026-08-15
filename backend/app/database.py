"""
Database — Postgres + pgvector only. No MinIO, no Neo4j, no Redis.

Two engines, two roles (VERITAS §6.2 — database-enforced append-only):
  - `owner_engine` connects as the table-owning role. Used only for DDL:
    creating tables and provisioning the runtime role's grants.
  - `engine` (AsyncSessionLocal) connects as a separate, least-privilege
    role that every request actually uses. That role has UPDATE and DELETE
    explicitly revoked on custody_log — and because it does not own the
    table, the revoke is real, not a no-op against owner privilege.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

_connect_args = {"ssl": "require"} if settings.DB_SSL_REQUIRE else {}
# asyncpg uses server-side prepared statements by default, which break under
# PgBouncer transaction-mode pooling (Neon's "-pooler" endpoint): the
# statement gets prepared on one backend connection but PgBouncer may hand
# a later request a *different* backend connection where that statement was
# never prepared, or reuses the same statement name against a connection
# that has moved on — surfacing as random "prepared statement ... does not
# exist" / "already exists" errors under any concurrency. Disabling
# asyncpg's client-side statement cache makes every connection safe to use
# through a transaction pooler; it's a no-op (slightly less caching, no
# correctness difference) against Neon's direct endpoint too, so this is
# safe regardless of which of the two Neon connection strings is configured.
_connect_args["statement_cache_size"] = 0

owner_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    connect_args=_connect_args,
)

engine = create_async_engine(
    settings.DATABASE_URL_APP,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables():
    """Create all tables and provision the least-privilege runtime role.
    Alembic handles migrations in production; this is the hackathon/dev path."""
    async with owner_engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))

    async with owner_engine.begin() as conn:
        from app.models import (
            user, case, evidence, lead, conversation, graph, seal,
            dispute, pairing, contradiction, cosign,
        )
        await conn.run_sync(Base.metadata.create_all)

    await _provision_app_role()


async def _provision_app_role():
    """Idempotently create the runtime DB role and grant it broad DML —
    except UPDATE/DELETE on custody_log, which stay revoked forever."""
    role = settings.DB_APP_ROLE
    async with owner_engine.begin() as conn:
        exists = (await conn.execute(
            text("SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :role"),
            {"role": role},
        )).scalar()
        if not exists:
            # Postgres DDL does not accept bind parameters; this value comes
            # from our own settings, not user input, so a literal is safe.
            escaped_pw = settings.DB_APP_PASSWORD.replace("'", "''")
            await conn.execute(text(f'CREATE ROLE "{role}" LOGIN PASSWORD \'{escaped_pw}\''))

        db_name = owner_engine.url.database
        await conn.execute(text(f'GRANT CONNECT ON DATABASE {db_name} TO "{role}"'))
        await conn.execute(text(f'GRANT USAGE ON SCHEMA public TO "{role}"'))
        await conn.execute(text(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "{role}"'))
        await conn.execute(text(f'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "{role}"'))
        await conn.execute(text(
            f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO "{role}"'
        ))
        await conn.execute(text(
            f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO "{role}"'
        ))
        # The load-bearing line: append-only, enforced by Postgres itself.
        # TRUNCATE is revoked too — GRANT ALL above includes it, and it
        # would otherwise let the app role wipe the whole ledger in one
        # statement (no FK from any other table references custody_log, so
        # nothing blocks a bare TRUNCATE the way REVOKE DELETE blocks a row
        # delete).
        await conn.execute(text(f'REVOKE UPDATE, DELETE, TRUNCATE ON custody_log FROM "{role}"'))
