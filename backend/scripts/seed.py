"""
Database seed script for VERITAS.
Creates one demo user per role so every flow in the master plan is testable:
investigator, supervisor, auditor, admin.
"""
import sys
import os
import asyncio
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal, create_tables
from app.models.user import User
from app.core.security import hash_password

log = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO)

USERS = [
    {"username": "admin", "password": "password123", "role": "admin"},
    {"username": "investigator1", "password": "password123", "role": "investigator"},
    {"username": "supervisor1", "password": "password123", "role": "supervisor"},
    {"username": "auditor1", "password": "password123", "role": "auditor"},
]


async def seed_users():
    log.info("Ensuring tables + append-only role exist...")
    await create_tables()

    async with AsyncSessionLocal() as db:
        for u in USERS:
            existing = (await db.execute(
                select(User).where(User.username == u["username"])
            )).scalar_one_or_none()
            if existing:
                existing.password_hash = hash_password(u["password"])
                existing.role = u["role"]
                log.info(f"Reset password for existing user: {u['username']} ({u['role']})")
                continue
            db.add(User(
                username=u["username"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
            ))
            log.info(f"Created user: {u['username']} / {u['password']}  role={u['role']}")
        await db.commit()

    log.info("Seeding complete.")
    log.info("Login with any of: " + ", ".join(f"{u['username']}/{u['password']}" for u in USERS))


if __name__ == "__main__":
    asyncio.run(seed_users())
