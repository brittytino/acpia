"""
Database seed script for ACPIA.
Ensures the initial admin and demo investigator users exist in the PostgreSQL DB,
matching the users seeded in Keycloak via acpia-realm.json.
"""
import sys
import os
import uuid
import asyncio
from datetime import datetime, timezone
import structlog

# Add the parent directory to sys.path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db
from app.models.models import User

logger = structlog.get_logger(__name__)

async def seed_users():
    logger.info("Starting database seeding...")
    
    # We use next() on the generator to get the session
    db_gen = get_db()
    db = await anext(db_gen)

    try:
        # Keycloak users defined in infra/keycloak/acpia-realm.json:
        # admin (admin@acpia.local)
        # investigator1 (investigator1@acpia.local)

        users_to_seed = [
            {
                "username": "admin",
                "email": "admin@acpia.local",
                "full_name": "System Admin",
                "role": "admin",
                # Hardcoded keycloak ID (in reality this would be synced via webhook)
                "keycloak_id": "00000000-0000-0000-0000-000000000001",
                "is_active": True,
            },
            {
                "username": "investigator1",
                "email": "investigator1@acpia.local",
                "full_name": "Demo Investigator",
                "role": "investigator",
                "badge_number": "INV-001",
                "jurisdiction": "Central Division",
                "keycloak_id": "00000000-0000-0000-0000-000000000002",
                "is_active": True,
            }
        ]

        from sqlalchemy import select
        for u_data in users_to_seed:
            stmt = select(User).where(User.username == u_data["username"])
            result = await db.execute(stmt)
            existing_user = result.scalars().first()

            if not existing_user:
                new_user = User(**u_data)
                db.add(new_user)
                logger.info(f"Created user: {u_data['username']}")
            else:
                logger.info(f"User already exists: {u_data['username']}")

        await db.commit()
        
        # Now enforce row-level security / revoking on chain_of_custody_log
        # to ensure it's strictly append-only
        await db.execute("REVOKE UPDATE, DELETE ON TABLE chain_of_custody_log FROM PUBLIC;")
        await db.execute("REVOKE UPDATE, DELETE ON TABLE chain_of_custody_log FROM acpia_user;")
        await db.commit()
        logger.info("Enforced append-only constraints on chain_of_custody_log.")
        
        logger.info("Database seeding completed successfully.")

    except Exception as e:
        logger.error(f"Seeding failed: {str(e)}")
        await db.rollback()
        raise
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(seed_users())
