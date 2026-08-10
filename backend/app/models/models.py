"""
SQLAlchemy ORM Models — matching exact schemas from ACPIA Architecture Section 9.1
All tables use UUIDs as primary keys, UTC timestamps, and appropriate constraints.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, BigInteger, Numeric, DateTime,
    ForeignKey, CheckConstraint, UniqueConstraint, Index, ARRAY, func,
    event
)
from sqlalchemy.dialects.postgresql import UUID, NUMRANGE, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    keycloak_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50), nullable=False,
        default="investigator"
    )
    badge_number: Mapped[Optional[str]] = mapped_column(String(50))
    jurisdiction: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    cases_lead: Mapped[List["Case"]] = relationship("Case", back_populates="lead_investigator", foreign_keys="Case.lead_investigator_id")
    evidence_ingested: Mapped[List["EvidenceItem"]] = relationship("EvidenceItem", back_populates="ingested_by_user")
    leads_reviewed: Mapped[List["Lead"]] = relationship("Lead", back_populates="reviewed_by_user")

    __table_args__ = (
        CheckConstraint("role IN ('investigator', 'supervisor', 'admin', 'analyst')", name="users_role_check"),
    )


class Case(Base):
    __tablename__ = "cases"

    case_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    case_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    lead_investigator_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.user_id"))
    jurisdiction: Mapped[str] = mapped_column(String(255), nullable=False)
    tags: Mapped[Optional[list]] = mapped_column(ARRAY(String), default=list)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, default=dict)

    # Relationships
    lead_investigator: Mapped[Optional["User"]] = relationship("User", back_populates="cases_lead", foreign_keys=[lead_investigator_id])
    evidence_items: Mapped[List["EvidenceItem"]] = relationship("EvidenceItem", back_populates="case", cascade="all, delete-orphan")
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="case", cascade="all, delete-orphan")
    analysis_runs: Mapped[List["AnalysisRun"]] = relationship("AnalysisRun", back_populates="case", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('open', 'under_review', 'closed', 'archived')", name="cases_status_check"),
        CheckConstraint("priority IN ('critical', 'high', 'medium', 'low')", name="cases_priority_check"),
        Index("idx_cases_status", "status"),
        Index("idx_cases_lead_investigator", "lead_investigator_id"),
    )


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    evidence_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    case_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("cases.case_id", ondelete="RESTRICT"), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    ingested_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.user_id"), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    processing_status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    is_known_hash_match: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    perceptual_hash: Mapped[Optional[str]] = mapped_column(String(255))
    exif_metadata: Mapped[Optional[dict]] = mapped_column(JSONB)
    analysis_result: Mapped[Optional[dict]] = mapped_column(JSONB)
    content_description: Mapped[Optional[str]] = mapped_column(Text)
    severity_tier: Mapped[Optional[int]] = mapped_column(Integer)
    source_device: Mapped[Optional[str]] = mapped_column(String(255))
    source_platform: Mapped[Optional[str]] = mapped_column(String(255))

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="evidence_items")
    ingested_by_user: Mapped["User"] = relationship("User", back_populates="evidence_ingested")
    custody_log: Mapped[List["ChainOfCustodyLog"]] = relationship("ChainOfCustodyLog", back_populates="evidence")

    __table_args__ = (
        UniqueConstraint("case_id", "sha256_hash", name="uq_evidence_case_hash"),
        CheckConstraint("processing_status IN ('pending', 'processing', 'completed', 'failed')", name="evidence_processing_status_check"),
        Index("idx_evidence_case_id", "case_id"),
        Index("idx_evidence_sha256", "sha256_hash"),
        Index("idx_evidence_mime_type", "mime_type"),
        Index("idx_evidence_processing_status", "processing_status"),
    )


class ChainOfCustodyLog(Base):
    """
    Append-only table — no UPDATE/DELETE grants at DB role level.
    Every access to evidence creates an immutable log entry.
    """
    __tablename__ = "chain_of_custody_log"

    log_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    evidence_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("evidence_items.evidence_id"), nullable=False)
    actor_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.user_id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    action_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    prior_hash: Mapped[Optional[str]] = mapped_column(String(64))
    resulting_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    evidence: Mapped["EvidenceItem"] = relationship("EvidenceItem", back_populates="custody_log")

    __table_args__ = (
        Index("idx_custody_evidence_id", "evidence_id"),
        Index("idx_custody_action_ts", "action_ts"),
    )


class Lead(Base):
    """
    AI-generated investigative leads requiring mandatory human review.
    Status transitions from 'pending' only via authenticated investigator PATCH.
    """
    __tablename__ = "leads"

    lead_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    case_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False)
    generated_by_agent: Mapped[str] = mapped_column(String(100), nullable=False)
    risk_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    confidence_lower: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    confidence_upper: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    detailed_analysis: Mapped[Optional[str]] = mapped_column(Text)
    evidence_citation_ids: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    evidence_citations: Mapped[Optional[dict]] = mapped_column(JSONB)  # Full citation objects
    reviewed_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.user_id"))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    reviewer_annotation: Mapped[Optional[str]] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    priority_rank: Mapped[Optional[int]] = mapped_column(Integer)
    lead_type: Mapped[Optional[str]] = mapped_column(String(100))
    neo4j_node_ids: Mapped[Optional[list]] = mapped_column(JSONB)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="leads")
    reviewed_by_user: Mapped[Optional["User"]] = relationship("User", back_populates="leads_reviewed")

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'confirmed', 'rejected', 'under_review')", name="leads_status_check"),
        CheckConstraint("risk_score >= 0 AND risk_score <= 100", name="leads_risk_score_range"),
        Index("idx_leads_case_id", "case_id"),
        Index("idx_leads_status", "status"),
        Index("idx_leads_risk_score", "risk_score"),
        Index("idx_leads_generated_by_agent", "generated_by_agent"),
    )


class AnalysisRun(Base):
    """Tracks each time the agent pipeline is triggered for a case."""
    __tablename__ = "analysis_runs"

    run_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    case_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False)
    triggered_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.user_id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="running")
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(255))
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    leads_generated: Mapped[int] = mapped_column(Integer, default=0)
    agent_results: Mapped[Optional[dict]] = mapped_column(JSONB)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="analysis_runs")

    __table_args__ = (
        CheckConstraint("status IN ('running', 'completed', 'failed', 'cancelled')", name="analysis_runs_status_check"),
        Index("idx_analysis_runs_case_id", "case_id"),
        Index("idx_analysis_runs_status", "status"),
    )


class AuditLog(Base):
    """System-wide audit log for all user actions."""
    __tablename__ = "audit_log"

    log_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.user_id"))
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(255))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    request_id: Mapped[Optional[str]] = mapped_column(String(255))
    details: Mapped[Optional[dict]] = mapped_column(JSONB)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="info")

    __table_args__ = (
        Index("idx_audit_actor_id", "actor_id"),
        Index("idx_audit_timestamp", "timestamp"),
        Index("idx_audit_resource_type", "resource_type"),
        Index("idx_audit_action", "action"),
    )
