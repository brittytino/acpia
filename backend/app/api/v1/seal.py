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

            complainant_dc = DisputeCode(
                case_id=fair_case.id, role="complainant", code=complainant_code,
                scope_summary=scope_summary, created_by=admin_user.id,
                report_id=report.id  # Automatically link their initial report!
            )
            db.add(complainant_dc)
            
            respondent_dc = DisputeCode(
                case_id=fair_case.id, role="respondent", code=respondent_code,
                scope_summary=scope_summary, created_by=admin_user.id,
            )
            db.add(respondent_dc)

            # Link the original report into this FAIR case
            report.claimed_by = fair_case.id
            await db.flush()

            # Create hash-only Evidence records for the complainant's initial submission
            from app.models.evidence import Evidence
            for a in body.artifacts:
                ev = Evidence(
                    case_id=fair_case.id, filename=a.filename, mime_type=a.mime_type,
                    size_bytes=a.size_bytes, sha256=a.sha256.lower(), integrity_ok=True,
                    storage_path="", submitter_role="complainant",
                    claimed_at=body.sealed_at,
                )
                db.add(ev)
                await db.flush()
                await write_custody(
                    db, fair_case.id, admin_user.id, "HASH_ONLY_RECEIVED", "evidence", ev.id,
                    detail={"sealed_sha256": ev.sha256, "submitter_role": "complainant", "method": "initial_seal"}
                )

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

    import asyncio
    # Ensure all emails are sent successfully (sequentially to avoid SMTP rate limits)
    for i, task in enumerate(tasks):
        if i > 0:
            await asyncio.sleep(1.5)
        await task

    return {
        "reference": reference,
        "accepts_bodies": store_bodies,
        "fair_case_reference": fair_case_ref,
        "complainant_code": complainant_code,
        "respondent_code": respondent_code,
    }


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

    import os

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(True, 15)

    # 1. LOGO
    logo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "logo.png")
    if os.path.exists(logo_path):
        pdf.image(logo_path, x=85, y=10, w=40)
    
    # Ensure title starts strictly below the logo
    pdf.set_y(55)

    # 2. TITLE
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(26, 58, 107) # Dark Blue
    pdf.cell(0, 10, "VERITAS OFFICIAL SEAL CERTIFICATE", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # 3. HEADER LINE
    pdf.set_draw_color(26, 58, 107)
    pdf.set_line_width(0.8)
    pdf.line(20, pdf.get_y() + 5, 190, pdf.get_y() + 5)
    pdf.ln(12)

    # 4. REFERENCE BOX
    pdf.set_fill_color(240, 244, 255)
    pdf.set_draw_color(26, 58, 107)
    pdf.set_line_width(0.5)
    pdf.cell(0, 15, f" REFERENCE: {report.reference} ", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # 5. METADATA
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 8, f"Sealed Timestamp (UTC): {report.sealed_at.strftime('%Y-%m-%d %H:%M:%S')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, f"Certificate Issued: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}", new_x="LMARGIN", new_y="NEXT")
    if report.contact:
        pdf.cell(0, 8, f"Submitter Contact: {report.contact}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # 6. ARTIFACTS TABLE
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "CRYPTOGRAPHIC LEDGER (SEALED EVIDENCE)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "B", 9)
    pdf.set_fill_color(220, 220, 220)
    pdf.cell(85, 8, "FILENAME", border=1, fill=True)
    pdf.cell(20, 8, "BYTES", border=1, fill=True)
    pdf.cell(85, 8, "SHA-256 FINGERPRINT", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Courier", "", 8)
    for a in report.artifacts:
        pdf.cell(85, 8, pdf_safe(a.filename[:45]), border=1)
        pdf.cell(20, 8, str(a.size_bytes), border=1)
        pdf.cell(85, 8, a.sha256[:32] + "...", border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(15)

    # 7. LEGAL GUIDELINES
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(150, 0, 0)
    pdf.cell(0, 10, "IMPORTANT GUIDELINES & CONDITIONS", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    guidelines = (
        "1. INTEGRITY ONLY: This certificate attests solely to the INTEGRITY of the listed records. "
        "It mathematically proves the SHA-256 values are completely unchanged since the moment of sealing.\n\n"
        "2. NO AUTHENTICITY CLAIM: This certificate makes NO ASSERTION as to whether the content is genuine, "
        "accurate, or truthful. Authenticity is evaluated by an investigator.\n\n"
        "3. LEGAL SUBMISSION: Keep this reference code secure. Present this certificate to law enforcement "
        "or the appropriate authorities to formally initiate your dispute or complaint.\n\n"
        "4. BLIND DUAL SUBMISSION: Any opposing party will be invited to submit their own evidence independently "
        "and securely without seeing your submission."
    )
    pdf.multi_cell(0, 6, guidelines, new_x="LMARGIN", new_y="NEXT")

    return Response(content=bytes(pdf.output()), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=seal_{reference}.pdf"})
