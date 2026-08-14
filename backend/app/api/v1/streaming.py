"""
WebSocket streaming endpoint for real-time AI pipeline progress.
Clients subscribe to /api/v1/cases/{case_id}/stream to receive
live updates as agents process evidence.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import json
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()

# In-memory connection registry: {case_id: set of WebSocket connections}
_connections: Dict[str, Set[WebSocket]] = {}


def get_connections_for_case(case_id: str) -> Set[WebSocket]:
    return _connections.get(case_id, set())


async def broadcast_to_case(case_id: str, message: dict):
    """Push a message to all subscribers watching a specific case."""
    connections = _connections.get(case_id, set())
    dead = set()
    for ws in connections:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    # Clean up dead connections
    for ws in dead:
        connections.discard(ws)


@router.websocket("/cases/{case_id}/stream")
async def case_stream(websocket: WebSocket, case_id: str):
    """
    WebSocket endpoint. Frontend connects here to get live progress updates.
    
    Message format (server → client):
    {
        "type": "agent_started" | "agent_completed" | "lead_generated" | "pipeline_done" | "ping",
        "agent": "multimedia_analyst" | ...,
        "progress": 0-100,
        "message": "Human readable status",
        "data": {}   # optional extra data
    }
    """
    await websocket.accept()
    logger.info("WebSocket connected", case_id=case_id)

    # Register this connection
    if case_id not in _connections:
        _connections[case_id] = set()
    _connections[case_id].add(websocket)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "case_id": case_id,
            "message": "Connected to ACPIA live stream",
        })

        # Keep alive: echo pings from client
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", case_id=case_id)
    except Exception as e:
        logger.warning("WebSocket error", case_id=case_id, error=str(e))
    finally:
        _connections.get(case_id, set()).discard(websocket)
