"""
Leads API — List, review (confirm/reject/annotate)
Human-in-the-loop enforcement: only investigators can change lead status.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timezone
import structlog

from app.database import get_db
from app.auth.keycloak import get_current_user, CurrentUser
from app.models.models import Lead, Case
from app.schemas.schemas import LeadResponse, LeadReview, LeadListResponse, EvidenceCitation

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Leads"])


@router.get("/cases/{case_id}/leads", response_model=LeadListResponse)
async def list_leads(
    case_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    agent: Optional[str] = Query(None),
    min_risk_score: Optional[float] = Query(None, ge=0, le=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List AI-generated leads for a case with filtering options."""
    # Verify case
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    if not case_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Case not found")

    query = select(Lead).where(Lead.case_id == case_id)

    if status_filter:
        query = query.where(Lead.status == status_filter)
    if agent:
        query = query.where(Lead.generated_by_agent == agent)
    if min_risk_score is not None:
        query = query.where(Lead.risk_score >= min_risk_score)

    # Counts for summary
    all_leads = await db.execute(select(Lead).where(Lead.case_id == case_id))
    all_list = all_leads.scalars().all()
    total = len(all_list)
    pending = sum(1 for l in all_list if l.status == "pending")
    confirmed = sum(1 for l in all_list if l.status == "confirmed")
    rejected = sum(1 for l in all_list if l.status == "rejected")

    # Paginate and sort by risk score descending
    query = query.order_by(Lead.risk_score.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    leads = result.scalars().all()

    return LeadListResponse(
        leads=[_lead_to_response(l) for l in leads],
        total=total,
        pending=pending,
        confirmed=confirmed,
        rejected=rejected,
    )


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single lead with full evidence citations."""
    lead = await _get_lead_or_404(lead_id, db)
    return _lead_to_response(lead)


@router.patch("/leads/{lead_id}", response_model=LeadResponse)
async def review_lead(
    lead_id: str,
    payload: LeadReview,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    HUMAN-IN-THE-LOOP: Investigator confirms, rejects, or annotates a lead.
    This is the ONLY path to changing a lead's status from 'pending'.
    Service accounts and agent processes do NOT have access to this endpoint.
    """
    lead = await _get_lead_or_404(lead_id, db)

    if lead.status not in ("pending", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lead is already '{lead.status}'. Can only review pending or under_review leads.",
        )

    lead.status = payload.status.value
    lead.reviewed_by = current_user.user_id
    lead.reviewed_at = datetime.now(timezone.utc)
    lead.reviewer_annotation = payload.annotation

    await db.commit()
    await db.refresh(lead)

    logger.info(
        "Lead reviewed by investigator",
        lead_id=lead_id,
        new_status=payload.status,
        investigator=current_user.username,
        case_id=lead.case_id,
    )

    return _lead_to_response(lead)


async def _get_lead_or_404(lead_id: str, db: AsyncSession) -> Lead:
    result = await db.execute(select(Lead).where(Lead.lead_id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def _lead_to_response(lead: Lead) -> LeadResponse:
    # Parse stored evidence citations
    citations = None
    if lead.evidence_citations:
        try:
            citations = [EvidenceCitation(**c) for c in lead.evidence_citations]
        except Exception:
            citations = None

    return LeadResponse(
        lead_id=lead.lead_id,
        case_id=lead.case_id,
        generated_by_agent=lead.generated_by_agent,
        risk_score=float(lead.risk_score),
        confidence_lower=float(lead.confidence_lower) if lead.confidence_lower else None,
        confidence_upper=float(lead.confidence_upper) if lead.confidence_upper else None,
        status=lead.status,
        summary=lead.summary,
        detailed_analysis=lead.detailed_analysis,
        evidence_citations=citations,
        reviewed_by=lead.reviewed_by,
        reviewed_at=lead.reviewed_at,
        reviewer_annotation=lead.reviewer_annotation,
        generated_at=lead.generated_at,
        priority_rank=lead.priority_rank,
        lead_type=lead.lead_type,
    )
