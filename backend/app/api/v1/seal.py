import secrets
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.seal import SealedReport, SealedArtifact
from app.core.pdf_safe import pdf_safe
from app.core.ratelimit import rate_limit
from pydantic import BaseModel, EmailStr
from typing import List, Optional

router = APIRouter(prefix="/seal", tags=["seal"])
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # no I/O/0/1 — read aloud safely
_DISP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_reference() -> str:
    part = lambda: "".join(secrets.choice(_ALPHABET) for _ in range(4))
    return f"VER-{part()}-{part()}"


def _code_part() -> str:
    return "".join(secrets.choice(_DISP_ALPHABET) for _ in range(4))


class SealedArtifactItem(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int
    sha256: str


class SealReportCreate(BaseModel):
    path_taken: str
    statement: Optional[str] = None
    complainant_email: Optional[str] = None   # NEW: email field
    accused_email: Optional[str] = None       # NEW: accused person's email
    sealed_at: datetime
    claimed_when: Optional[datetime] = None
    artifacts: List[SealedArtifactItem]


@router.post("/reports", status_code=201, dependencies=[Depends(rate_limit(10, 60))])
async def create_sealed_report(body: SealReportCreate, db: AsyncSession = Depends(get_db)):
    """
    Accepts hashes and context. For the illegal-material path, NEVER a body.
    Now also accepts complainant_email and accused_email:
    - complainant_email: send case summary receipt.
    - accused_email: auto-open a FAIR dispute case and email the accused respondent code.
    """
    store_bodies = body.path_taken != "illegal_material"

    report = SealedReport(
        reference=generate_reference(),
        path_taken=body.path_taken,
        statement=body.statement,
        contact=body.complainant_email,   # store email in contact field
        sealed_at=body.sealed_at,
        claimed_when=body.claimed_when,
    )
    db.add(report)
    await db.flush()

    for a in body.artifacts:
        if len(a.sha256) != 64 or not all(c in "0123456789abcdefABCDEF" for c in a.sha256):
            raise HTTPException(422, "Malformed hash.")
        db.add(SealedArtifact(
            report_id=report.id,
            filename=a.filename,
            mime_type=a.mime_type,
            size_bytes=a.size_bytes,
            sha256=a.sha256.lower(),
            body_stored=False,
        ))

    await db.commit()

    reference = report.reference

    # ── Fire email notifications asynchronously ────────────────────────────
    from app.config import settings
    from app.services import email as email_svc

    tasks = []

    if body.complainant_email:
        tasks.append(email_svc.send_complaint_receipt(
            email=body.complainant_email,
            reference=reference,
            statement=body.statement,
            artifact_count=len(body.artifacts),
            seal_url=settings.SEAL_URL,
        ))

    # If an accused email was provided: auto-open a FAIR case and send dispute codes
    respondent_code = None
    complainant_code = None
    fair_case_ref = None

    if body.accused_email:
        from app.models.case import Case
        from app.models.dispute import DisputeCode
        from app.core.custody import write_custody
        from sqlalchemy import select
        from app.models.user import User

        admin_user = (await db.execute(select(User).where(User.role == "admin").limit(1))).scalar_one_or_none()
        if admin_user is None:
            admin_user = (await db.execute(select(User).limit(1))).scalar_one_or_none()

        if admin_user:
            # Create the FAIR case
            fair_case = Case(
                reference=f"FAIR-{int(datetime.now(timezone.utc).timestamp())}",
                title=f"Complaint filed via Seal Portal — {reference}",
                case_type="fair",
                status="awaiting_submissions",
                created_by=admin_user.id,
            )
            db.add(fair_case)
            await db.flush()

            scope_summary = (
                body.statement[:200] if body.statement
                else f"Complaint submitted via sealed report {reference}"
            )
            complainant_code = f"VER-{_code_part()}-{_code_part()}-C"
            respondent_code = f"VER-{_code_part()}-{_code_part()}-R"

            db.add(DisputeCode(
                case_id=fair_case.id, role="complainant", code=complainant_code,
                scope_summary=scope_summary, created_by=admin_user.id,
            ))
            db.add(DisputeCode(
                case_id=fair_case.id, role="respondent", code=respondent_code,
                scope_summary=scope_summary, created_by=admin_user.id,
            ))

            # Link the original report into this FAIR case
            report.claimed_by = fair_case.id

            await write_custody(db, fair_case.id, admin_user.id, "DISPUTE_OPENED",
                                "case", fair_case.id, {
                                    "scope_summary": scope_summary,
                                    "sealed_reference": reference,
                                    "auto_opened": True,
                                })
            await db.commit()
            fair_case_ref = fair_case.reference

            # Email the accused their respondent code
            tasks.append(email_svc.send_respondent_invite(
                email=body.accused_email,
                respondent_code=respondent_code,
                case_reference=fair_case_ref,
                scope_summary=scope_summary,
                seal_url=settings.SEAL_URL,
            ))

            # Email the complainant their complainant code (if email was given)
            if body.complainant_email:
                tasks.append(email_svc.send_complainant_case_opened(
                    email=body.complainant_email,
                    complainant_code=complainant_code,
                    case_reference=fair_case_ref,
                    scope_summary=scope_summary,
                    seal_url=settings.SEAL_URL,
                ))

    # Fire all emails in the background without blocking the response
    if tasks:
        asyncio.create_task(_fire_emails(tasks))

    return {
        "reference": reference,
        "accepts_bodies": store_bodies,
        "fair_case_reference": fair_case_ref,
        "complainant_code": complainant_code,
        "respondent_code": respondent_code,
    }


async def _fire_emails(tasks):
    """Run all email coroutines concurrently, silently catching errors."""
    import logging
    log = logging.getLogger("veritas.email")
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for r in results:
        if isinstance(r, Exception):
            log.warning(f"Email task error: {r}")


@router.get("/reports/{reference}/certificate")
async def download_seal_certificate(reference: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from fastapi import Response
    from fpdf import FPDF

    result = await db.execute(select(SealedReport).where(SealedReport.reference == reference).options(selectinload(SealedReport.artifacts)))
    report = result.scalars().first()
    if not report:
        raise HTTPException(404, "Report not found")

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(True, 15)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "VERITAS SEAL CERTIFICATE", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Reference: {report.reference}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Sealed at: {report.sealed_at.isoformat()}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).isoformat()}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Courier", "B", 8)
    pdf.cell(70, 6, "FILENAME")
    pdf.cell(22, 6, "BYTES")
    pdf.cell(0, 6, "SHA-256", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "", 7)
    for a in report.artifacts:
        pdf.cell(70, 5, pdf_safe(a.filename[:40]))
        pdf.cell(22, 5, str(a.size_bytes))
        pdf.cell(0, 5, a.sha256, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5,
        "This certificate attests to the INTEGRITY of the listed records - that "
        "their SHA-256 values are unchanged since the moment of sealing. It makes "
        "NO ASSERTION as to whether the content of any record is genuine, accurate, "
        "or truthful. Authenticity is a separate question, evaluated only after this "
        "report is accepted into an investigation, and always by a human investigator.",
        new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(0, 5,
        "Keep this reference code. It is what you give to the investigating authority; "
        "the file itself was never transmitted to produce it.",
        new_x="LMARGIN", new_y="NEXT")

    return Response(content=bytes(pdf.output()), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=seal_{reference}.pdf"})
