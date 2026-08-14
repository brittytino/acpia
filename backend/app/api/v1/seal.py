"""
ACPIA Seal — public endpoints. No authentication required.
CRITICAL: The illegal_material path NEVER stores the file body.
Rate-limited. Hashing happens in-browser.
"""
import os
import uuid
import secrets
import hashlib
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.seal import SealedReport, SealedArtifact
from app.config import settings

router = APIRouter(prefix="/seal", tags=["ACPIA Seal — Public"])


def _gen_reference() -> str:
    """Generate ACP-XXXX-XXXX style reference code."""
    chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    part1 = "".join(secrets.choice(chars) for _ in range(4))
    part2 = "".join(secrets.choice(chars) for _ in range(4))
    return f"ACP-{part1}-{part2}"


# ── Request / Response schemas ─────────────────────────────────────────────────

class ArtifactHashIn(BaseModel):
    filename: str
    sha256: str
    size_bytes: int
    mime_type: str


class SealReportIn(BaseModel):
    path_taken: str  # guardian | self | illegal_material
    statement: Optional[str] = None
    contact: Optional[str] = None
    sealed_at: datetime
    artifacts: list[ArtifactHashIn] = []


class SealReportOut(BaseModel):
    reference: str
    sealed_at: datetime
    artifact_count: int


class ResourcesOut(BaseModel):
    helplines: list[dict]
    reporting: list[dict]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/reports", response_model=SealReportOut)
async def create_sealed_report(
    payload: SealReportIn,
    db: AsyncSession = Depends(get_db),
):
    """Create a sealed report. Artifacts are hash-only for the illegal_material path."""
    reference = _gen_reference()

    report = SealedReport(
        reference=reference,
        path_taken=payload.path_taken,
        statement=payload.statement,
        contact=payload.contact,
        sealed_at=payload.sealed_at,
    )
    db.add(report)
    await db.flush()

    for art in payload.artifacts:
        sealed_art = SealedArtifact(
            report_id=report.id,
            filename=art.filename,
            mime_type=art.mime_type,
            size_bytes=art.size_bytes,
            sha256=art.sha256,
            body_stored=False,  # hashes only — body upload is separate endpoint
        )
        db.add(sealed_art)

    await db.commit()
    return SealReportOut(
        reference=reference,
        sealed_at=payload.sealed_at,
        artifact_count=len(payload.artifacts),
    )


@router.post("/reports/{ref}/artifacts")
async def attach_artifact_body(
    ref: str,
    file: UploadFile = File(...),
    sha256_claimed: str = "",
    db: AsyncSession = Depends(get_db),
):
    """
    Attach a file body — ONLY permitted for lawful paths (guardian, self).
    Illegal_material path NEVER reaches this endpoint.
    Server recomputes SHA-256 and verifies integrity.
    """
    result = await db.execute(
        select(SealedReport).where(SealedReport.reference == ref)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Reference not found")

    if report.path_taken == "illegal_material":
        raise HTTPException(
            403,
            "File bodies must not be uploaded for this report type. "
            "The hash is the legally relevant artefact."
        )

    # Size check
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, "File too large")

    # Recompute hash — verify integrity
    actual_sha256 = hashlib.sha256(content).hexdigest()
    if sha256_claimed and actual_sha256 != sha256_claimed:
        raise HTTPException(400, f"Integrity check failed. Expected {sha256_claimed}, got {actual_sha256}")

    # Store
    storage_dir = Path(settings.STORAGE_PATH) / "sealed" / ref
    storage_dir.mkdir(parents=True, exist_ok=True)
    storage_path = storage_dir / f"{actual_sha256[:16]}_{file.filename}"
    storage_path.write_bytes(content)

    # Update artifact record
    art_result = await db.execute(
        select(SealedArtifact).where(
            SealedArtifact.report_id == report.id,
            SealedArtifact.sha256 == actual_sha256,
        )
    )
    artifact = art_result.scalar_one_or_none()
    if artifact:
        artifact.body_stored = True
        artifact.storage_path = str(storage_path)
    else:
        # New artifact not in original list
        db.add(SealedArtifact(
            report_id=report.id,
            filename=file.filename or "unknown",
            mime_type=file.content_type or "application/octet-stream",
            size_bytes=len(content),
            sha256=actual_sha256,
            body_stored=True,
            storage_path=str(storage_path),
        ))

    await db.commit()
    return {"sha256": actual_sha256, "stored": True, "reference": ref}


@router.get("/reports/{ref}/certificate")
async def get_preservation_certificate(ref: str, db: AsyncSession = Depends(get_db)):
    """Generate preservation certificate PDF."""
    result = await db.execute(
        select(SealedReport).where(SealedReport.reference == ref)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Reference not found")

    from fpdf import FPDF
    from io import BytesIO

    pdf = FPDF()
    pdf.add_page()

    # Header
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(46, 110, 107)  # --calm
    pdf.cell(0, 12, "ACPIA — Evidence Preservation Certificate", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(86, 100, 111)
    pdf.cell(0, 6, "Issued under Bharatiya Sakshya Adhiniyam 2023, Section 63", ln=True, align="C")
    pdf.ln(8)

    # Reference and time
    pdf.set_font("Courier", "B", 14)
    pdf.set_text_color(26, 36, 48)
    pdf.cell(0, 8, f"Reference Code: {report.reference}", ln=True)
    pdf.set_font("Courier", "", 11)
    pdf.cell(0, 6, f"Sealed at: {report.sealed_at.isoformat()}", ln=True)
    pdf.cell(0, 6, f"Path: {report.path_taken.replace('_', ' ').title()}", ln=True)
    pdf.ln(6)

    # Artifacts
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(26, 36, 48)
    pdf.cell(0, 8, "Sealed Artifacts", ln=True)
    pdf.set_draw_color(226, 232, 236)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    arts_result = await db.execute(
        select(SealedArtifact).where(SealedArtifact.report_id == report.id)
    )
    artifacts = arts_result.scalars().all()

    for art in artifacts:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(26, 36, 48)
        pdf.cell(0, 6, art.filename, ln=True)
        pdf.set_font("Courier", "", 9)
        pdf.set_text_color(86, 100, 111)
        # Break SHA-256 into readable groups
        sha_groups = " ".join(art.sha256[i:i+8] for i in range(0, 64, 8))
        pdf.cell(0, 5, f"SHA-256: {sha_groups}", ln=True)
        pdf.cell(0, 5, f"Size: {art.size_bytes:,} bytes  |  Type: {art.mime_type}", ln=True)
        pdf.ln(3)

    # Statement
    if report.statement:
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(26, 36, 48)
        pdf.cell(0, 8, "Declarant Statement", ln=True)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(26, 36, 48)
        pdf.multi_cell(0, 6, report.statement[:500])
        pdf.ln(4)

    # Legal notice
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(147, 160, 170)
    pdf.multi_cell(0, 5,
        "This document records a SHA-256 cryptographic digest of digital evidence computed "
        "entirely in the declarant's browser. The file body was not transmitted to ACPIA systems "
        "unless explicitly indicated above. The hash constitutes the basis for integrity verification "
        "under BSA §63. Any modification to the original file will produce a different hash value."
    )

    pdf_bytes = bytes(pdf.output())

    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp.write(pdf_bytes)
    tmp.close()

    return FileResponse(
        tmp.name,
        media_type="application/pdf",
        filename=f"ACPIA-Certificate-{ref}.pdf",
    )


@router.get("/resources", response_model=ResourcesOut)
async def get_resources():
    """Helplines and reporting channels — always available, no auth."""
    return ResourcesOut(
        helplines=[
            {"name": "Childline", "number": "1098", "description": "Free, 24 hours. For anything involving a child.", "call": "tel:1098"},
            {"name": "National Cyber Crime helpline", "number": "1930", "description": "For online crimes, fraud, and harmful content.", "call": "tel:1930"},
        ],
        reporting=[
            {"name": "cybercrime.gov.in", "url": "https://cybercrime.gov.in", "description": "File online. Takes about ten minutes."},
            {"name": "POCSO e-Box (NCPCR)", "url": "https://ncpcr.gov.in/page/pocso-e-box.html", "description": "Confidential complaints about child sexual abuse."},
            {"name": "NCRP — National Crime Reporting Portal", "url": "https://ncrp.gov.in", "description": "National Crime Reporting Portal."},
        ],
    )
