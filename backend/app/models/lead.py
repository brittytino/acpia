"""Lead model — the human gate. Database enforces no AI can write CONFIRMED."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
import sqlalchemy as sa
from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    # identity_link | behavioural_drift | geospatial | timeline_conflict
    summary: Mapped[str] = mapped_column(String, nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    confidence_ci: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    signals: Mapped[dict] = mapped_column(JSONB, default=dict)
    source_ids: Mapped[list] = mapped_column(ARRAY(sa.UUID), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="proposed")
    # proposed | confirmed | rejected  — CONFIRMED can ONLY be set by authenticated human action
    judged_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    judged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    case = relationship("Case", back_populates="leads")

    __table_args__ = (
        CheckConstraint("cardinality(source_ids) > 0", name="ck_lead_has_sources"),
        CheckConstraint(
            "(status = 'proposed') = (judged_by IS NULL)",
            name="ck_lead_judge_consistency"
        ),
        CheckConstraint(
            "status IN ('proposed', 'confirmed', 'rejected')",
            name="ck_lead_status"
        ),
    )
