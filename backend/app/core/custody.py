"""
Custody log writer — append-only, never UPDATE or DELETE.
Every forensic action flows through here.
"""
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def write_custody(
    db: AsyncSession,
    case_id: UUID,
    actor_id: Optional[UUID],
    action: str,
    target_type: str,
    target_id: Optional[UUID] = None,
    detail: dict | None = None,
) -> None:
    """
    Append a custody log entry. This is the forensic record.
    
    Actions: INGESTED | HASH_VERIFIED | INTEGRITY_FAILED | VIEWED |
             LEAD_CONFIRMED | LEAD_REJECTED | REPORT_GENERATED | CERTIFICATE_GENERATED
    """
    await db.execute(
        text(
            """
            INSERT INTO custody_log (case_id, actor_id, action, target_type, target_id, detail, at)
            VALUES (:case_id, :actor_id, :action, :target_type, :target_id, :detail::jsonb, :at)
            """
        ),
        {
            "case_id": str(case_id),
            "actor_id": str(actor_id) if actor_id else None,
            "action": action,
            "target_type": target_type,
            "target_id": str(target_id) if target_id else None,
            "detail": __import__("json").dumps(detail or {}),
            "at": datetime.now(timezone.utc),
        },
    )
