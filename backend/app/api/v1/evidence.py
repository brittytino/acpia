"""
Evidence API — Upload, retrieve, analyze, chain-of-custody
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import structlog

from app.database import get_db
from app.auth.keycloak import get_current_user, CurrentUser
from app.models.models import Case, EvidenceItem, ChainOfCustodyLog
from app.schemas.schemas import EvidenceResponse, CustodyLogResponse, CustodyLogEntry, AnalysisTriggerResponse
from app.services.ingest import ingest_service
from app.workers.analysis_tasks import trigger_analysis_pipeline

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Evidence"])


@router.post("/cases/{case_id}/evidence", response_model=List[EvidenceResponse], status_code=201)
async def upload_evidence(
    case_id: str,
    files: List[UploadFile] = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Upload one or more evidence files to a case.
    Triggers SHA-256 hashing, MIME detection, deduplication,
    known-hash check, MinIO storage, and chain-of-custody logging.
    """
    # Verify case exists
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status in ("closed", "archived"):
        raise HTTPException(status_code=400, detail="Cannot add evidence to a closed or archived case")

    actor_ip = request.client.host if request and request.client else None
    results = []
    errors = []

    for upload_file in files:
        try:
            file_bytes = await upload_file.read()

            if len(file_bytes) > (500 * 1024 * 1024):  # 500MB limit
                errors.append({"filename": upload_file.filename, "error": "File too large (max 500MB)"})
                continue

            evidence = await ingest_service.ingest_evidence(
                db=db,
                file_bytes=file_bytes,
                original_filename=upload_file.filename,
                case_id=case_id,
                ingested_by_user_id=current_user.user_id,
                actor_ip=actor_ip,
            )
            results.append(evidence)

        except ValueError as e:
            errors.append({"filename": upload_file.filename, "error": str(e)})
        except Exception as e:
            logger.error("Evidence upload failed", filename=upload_file.filename, error=str(e))
            errors.append({"filename": upload_file.filename, "error": "Internal processing error"})

    if errors and not results:
        raise HTTPException(status_code=422, detail={"errors": errors})

    logger.info(
        "Evidence upload batch complete",
        case_id=case_id,
        uploaded=len(results),
        failed=len(errors),
    )

    return [_evidence_to_response(e) for e in results]


@router.get("/cases/{case_id}/evidence", response_model=List[EvidenceResponse])
async def list_evidence(
    case_id: str,
    mime_type: Optional[str] = Query(None),
    processing_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all evidence items for a case."""
    query = select(EvidenceItem).where(EvidenceItem.case_id == case_id)

    if mime_type:
        query = query.where(EvidenceItem.mime_type.ilike(f"%{mime_type}%"))
    if processing_status:
        query = query.where(EvidenceItem.processing_status == processing_status)

    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(EvidenceItem.ingested_at.desc())

    result = await db.execute(query)
    items = result.scalars().all()
    return [_evidence_to_response(e) for e in items]


@router.get("/cases/{case_id}/evidence/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(
    case_id: str,
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single evidence item with metadata and chain-of-custody summary."""
    evidence = await _get_evidence_or_404(case_id, evidence_id, db)
    return _evidence_to_response(evidence)


@router.get("/audit/{evidence_id}", response_model=CustodyLogResponse)
async def get_custody_log(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Full chain-of-custody audit trail for an evidence item."""
    # Get evidence
    ev_result = await db.execute(select(EvidenceItem).where(EvidenceItem.evidence_id == evidence_id))
    evidence = ev_result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    # Get all custody log entries (ordered chronologically)
    log_result = await db.execute(
        select(ChainOfCustodyLog)
        .where(ChainOfCustodyLog.evidence_id == evidence_id)
        .order_by(ChainOfCustodyLog.action_ts.asc())
    )
    entries = log_result.scalars().all()

    # Verify chain integrity
    integrity_ok = all(
        entries[i].resulting_hash == entries[i + 1].prior_hash
        for i in range(len(entries) - 1)
        if entries[i + 1].prior_hash is not None
    )

    return CustodyLogResponse(
        evidence_id=evidence_id,
        original_filename=evidence.original_filename,
        sha256_hash=evidence.sha256_hash,
        entries=[CustodyLogEntry.model_validate(e) for e in entries],
        hash_integrity_verified=integrity_ok,
        total_entries=len(entries),
    )


@router.post("/cases/{case_id}/analyze", response_model=AnalysisTriggerResponse)
async def trigger_analysis(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Trigger the multi-agent analysis pipeline for a case."""
    # Verify case exists and has evidence
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    ev_count_result = await db.execute(
        select(EvidenceItem).where(
            EvidenceItem.case_id == case_id,
            EvidenceItem.processing_status.in_(["pending", "failed"]),
        )
    )
    pending_evidence = ev_count_result.scalars().all()

    if not pending_evidence:
        raise HTTPException(
            status_code=400,
            detail="No pending evidence to analyze. All evidence may already be processed.",
        )

    # Trigger Celery task
    task = trigger_analysis_pipeline.delay(case_id, current_user.user_id)

    logger.info(
        "Analysis pipeline triggered",
        case_id=case_id,
        task_id=task.id,
        evidence_count=len(pending_evidence),
        triggered_by=current_user.username,
    )

    return AnalysisTriggerResponse(
        run_id=task.id,
        case_id=case_id,
        status="queued",
        celery_task_id=task.id,
        message=f"Analysis pipeline queued for {len(pending_evidence)} evidence items",
    )


async def _get_evidence_or_404(case_id: str, evidence_id: str, db: AsyncSession) -> EvidenceItem:
    result = await db.execute(
        select(EvidenceItem).where(
            EvidenceItem.evidence_id == evidence_id,
            EvidenceItem.case_id == case_id,
        )
    )
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return evidence


def _evidence_to_response(e: EvidenceItem) -> EvidenceResponse:
    return EvidenceResponse(
        evidence_id=e.evidence_id,
        case_id=e.case_id,
        sha256_hash=e.sha256_hash,
        original_filename=e.original_filename,
        mime_type=e.mime_type,
        file_size_bytes=e.file_size_bytes,
        ingested_at=e.ingested_at,
        ingested_by=e.ingested_by,
        storage_path=e.storage_path,
        processing_status=e.processing_status,
        is_known_hash_match=e.is_known_hash_match,
        exif_metadata=e.exif_metadata,
        content_description=e.content_description,
        severity_tier=e.severity_tier,
        source_device=e.source_device,
        source_platform=e.source_platform,
    )
