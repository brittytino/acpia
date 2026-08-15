import hashlib
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.seal import SealedReport
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.user import User
from app.core.custody import write_custody
from app.core.security import get_current_user
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import aiofiles

router = APIRouter(prefix="/inbound", tags=["inbound"])


class AcceptRequest(BaseModel):
    case_id: Optional[UUID] = None


def _format_hash(sha256: str) -> str:
    return "  ".join(sha256[i:i + 16] for i in range(0, len(sha256), 16))


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
    # Only exercised when a SealedArtifact.body_stored is True — the seal
    # flow is hash-only by design (the file body never leaves the sealer's
    # device), so this rarely runs. If a body-stored artifact upload path
    # is ever added, wire it through app.services.storage like evidence.py
    # does, and this would need to fetch bytes from a Cloudinary URL
    # instead of opening a local path.
    h = hashlib.sha256()
    async with aiofiles.open(path, 'rb') as f:
        while chunk := await f.read(8192):
            h.update(chunk)
    return h.hexdigest()


@router.get("")
async def list_inbound(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unclaimed sealed reports awaiting investigator triage."""
    result = await db.execute(
        select(SealedReport)
        .where(SealedReport.claimed_by.is_(None))
        .order_by(SealedReport.sealed_at.desc())
    )
    reports = result.scalars().all()
    return [{
        "reference": r.reference,
        "path_taken": r.path_taken,
        "sealed_at": r.sealed_at.isoformat(),
    } for r in reports]


@router.get("/{reference}")
async def get_inbound_detail(
    reference: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = await get_report(db, reference)
    if report is None:
        raise HTTPException(404, "No sealed report with that reference.")

    return {
        "reference": report.reference,
        "path_taken": report.path_taken,
        "statement": report.statement,
        "contact": report.contact,
        "sealed_at": report.sealed_at.isoformat(),
        "claimed": report.claimed_by is not None,
        "artifacts": [{
            "filename": a.filename,
            "mime_type": a.mime_type,
            "size_bytes": a.size_bytes,
            "sha256_groups": _format_hash(a.sha256),
            "body_stored": a.body_stored,
            "integrity": "HASH_ONLY" if not a.body_stored else "VERIFIED",
        } for a in report.artifacts],
    }


@router.post("/{reference}/accept")
async def accept_report(reference: str, body: AcceptRequest,
                        user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    report = await get_report(db, reference)
    if report is None:
        raise HTTPException(404, "No sealed report with that reference.")
    if report.claimed_by is not None:
        raise HTTPException(409, "This report has already been accepted into a case.")

    is_fair = report.path_taken in ("complainant", "respondent")
    case = (await get_case(db, body.case_id) if body.case_id
            else await create_case(db, f"Inbound {reference}", user.id))

    results = []
    for artifact in report.artifacts:
        if artifact.body_stored and artifact.storage_path:
            actual = await sha256_of_file(artifact.storage_path)
            verified = (actual == artifact.sha256)
        else:
            actual, verified = None, None      # hash-only: nothing to recompute

        ev = Evidence(
            case_id=case.id,
            filename=artifact.filename,
            mime_type=artifact.mime_type,
            size_bytes=artifact.size_bytes,
            sha256=artifact.sha256,
            integrity_ok=verified if verified is not None else True,
            storage_path=artifact.storage_path or "",
            submitter_role=report.path_taken if is_fair else None,
            claimed_at=report.claimed_when or report.sealed_at,
        )
        db.add(ev)
        await db.flush()

        await write_custody(
            db, case.id, user.id,
            action="HASH_VERIFIED" if verified else
                   "INTEGRITY_FAILED" if verified is False else "HASH_ONLY_RECEIVED",
            target_type="evidence", target_id=ev.id,
            detail={"sealed_sha256": artifact.sha256, "recomputed_sha256": actual,
                    "reference": reference, "submitter_role": ev.submitter_role},
        )
        results.append({"filename": artifact.filename,
                        "sealed_sha256": artifact.sha256,
                        "recomputed_sha256": actual, "verified": verified})

    report.claimed_by = case.id
    await db.commit()
    return {"case_id": str(case.id), "case_reference": case.reference,
            "artifacts": results}
