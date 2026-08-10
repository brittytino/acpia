"""
LLaVA Vision Tool
Analyzes images and video frames using LLaVA vision-language model via Ollama.
"""
import base64
import httpx
import structlog
import json
import os
from typing import Optional

logger = structlog.get_logger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "llava:13b")


def analyze_image(
    image_bytes: bytes,
    evidence_id: str = "unknown",
    context_prompt: Optional[str] = None,
    mime_type: str = "image/jpeg",
) -> dict:
    """
    Analyze an image using LLaVA vision-language model.
    Returns scene description, detected objects, text content, and forensic observations.

    IMPORTANT: This function processes potentially sensitive law enforcement evidence.
    All outputs are investigative leads, not findings. Human review is required.
    """
    # Encode image as base64
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = context_prompt or (
        "Analyze this image for forensic investigation purposes. Describe:\n"
        "1. Scene description and setting\n"
        "2. Any visible people (physical descriptors only, no identity claims)\n"
        "3. Any visible devices, objects, or artifacts of investigative interest\n"
        "4. Any visible text, usernames, platform indicators, or identifiers\n"
        "5. Metadata clues visible in the image (watermarks, timestamps, UI elements)\n"
        "6. Any behavioral or environmental context\n"
        "Be factual and descriptive. Note any uncertainty explicitly."
    )

    logger.info("Analyzing image with LLaVA", evidence_id=evidence_id, model=VISION_MODEL)

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": VISION_MODEL,
                "prompt": prompt,
                "images": [image_b64],
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 1024,
                },
            },
            timeout=120,
        )
        response.raise_for_status()
        result = response.json()
        analysis_text = result.get("response", "")

        # Extract structured fields using LLM
        structured = _extract_structured_observations(analysis_text, evidence_id)

        logger.info("Image analysis complete", evidence_id=evidence_id, text_length=len(analysis_text))

        return {
            "evidence_id": evidence_id,
            "model": VISION_MODEL,
            "raw_description": analysis_text,
            "structured_observations": structured,
            "contains_text": bool(structured.get("visible_text")),
            "forensic_flags": structured.get("forensic_flags", []),
        }

    except httpx.TimeoutException:
        logger.error("LLaVA timeout", evidence_id=evidence_id)
        return {"evidence_id": evidence_id, "error": "Vision model timeout", "model": VISION_MODEL}
    except Exception as e:
        logger.error("LLaVA analysis failed", evidence_id=evidence_id, error=str(e))
        return {"evidence_id": evidence_id, "error": str(e), "model": VISION_MODEL}


def _extract_structured_observations(analysis_text: str, evidence_id: str) -> dict:
    """Use Ollama LLM to extract structured observations from the raw vision analysis."""
    extraction_prompt = f"""
Extract structured information from this forensic image analysis:

{analysis_text}

Return a JSON object with these fields:
{{
  "scene_type": "string (indoor/outdoor/digital_screen/document/other)",
  "visible_text": ["list of any visible text strings"],
  "platform_indicators": ["any social media platforms, apps, or services visible"],
  "device_types": ["any devices visible"],
  "people_count": 0,
  "forensic_flags": ["list of forensically relevant observations"],
  "confidence": 0.0-1.0
}}

Return ONLY valid JSON, no explanation.
"""
    try:
        from tools.nlp_tool import query_llm
        json_str = query_llm(extraction_prompt, temperature=0.0, max_tokens=512)
        # Parse JSON
        start = json_str.find("{")
        end = json_str.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(json_str[start:end])
    except Exception as e:
        logger.warning("Structured extraction failed", error=str(e))

    return {"forensic_flags": [], "visible_text": []}
