"""Sealed reports and sealed artifacts — ACPIA Seal public surface."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, BigInteger, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SealedReport(Base):
    __tablename__ = "sealed_reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # ACP-7K4M-2X9P
    path_taken: Mapped[str] = mapped_column(String, nullable=False)
    # guardian | self | illegal_material
    statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contact: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sealed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    claimed_when: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # when the submitter says the underlying event occurred — distinct from
    # sealed_at (when they sealed it). A large gap feeds the Authenticity Agent.
    claimed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("cases.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    artifacts = relationship("SealedArtifact", back_populates="report", cascade="all, delete-orphan")


class SealedArtifact(Base):
    __tablename__ = "sealed_artifacts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sealed_reports.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)  # computed in browser
    body_stored: Mapped[bool] = mapped_column(Boolean, default=False)  # FALSE for illegal_material
    storage_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    report = relationship("SealedReport", back_populates="artifacts")
