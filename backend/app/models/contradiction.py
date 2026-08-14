"""Contradiction model — the Contradiction Board (VERITAS §8).

The Contradiction Agent runs impartially across the UNION of all
submissions in a case. It has no concept of "sides." Every contradiction
ships with a caveat — an innocent explanation the investigator must weigh —
and, like a Lead, can only be confirmed-as-material or dismissed by an
authenticated human. The database enforces that, not a convention.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
import sqlalchemy as sa
from app.database import Base


class Contradiction(Base):
    __tablename__ = "contradictions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    # temporal_impossibility | metadata_claim_mismatch |
    # device_activity_conflict | absent_from_complete_export
    summary: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)  # high | medium | low
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    caveat: Mapped[str] = mapped_column(String, nullable=False)  # ALWAYS present
    source_ids: Mapped[list] = mapped_column(ARRAY(sa.UUID), nullable=False)
    signals: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String, nullable=False, default="proposed")
    # proposed | confirmed_material | dismissed
    judged_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    judged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    case = relationship("Case", back_populates="contradictions")

    __table_args__ = (
        CheckConstraint("cardinality(source_ids) > 0", name="ck_contradiction_has_sources"),
        CheckConstraint(
            "(status = 'proposed') = (judged_by IS NULL)",
            name="ck_contradiction_judge_consistency",
        ),
        CheckConstraint(
            "status IN ('proposed', 'confirmed_material', 'dismissed')",
            name="ck_contradiction_status",
        ),
        CheckConstraint("severity IN ('high', 'medium', 'low')", name="ck_contradiction_severity"),
    )
