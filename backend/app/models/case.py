"""Case model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # CASE-2026-0114
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="open")
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    creator = relationship("User", back_populates="cases", foreign_keys=[created_by])
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="case", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="case", cascade="all, delete-orphan")
    nodes = relationship("Node", back_populates="case", cascade="all, delete-orphan")
    edges = relationship("Edge", back_populates="case", cascade="all, delete-orphan")
    acquisitions = relationship("Acquisition", back_populates="case", cascade="all, delete-orphan")
