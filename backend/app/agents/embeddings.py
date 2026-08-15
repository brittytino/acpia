"""
Embeddings — Google Gemini `gemini-embedding-001`, free tier.

OpenRouter has no embeddings endpoint (chat-completions only), so this is a
separate provider from openrouter.py. Failure is non-fatal everywhere this
is called: the link agent just skips embedding-based similarity for an item
with no vector rather than failing the pipeline.

`text-embedding-004` (the previous model here) has been retired by Google —
calls to it now 404. `gemini-embedding-001` is the current stable
replacement; it defaults to 3072-dim output, so `outputDimensionality` is
pinned to 768 to match the `Vector(768)` columns in
app/models/evidence.py and app/models/graph.py.
"""
import logging

import httpx

from app.config import settings

log = logging.getLogger(__name__)

_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-embedding-001:embedContent"
)
_OUTPUT_DIMENSIONALITY = 768


async def embed(text: str) -> list[float] | None:
    text = (text or "").strip()
    if not text:
        return None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                _API_URL,
                params={"key": settings.GEMINI_API_KEY},
                json={
                    "model": "models/gemini-embedding-001",
                    "content": {"parts": [{"text": text[:8000]}]},
                    "outputDimensionality": _OUTPUT_DIMENSIONALITY,
                },
            )
            r.raise_for_status()
            return r.json()["embedding"]["values"]
    except Exception as e:
        log.warning(f"gemini embed failed: {e}")
        return None
