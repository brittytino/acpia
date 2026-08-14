"""
Minimal in-memory rate limiter for public/unauthenticated endpoints.

No Redis, no new dependency — consistent with this project's "asyncio
in-process, not twelve services" stance (see ACPIA_MASTER_SPECIFICATION §5.2).
Good enough to stop trivial brute-force/spam against a single-process
deployment; a multi-worker production deployment would need a shared store
(Redis) instead, since each worker keeps its own counters.
"""
import time
from collections import defaultdict

from fastapi import Request, HTTPException


class _FixedWindowLimiter:
    def __init__(self):
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        now = time.monotonic()
        bucket = self._hits[key]
        cutoff = now - window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.pop(0)
        if len(bucket) >= max_requests:
            raise HTTPException(429, "Too many requests. Please wait and try again.")
        bucket.append(now)


_limiter = _FixedWindowLimiter()


def rate_limit(max_requests: int, window_seconds: int):
    """Dependency factory: `Depends(rate_limit(5, 60))` allows 5 req/min per client IP+route."""

    async def _check(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{request.url.path}:{client_ip}"
        _limiter.check(key, max_requests, window_seconds)

    return _check
