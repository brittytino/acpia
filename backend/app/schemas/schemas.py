"""
Pydantic schemas for all API request/response types.
These mirror the SQLAlchemy models but are serialization-safe.
"""
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


# ─────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────

class CaseStatus(str, Enum):
    open = "open"
    under_review = "under_review"
    closed = "closed"
    archived = "archived"


class CasePriority(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class LeadStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    rejected = "rejected"
    under_review = "under_review"


class EvidenceProcessingStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class UserRole(str, Enum):
    investigator = "investigator"
    supervisor = "supervisor"
    admin = "admin"
    analyst = "analyst"


# ─────────────────────────────────────────────
# User Schemas
# ─────────────────────────────────────────────

class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: UserRole = UserRole.investigator
    badge_number: Optional[str] = None
    jurisdiction: Optional[str] = None


class UserCreate(UserBase):
    keycloak_id: str


class UserResponse(UserBase):
    user_id: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Case Schemas
# ─────────────────────────────────────────────

class CaseCreate(BaseModel):
    case_number: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    jurisdiction: str = Field(..., min_length=1)
    priority: CasePriority = CasePriority.medium
    tags: Optional[List[str]] = None


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    tags: Optional[List[str]] = None


class CaseResponse(BaseModel):
    case_id: str
    case_number: str
    title: str
    description: Optional[str] = None
    opened_at: datetime
    closed_at: Optional[datetime] = None
    status: CaseStatus
    priority: CasePriority
    lead_investigator_id: Optional[str] = None
    jurisdiction: str
    tags: Optional[List[str]] = None
    evidence_count: int = 0
    lead_count: int = 0
    pending_leads: int = 0

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    cases: List[CaseResponse]
    total: int
    page: int
    page_size: int


# ─────────────────────────────────────────────
# Evidence Schemas
# ─────────────────────────────────────────────

class EvidenceResponse(BaseModel):
    evidence_id: str
    case_id: str
    sha256_hash: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    ingested_at: datetime
    ingested_by: str
    storage_path: str
    processing_status: EvidenceProcessingStatus
    is_known_hash_match: bool
    exif_metadata: Optional[Dict[str, Any]] = None
    content_description: Optional[str] = None
    severity_tier: Optional[int] = None
    source_device: Optional[str] = None
    source_platform: Optional[str] = None

    model_config = {"from_attributes": True}


class EvidenceCitation(BaseModel):
    evidence_id: str
    original_filename: str
    sha256_hash: str
    excerpt_ref: Optional[str] = None
    excerpt_text: Optional[str] = None
    timestamp_ref: Optional[str] = None
    mime_type: str
    confidence: float = Field(ge=0.0, le=1.0)


# ─────────────────────────────────────────────
# Chain of Custody Schemas
# ─────────────────────────────────────────────

class CustodyLogEntry(BaseModel):
    log_id: int
    evidence_id: str
    actor_id: str
    action: str
    action_ts: datetime
    prior_hash: Optional[str] = None
    resulting_hash: str
    ip_address: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class CustodyLogResponse(BaseModel):
    evidence_id: str
    original_filename: str
    sha256_hash: str
    entries: List[CustodyLogEntry]
    hash_integrity_verified: bool
    total_entries: int


# ─────────────────────────────────────────────
# Lead Schemas
# ─────────────────────────────────────────────

class LeadResponse(BaseModel):
    lead_id: str
    case_id: str
    generated_by_agent: str
    risk_score: float
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None
    status: LeadStatus
    summary: str
    detailed_analysis: Optional[str] = None
    evidence_citations: Optional[List[EvidenceCitation]] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewer_annotation: Optional[str] = None
    generated_at: datetime
    priority_rank: Optional[int] = None
    lead_type: Optional[str] = None

    model_config = {"from_attributes": True}


class LeadReview(BaseModel):
    """Investigator confirm/reject/annotate a lead."""
    status: LeadStatus = Field(..., description="Must be 'confirmed' or 'rejected'")
    annotation: Optional[str] = Field(None, max_length=5000)

    @field_validator("status")
    @classmethod
    def status_must_be_decision(cls, v):
        if v not in (LeadStatus.confirmed, LeadStatus.rejected, LeadStatus.under_review):
            raise ValueError("Status must be 'confirmed', 'rejected', or 'under_review'")
        return v


class LeadListResponse(BaseModel):
    leads: List[LeadResponse]
    total: int
    pending: int
    confirmed: int
    rejected: int


# ─────────────────────────────────────────────
# Analysis Pipeline Schemas
# ─────────────────────────────────────────────

class AnalysisTriggerResponse(BaseModel):
    run_id: str
    case_id: str
    status: str
    celery_task_id: Optional[str] = None
    message: str


class PipelineStatus(BaseModel):
    run_id: str
    case_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    evidence_count: int
    leads_generated: int
    agent_results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    progress_pct: float = 0.0

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Knowledge Graph Schemas
# ─────────────────────────────────────────────

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # Person, Device, Platform, Location, FileEvidence
    properties: Dict[str, Any]
    risk_score: Optional[float] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship_type: str
    properties: Dict[str, Any]
    confidence: float
    timestamp: Optional[datetime] = None


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int
    total_edges: int
    case_id: str


# ─────────────────────────────────────────────
# Health & Metrics Schemas
# ─────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    services: Dict[str, bool]
    timestamp: datetime


class SystemMetrics(BaseModel):
    total_cases: int
    open_cases: int
    total_evidence: int
    total_leads: int
    pending_leads: int
    confirmed_leads: int
    rejected_leads: int
    precision_ratio: float
    avg_analysis_time_seconds: float
    active_pipeline_runs: int
