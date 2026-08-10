"""
WebSocket endpoint for real-time pipeline progress streaming.
Clients subscribe to a case's pipeline stream and get JSON updates.
"""
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.database import get_redis
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Streaming"])

# Active WebSocket connections: case_id -> list of websockets
_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/cases/{case_id}/stream")
async def pipeline_stream(
    websocket: WebSocket,
    case_id: str,
    token: str = Query(...),
):
    """
    WebSocket endpoint for real-time agent pipeline progress.
    Client sends: { "type": "ping" }
    Server sends: { "type": "agent_update", "agent": "...", "status": "...", "progress": 0-100 }
    """
    await websocket.accept()

    if case_id not in _connections:
        _connections[case_id] = []
    _connections[case_id].append(websocket)

    logger.info("WebSocket client connected", case_id=case_id)

    # Subscribe to Redis pub/sub for this case
    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"acpia:pipeline:{case_id}")

    try:
        await websocket.send_json({
            "type": "connected",
            "case_id": case_id,
            "message": "Connected to ACPIA pipeline stream",
        })

        async def redis_listener():
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await websocket.send_json(data)
                    except Exception as e:
                        logger.error("Error sending WebSocket message", error=str(e))
                        break

        async def ws_listener():
            while True:
                try:
                    msg = await websocket.receive_json()
                    if msg.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except WebSocketDisconnect:
                    break

        # Run both listeners concurrently
        await asyncio.gather(redis_listener(), ws_listener())

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected", case_id=case_id)
    finally:
        await pubsub.unsubscribe(f"acpia:pipeline:{case_id}")
        await pubsub.aclose()
        if case_id in _connections:
            _connections[case_id].remove(websocket)


async def broadcast_pipeline_update(case_id: str, update: dict):
    """
    Broadcast a pipeline update to all WebSocket clients for a case.
    Called from Celery workers via Redis pub/sub.
    """
    redis = await get_redis()
    await redis.publish(
        f"acpia:pipeline:{case_id}",
        json.dumps(update),
    )
