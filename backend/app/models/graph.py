"""Knowledge graph: Node + Edge models (Postgres, no Neo4j needed)."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from app.database import Base


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)  # person|device|platform|file|location|event
    label: Mapped[str] = mapped_column(String, nullable=False)
    props: Mapped[dict] = mapped_column(JSONB, default=dict)
    embedding: Mapped[Optional[list]] = mapped_column(Vector(768), nullable=True)

    case = relationship("Case", back_populates="nodes")


class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    src_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    dst_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    observed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    confidence_ci: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    signals: Mapped[dict] = mapped_column(JSONB, default=dict)
    source_ids: Mapped[list] = mapped_column(ARRAY(sa.UUID), nullable=False)

    case = relationship("Case", back_populates="edges")

    __table_args__ = (
        CheckConstraint("cardinality(source_ids) > 0", name="ck_edge_has_sources"),
    )
