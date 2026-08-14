"""VERITAS-specific endpoints: Contradiction Board, Blind Dual Submission
(dispute codes), the Auditor view, supervisor co-signature, and QR pairing.

Kept in one router because each piece is small and they share the same
"the architecture is the answer" philosophy — see VERITAS_FINAL_MASTER_PLAN.md.
"""
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

import aiofiles
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.core.security import get_current_user, require_role
from app.core.custody import write_custody, verify_chain
from app.core.events import bus
from app.models.user import User
from app.models.case import Case
from app.models.evidence import Evidence, CustodyLog
from app.models.lead import Lead
from app.models.contradiction import Contradiction
from app.models.dispute import DisputeCode
from app.models.pairing import PairingToken
from app.models.cosign import CoSignRequest

router = APIRouter(tags=["VERITAS"])

_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _code_part() -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(4))


# ─────────────────────────────────────────────────────────────
# Contradiction Board (VERITAS §8)
# ─────────────────────────────────────────────────────────────

class ContradictionOut(BaseModel):
    id: UUID
    case_id: UUID
    kind: str
    summary: str
    severity: str
    confidence: float
    caveat: str
    source_ids: list
    signals: dict
    status: str
    judged_by: Optional[UUID]
    judged_at: Optional[datetime]
    created_at: datetime


@router.get("/cases/{case_id}/contradictions", response_model=list[ContradictionOut])
async def list_contradictions(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contradiction).where(Contradiction.case_id == case_id).order_by(Contradiction.created_at)
    )
    rows = result.scalars().all()
    return [ContradictionOut(
        id=c.id, case_id=c.case_id, kind=c.kind, summary=c.summary,
        severity=c.severity, confidence=float(c.confidence), caveat=c.caveat,
        source_ids=[str(s) for s in c.source_ids], signals=c.signals,
        status=c.status, judged_by=c.judged_by, judged_at=c.judged_at,
        created_at=c.created_at,
    ) for c in rows]


@router.post("/contradictions/{contradiction_id}/confirm")
async def confirm_contradiction(
    contradiction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HUMAN GATE — the only place status=confirmed_material can be set."""
    c = (await db.execute(select(Contradiction).where(Contradiction.id == contradiction_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Contradiction not found")
    if c.status != "proposed":
        raise HTTPException(409, "Already judged.")
    c.status = "confirmed_material"
    c.judged_by = current_user.id
    c.judged_at = datetime.now(timezone.utc)
    await write_custody(db, c.case_id, current_user.id, "CONTRADICTION_CONFIRMED",
                        "contradiction", c.id, {"summary": c.summary})
    await db.commit()
    await bus.emit(str(c.case_id), "contradiction.confirmed", {"id": str(c.id)})
    return {"status": "confirmed_material", "judged_by": current_user.username}


@router.post("/contradictions/{contradiction_id}/dismiss")
async def dismiss_contradiction(
    contradiction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = (await db.execute(select(Contradiction).where(Contradiction.id == contradiction_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Contradiction not found")
    if c.status != "proposed":
        raise HTTPException(409, "Already judged.")
    c.status = "dismissed"
    c.judged_by = current_user.id
    c.judged_at = datetime.now(timezone.utc)
    await write_custody(db, c.case_id, current_user.id, "CONTRADICTION_DISMISSED",
                        "contradiction", c.id, {"summary": c.summary})
    await db.commit()
    await bus.emit(str(c.case_id), "contradiction.dismissed", {"id": str(c.id)})
    return {"status": "dismissed", "judged_by": current_user.username}


# ─────────────────────────────────────────────────────────────
# Blind Dual Submission — dispute codes (VERITAS §3, §4.3)
# ─────────────────────────────────────────────────────────────

class DisputeCreate(BaseModel):
    title: str
    scope_summary: str  # e.g. "events between 1 July and 11 August 2026"
    complainant_email: Optional[str] = None   # NEW: send complainant their code
    respondent_email: Optional[str] = None    # NEW: send accused their code


class SealedArtifactIn(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int
    sha256: str


class DisputeSubmit(BaseModel):
    statement: Optional[str] = None
    contact: Optional[str] = None
    sealed_at: datetime
    claimed_when: Optional[datetime] = None
    artifacts: List[SealedArtifactIn]


@router.post("/disputes", status_code=201)
async def open_dispute(
    body: DisputeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("investigator", "supervisor", "admin")),
):
    """Opens a FAIR case and issues both codes at once. Neither party can
    see the other's submission — there is no query path between them.
    Optionally emails each party their code."""
    import time
    case = Case(
        reference=f"CASE-{int(time.time())}",
        title=body.title,
        case_type="fair",
        status="awaiting_submissions",
        created_by=current_user.id,
    )
    db.add(case)
    await db.flush()

    complainant_code = f"VER-{_code_part()}-{_code_part()}-C"
    respondent_code = f"VER-{_code_part()}-{_code_part()}-R"

    db.add(DisputeCode(case_id=case.id, role="complainant", code=complainant_code,
                       scope_summary=body.scope_summary, created_by=current_user.id))
    db.add(DisputeCode(case_id=case.id, role="respondent", code=respondent_code,
                       scope_summary=body.scope_summary, created_by=current_user.id))

    await write_custody(db, case.id, current_user.id, "DISPUTE_OPENED", "case", case.id,
                        {"scope_summary": body.scope_summary})
    await db.commit()

    # ── Fire email notifications in background ──────────────────────────────
    import asyncio
    from app.services import email as email_svc
    from app.config import settings

    email_tasks = []
    if body.complainant_email:
        email_tasks.append(email_svc.send_complainant_case_opened(
            email=body.complainant_email,
            complainant_code=complainant_code,
            case_reference=case.reference,
            scope_summary=body.scope_summary,
            seal_url=settings.SEAL_URL,
        ))
    if body.respondent_email:
        email_tasks.append(email_svc.send_respondent_invite(
            email=body.respondent_email,
            respondent_code=respondent_code,
            case_reference=case.reference,
            scope_summary=body.scope_summary,
            seal_url=settings.SEAL_URL,
        ))
    if email_tasks:
        asyncio.create_task(_fire_emails(email_tasks))

    return {
        "case_id": str(case.id),
        "case_reference": case.reference,
        "complainant_code": complainant_code,
        "respondent_code": respondent_code,
        "scope_summary": body.scope_summary,
    }


async def _fire_emails(tasks):
    """Run all email coroutines concurrently, silently catching errors."""
    import logging
    log = logging.getLogger("veritas.email")
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for r in results:
        if isinstance(r, Exception):
            log.warning(f"Email task error: {r}")



@router.get("/cases/{case_id}/dispute-codes")
async def list_dispute_codes(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Investigator-only view of both codes and whether each has been used —
    never exposes which artifacts were submitted, just the submission state."""
    rows = (await db.execute(select(DisputeCode).where(DisputeCode.case_id == case_id))).scalars().all()
    return [{
        "role": dc.role, "code": dc.code, "scope_summary": dc.scope_summary,
        "submitted": dc.report_id is not None,
    } for dc in rows]


@router.get("/disputes/{code}")
async def get_dispute_scope(code: str, db: AsyncSession = Depends(get_db)):
    """Public, unauthenticated. Tells a party only their own role, the
    scope they're responding to, and whether they've already submitted —
    never anything about the other party's evidence."""
    dc = (await db.execute(select(DisputeCode).where(DisputeCode.code == code))).scalar_one_or_none()
    if not dc:
        raise HTTPException(404, "No dispute found for that code.")
    case = (await db.execute(select(Case).where(Case.id == dc.case_id))).scalar_one_or_none()
    return {
        "role": dc.role,
        "scope_summary": dc.scope_summary,
        "case_reference": case.reference if case else None,
        "already_submitted": dc.report_id is not None,
    }


@router.post("/disputes/{code}/submit", status_code=201)
async def submit_dispute_evidence(code: str, body: DisputeSubmit, db: AsyncSession = Depends(get_db)):
    """The respondent/complainant seals and submits, blind, straight into
    the case their code was issued for. No investigator step in between —
    the case already exists and both parties are already known."""
    from app.models.seal import SealedReport, SealedArtifact

    dc = (await db.execute(select(DisputeCode).where(DisputeCode.code == code))).scalar_one_or_none()
    if not dc:
        raise HTTPException(404, "No dispute found for that code.")
    if dc.report_id is not None:
        raise HTTPException(409, "This code has already been used to submit evidence.")

    report = SealedReport(
        reference=f"VER-{_code_part()}-{_code_part()}",
        path_taken=dc.role,
        statement=body.statement,
        contact=body.contact,
        sealed_at=body.sealed_at,
        claimed_when=body.claimed_when,
        claimed_by=dc.case_id,
    )
    db.add(report)
    await db.flush()

    for a in body.artifacts:
        if len(a.sha256) != 64 or not all(c in "0123456789abcdefABCDEF" for c in a.sha256):
            raise HTTPException(422, "Malformed hash.")
        db.add(SealedArtifact(
            report_id=report.id, filename=a.filename, mime_type=a.mime_type,
            size_bytes=a.size_bytes, sha256=a.sha256.lower(), body_stored=False,
        ))

        ev = Evidence(
            case_id=dc.case_id, filename=a.filename, mime_type=a.mime_type,
            size_bytes=a.size_bytes, sha256=a.sha256.lower(), integrity_ok=True,
            storage_path="", submitter_role=dc.role,
            claimed_at=body.claimed_when or body.sealed_at,
        )
        db.add(ev)
        await db.flush()
        await write_custody(
            db, dc.case_id, None, "HASH_ONLY_RECEIVED", "evidence", ev.id,
            detail={"sealed_sha256": ev.sha256, "submitter_role": dc.role, "dispute_code": code},
        )

    dc.report_id = report.id
    await db.commit()

    await bus.emit(str(dc.case_id), "dispute.submitted", {"role": dc.role})
    return {"reference": report.reference}


# ─────────────────────────────────────────────────────────────
# Auditor view (VERITAS §4.6)
# ─────────────────────────────────────────────────────────────

@router.get("/cases/{case_id}/audit")
async def audit_case(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("auditor", "supervisor", "admin")),
):
    """Read-only. Verifies the ledger and surfaces the confirm/reject ratio
    per investigator — without ever exposing evidence content."""
    chain = await verify_chain(db, case_id)

    leads = (await db.execute(select(Lead).where(Lead.case_id == case_id))).scalars().all()
    contradictions = (await db.execute(
        select(Contradiction).where(Contradiction.case_id == case_id)
    )).scalars().all()

    judged = [l for l in leads if l.status != "proposed"] + \
             [c for c in contradictions if c.status != "proposed"]
    confirmed = sum(1 for j in judged if j.status in ("confirmed", "confirmed_material"))
    per_investigator: dict[str, dict] = {}
    for j in judged:
        if not j.judged_by:
            continue
        key = str(j.judged_by)
        per_investigator.setdefault(key, {"confirmed": 0, "total": 0})
        per_investigator[key]["total"] += 1
        if j.status in ("confirmed", "confirmed_material"):
            per_investigator[key]["confirmed"] += 1

    user_rows = (await db.execute(select(User).where(
        User.id.in_([UUID(k) for k in per_investigator.keys()])
    ))).scalars().all() if per_investigator else []
    username_by_id = {str(u.id): u.username for u in user_rows}

    return {
        "chain": chain,
        "human_decisions": len(judged),
        "confirmed": confirmed,
        "rejected_or_dismissed": len(judged) - confirmed,
        "confirm_ratio": round(confirmed / len(judged), 3) if judged else None,
        "flag_high_confirm_ratio": bool(judged) and (confirmed / len(judged)) > 0.95 and len(judged) >= 10,
        "ai_written_findings": 0,  # structurally impossible — see Lead/Contradiction CHECK constraints
        "per_investigator": [
            {"username": username_by_id.get(k, k), "confirmed": v["confirmed"], "total": v["total"],
             "ratio": round(v["confirmed"] / v["total"], 3)}
            for k, v in per_investigator.items()
        ],
    }


# ─────────────────────────────────────────────────────────────
# Supervisor co-signature — dual control (VERITAS §6.3 defence #4)
# ─────────────────────────────────────────────────────────────

class CoSignCreate(BaseModel):
    action: str  # delete_case | override_integrity_failure
    detail: dict = {}


@router.post("/cases/{case_id}/cosign-requests", status_code=201)
async def request_cosign(
    case_id: UUID,
    body: CoSignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("investigator", "supervisor", "admin")),
):
    if body.action not in ("delete_case", "override_integrity_failure"):
        raise HTTPException(422, "Unknown action.")
    req = CoSignRequest(case_id=case_id, action=body.action, detail=body.detail,
                        requested_by=current_user.id)
    db.add(req)
    await db.flush()
    await write_custody(db, case_id, current_user.id, "COSIGN_REQUESTED", "cosign_request",
                        req.id, {"action": body.action, "detail": body.detail})
    await db.commit()
    return {"id": str(req.id), "status": "pending"}


@router.get("/cases/{case_id}/cosign-requests")
async def list_cosign_requests(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (await db.execute(
        select(CoSignRequest).where(CoSignRequest.case_id == case_id).order_by(CoSignRequest.requested_at.desc())
    )).scalars().all()
    return [{
        "id": str(r.id), "action": r.action, "detail": r.detail, "status": r.status,
        "requested_by": str(r.requested_by), "requested_at": r.requested_at.isoformat(),
        "approved_by": str(r.approved_by) if r.approved_by else None,
    } for r in rows]


@router.post("/cosign-requests/{request_id}/approve")
async def approve_cosign(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("supervisor", "admin")),
):
    req = (await db.execute(select(CoSignRequest).where(CoSignRequest.id == request_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "pending":
        raise HTTPException(409, "Already resolved.")
    if req.requested_by == current_user.id:
        raise HTTPException(403, "One corrupt actor is not enough: the approver must differ from the requester.")

    req.status = "approved"
    req.approved_by = current_user.id
    req.approved_at = datetime.now(timezone.utc)

    if req.action == "override_integrity_failure":
        ev_id = req.detail.get("evidence_id")
        if ev_id:
            ev = (await db.execute(select(Evidence).where(Evidence.id == UUID(ev_id)))).scalar_one_or_none()
            if ev:
                ev.integrity_ok = True
        await write_custody(db, req.case_id, current_user.id, "INTEGRITY_OVERRIDDEN", "evidence",
                            UUID(ev_id) if ev_id else None,
                            {"requested_by": str(req.requested_by), "cosign_request": str(req.id)})
        req.status = "executed"
        await db.commit()
        return {"status": "executed", "action": req.action}

    if req.action == "delete_case":
        await write_custody(db, req.case_id, current_user.id, "CASE_DELETION_APPROVED", "case",
                            req.case_id, {"requested_by": str(req.requested_by)})
        await db.commit()
        case = (await db.execute(select(Case).where(Case.id == req.case_id))).scalar_one_or_none()
        if case:
            await db.delete(case)
            await db.commit()
        return {"status": "executed", "action": req.action}

    await db.commit()
    return {"status": "approved", "action": req.action}


@router.post("/cosign-requests/{request_id}/reject")
async def reject_cosign(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("supervisor", "admin")),
):
    req = (await db.execute(select(CoSignRequest).where(CoSignRequest.id == request_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "pending":
        raise HTTPException(409, "Already resolved.")
    req.status = "rejected"
    req.approved_by = current_user.id
    req.approved_at = datetime.now(timezone.utc)
    await write_custody(db, req.case_id, current_user.id, "COSIGN_REJECTED", "cosign_request", req.id, {})
    await db.commit()
    return {"status": "rejected"}


# ─────────────────────────────────────────────────────────────
# QR pairing (VERITAS §5.1)
# ─────────────────────────────────────────────────────────────

@router.post("/cases/{case_id}/pair")
async def create_pairing(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = secrets.token_urlsafe(24)
    pt = PairingToken(
        case_id=case_id, token=token, created_by=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    db.add(pt)
    await db.commit()
    return {"url": f"{settings.SEAL_URL}/pair/{token}", "token": token, "expires_in": 900}


@router.get("/pair/{token}")
async def get_pairing(token: str, db: AsyncSession = Depends(get_db)):
    pt = (await db.execute(select(PairingToken).where(PairingToken.token == token))).scalar_one_or_none()
    if not pt:
        raise HTTPException(404, "Pairing link not found.")
    if pt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, "This pairing link has expired. Ask the investigator for a new QR code.")
    case = (await db.execute(select(Case).where(Case.id == pt.case_id))).scalar_one_or_none()
    return {"case_reference": case.reference if case else None, "expires_at": pt.expires_at.isoformat()}


class PairSubmit(BaseModel):
    artifacts: List[SealedArtifactIn]


@router.post("/pair/{token}/submit", status_code=201)
async def submit_via_pairing(token: str, body: PairSubmit, db: AsyncSession = Depends(get_db)):
    pt = (await db.execute(select(PairingToken).where(PairingToken.token == token))).scalar_one_or_none()
    if not pt:
        raise HTTPException(404, "Pairing link not found.")
    if pt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, "This pairing link has expired.")

    created = []
    for a in body.artifacts:
        if len(a.sha256) != 64 or not all(c in "0123456789abcdefABCDEF" for c in a.sha256):
            raise HTTPException(422, "Malformed hash.")
        ev = Evidence(
            case_id=pt.case_id, filename=a.filename, mime_type=a.mime_type,
            size_bytes=a.size_bytes, sha256=a.sha256.lower(), integrity_ok=True, storage_path="",
        )
        db.add(ev)
        await db.flush()
        await write_custody(db, pt.case_id, pt.created_by, "HASH_ONLY_RECEIVED", "evidence", ev.id,
                            {"sealed_sha256": ev.sha256, "method": "qr_pairing"})
        created.append(str(ev.id))

    pt.used = True
    await db.commit()
    await bus.emit(str(pt.case_id), "evidence.paired", {"count": len(created)})
    return {"evidence_ids": created}
