"""
Multimedia Analyst Agent — ACPIA Layer 3, Agent 1
Analyzes image, video, and audio evidence using LLaVA (vision) and Whisper (audio).
Detects harmful content, extracts scene descriptions, identifies objects/faces.
"""
import base64
import io
import os
import structlog
from typing import TYPE_CHECKING

logger = structlog.get_logger("multimedia_analyst")


class MultimediaAnalystAgent:
    """
    Processes image, video, and audio evidence.
    - Images: uses LLaVA for visual scene analysis
    - Audio: uses faster-whisper for transcription
    - Extracts entities, identifies risk indicators
    """

    AGENT_NAME = "multimedia_analyst"

    VISION_PROMPT = """You are a forensic AI assistant helping law enforcement analyze digital evidence.
Analyze this image carefully and provide a structured JSON response.

Respond ONLY with valid JSON in this exact format:
{
  "scene_description": "detailed description of what is shown",
  "detected_objects": ["list", "of", "objects"],
  "detected_text": "any visible text in the image",
  "risk_indicators": ["list of concerning elements, if any"],
  "risk_score": 0-100,
  "confidence": 0.0-1.0,
  "metadata_notes": "any relevant metadata observations"
}

Be objective and factual. If the image contains nothing concerning, say so clearly."""

    async def run(self, state: dict) -> dict:
        """LangGraph node entry point."""
        multimedia_evidence = state.get("multimedia_evidence", [])
        leads = []
        graph_entities = []
        errors = []

        if not multimedia_evidence:
            return {
                **state,
                "agent_results": state.get("agent_results", []) + [{
                    "agent": self.AGENT_NAME,
                    "status": "skipped",
                    "reason": "no multimedia evidence",
                    "findings_count": 0,
                }]
            }

        logger.info(f"Analyzing {len(multimedia_evidence)} multimedia items")

        for evidence in multimedia_evidence:
            try:
                result = await self._analyze_item(evidence)
                if result.get("lead"):
                    leads.append(result["lead"])
                if result.get("entities"):
                    graph_entities.extend(result["entities"])
            except Exception as e:
                logger.error("Multimedia analysis failed", evidence_id=evidence.get("evidence_id"), error=str(e))
                errors.append({"agent": self.AGENT_NAME, "evidence_id": evidence.get("evidence_id"), "error": str(e)})

        return {
            **state,
            "leads": state.get("leads", []) + leads,
            "graph_entities": state.get("graph_entities", []) + graph_entities,
            "errors": state.get("errors", []) + errors,
            "agent_results": state.get("agent_results", []) + [{
                "agent": self.AGENT_NAME,
                "status": "completed",
                "findings_count": len(leads),
            }]
        }

    async def _analyze_item(self, evidence: dict) -> dict:
        """Analyze a single multimedia evidence item."""
        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from tools.ai_tools import call_ollama_vision, call_ollama_text, extract_json_from_response, make_lead

        mime = evidence.get("mime_type", "")
        evidence_id = evidence.get("evidence_id", "unknown")
        file_bytes = evidence.get("file_bytes", b"")

        if mime.startswith("image/"):
            return await self._analyze_image(evidence, file_bytes, evidence_id, call_ollama_vision, extract_json_from_response, make_lead)
        elif mime.startswith("audio/"):
            return await self._analyze_audio(evidence, file_bytes, evidence_id, call_ollama_text, make_lead)
        else:
            return {}

    async def _analyze_image(self, evidence, file_bytes, evidence_id, call_ollama_vision, extract_json_from_response, make_lead) -> dict:
        """LLaVA-based image analysis."""
        # Convert bytes to base64 for Ollama
        img_b64 = base64.b64encode(file_bytes).decode("utf-8")

        raw_response = call_ollama_vision(
            prompt=self.VISION_PROMPT,
            image_b64=img_b64,
        )

        analysis = extract_json_from_response(raw_response)
        risk_score = float(analysis.get("risk_score", 0))

        entities = []
        objects = analysis.get("detected_objects", [])
        if objects:
            entities.append({
                "type": "FileEvidence",
                "evidence_id": evidence_id,
                "detected_objects": objects,
                "scene": analysis.get("scene_description", "")[:200],
            })

        # Only generate a lead if risk score is meaningful
        if risk_score >= 30 or analysis.get("risk_indicators"):
            lead = make_lead(
                agent_name=self.AGENT_NAME,
                summary=f"Image analysis: {analysis.get('scene_description', 'No description')[:300]}",
                risk_score=risk_score,
                evidence_ids=[evidence_id],
                detailed_analysis=f"Objects: {objects}\nRisk indicators: {analysis.get('risk_indicators', [])}\nDetected text: {analysis.get('detected_text', '')}",
                lead_type="multimedia_finding",
            )
            return {"lead": lead, "entities": entities}

        return {"entities": entities}

    async def _analyze_audio(self, evidence, file_bytes, evidence_id, call_ollama_text, make_lead) -> dict:
        """Whisper-based audio transcription and analysis."""
        transcript = ""
        try:
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name

            # Try faster-whisper first
            try:
                from faster_whisper import WhisperModel
                model = WhisperModel("base", device="auto", compute_type="int8")
                segments, _ = model.transcribe(tmp_path)
                transcript = " ".join(seg.text for seg in segments)
            except ImportError:
                # Fallback: just note we can't transcribe
                transcript = "[Audio transcription unavailable — faster_whisper not installed]"
            finally:
                os.unlink(tmp_path)
        except Exception as e:
            transcript = f"[Transcription failed: {e}]"

        if not transcript or transcript.startswith("["):
            return {}

        # Ask LLM to analyze the transcript for risk
        analysis_prompt = f"""You are a forensic analyst. Analyze this audio transcript for any concerning content.
Transcript: {transcript[:3000]}

Respond in JSON only:
{{
  "summary": "brief summary of content",
  "risk_indicators": ["list of concerns"],
  "risk_score": 0-100,
  "contains_criminal_content": true/false
}}"""
        raw = call_ollama_text(analysis_prompt)
        from tools.ai_tools import extract_json_from_response
        analysis = extract_json_from_response(raw)

        risk_score = float(analysis.get("risk_score", 0))
        if risk_score >= 30:
            lead = make_lead(
                agent_name=self.AGENT_NAME,
                summary=f"Audio analysis: {analysis.get('summary', 'Transcript analyzed')}",
                risk_score=risk_score,
                evidence_ids=[evidence_id],
                detailed_analysis=f"Transcript excerpt: {transcript[:1000]}\nRisk indicators: {analysis.get('risk_indicators', [])}",
                lead_type="audio_finding",
            )
            return {"lead": lead, "entities": []}

        return {}
