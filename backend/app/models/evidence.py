"""Evidence + Acquisition + CustodyLog models."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, BigInteger, Boolean, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.database import Base


class Acquisition(Base):
    __tablename__ = "acquisitions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    method: Mapped[str] = mapped_column(String, nullable=False)
    # adb_logical_consented | forensic_import | direct_upload | citizen_sealed
    device_profile: Mapped[dict] = mapped_column(JSONB, default=dict)
    operator_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    case = relationship("Case", back_populates="acquisitions")
    evidence = relationship("Evidence", back_populates="acquisition")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    acquisition_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("acquisitions.id"), nullable=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    source_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    client_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    integrity_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    exif: Mapped[dict] = mapped_column(JSONB, default=dict)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # from moondream
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding: Mapped[Optional[list]] = mapped_column(Vector(768), nullable=True)
    relevance: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    revealed_count: Mapped[int] = mapped_column(Integer, default=0)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # ── Two-score model (VERITAS §7): integrity vs authenticity ──────────
    # Integrity is the binary SHA-256 question, derived from custody log actions.
    # Authenticity is never a score — an indicator list, each with a caveat.
    submitter_role: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # complainant | respondent | null (ordinary GUARD evidence has no "side")
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # when the submitter says the event/content occurred — compared against
    # sealed_at and any embedded metadata to compute authenticity indicators
    authenticity_indicators: Mapped[list] = mapped_column(JSONB, default=list)
    # [{"kind": str, "detail": str, "caveat": str, "severity": "low"|"medium"|"high"}]

    case = relationship("Case", back_populates="evidence")
    acquisition = relationship("Acquisition", back_populates="evidence")

    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("case_id", "sha256", name="uq_evidence_case_sha256"),
    )


class CustodyLog(Base):
    """Append-only, hash-chained custody ledger (VERITAS §6.1).
    Each entry embeds the previous entry's hash. Altering or deleting any
    row breaks every hash after it — detectably, forever. UPDATE/DELETE are
    also revoked at the database level for the app role (see database.py)."""
    __tablename__ = "custody_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    target_type: Mapped[str] = mapped_column(String, nullable=False)
    target_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    detail: Mapped[dict] = mapped_column(JSONB, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="0" * 64)
    entry_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="")
