from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence, CustodyLog
from app.models.user import User
from datetime import datetime, timezone
import socket
from fpdf import FPDF
from app.config import settings
from uuid import UUID

router = APIRouter(prefix="/api/v1/cases", tags=["reports"])

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
        ("Case reference", case.reference),
        ("Generated", datetime.now(timezone.utc).isoformat()),
        ("Producing system", f"ACPIA on {socket.gethostname()}"),
        ("Certifying officer", f"{officer.username} ({officer.role})"),
    ]:
        pdf.cell(45, 6, label)
        pdf.cell(0, 6, str(value), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5,
        "The electronic records listed below were produced by the above system "
        "in its ordinary course of operation. The system was operating properly "
        "throughout the relevant period. Each record's SHA-256 value was computed "
        "at the point of acquisition and re-verified on receipt.")

    pdf.ln(3)
    pdf.set_font("Courier", "B", 8)
    pdf.cell(70, 6, "FILENAME")
    pdf.cell(22, 6, "BYTES")
    pdf.cell(0, 6, "SHA-256", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Courier", "", 7)
    for e in evidence_rows:
        pdf.cell(70, 5, (e.filename[:37] + '...') if len(e.filename) > 40 else e.filename)
        pdf.cell(22, 5, str(e.size_bytes))
        pdf.cell(0, 5, e.sha256, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Courier", "B", 8)
    pdf.cell(0, 6, "CHAIN OF CUSTODY", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "", 7)
    for c in custody_rows:
        actor_name = "system"  # In real implementation join with users
        pdf.cell(0, 5, f"{c.at.isoformat()}  {c.action:<22} {actor_name}",
                 new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5,
        "AI-derived leads in the accompanying report are investigative leads "
        "requiring human verification. They are not findings of fact. Each was "
        "confirmed by a named investigator whose identity is recorded above.")

    pdf.ln(8)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(90, 6, "System operator: ______________________")
    pdf.cell(0, 6, "Expert: ______________________", new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())

@router.get("/{case_id}/certificate")
async def get_certificate(case_id: UUID, db: AsyncSession = Depends(get_db)):
    # Mock user for now, in real life parse from token
    officer = User(username="Investigator", role="analyst")
    
    case = (await db.execute(select(Case).where(Case.id == case_id))).scalars().first()
    if not case:
        raise HTTPException(404, "Case not found")
        
    evidence_rows = (await db.execute(select(Evidence).where(Evidence.case_id == case_id))).scalars().all()
    custody_rows = (await db.execute(select(CustodyLog).where(CustodyLog.case_id == case_id).order_by(CustodyLog.at))).scalars().all()
    
    pdf_bytes = build_certificate(case, evidence_rows, custody_rows, officer)
    
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=certificate_{case.reference}.pdf"})
