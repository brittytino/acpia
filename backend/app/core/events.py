"""
EventBus — asyncio WebSocket pub/sub.
Powers all real-time events in the Console.
"""
import json
from collections import defaultdict
from datetime import datetime, timezone
from fastapi import WebSocket


class EventBus:
    def __init__(self) -> None:
        self._subs: dict[str, set[WebSocket]] = defaultdict(set)

    async def subscribe(self, case_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._subs[case_id].add(ws)

    def unsubscribe(self, case_id: str, ws: WebSocket) -> None:
        self._subs[case_id].discard(ws)

    async def emit(self, case_id: str, event: str, payload: dict) -> None:
        msg = json.dumps({
            "event": event,
            "case_id": case_id,
            "at": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        })
        dead: set[WebSocket] = set()
        for ws in list(self._subs.get(case_id, set())):
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        self._subs[case_id] -= dead

    async def broadcast(self, event: str, payload: dict) -> None:
        """Emit to all connected clients (dashboard updates)."""
        msg = json.dumps({
            "event": event,
            "at": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        })
        for case_id, sockets in list(self._subs.items()):
            dead: set[WebSocket] = set()
            for ws in list(sockets):
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead.add(ws)
            self._subs[case_id] -= dead


# Singleton — imported by pipeline and stream endpoints
bus = EventBus()
