"""Conversation + Message models — the Escalation Timeline source."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Integer, Numeric, Text, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    evidence_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    participants: Mapped[list] = mapped_column(ARRAY(String), nullable=False, default=list)
    first_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    trajectory: Mapped[Optional[float]] = mapped_column(Numeric(5, 3), nullable=True)  # stages/week
    drift_ratio: Mapped[Optional[float]] = mapped_column(Numeric(5, 3), nullable=True)
    code_switch_slope: Mapped[Optional[float]] = mapped_column(Numeric(5, 3), nullable=True)
    code_switch_delta: Mapped[Optional[float]] = mapped_column(Numeric(5, 3), nullable=True)
    code_switch_direction: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    language_profile: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default='{}')

    case = relationship("Case", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan",
                           order_by="Message.idx")


VALID_STAGES = (
    "rapport_building", "trust_exclusivity", "dependency",
    "isolation", "desensitization", "solicitation", "none"
)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    idx: Mapped[int] = mapped_column(Integer, nullable=False)
    sender: Mapped[str] = mapped_column(String, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    char_count: Mapped[int] = mapped_column(Integer, nullable=False)
    stage: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stage_conf: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    evidence_span: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # "L142-L147"
    language: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tamil_share: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
