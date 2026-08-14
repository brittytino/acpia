from fastapi import APIRouter, Depends, HTTPException, Response, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence, CustodyLog
from app.models.lead import Lead
from app.models.contradiction import Contradiction
from app.models.user import User
from app.core.security import decode_token
from app.core.pdf_safe import pdf_safe as _s
from datetime import datetime, timezone
import socket
import uuid
from fpdf import FPDF
from app.config import settings
from uuid import UUID

router = APIRouter(prefix="/cases", tags=["reports"])


async def user_from_query_token(
    db: AsyncSession,
    token: str | None,
    request: Request | None = None,
) -> User:
    """Prefer a real Authorization header (what the Console now sends, via
    fetch()+blob rather than window.open()). Query-param token stays as a
    fallback for any caller that can't set a header — but a token in the URL
    ends up in browser history and server logs, so it's the last resort."""
    if request is not None:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Missing token")
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    user = (await db.execute(select(User).where(User.id == uuid.UUID(user_id)))).scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User no longer exists")
    return user


def build_certificate(case, evidence_rows, custody_rows, officer) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(True, 15)

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "CERTIFICATE UNDER SECTION 63(4)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, "Bharatiya Sakshya Adhiniyam, 2023", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    for label, value in [
        ("Case reference", _s(case.reference)),
        ("Generated", datetime.now(timezone.utc).isoformat()),
        ("Producing system", f"VERITAS on {socket.gethostname()}"),
        ("Certifying officer", _s(f"{officer.username} ({officer.role})")),
    ]:
        pdf.cell(45, 6, label)
        pdf.cell(0, 6, str(value), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 9)
    pdf.multi_cell(0, 5,
        "This certificate attests ONLY to the INTEGRITY of the records listed below - "
        "that each SHA-256 value is unchanged since the moment of sealing, verified by an "
        "unbroken, hash-chained custody ledger. It makes NO ASSERTION as to the AUTHENTICITY "
        "of any record's content - whether it is genuine, accurate, or truthful. Authenticity "
        "indicators, where present, are recorded separately in the case file and require "
        "human evaluation; they are never merged into this integrity attestation.",
        new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.ln(2)
    pdf.multi_cell(0, 5,
        "The electronic records listed below were produced by the above system "
        "in its ordinary course of operation. The system was operating properly "
        "throughout the relevant period. Each record's SHA-256 value was computed "
        "at the point of acquisition and re-verified on receipt.",
        new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.set_font("Courier", "B", 8)
    pdf.cell(70, 6, "FILENAME")
    pdf.cell(22, 6, "BYTES")
    pdf.cell(0, 6, "SHA-256", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Courier", "", 7)
    for e in evidence_rows:
        fname = _s((e.filename[:37] + '...') if len(e.filename) > 40 else e.filename)
        pdf.cell(70, 5, fname)
        pdf.cell(22, 5, str(e.size_bytes))
        pdf.cell(0, 5, e.sha256, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Courier", "B", 8)
    pdf.cell(0, 6, "CHAIN OF CUSTODY", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "", 7)
    for c in custody_rows:
        pdf.cell(0, 5, _s(f"{c.at.isoformat()}  {c.action:<22} {str(c.actor_id or 'system')[:8]}"),
                 new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5,
        "AI-derived leads in the accompanying report are investigative leads "
        "requiring human verification. They are not findings of fact. Each was "
        "confirmed by a named investigator whose identity is recorded above.",
        new_x="LMARGIN", new_y="NEXT")

    pdf.ln(8)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(90, 6, "System operator: ______________________")
    pdf.cell(0, 6, "Expert: ______________________", new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())


def build_case_report(case, confirmed_leads, confirmed_contradictions, officer) -> bytes:
    """Case report — VERITAS §10 checklist: ONLY confirmed leads, never proposals."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(True, 15)

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "CASE REPORT", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, _s(f"Case reference: {case.reference}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, _s(f"Title: {case.title}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, _s(f"Certifying officer: {officer.username} ({officer.role})"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).isoformat()}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 9)
    pdf.multi_cell(0, 5,
        "This report includes ONLY leads and contradictions that were reviewed and "
        "confirmed by a named human investigator. Proposed items that were never judged, "
        "and items an investigator rejected or dismissed, are excluded by construction - "
        "this filter is a database query, not an editorial choice.",
        new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"CONFIRMED LEADS ({len(confirmed_leads)})", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    if not confirmed_leads:
        pdf.multi_cell(0, 5, "None confirmed.", new_x="LMARGIN", new_y="NEXT")
    for l in confirmed_leads:
        pdf.ln(1)
        pdf.set_font("Helvetica", "B", 9)
        pdf.multi_cell(0, 5, _s(f"[{l.kind}]  confidence {float(l.confidence):.2f} +/- {float(l.confidence_ci):.2f}"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 5, _s(l.summary), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "I", 8)
        pdf.multi_cell(0, 5, _s(f"Confirmed by investigator id {l.judged_by} at {l.judged_at.isoformat() if l.judged_at else ''}"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"CONFIRMED CONTRADICTIONS ({len(confirmed_contradictions)})", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    if not confirmed_contradictions:
        pdf.multi_cell(0, 5, "None confirmed as material.", new_x="LMARGIN", new_y="NEXT")
    for c in confirmed_contradictions:
        pdf.ln(1)
        pdf.set_font("Helvetica", "B", 9)
        pdf.multi_cell(0, 5, _s(f"[{c.kind}]  severity {c.severity}  confidence {float(c.confidence):.2f}"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 5, _s(c.summary), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "I", 8)
        pdf.multi_cell(0, 5, _s(f"Caveat: {c.caveat}"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(0, 5,
        "VERITAS does not determine which party, if any, is truthful. This report "
        "surfaces what a human investigator confirmed as material; the judgment "
        "remains theirs, and the courts', to make.",
        new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())


@router.get("/{case_id}/certificate")
async def get_certificate(case_id: UUID, request: Request, token: str | None = Query(None), db: AsyncSession = Depends(get_db)):
    officer = await user_from_query_token(db, token, request)

    case = (await db.execute(select(Case).where(Case.id == case_id))).scalars().first()
    if not case:
        raise HTTPException(404, "Case not found")

    evidence_rows = (await db.execute(select(Evidence).where(Evidence.case_id == case_id))).scalars().all()
    custody_rows = (await db.execute(select(CustodyLog).where(CustodyLog.case_id == case_id).order_by(CustodyLog.at))).scalars().all()

    pdf_bytes = build_certificate(case, evidence_rows, custody_rows, officer)

    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=certificate_{case.reference}.pdf"})


@router.get("/{case_id}/report")
async def get_case_report(case_id: UUID, request: Request, token: str | None = Query(None), db: AsyncSession = Depends(get_db)):
    officer = await user_from_query_token(db, token, request)

    case = (await db.execute(select(Case).where(Case.id == case_id))).scalars().first()
    if not case:
        raise HTTPException(404, "Case not found")

    leads = (await db.execute(
        select(Lead).where(Lead.case_id == case_id, Lead.status == "confirmed")
    )).scalars().all()
    contradictions = (await db.execute(
        select(Contradiction).where(Contradiction.case_id == case_id, Contradiction.status == "confirmed_material")
    )).scalars().all()

    pdf_bytes = build_case_report(case, leads, contradictions, officer)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=report_{case.reference}.pdf"})
