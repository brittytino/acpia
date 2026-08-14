"""
ACPIA AI Agents — Base class and shared utilities.
All agents use this to call Ollama, write to Neo4j, and emit leads.
"""
import json
import re
import httpx
import structlog
from typing import Optional, Any
from datetime import datetime, timezone

logger = structlog.get_logger(__name__)

# Ollama base URL — read from env or default to hackathon port
import os
OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11535")
LLM_MODEL = os.environ.get("LLM_MODEL", "llama3.1:8b")
VISION_MODEL = os.environ.get("VISION_MODEL", "llava:7b")


def call_ollama_text(prompt: str, model: str = None, temperature: float = 0.1, timeout: int = 120) -> str:
    """
    Call Ollama with a text prompt. Returns the response string.
    Uses llama3.1:8b by default.
    """
    model = model or LLM_MODEL
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": 2048,
                },
            },
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json().get("response", "")
    except httpx.ConnectError:
        logger.warning("Ollama not reachable, using fallback response", url=OLLAMA_URL, model=model)
        return f'{{"error": "ollama_unavailable", "model": "{model}"}}'
    except Exception as e:
        logger.error("Ollama call failed", error=str(e), model=model)
        return f'{{"error": "{str(e)}"}}'


def call_ollama_vision(prompt: str, image_b64: str, model: str = None, timeout: int = 180) -> str:
    """
    Call Ollama with an image + prompt (LLaVA-style multimodal).
    image_b64: base64-encoded image bytes.
    """
    model = model or VISION_MODEL
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "images": [image_b64],
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 1024},
            },
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json().get("response", "")
    except httpx.ConnectError:
        logger.warning("Ollama vision not reachable", url=OLLAMA_URL, model=model)
        return '{"error": "ollama_unavailable"}'
    except Exception as e:
        logger.error("Ollama vision call failed", error=str(e))
        return f'{{"error": "{str(e)}"}}'


def get_embedding(text: str, model: str = "nomic-embed-text") -> list:
    """Get a text embedding vector from Ollama."""
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": model, "prompt": text},
            timeout=60,
        )
        response.raise_for_status()
        return response.json().get("embedding", [])
    except Exception as e:
        logger.warning("Embedding failed", error=str(e))
        return []


def extract_json_from_response(text: str) -> dict:
    """
    Robustly extract the first JSON object from a LLM response.
    LLMs often wrap JSON in markdown blocks or add explanation text.
    """
    if not text:
        return {}
    
    # Try to parse as-is first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Strip markdown code block fences
    text_clean = re.sub(r"```(?:json)?\s*", "", text)
    text_clean = re.sub(r"```\s*$", "", text_clean).strip()
    try:
        return json.loads(text_clean)
    except json.JSONDecodeError:
        pass

    # Find first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Give up
    logger.warning("Could not extract JSON from LLM response", preview=text[:200])
    return {}


def make_lead(
    agent_name: str,
    summary: str,
    risk_score: float,
    evidence_ids: list,
    detailed_analysis: str = "",
    lead_type: str = "general",
    confidence_lower: float = None,
    confidence_upper: float = None,
) -> dict:
    """Construct a standardized lead dict for saving to PostgreSQL."""
    confidence_lower = confidence_lower or max(0.0, risk_score - 15.0)
    confidence_upper = confidence_upper or min(100.0, risk_score + 10.0)
    return {
        "agent": agent_name,
        "summary": summary[:2000],
        "detailed_analysis": detailed_analysis[:5000],
        "risk_score": float(risk_score),
        "confidence_lower": float(confidence_lower),
        "confidence_upper": float(confidence_upper),
        "lead_type": lead_type,
        "evidence_citations": [
            {"evidence_id": eid} for eid in evidence_ids
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def write_to_neo4j(cypher: str, params: dict, neo4j_uri: str, neo4j_user: str, neo4j_password: str) -> bool:
    """Execute a Cypher write query on Neo4j."""
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        with driver.session() as session:
            session.run(cypher, **params)
        driver.close()
        return True
    except Exception as e:
        logger.warning("Neo4j write failed (non-fatal)", error=str(e), cypher=cypher[:100])
        return False
