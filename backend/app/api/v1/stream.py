"""WebSocket stream — live pipeline events for the Console."""
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.events import bus
from app.models.case import Case
from app.pipeline import run_pipeline

router = APIRouter(tags=["Stream"])


@router.websocket("/cases/{case_id}/stream")
async def stream_case(case_id: str, websocket: WebSocket):
    """WebSocket endpoint — subscribe to all pipeline events for a case."""
    await bus.subscribe(case_id, websocket)
    try:
        while True:
            # Keep alive — ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        bus.unsubscribe(case_id, websocket)


@router.post("/cases/{case_id}/analyze")
async def start_pipeline(
    case_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start the analysis pipeline as a background asyncio task."""
    result = await db.execute(select(Case).where(Case.id == case_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Case not found")

    background_tasks.add_task(run_pipeline, str(case_id))
    return {"status": "pipeline_started", "case_id": str(case_id)}


@router.get("/cases/{case_id}/conversations")
async def get_conversations(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    from app.models.conversation import Conversation
    result = await db.execute(
        select(Conversation).where(Conversation.case_id == case_id)
    )
    convos = result.scalars().all()
    return [{
        "id": str(c.id),
        "platform": c.platform,
        "participants": c.participants,
        "message_count": c.message_count,
        "trajectory": float(c.trajectory) if c.trajectory else None,
        "drift_ratio": float(c.drift_ratio) if c.drift_ratio else None,
        "first_at": c.first_at.isoformat() if c.first_at else None,
        "last_at": c.last_at.isoformat() if c.last_at else None,
    } for c in convos]


@router.get("/conversations/{convo_id}/timeline")
async def get_escalation_timeline(
    convo_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Escalation Timeline data — the signature feature."""
    from app.models.conversation import Conversation, Message
    result = await db.execute(
        select(Conversation).where(Conversation.id == convo_id)
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(404, "Conversation not found")

    msgs_result = await db.execute(
        select(Message).where(Message.conversation_id == convo_id)
        .order_by(Message.idx)
    )
    messages = msgs_result.scalars().all()

    return {
        "conversation_id": str(convo_id),
        "participants": convo.participants,
        "message_count": convo.message_count or len(messages),
        "trajectory": float(convo.trajectory) if convo.trajectory else None,
        "drift_ratio": float(convo.drift_ratio) if convo.drift_ratio else None,
        "messages": [{
            "idx": m.idx,
            "sender": m.sender,
            "sent_at": m.sent_at.isoformat(),
            "stage": m.stage,
            "stage_conf": float(m.stage_conf) if m.stage_conf else None,
            "evidence_span": m.evidence_span,
        } for m in messages],
    }


@router.get("/cases/{case_id}/graph")
async def get_graph(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """Cytoscape-shaped nodes + edges for the knowledge graph."""
    from app.models.graph import Node, Edge
    from sqlalchemy import or_

    nodes_r = await db.execute(select(Node).where(Node.case_id == case_id))
    nodes = nodes_r.scalars().all()

    edges_r = await db.execute(select(Edge).where(Edge.case_id == case_id))
    edges = edges_r.scalars().all()

    return {
        "nodes": [{"data": {"id": str(n.id), "label": n.label, "kind": n.kind, **n.props}} for n in nodes],
        "edges": [{"data": {
            "id": str(e.id),
            "source": str(e.src_id),
            "target": str(e.dst_id),
            "kind": e.kind,
            "confidence": float(e.confidence),
            "confidence_ci": float(e.confidence_ci),
        }} for e in edges],
    }


@router.get("/cases/{case_id}/impact")
async def get_impact(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """Live Impact Ledger counters."""
    from sqlalchemy import func
    from app.models.evidence import Evidence
    from app.models.lead import Lead

    total = (await db.execute(
        select(func.count(Evidence.id)).where(Evidence.case_id == case_id)
    )).scalar() or 0

    processed = (await db.execute(
        select(func.count(Evidence.id)).where(Evidence.case_id == case_id, Evidence.processed == True)
    )).scalar() or 0

    viewed = (await db.execute(
        select(func.sum(Evidence.revealed_count)).where(Evidence.case_id == case_id)
    )).scalar() or 0

    leads_total = (await db.execute(
        select(func.count(Lead.id)).where(Lead.case_id == case_id)
    )).scalar() or 0

    leads_confirmed = (await db.execute(
        select(func.count(Lead.id)).where(Lead.case_id == case_id, Lead.status == "confirmed")
    )).scalar() or 0

    avoided = processed - viewed
    pct = round((avoided / processed * 100) if processed > 0 else 0, 1)

    return {
        "artifacts_total": total,
        "artifacts_processed": processed,
        "artifacts_viewed": viewed,
        "exposure_avoided_pct": pct,
        "leads_pending": leads_total - leads_confirmed,
        "leads_confirmed": leads_confirmed,
    }


@router.get("/cases/{case_id}/custody")
async def get_custody_log(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """Full custody log."""
    from app.models.evidence import CustodyLog
    result = await db.execute(
        select(CustodyLog).where(CustodyLog.case_id == case_id)
        .order_by(CustodyLog.at)
    )
    entries = result.scalars().all()
    return [{
        "id": e.id,
        "actor_id": str(e.actor_id) if e.actor_id else None,
        "action": e.action,
        "target_type": e.target_type,
        "target_id": str(e.target_id) if e.target_id else None,
        "detail": e.detail,
        "at": e.at.isoformat(),
    } for e in entries]
