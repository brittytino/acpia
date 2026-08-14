"""
Artifact Agent — per-file processing.
EXIF/GPS extraction, OCR, moondream description, nomic-embed-text embeddings, relevance scoring.
Emits artifact.processed event.
"""
import hashlib
import io
import json
import logging
from pathlib import Path
from typing import Optional
import httpx
from PIL import Image
import piexif

from app.config import settings

log = logging.getLogger(__name__)

OLLAMA_BASE = settings.OLLAMA_BASE_URL
VISION_MODEL = settings.VISION_MODEL
EMBED_MODEL = settings.EMBED_MODEL


async def _moondream_describe(image_path: str) -> str:
    """Get moondream description of an image — never reproduces content, just describes."""
    import base64
    try:
        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        async with httpx.AsyncClient(base_url=OLLAMA_BASE, timeout=60) as c:
            resp = await c.post("/api/generate", json={
                "model": VISION_MODEL,
                "prompt": "Describe what is in this image in one sentence. Focus on objects, setting, and any visible text. Do not reproduce or describe any illegal content.",
                "images": [img_b64],
                "stream": False,
                "keep_alive": -1,
            })
            return resp.json().get("response", "")[:500]
    except Exception as e:
        log.warning(f"moondream failed: {e}")
        return ""


async def _embed(text: str) -> Optional[list]:
    """Embed text with nomic-embed-text."""
    if not text.strip():
        return None
    try:
        async with httpx.AsyncClient(base_url=OLLAMA_BASE, timeout=30) as c:
            resp = await c.post("/api/embeddings", json={
                "model": EMBED_MODEL,
                "prompt": text[:2000],
                "keep_alive": -1,
            })
            return resp.json().get("embedding")
    except Exception as e:
        log.warning(f"embed failed: {e}")
        return None


def _extract_exif(path: str) -> dict:
    """Extract EXIF/GPS metadata from image."""
    try:
        exif_data = piexif.load(path)
        result = {}
        if "GPS" in exif_data and exif_data["GPS"]:
            gps = exif_data["GPS"]
            def to_deg(val):
                d, m, s = val
                return d[0]/d[1] + (m[0]/m[1])/60 + (s[0]/s[1])/3600
            if piexif.GPSIFD.GPSLatitude in gps and piexif.GPSIFD.GPSLongitude in gps:
                lat = to_deg(gps[piexif.GPSIFD.GPSLatitude])
                lon = to_deg(gps[piexif.GPSIFD.GPSLongitude])
                if gps.get(piexif.GPSIFD.GPSLatitudeRef) == b"S":
                    lat = -lat
                if gps.get(piexif.GPSIFD.GPSLongitudeRef) == b"W":
                    lon = -lon
                result["gps_lat"] = round(lat, 6)
                result["gps_lon"] = round(lon, 6)
        if "0th" in exif_data:
            raw = exif_data["0th"]
            if piexif.ImageIFD.Make in raw:
                result["make"] = raw[piexif.ImageIFD.Make].decode("utf-8", errors="ignore")
            if piexif.ImageIFD.Model in raw:
                result["model"] = raw[piexif.ImageIFD.Model].decode("utf-8", errors="ignore")
            if piexif.ImageIFD.DateTime in raw:
                result["datetime"] = raw[piexif.ImageIFD.DateTime].decode("utf-8", errors="ignore")
        return result
    except Exception:
        return {}


def _ocr_text(path: str, mime_type: str) -> str:
    """Extract text — from image via pytesseract, or read plaintext files."""
    try:
        if mime_type.startswith("text/"):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()[:10000]
        if mime_type.startswith("image/"):
            try:
                import pytesseract
                img = Image.open(path)
                return pytesseract.image_to_string(img)[:5000]
            except ImportError:
                pass
    except Exception as e:
        log.warning(f"ocr failed: {e}")
    return ""


def _relevance_score(description: str, ocr: str, exif: dict) -> float:
    """Heuristic relevance score 0–1. Boosted by GPS, text content, description length."""
    score = 0.3
    if exif.get("gps_lat"):
        score += 0.2
    if len(ocr) > 100:
        score += 0.2
    if len(description) > 50:
        score += 0.15
    concerning_terms = ["meet", "secret", "delete", "don't tell", "just us"]
    if any(t in ocr.lower() for t in concerning_terms):
        score += 0.15
    return round(min(score, 0.99), 3)


async def artifact_agent(evidence_record) -> dict:
    """
    Process one evidence record. Returns a dict for the artifact.processed event.
    evidence_record: SQLAlchemy Evidence ORM object
    """
    path = evidence_record.storage_path
    mime = evidence_record.mime_type

    exif = _extract_exif(path) if mime.startswith("image/") else {}
    ocr = _ocr_text(path, mime)
    description = await _moondream_describe(path) if mime.startswith("image/") else ""
    embed_text = description or ocr[:2000]
    embedding = await _embed(embed_text)
    relevance = _relevance_score(description, ocr, exif)

    return {
        "evidence_id": str(evidence_record.id),
        "filename": evidence_record.filename,
        "mime_type": mime,
        "sha256": evidence_record.sha256,
        "exif": exif,
        "description": description,
        "ocr_preview": ocr[:200] if ocr else None,
        "embedding": embedding,
        "relevance": relevance,
        "integrity_ok": evidence_record.integrity_ok,
    }
