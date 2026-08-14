import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.seal import SealedReport, SealedArtifact
from app.core.pdf_safe import pdf_safe
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/seal", tags=["seal"])
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # no I/O/0/1 — read aloud safely


def generate_reference() -> str:
    part = lambda: "".join(secrets.choice(_ALPHABET) for _ in range(4))
    return f"VER-{part()}-{part()}"


class SealedArtifactItem(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int
    sha256: str


class SealReportCreate(BaseModel):
    path_taken: str
    statement: Optional[str] = None
    contact: Optional[str] = None
    sealed_at: datetime
    claimed_when: Optional[datetime] = None
    artifacts: List[SealedArtifactItem]


@router.post("/reports", status_code=201)
async def create_sealed_report(body: SealReportCreate, db: AsyncSession = Depends(get_db)):
    """Accepts hashes and context. For the illegal-material path, NEVER a body."""
    store_bodies = body.path_taken != "illegal_material"

    report = SealedReport(
        reference=generate_reference(),
        path_taken=body.path_taken,
        statement=body.statement,
        contact=body.contact,
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
    return {"reference": report.reference, "accepts_bodies": store_bodies}


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
