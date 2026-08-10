"""
LangGraph Multi-Agent Orchestrator — ACPIA Layer 3
Dispatches 8 specialist agents in parallel to analyze case evidence.
Each agent writes findings to Neo4j and returns scored leads.
"""
import asyncio
import json
import os
import structlog
from datetime import datetime, timezone
from typing import TypedDict, Annotated, Any, Callable, Optional
from langgraph.graph import StateGraph, END
from langgraph.graph.graph import CompiledGraph
import operator

from agents.multimedia_analyst import MultimediaAnalystAgent
from agents.conversation_intel import ConversationIntelAgent
from agents.identity_resolution import IdentityResolutionAgent
from agents.timeline_reconstruction import TimelineReconstructionAgent
from agents.geospatial_intel import GeospatialIntelAgent
from agents.network_relations import NetworkRelationsAgent
from agents.document_metadata import DocumentMetadataAgent
from agents.case_synthesis import CaseSynthesisAgent

logger = structlog.get_logger(__name__)


class PipelineState(TypedDict):
    """Shared state passed through the LangGraph pipeline."""
    case_id: str
    run_id: str
    user_id: str

    # Evidence organized by type
    multimedia_evidence: list  # images, video, audio
    text_evidence: list        # chats, emails, logs
    document_evidence: list    # PDFs, archives

    # Agent outputs (accumulated with operator.add)
    agent_results: Annotated[list, operator.add]

    # Generated leads
    leads: Annotated[list, operator.add]

    # Graph nodes/edges written by agents
    graph_entities: Annotated[list, operator.add]

    # Progress tracking
    progress: dict
    errors: Annotated[list, operator.add]

    # Final synthesis output
    synthesis: Optional[dict]


async def load_evidence(state: PipelineState) -> PipelineState:
    """Load evidence items from database and categorize by type."""
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker
    import sys
    sys.path.insert(0, "/app")
    from app.models.models import EvidenceItem
    from app.config import settings
    from minio import Minio

    engine = create_engine(settings.DATABASE_URL_SYNC)
    Session = sessionmaker(bind=engine)

    minio = Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )

    multimedia = []
    text = []
    documents = []

    with Session() as db:
        items = db.execute(
            select(EvidenceItem).where(
                EvidenceItem.case_id == state["case_id"],
                EvidenceItem.processing_status == "pending",
            )
        ).scalars().all()

        for item in items:
            # Retrieve from MinIO
            try:
                response = minio.get_object(settings.MINIO_BUCKET, item.storage_path)
                file_bytes = response.read()

                evidence_dict = {
                    "evidence_id": item.evidence_id,
                    "filename": item.original_filename,
                    "mime_type": item.mime_type,
                    "sha256_hash": item.sha256_hash,
                    "file_bytes": file_bytes,
                    "ingested_at": item.ingested_at.isoformat(),
                }

                if item.mime_type.startswith(("image/", "video/", "audio/")):
                    multimedia.append(evidence_dict)
                elif item.mime_type in ("text/plain", "application/json") or "chat" in item.original_filename.lower():
                    text.append(evidence_dict)
                else:
                    documents.append(evidence_dict)

                # Mark as processing
                item.processing_status = "processing"

            except Exception as e:
                logger.error("Failed to load evidence", evidence_id=item.evidence_id, error=str(e))

        db.commit()

    logger.info(
        "Evidence loaded",
        case_id=state["case_id"],
        multimedia=len(multimedia),
        text=len(text),
        documents=len(documents),
    )

    return {
        **state,
        "multimedia_evidence": multimedia,
        "text_evidence": text,
        "document_evidence": documents,
    }


def create_pipeline() -> CompiledGraph:
    """Build the LangGraph multi-agent pipeline."""
    graph = StateGraph(PipelineState)

    # Node: Load evidence
    graph.add_node("load_evidence", load_evidence)

    # Nodes: 7 parallel specialist agents (Agent 1-7)
    # These run in parallel after evidence loading
    graph.add_node("multimedia_analyst", MultimediaAnalystAgent().run)
    graph.add_node("conversation_intel", ConversationIntelAgent().run)
    graph.add_node("identity_resolution", IdentityResolutionAgent().run)
    graph.add_node("timeline_reconstruction", TimelineReconstructionAgent().run)
    graph.add_node("geospatial_intel", GeospatialIntelAgent().run)
    graph.add_node("network_relations", NetworkRelationsAgent().run)
    graph.add_node("document_metadata", DocumentMetadataAgent().run)

    # Node: Case synthesis (Agent 8) — runs AFTER all specialist agents
    graph.add_node("case_synthesis", CaseSynthesisAgent().run)

    # Edge: start -> load_evidence
    graph.set_entry_point("load_evidence")

    # Edges: load_evidence -> all 7 specialist agents (parallel fan-out)
    parallel_agents = [
        "multimedia_analyst",
        "conversation_intel",
        "identity_resolution",
        "timeline_reconstruction",
        "geospatial_intel",
        "network_relations",
        "document_metadata",
    ]
    for agent_name in parallel_agents:
        graph.add_edge("load_evidence", agent_name)

    # Edges: all agents -> case_synthesis (fan-in)
    for agent_name in parallel_agents:
        graph.add_edge(agent_name, "case_synthesis")

    # Edge: case_synthesis -> END
    graph.add_edge("case_synthesis", END)

    return graph.compile()


async def run_pipeline(
    case_id: str,
    run_id: str,
    user_id: str,
    progress_callback: Optional[Callable] = None,
) -> dict:
    """
    Run the full multi-agent analysis pipeline for a case.
    Returns summary of leads generated and agent results.
    """
    logger.info("Starting LangGraph pipeline", case_id=case_id, run_id=run_id)

    if progress_callback:
        progress_callback({
            "type": "agent_update",
            "agent": "orchestrator",
            "status": "loading_evidence",
            "progress": 5,
            "message": "Loading and categorizing evidence...",
        })

    pipeline = create_pipeline()

    initial_state = PipelineState(
        case_id=case_id,
        run_id=run_id,
        user_id=user_id,
        multimedia_evidence=[],
        text_evidence=[],
        document_evidence=[],
        agent_results=[],
        leads=[],
        graph_entities=[],
        progress={},
        errors=[],
        synthesis=None,
    )

    # Run with progress callbacks injected
    final_state = await pipeline.ainvoke(
        initial_state,
        config={
            "configurable": {
                "progress_callback": progress_callback,
                "run_id": run_id,
            }
        },
    )

    # Save all leads to PostgreSQL
    leads_saved = await _save_leads(final_state.get("leads", []), case_id, run_id)

    # Mark evidence as completed
    await _mark_evidence_complete(case_id)

    if progress_callback:
        progress_callback({
            "type": "agent_update",
            "agent": "orchestrator",
            "status": "complete",
            "progress": 100,
            "message": f"Analysis complete. {leads_saved} leads generated.",
        })

    return {
        "leads_generated": leads_saved,
        "agent_summary": {
            result.get("agent"): {
                "status": result.get("status"),
                "findings": result.get("findings_count", 0),
            }
            for result in final_state.get("agent_results", [])
        },
        "errors": final_state.get("errors", []),
        "synthesis": final_state.get("synthesis"),
    }


async def _save_leads(leads: list, case_id: str, run_id: str) -> int:
    """Save generated leads to PostgreSQL."""
    if not leads:
        return 0

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import sys
    sys.path.insert(0, "/app")
    from app.models.models import Lead
    from app.config import settings

    engine = create_engine(settings.DATABASE_URL_SYNC)
    Session = sessionmaker(bind=engine)

    saved = 0
    with Session() as db:
        for i, lead_data in enumerate(leads):
            try:
                lead = Lead(
                    case_id=case_id,
                    generated_by_agent=lead_data.get("agent", "unknown"),
                    risk_score=min(100.0, max(0.0, float(lead_data.get("risk_score", 0)))),
                    confidence_lower=lead_data.get("confidence_lower"),
                    confidence_upper=lead_data.get("confidence_upper"),
                    status="pending",
                    summary=lead_data.get("summary", "")[:2000],
                    detailed_analysis=lead_data.get("detailed_analysis"),
                    evidence_citations=lead_data.get("evidence_citations", []),
                    evidence_citation_ids=[
                        c.get("evidence_id") for c in lead_data.get("evidence_citations", [])
                        if c.get("evidence_id")
                    ],
                    priority_rank=i + 1,
                    lead_type=lead_data.get("lead_type"),
                    neo4j_node_ids=lead_data.get("neo4j_node_ids"),
                )
                db.add(lead)
                saved += 1
            except Exception as e:
                logger.error("Failed to save lead", error=str(e))

        db.commit()

    return saved


async def _mark_evidence_complete(case_id: str):
    """Mark all evidence items as completed after analysis."""
    from sqlalchemy import create_engine, update
    from sqlalchemy.orm import sessionmaker
    import sys
    sys.path.insert(0, "/app")
    from app.models.models import EvidenceItem
    from app.config import settings

    engine = create_engine(settings.DATABASE_URL_SYNC)
    Session = sessionmaker(bind=engine)

    with Session() as db:
        db.execute(
            update(EvidenceItem)
            .where(
                EvidenceItem.case_id == case_id,
                EvidenceItem.processing_status == "processing",
            )
            .values(processing_status="completed")
        )
        db.commit()
