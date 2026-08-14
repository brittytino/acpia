"""
Leads API — the human gate.
CRITICAL: No code path here can set status=CONFIRMED except an authenticated human action.
grep-provable.
"""
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models.lead import Lead
from app.models.user import User
from app.core.security import get_current_user
from app.core.custody import write_custody
from app.core.events import bus

router = APIRouter(tags=["Leads"])


class LeadOut(BaseModel):
    id: UUID
    case_id: UUID
    kind: str
    summary: str
    confidence: float
    confidence_ci: float
    signals: dict
    source_ids: list
    status: str
    judged_by: UUID | None
    judged_at: datetime | None
    created_at: datetime


@router.get("/cases/{case_id}/leads", response_model=list[LeadOut])
async def list_leads(
    case_id: UUID,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Lead).where(Lead.case_id == case_id)
    if status:
        q = q.where(Lead.status == status)
    result = await db.execute(q.order_by(Lead.created_at))
    leads = result.scalars().all()
    return [LeadOut(
        id=l.id, case_id=l.case_id, kind=l.kind, summary=l.summary,
        confidence=float(l.confidence), confidence_ci=float(l.confidence_ci),
        signals=l.signals, source_ids=[str(s) for s in l.source_ids],
        status=l.status, judged_by=l.judged_by, judged_at=l.judged_at,
        created_at=l.created_at,
    ) for l in leads]


@router.post("/leads/{lead_id}/confirm")
async def confirm_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  # HUMAN GATE — authenticated actor required
):
    """
    HUMAN GATE: Confirm a lead. Only authenticated investigators can call this.
    Sets status=confirmed and records the human actor. Database CHECK enforces consistency.
    No pipeline code path may call this endpoint.
    """
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")

    judged_at = datetime.now(timezone.utc)
    # Atomic, condition-on-write: two concurrent confirm/reject calls on the
    # same lead can otherwise both pass a plain status-check-then-write and
    # both commit, leaving contradictory CONFIRMED + REJECTED custody
    # entries for one lead. The WHERE clause makes only the first writer win.
    claim = await db.execute(
        update(Lead)
        .where(Lead.id == lead_id, Lead.status == "proposed")
        .values(status="confirmed", judged_by=current_user.id, judged_at=judged_at)
    )
    if claim.rowcount == 0:
        raise HTTPException(409, "Lead has already been judged.")
    lead.status = "confirmed"
    lead.judged_by = current_user.id
    lead.judged_at = judged_at

    await write_custody(
        db, lead.case_id, current_user.id,
        action="LEAD_CONFIRMED",
        target_type="lead",
        target_id=lead.id,
        detail={"summary": lead.summary, "confidence": float(lead.confidence)},
    )
    await db.commit()

    await bus.emit(str(lead.case_id), "lead.confirmed", {
        "id": str(lead.id),
        "actor": current_user.username,
        "at": lead.judged_at.isoformat(),
    })

    return {"status": "confirmed", "judged_by": current_user.username}


@router.post("/leads/{lead_id}/reject")
async def reject_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  # HUMAN GATE
):
    """HUMAN GATE: Reject a lead. Records the human actor."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")

    judged_at = datetime.now(timezone.utc)
    claim = await db.execute(
        update(Lead)
        .where(Lead.id == lead_id, Lead.status == "proposed")
        .values(status="rejected", judged_by=current_user.id, judged_at=judged_at)
    )
    if claim.rowcount == 0:
        raise HTTPException(409, "Lead has already been judged.")
    lead.status = "rejected"
    lead.judged_by = current_user.id
    lead.judged_at = judged_at

    await write_custody(
        db, lead.case_id, current_user.id,
        action="LEAD_REJECTED",
        target_type="lead",
        target_id=lead.id,
        detail={"summary": lead.summary},
    )
    await db.commit()

    await bus.emit(str(lead.case_id), "lead.rejected", {
        "id": str(lead.id),
        "actor": current_user.username,
    })

    return {"status": "rejected", "judged_by": current_user.username}
