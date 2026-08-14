import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from fastapi import WebSocket

class EventBus:
    def __init__(self):
        self._subs: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, case_id: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._subs[case_id].add(ws)

    async def unsubscribe(self, case_id: str, ws: WebSocket):
        async with self._lock:
            self._subs[case_id].discard(ws)

    async def emit(self, case_id: str, event: str, payload: dict):
        msg = json.dumps({"event": event, "case_id": case_id,
                          "at": datetime.now(timezone.utc).isoformat(),
                          "payload": payload}, default=str)
        async with self._lock:
            targets = list(self._subs[case_id])
        dead = []
        for ws in targets:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._subs[case_id].discard(ws)

bus = EventBus()
