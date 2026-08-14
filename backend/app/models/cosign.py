"""CoSignRequest — dual control on destructive actions (VERITAS §6.3 defence #4).

One corrupt actor is not enough: deleting a case or overriding an
integrity failure requires a second, different, supervisor-role human to
approve before the action executes.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CoSignRequest(Base):
    __tablename__ = "cosign_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)
    # delete_case | override_integrity_failure | export_full_evidence
    detail: Mapped[dict] = mapped_column(JSONB, default=dict)
    requested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    # pending | approved | rejected | executed
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    case = relationship("Case")

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'executed')",
            name="ck_cosign_status",
        ),
        CheckConstraint(
            "requested_by IS DISTINCT FROM approved_by",
            name="ck_cosign_distinct_actors",
        ),
    )
