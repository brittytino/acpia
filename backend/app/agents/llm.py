import httpx
import json
from app.config import settings

_client = httpx.AsyncClient(base_url=settings.ollama_url, timeout=120)

async def warm() -> None:
    for m in (settings.model_vision, settings.model_text, settings.model_embed):
        await _client.post("/api/generate",
            json={"model": m, "prompt": "ready", "stream": False, "keep_alive": -1})

async def chat_json(model: str, system: str, user: str, schema: dict,
                    temperature: float = 0.1) -> dict:
    r = await _client.post("/api/chat", json={
        "model": model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "format": schema, 
        "options": {"temperature": temperature}, 
        "stream": False,
    })
    r.raise_for_status()
    return json.loads(r.json()["message"]["content"])

async def embed(text: str) -> list[float]:
    r = await _client.post("/api/embeddings",
        json={"model": settings.model_embed, "prompt": text[:8000]})
    r.raise_for_status()
    return r.json()["embedding"]
