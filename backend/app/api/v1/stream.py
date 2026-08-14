"""WebSocket stream — live pipeline events for the Console."""
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.events import bus
from app.core.security import get_current_user
from app.models.case import Case
from app.models.user import User
from app.pipeline import run_pipeline

router = APIRouter(tags=["Stream"])


@router.websocket("/cases/{case_id}/stream")
async def stream_case(case_id: str, websocket: WebSocket):
    """WebSocket endpoint — subscribe to all pipeline events for a case."""
    await bus.subscribe(case_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await bus.unsubscribe(case_id, websocket)


@router.post("/cases/{case_id}/analyze")
async def start_pipeline(
    case_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
        "trajectory": float(c.trajectory) if c.trajectory is not None else None,
        "drift_ratio": float(c.drift_ratio) if c.drift_ratio is not None else None,
        "first_at": c.first_at.isoformat() if c.first_at else None,
        "last_at": c.last_at.isoformat() if c.last_at else None,
        "code_switch_delta": float(c.code_switch_delta) if c.code_switch_delta is not None else None,
        "code_switch_direction": c.code_switch_direction,
    } for c in convos]


@router.get("/conversations/{convo_id}/timeline")
async def get_escalation_timeline(
    convo_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Escalation Timeline data — the signature feature. Includes the
    Tanglish language band (VERITAS §3.8): per-window Tamil share and the
    code-switch drift callout, alongside the behavioural stage trajectory."""
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
        "trajectory": float(convo.trajectory) if convo.trajectory is not None else None,
        "drift_ratio": float(convo.drift_ratio) if convo.drift_ratio is not None else None,
        "code_switch": {
            "slope": float(convo.code_switch_slope) if convo.code_switch_slope is not None else None,
            "delta": float(convo.code_switch_delta) if convo.code_switch_delta is not None else None,
            "direction": convo.code_switch_direction,
            "windows": (convo.language_profile or {}).get("windows", []),
            "confidence": (convo.language_profile or {}).get("confidence"),
        },
        "messages": [{
            "idx": m.idx,
            "sender": m.sender,
            "sent_at": m.sent_at.isoformat(),
            "stage": m.stage,
            "stage_conf": float(m.stage_conf) if m.stage_conf is not None else None,
            "evidence_span": m.evidence_span,
            "language": m.language,
            "tamil_share": float(m.tamil_share) if m.tamil_share is not None else None,
        } for m in messages],
    }


@router.get("/cases/{case_id}/graph")
async def get_graph(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cytoscape-shaped nodes + edges for the knowledge graph."""
    from app.models.graph import Node, Edge

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
async def get_impact(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Live Impact Ledger counters."""
    from sqlalchemy import func
    from app.models.evidence import Evidence
    from app.models.lead import Lead

    total = (await db.execute(
        select(func.count(Evidence.id)).where(Evidence.case_id == case_id)
    )).scalar() or 0

    processed = (await db.execute(
        select(func.count(Evidence.id)).where(Evidence.case_id == case_id, Evidence.processed == True)  # noqa: E712
    )).scalar() or 0

    viewed = (await db.execute(
        select(func.count(Evidence.id)).where(Evidence.case_id == case_id, Evidence.revealed_count > 0)
    )).scalar() or 0

    leads_total = (await db.execute(
        select(func.count(Lead.id)).where(Lead.case_id == case_id)
    )).scalar() or 0

    leads_confirmed = (await db.execute(
        select(func.count(Lead.id)).where(Lead.case_id == case_id, Lead.status == "confirmed")
    )).scalar() or 0

    avoided_pct = round((1 - viewed / processed) * 100, 1) if processed > 0 else 0.0

    return {
        "artifacts_total": total,
        "artifacts_processed": processed,
        "artifacts_viewed": viewed,
        "exposure_avoided_pct": avoided_pct,
        "leads_pending": leads_total - leads_confirmed,
        "leads_confirmed": leads_confirmed,
        "note": "Measured this session. Not a benchmark.",
    }


@router.get("/cases/{case_id}/custody")
async def get_custody_log(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full custody log, in chain order — what the Auditor view re-verifies."""
    from app.models.evidence import CustodyLog
    result = await db.execute(
        select(CustodyLog).where(CustodyLog.case_id == case_id)
        .order_by(CustodyLog.id)
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
        "prev_hash": e.prev_hash,
        "entry_hash": e.entry_hash,
    } for e in entries]
