"""
Cases API — POST, GET, LIST, UPDATE
All endpoints require authenticated investigator token.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case as sql_case
from typing import Optional
import structlog

from app.database import get_db
from app.auth.keycloak import get_current_user, CurrentUser
from app.models.models import Case, EvidenceItem, Lead
from app.schemas.schemas import (
    CaseCreate, CaseUpdate, CaseResponse, CaseListResponse, CaseStatus
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new investigation case."""
    # Check for duplicate case number
    existing = await db.execute(
        select(Case).where(Case.case_number == payload.case_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Case number '{payload.case_number}' already exists",
        )

    case = Case(
        case_number=payload.case_number,
        title=payload.title,
        description=payload.description,
        jurisdiction=payload.jurisdiction,
        priority=payload.priority,
        tags=payload.tags or [],
        lead_investigator_id=current_user.user_id,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)

    logger.info(
        "Case created",
        case_id=case.case_id,
        case_number=case.case_number,
        investigator=current_user.username,
    )

    return await _case_with_counts(case, db)


@router.get("", response_model=CaseListResponse)
async def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all cases with filtering and pagination."""
    query = select(Case)

    if status:
        query = query.where(Case.status == status)
    if priority:
        query = query.where(Case.priority == priority)
    if search:
        query = query.where(
            Case.title.ilike(f"%{search}%")
            | Case.case_number.ilike(f"%{search}%")
        )

    # Count total
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Case.opened_at.desc())

    result = await db.execute(query)
    cases = result.scalars().all()

    case_responses = [await _case_with_counts(c, db) for c in cases]

    return CaseListResponse(
        cases=case_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single case by ID."""
    case = await _get_case_or_404(case_id, db)
    return await _case_with_counts(case, db)


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    payload: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update case metadata."""
    case = await _get_case_or_404(case_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)

    await db.commit()
    await db.refresh(case)
    return await _case_with_counts(case, db)


async def _get_case_or_404(case_id: str, db: AsyncSession) -> Case:
    result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


async def _case_with_counts(case: Case, db: AsyncSession) -> CaseResponse:
    """Attach evidence and lead counts to case response."""
    ev_count = await db.execute(
        select(func.count(EvidenceItem.evidence_id)).where(EvidenceItem.case_id == case.case_id)
    )
    lead_count = await db.execute(
        select(func.count(Lead.lead_id)).where(Lead.case_id == case.case_id)
    )
    pending_leads = await db.execute(
        select(func.count(Lead.lead_id)).where(
            Lead.case_id == case.case_id,
            Lead.status == "pending",
        )
    )

    return CaseResponse(
        case_id=case.case_id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        opened_at=case.opened_at,
        closed_at=case.closed_at,
        status=case.status,
        priority=case.priority,
        lead_investigator_id=case.lead_investigator_id,
        jurisdiction=case.jurisdiction,
        tags=case.tags,
        evidence_count=ev_count.scalar() or 0,
        lead_count=lead_count.scalar() or 0,
        pending_leads=pending_leads.scalar() or 0,
    )
