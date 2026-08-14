"""Cases API."""
import secrets
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.lead import Lead
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter(prefix="/cases", tags=["Cases"])


class CaseIn(BaseModel):
    title: str


class CaseOut(BaseModel):
    id: UUID
    reference: str
    title: str
    status: str
    case_type: str = "guard"
    created_at: datetime
    evidence_count: int = 0
    leads_pending: int = 0


@router.get("", response_model=list[CaseOut])
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Case).where(Case.status != "deleted").order_by(Case.created_at.desc())
    )
    cases = result.scalars().all()

    output = []
    for c in cases:
        ev_count = (await db.execute(
            select(func.count(Evidence.id)).where(Evidence.case_id == c.id)
        )).scalar() or 0
        leads_pending = (await db.execute(
            select(func.count(Lead.id)).where(Lead.case_id == c.id, Lead.status == "proposed")
        )).scalar() or 0
        output.append(CaseOut(
            id=c.id, reference=c.reference, title=c.title,
            status=c.status, case_type=c.case_type, created_at=c.created_at,
            evidence_count=ev_count, leads_pending=leads_pending,
        ))
    return output


@router.post("", response_model=CaseOut)
async def create_case(
    body: CaseIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    year = datetime.now().year
    num = secrets.randbelow(9000) + 1000
    case = Case(
        reference=f"CASE-{year}-{num:04d}",
        title=body.title,
        created_by=current_user.id,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return CaseOut(id=case.id, reference=case.reference, title=case.title,
                   status=case.status, case_type=case.case_type, created_at=case.created_at)


@router.get("/{case_id}", response_model=CaseOut)
async def get_case(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(404, "Case not found")

    ev_count = (await db.execute(
        select(func.count(Evidence.id)).where(Evidence.case_id == case.id)
    )).scalar() or 0
    leads_pending = (await db.execute(
        select(func.count(Lead.id)).where(Lead.case_id == case.id, Lead.status == "proposed")
    )).scalar() or 0

    return CaseOut(id=case.id, reference=case.reference, title=case.title,
                   status=case.status, case_type=case.case_type, created_at=case.created_at,
                   evidence_count=ev_count, leads_pending=leads_pending)
