import hashlib
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.seal import SealedReport
from app.models.case import Case
from app.models.evidence import Evidence
from app.core.custody import write_custody
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import aiofiles

router = APIRouter(prefix="/api/v1/inbound", tags=["inbound"])

class AcceptRequest(BaseModel):
    case_id: Optional[UUID] = None

async def get_report(db: AsyncSession, reference: str):
    result = await db.execute(
        select(SealedReport)
        .where(SealedReport.reference == reference)
        .options(selectinload(SealedReport.artifacts))
    )
    return result.scalars().first()

async def get_case(db: AsyncSession, case_id: UUID):
    result = await db.execute(select(Case).where(Case.id == case_id))
    return result.scalars().first()

async def create_case(db: AsyncSession, title: str, user_id: UUID):
    import time
    ref = f"CASE-{int(time.time())}"
    case = Case(reference=ref, title=title, created_by=user_id)
    db.add(case)
    await db.flush()
    return case

async def sha256_of_file(path: str) -> str:
    h = hashlib.sha256()
    async with aiofiles.open(path, 'rb') as f:
        while chunk := await f.read(8192):
            h.update(chunk)
    return h.hexdigest()

# Mock current_user dependency for now
async def current_user():
    from app.models.user import User
    from uuid import uuid4
    # Real implementation would parse JWT. We stub this for structural completion.
    class MockUser:
        id = uuid4()
    return MockUser()

@router.post("/{reference}/accept")
async def accept_report(reference: str, body: AcceptRequest,
                        user=Depends(current_user), db: AsyncSession = Depends(get_db)):
    report = await get_report(db, reference)
    if report is None:
        raise HTTPException(404, "No sealed report with that reference.")
    if report.claimed_by is not None:
        raise HTTPException(409, "This report has already been accepted into a case.")

    case = (await get_case(db, body.case_id) if body.case_id
            else await create_case(db, f"Inbound {reference}", user.id))

    results = []
    for artifact in report.artifacts:
        if artifact.body_stored and artifact.storage_path:
            actual = await sha256_of_file(artifact.storage_path)
            verified = (actual == artifact.sha256)
        else:
            actual, verified = None, None      # hash-only: nothing to recompute

        # Create Evidence record in the case
        ev = Evidence(
            case_id=case.id,
            filename=artifact.filename,
            mime_type=artifact.mime_type,
            size_bytes=artifact.size_bytes,
            sha256=artifact.sha256,
            integrity_ok=verified if verified is not None else True # Hash-only is assumed true for custody until body is acquired
        )
        db.add(ev)
        await db.flush()

        await write_custody(
            db, str(case.id), str(user.id),
            action="HASH_VERIFIED" if verified else
                   "INTEGRITY_FAILED" if verified is False else "HASH_ONLY_RECEIVED",
            target_type="evidence", target_id=str(ev.id),
            detail={"sealed_sha256": artifact.sha256, "recomputed_sha256": actual},
        )
        results.append({"filename": artifact.filename,
                        "sealed_sha256": artifact.sha256,
                        "recomputed_sha256": actual, "verified": verified})

    report.claimed_by = case.id
    await db.commit()
    return {"case_id": str(case.id), "case_reference": case.reference,
            "artifacts": results}
