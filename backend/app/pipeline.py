"""VERITAS pipeline orchestrator — runs all five agents against real DB
state for one case, emitting every step over the WebSocket as it happens.
`Semaphore(3)` bounds concurrent OpenRouter/Gemini calls so a burst of
uploads doesn't trip the free-tier rate limits on those APIs.
"""
import asyncio
import logging
from functools import partial

from sqlalchemy import select

from app.core.events import bus
from app.database import AsyncSessionLocal
from app.models.evidence import Evidence
from app.models.conversation import Conversation
from app.models.graph import Node
from app.agents.artifact import artifact_agent as run_artifact_agent
from app.agents.authenticity import assess_authenticity
from app.agents.narrative import narrative_agent
from app.agents.link import IdentityBuilder, compute_edges, lead_from_edge
from app.agents.contradiction import find_contradictions

log = logging.getLogger(__name__)


async def run_pipeline(case_id: str) -> None:
    await bus.emit(case_id, "pipeline.started", {})
    emit = partial(bus.emit, case_id)

    async with AsyncSessionLocal() as db:
        # ── Artifact + Authenticity Agents ──────────────────────────────
        unprocessed = (await db.execute(
            select(Evidence).where(Evidence.case_id == case_id, Evidence.processed == False)  # noqa: E712
        )).scalars().all()

        sem = asyncio.Semaphore(3)

        async def process_one(ev: Evidence):
            async with sem:
                try:
                    result = await run_artifact_agent(ev)
                except Exception as e:
                    log.warning(f"artifact_agent failed for {ev.id}: {e}")
                    result = {"exif": {}, "description": "", "ocr_preview": None,
                             "embedding": None, "relevance": 0.3}

                ev.exif = result.get("exif") or {}
                ev.description = result.get("description") or None
                ev.ocr_text = result.get("ocr_preview") or None
                if result.get("embedding"):
                    ev.embedding = result["embedding"]
                ev.relevance = result.get("relevance")
                ev.authenticity_indicators = assess_authenticity(ev)
                ev.processed = True

                await emit("artifact.processed", {
                    "evidence_id": str(ev.id), "filename": ev.filename,
                    "relevance": ev.relevance, "description": ev.description,
                })
                if ev.authenticity_indicators:
                    await emit("authenticity.assessed", {
                        "evidence_id": str(ev.id),
                        "indicator_count": len(ev.authenticity_indicators),
                        "indicators": ev.authenticity_indicators,
                    })

        if unprocessed:
            await asyncio.gather(*(process_one(ev) for ev in unprocessed))
            await db.commit()

        # ── Narrative Agent (+ identity accumulation for Link Agent) ────
        convos = (await db.execute(
            select(Conversation).where(Conversation.case_id == case_id)
        )).scalars().all()

        identity_builder = IdentityBuilder()
        for convo in convos:
            ev = (await db.execute(select(Evidence).where(Evidence.id == convo.evidence_id))).scalar_one_or_none()
            if not ev or not ev.storage_path:
                continue
            device_tag = str(ev.acquisition_id) if ev.acquisition_id else None
            await narrative_agent(convo, emit, ev.storage_path, db, identity_builder, device_tag)
        if convos:
            await db.commit()

        # ── Link Agent ───────────────────────────────────────────────────
        identities = identity_builder.build()
        if len(identities) >= 2:
            existing_nodes = (await db.execute(
                select(Node).where(Node.case_id == case_id, Node.kind == "person")
            )).scalars().all()
            node_id_by_label = {n.label: n.id for n in existing_nodes}

            for identity in identities:
                if identity.label not in node_id_by_label:
                    node = Node(case_id=case_id, kind="person", label=identity.label,
                               props={"message_count": len(identity.messages)})
                    db.add(node)
                    await db.flush()
                    node_id_by_label[identity.label] = node.id

            edges = compute_edges(case_id, identities, node_id_by_label)
            for edge in edges:
                db.add(edge)
                await db.flush()
                await emit("link.proposed", {
                    "source": str(edge.src_id), "target": str(edge.dst_id),
                    "confidence": float(edge.confidence), "confidence_ci": float(edge.confidence_ci),
                })
                lead = await lead_from_edge(edge)
                db.add(lead)
                await emit("lead.created", {"kind": lead.kind, "summary": lead.summary})
            if edges:
                await db.commit()

        # ── Contradiction Agent (FAIR cases with both submissions) ───────
        contradictions = await find_contradictions(db, case_id)
        for c in contradictions:
            db.add(c)
            await emit("contradiction.found", {
                "kind": c.kind, "summary": c.summary, "severity": c.severity,
                "confidence": float(c.confidence),
            })
        if contradictions:
            await db.commit()

        # ── Impact Ledger ────────────────────────────────────────────────
        summary = await _impact_summary(db, case_id)

    await emit("pipeline.complete", summary)


async def _impact_summary(db, case_id: str) -> dict:
    from sqlalchemy import func
    from app.models.lead import Lead

    processed = (await db.execute(
        select(func.count(Evidence.id)).where(Evidence.case_id == case_id, Evidence.processed == True)  # noqa: E712
    )).scalar() or 0
    revealed = (await db.execute(
        select(func.count(Evidence.id)).where(Evidence.case_id == case_id, Evidence.revealed_count > 0)
    )).scalar() or 0
    leads = (await db.execute(
        select(Lead.status, func.count(Lead.id)).where(Lead.case_id == case_id).group_by(Lead.status)
    )).all()

    avoided = round((1 - revealed / processed) * 100, 1) if processed else 0.0
    return {
        "artifacts_processed": processed,
        "surfaced_for_review": revealed,
        "exposure_avoided_pct": avoided,
        "leads": {status: count for status, count in leads},
        "note": "Measured this session. Not a benchmark.",
    }
