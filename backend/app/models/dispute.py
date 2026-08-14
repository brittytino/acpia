"""DisputeCode — Blind Dual Submission (VERITAS §3).

A FAIR case is opened with two codes, one per party. Each party seals and
submits evidence independently, blind to the other's submission — there is
no query path from one code to the other party's SealedReport. Only the
investigator (querying by case_id) and the Contradiction Agent (running
across the union) ever see both sides.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DisputeCode(Base):
    __tablename__ = "dispute_codes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # complainant | respondent
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # VER-7K4M-2X9P-C
    scope_summary: Mapped[str] = mapped_column(String, nullable=False)
    report_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("sealed_reports.id"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    case = relationship("Case", back_populates="dispute_codes")

    __table_args__ = (
        CheckConstraint("role IN ('complainant', 'respondent')", name="ck_dispute_role"),
    )
