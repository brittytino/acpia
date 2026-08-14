import secrets
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.seal import SealedReport, SealedArtifact
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1/seal", tags=["seal"])
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # no I/O/0/1 — read aloud safely

def generate_reference() -> str:
    part = lambda: "".join(secrets.choice(_ALPHABET) for _ in range(4))
    return f"ACP-{part()}-{part()}"

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
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "ACPIA SEAL CERTIFICATE", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Reference: {report.reference}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Sealed At: {report.sealed_at.isoformat()}", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(5)
    pdf.set_font("Courier", "", 8)
    for a in report.artifacts:
        pdf.cell(0, 5, f"{a.filename} | {a.sha256}", new_x="LMARGIN", new_y="NEXT")
        
    return Response(content=bytes(pdf.output()), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=seal_{reference}.pdf"})

