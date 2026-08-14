"""
Pipeline orchestrator — asyncio, no Celery, no Redis.
Bounded semaphore(3) for GPU inference, sequential narrative + link phases.
All progress streamed over WebSocket via EventBus.
"""
import asyncio
import logging
import uuid
from functools import partial
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import bus
from app.agents.artifact import artifact_agent
from app.agents.narrative import narrative_agent
from app.agents.link import link_agent
from app.models.evidence import Evidence, CustodyLog
from app.models.conversation import Conversation, Message
from app.models.lead import Lead
from app.models.graph import Node, Edge
from app.core.custody import write_custody
from app.database import AsyncSessionLocal

log = logging.getLogger(__name__)


async def _get_unprocessed_evidence(db: AsyncSession, case_id: str) -> list:
    result = await db.execute(
        select(Evidence).where(
            Evidence.case_id == uuid.UUID(case_id),
            Evidence.processed == False,
            Evidence.integrity_ok == True,
        )
    )
    return result.scalars().all()


async def _get_conversations(db: AsyncSession, case_id: str) -> list:
    result = await db.execute(
        select(Conversation).where(Conversation.case_id == uuid.UUID(case_id))
    )
    return result.scalars().all()


async def _get_all_evidence(db: AsyncSession, case_id: str) -> list:
    result = await db.execute(
        select(Evidence).where(
            Evidence.case_id == uuid.UUID(case_id),
            Evidence.integrity_ok == True,
        )
    )
    return result.scalars().all()


async def _create_lead_from_edge(db: AsyncSession, edge: dict, case_id: str) -> Lead:
    """Create a lead from a proposed link. Status is always 'proposed' — human must confirm."""
    lead = Lead(
        case_id=uuid.UUID(case_id),
        kind="identity_link",
        summary=f"Potential link: {edge['src_label']} ⇄ {edge['dst_label']} "
                f"(confidence {edge['confidence']:.2f} ± {edge['confidence_ci']:.2f})",
        confidence=edge["confidence"],
        confidence_ci=edge["confidence_ci"],
        signals=edge["signals"],
        source_ids=[uuid.UUID(sid) for sid in edge["source_ids"]],
        status="proposed",  # ONLY humans can set confirmed
    )
    db.add(lead)
    await db.flush()
    return lead


async def _impact_summary(db: AsyncSession, case_id: str) -> dict:
    from sqlalchemy import func
    # Total processed
    total_result = await db.execute(
        select(func.count(Evidence.id)).where(
            Evidence.case_id == uuid.UUID(case_id),
            Evidence.processed == True,
        )
    )
    total = total_result.scalar() or 0

    # Human-viewed (revealed)
    viewed_result = await db.execute(
        select(func.sum(Evidence.revealed_count)).where(
            Evidence.case_id == uuid.UUID(case_id),
        )
    )
    viewed = viewed_result.scalar() or 0

    # Leads
    leads_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.case_id == uuid.UUID(case_id))
    )
    leads = leads_result.scalar() or 0

    avoided = total - viewed
    pct = round((avoided / total * 100) if total > 0 else 0, 1)

    return {
        "artifacts_processed": total,
        "artifacts_viewed": viewed,
        "exposure_avoided_pct": pct,
        "leads_pending": leads,
    }


async def run_pipeline(case_id: str) -> None:
    """
    Full pipeline for a case:
    1. Artifact Agent (parallel, semaphore=3)
    2. Narrative Agent (sequential per conversation)
    3. Link Agent (across all evidence)
    """
    log.info(f"Pipeline starting for case {case_id}")
    await bus.emit(case_id, "pipeline.started", {"case_id": case_id})

    async with AsyncSessionLocal() as db:
        # ── Phase 1: Artifact Agent ────────────────────────────────
        artifacts = await _get_unprocessed_evidence(db, case_id)
        await bus.emit(case_id, "pipeline.artifact_count", {"count": len(artifacts)})

        sem = asyncio.Semaphore(3)  # bounded — don't thrash the GPU

        async def process_one(ev):
            async with sem:
                try:
                    result = await artifact_agent(ev)
                    # Persist results
                    await db.execute(
                        update(Evidence).where(Evidence.id == ev.id).values(
                            exif=result.get("exif", {}),
                            description=result.get("description"),
                            ocr_text=result.get("ocr_preview"),
                            embedding=result.get("embedding"),
                            relevance=result.get("relevance"),
                            processed=True,
                        )
                    )
                    await db.commit()
                    await bus.emit(case_id, "artifact.processed", result)
                except Exception as e:
                    log.error(f"Artifact agent failed for {ev.id}: {e}")
                    await bus.emit(case_id, "artifact.error", {
                        "evidence_id": str(ev.id),
                        "error": str(e),
                    })

        await asyncio.gather(*(process_one(a) for a in artifacts))

        # ── Phase 2: Narrative Agent ───────────────────────────────
        conversations = await _get_conversations(db, case_id)
        for convo in conversations:
            try:
                # Find the source evidence file
                ev_result = await db.execute(
                    select(Evidence).where(Evidence.id == convo.evidence_id)
                )
                ev = ev_result.scalar_one_or_none()
                if not ev:
                    continue

                result = await narrative_agent(
                    conversation=convo,
                    storage_path=ev.storage_path,
                    emit=partial(bus.emit, case_id),
                )

                # Persist trajectory
                if result:
                    await db.execute(
                        update(Conversation).where(Conversation.id == convo.id).values(
                            trajectory=result.get("trajectory"),
                            drift_ratio=result.get("drift_ratio"),
                            message_count=result.get("message_count", 0),
                        )
                    )

                    # Persist messages
                    for msg in result.get("staged_messages", []):
                        m = Message(
                            conversation_id=convo.id,
                            idx=msg["idx"],
                            sender=msg["sender"],
                            sent_at=msg["sent_at"],
                            char_count=msg["char_count"],
                            stage=msg["stage"],
                            stage_conf=msg["stage_conf"],
                            evidence_span=msg["evidence_span"],
                        )
                        db.add(m)
                    await db.commit()

                    # Check for behavioural drift lead
                    if result.get("drift_ratio", 1.0) >= 1.8:
                        drift_lead = Lead(
                            case_id=uuid.UUID(case_id),
                            kind="behavioural_drift",
                            summary=f"Escalation rate doubled in final conversation window "
                                    f"(drift ×{result['drift_ratio']:.1f}) — {convo.participants}",
                            confidence=min(0.6 + (result["drift_ratio"] - 1.8) * 0.1, 0.85),
                            confidence_ci=0.12,
                            signals={"drift_ratio": result["drift_ratio"], "trajectory": result["trajectory"]},
                            source_ids=[convo.evidence_id],
                            status="proposed",  # HUMAN GATE — only humans set confirmed
                        )
                        db.add(drift_lead)
                        await db.commit()
                        await bus.emit(case_id, "lead.created", {
                            "lead_id": str(drift_lead.id),
                            "kind": "behavioural_drift",
                            "summary": drift_lead.summary,
                            "confidence": float(drift_lead.confidence),
                            "confidence_ci": float(drift_lead.confidence_ci),
                        })

            except Exception as e:
                log.error(f"Narrative agent failed for conversation {convo.id}: {e}")

        # ── Phase 3: Link Agent ────────────────────────────────────
        all_evidence = await _get_all_evidence(db, case_id)
        try:
            proposed_edges = await link_agent(
                case_id=case_id,
                evidence_list=all_evidence,
                emit=partial(bus.emit, case_id),
            )

            for edge in proposed_edges:
                lead = await _create_lead_from_edge(db, edge, case_id)
                await db.commit()
                await bus.emit(case_id, "lead.created", {
                    "lead_id": str(lead.id),
                    "kind": lead.kind,
                    "summary": lead.summary,
                    "confidence": float(lead.confidence),
                    "confidence_ci": float(lead.confidence_ci),
                    "signals": lead.signals,
                })

        except Exception as e:
            log.error(f"Link agent failed: {e}")

        # ── Complete ───────────────────────────────────────────────
        summary = await _impact_summary(db, case_id)
        await bus.emit(case_id, "pipeline.complete", summary)
        log.info(f"Pipeline complete for case {case_id}: {summary}")
