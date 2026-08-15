"""
Artifact Agent — per-file processing.
EXIF/GPS extraction, OCR, vision description (OpenRouter), embeddings
(Gemini), relevance scoring. Emits artifact.processed event.
"""
import logging
from typing import Optional
from PIL import Image
import piexif

from app.agents import openrouter
from app.agents import embeddings as embed_agent
from app.services import storage

log = logging.getLogger(__name__)

_VISION_PROMPT = (
    "Describe what is in this image in one sentence. Focus on objects, "
    "setting, and any visible text. Do not reproduce or describe any "
    "illegal content."
)


async def _describe(image_bytes: bytes) -> str:
    """Vision description via OpenRouter's fallback model chain — never
    reproduces content, just describes."""
    try:
        return await openrouter.vision_describe(image_bytes, _VISION_PROMPT)
    except Exception as e:
        log.warning(f"vision_describe failed: {e}")
        return ""


async def _embed(text: str) -> Optional[list]:
    """Embed text via Gemini's text-embedding-004."""
    if not text.strip():
        return None
    return await embed_agent.embed(text[:2000])


def _extract_exif(content: bytes) -> dict:
    """Extract EXIF/GPS metadata from image bytes."""
    try:
        exif_data = piexif.load(content)
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


def _ocr_text(content: bytes, mime_type: str) -> str:
    """Extract text — from image via pytesseract, or decode plaintext files."""
    try:
        if mime_type.startswith("text/"):
            return content.decode("utf-8", errors="ignore")[:10000]
        if mime_type.startswith("image/"):
            try:
                import io
                import pytesseract
                from PIL import ImageEnhance
                img = Image.open(io.BytesIO(content))
                # Enhance for dark-mode screenshot OCR
                img = img.convert('L') # Grayscale
                img = img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(2.0)
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
    storage_path holds a Cloudinary URL (see app/services/storage.py) —
    fetched once here into memory rather than opened off local disk, since
    Render's free tier has no persistent filesystem.
    """
    mime = evidence_record.mime_type

    try:
        content = await storage.fetch_bytes(evidence_record.storage_path)
    except Exception as e:
        log.warning(f"could not fetch evidence bytes from storage: {e}")
        content = b""

    exif = _extract_exif(content) if mime.startswith("image/") and content else {}
    ocr = _ocr_text(content, mime) if content else ""
    description = await _describe(content) if mime.startswith("image/") and content else ""
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
