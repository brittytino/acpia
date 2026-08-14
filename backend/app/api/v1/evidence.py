"""
Evidence API — upload, list, reveal.
/reveal endpoint logs access and increments the exposure counter.
"""
import hashlib
import uuid
from pathlib import Path
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.evidence import Evidence, Acquisition
from app.models.case import Case
from app.models.conversation import Conversation
from app.models.user import User
from app.core.security import get_current_user
from app.core.custody import write_custody
from app.config import settings

router = APIRouter(tags=["Evidence"])


class EvidenceOut(BaseModel):
    id: UUID
    filename: str
    mime_type: str
    size_bytes: int
    sha256: str
    integrity_ok: bool
    relevance: float | None
    revealed_count: int
    processed: bool
    description: str | None
    exif: dict


@router.post("/cases/{case_id}/acquisitions")
async def register_acquisition(
    case_id: UUID,
    method: str = "direct_upload",
    device_info: str = "{}",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json
    acq = Acquisition(
        case_id=case_id,
        method=method,
        device_profile=json.loads(device_info),
        operator_id=current_user.id,
    )
    db.add(acq)
    await db.commit()
    await db.refresh(acq)
    return {"acquisition_id": str(acq.id)}


@router.post("/cases/{case_id}/evidence")
async def upload_evidence(
    case_id: UUID,
    file: UploadFile = File(...),
    client_sha256: str = Form(""),
    acquisition_id: str = Form(""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload evidence. Server recomputes SHA-256 and compares client hash."""
    # Check case exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    if not case_result.scalar_one_or_none():
        raise HTTPException(404, "Case not found")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, "File too large")

    actual_sha256 = hashlib.sha256(content).hexdigest()
    integrity_ok = (not client_sha256) or (actual_sha256 == client_sha256)

    # Store file
    storage_dir = Path(settings.STORAGE_PATH) / "cases" / str(case_id)
    storage_dir.mkdir(parents=True, exist_ok=True)
    storage_path = storage_dir / f"{actual_sha256[:16]}_{file.filename}"
    storage_path.write_bytes(content)

    # Create evidence record
    ev = Evidence(
        case_id=case_id,
        acquisition_id=UUID(acquisition_id) if acquisition_id else None,
        filename=file.filename or "unknown",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        sha256=actual_sha256,
        client_sha256=client_sha256 or None,
        integrity_ok=integrity_ok,
        storage_path=str(storage_path),
    )
    db.add(ev)
    await db.flush()

    action = "INGESTED" if integrity_ok else "INTEGRITY_FAILED"
    await write_custody(
        db, case_id, current_user.id,
        action=action,
        target_type="evidence",
        target_id=ev.id,
        detail={"sha256": actual_sha256, "filename": file.filename, "integrity_ok": integrity_ok},
    )

    # Auto-create conversation for text/chat files
    if ev.mime_type.startswith("text/") and integrity_ok:
        convo = Conversation(
            case_id=case_id,
            evidence_id=ev.id,
            platform="unknown",
            participants=["user_a", "user_b"],  # narrative agent will refine
        )
        db.add(convo)

    await db.commit()

    return {
        "evidence_id": str(ev.id),
        "sha256": actual_sha256,
        "integrity_ok": integrity_ok,
        "integrity_status": action,
    }


@router.post("/cases/{case_id}/import")
async def import_zip(
    case_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import a forensic export ZIP — USB acquisition fallback."""
    import zipfile, io

    content = await file.read()
    imported = []

    acq = Acquisition(
        case_id=case_id,
        method="forensic_import",
        device_profile={"source_file": file.filename},
        operator_id=current_user.id,
    )
    db.add(acq)
    await db.flush()

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for name in zf.namelist():
                if name.endswith("/"):
                    continue
                file_bytes = zf.read(name)
                sha = hashlib.sha256(file_bytes).hexdigest()
                import mimetypes
                mime = mimetypes.guess_type(name)[0] or "application/octet-stream"

                storage_dir = Path(settings.STORAGE_PATH) / "cases" / str(case_id)
                storage_dir.mkdir(parents=True, exist_ok=True)
                sp = storage_dir / f"{sha[:16]}_{Path(name).name}"
                sp.write_bytes(file_bytes)

                ev = Evidence(
                    case_id=case_id,
                    acquisition_id=acq.id,
                    filename=Path(name).name,
                    source_path=name,
                    mime_type=mime,
                    size_bytes=len(file_bytes),
                    sha256=sha,
                    integrity_ok=True,
                    storage_path=str(sp),
                )
                db.add(ev)
                await db.flush()

                await write_custody(
                    db, case_id, current_user.id,
                    action="INGESTED",
                    target_type="evidence",
                    target_id=ev.id,
                    detail={"sha256": sha, "source": name, "method": "forensic_import"},
                )

                if mime.startswith("text/"):
                    db.add(Conversation(
                        case_id=case_id, evidence_id=ev.id,
                        platform="unknown", participants=["user_a", "user_b"],
                    ))

                imported.append({"filename": Path(name).name, "sha256": sha})
    except zipfile.BadZipFile:
        raise HTTPException(400, "Invalid ZIP file")

    acq.completed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"imported": len(imported), "files": imported}


@router.get("/cases/{case_id}/evidence", response_model=list[EvidenceOut])
async def list_evidence(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Evidence).where(Evidence.case_id == case_id)
        .order_by(Evidence.created_at)
    )
    evs = result.scalars().all()
    return [EvidenceOut(
        id=e.id, filename=e.filename, mime_type=e.mime_type,
        size_bytes=e.size_bytes, sha256=e.sha256,
        integrity_ok=e.integrity_ok, relevance=e.relevance,
        revealed_count=e.revealed_count, processed=e.processed,
        description=e.description, exif=e.exif or {},
    ) for e in evs]


@router.post("/evidence/{evidence_id}/reveal")
async def reveal_evidence(
    evidence_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Log the reveal action and increment exposure counter.
    Required before viewing file content — this is the investigator-welfare feature.
    """
    result = await db.execute(select(Evidence).where(Evidence.id == evidence_id))
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(404, "Evidence not found")

    ev.revealed_count += 1
    await write_custody(
        db, ev.case_id, current_user.id,
        action="VIEWED",
        target_type="evidence",
        target_id=ev.id,
        detail={"reveal_count": ev.revealed_count},
    )
    await db.commit()
    return {"revealed": True, "reveal_count": ev.revealed_count, "storage_path": ev.storage_path}
