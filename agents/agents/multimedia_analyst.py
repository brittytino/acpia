"""
Agent 1 — Multimedia Analyst
Analyzes images, video frames, and audio files.
Uses LLaVA (vision), faster-whisper (ASR), FFmpeg (video), ExifTool (metadata).
"""
import json
import structlog
import subprocess
import tempfile
import os
from typing import List
from tools.llava_tool import analyze_image
from tools.whisper_tool import transcribe_audio
from tools.exif_tool import extract_exif, compute_device_fingerprint
from tools.graph_write_tool import GraphWriteService
from app.config import settings

logger = structlog.get_logger(__name__)


class MultimediaAnalystAgent:
    AGENT_NAME = "multimedia_analyst"

    async def run(self, state: dict) -> dict:
        multimedia_evidence = state.get("multimedia_evidence", [])
        case_id = state["case_id"]

        progress_cb = state.get("progress_callback")
        if progress_cb:
            progress_cb({
                "type": "agent_update",
                "agent": self.AGENT_NAME,
                "status": "running",
                "progress": 10,
                "message": f"Analyzing {len(multimedia_evidence)} multimedia items...",
            })

        if not multimedia_evidence:
            return {
                **state,
                "agent_results": [{"agent": self.AGENT_NAME, "status": "no_evidence", "findings_count": 0}],
                "leads": [],
            }

        graph = GraphWriteService(settings.NEO4J_URI, settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        leads = []

        try:
            for ev in multimedia_evidence:
                mime = ev["mime_type"]
                if mime.startswith("image/"):
                    result = await self._analyze_image(ev, case_id, graph)
                elif mime.startswith("video/"):
                    result = await self._analyze_video(ev, case_id, graph)
                elif mime.startswith("audio/"):
                    result = await self._analyze_audio(ev, case_id, graph)
                else:
                    continue

                if result and result.get("risk_score", 0) > 20:
                    leads.append(self._create_lead(result, ev))

        finally:
            graph.close()

        return {
            **state,
            "agent_results": [{"agent": self.AGENT_NAME, "status": "completed", "findings_count": len(leads)}],
            "leads": leads,
        }

    async def _analyze_image(self, ev: dict, case_id: str, graph: GraphWriteService) -> dict:
        evidence_id = ev["evidence_id"]

        # EXIF extraction
        exif_data = extract_exif(ev["file_bytes"], ev["filename"])
        fingerprint = compute_device_fingerprint(exif_data)

        # GPS data → Location node
        coords = exif_data.get("forensic_summary", {}).get("coordinates")
        device_id = None
        if coords and fingerprint:
            device_id = graph.upsert_device(
                case_id=case_id,
                device_fingerprint=fingerprint,
                confidence=0.8,
                source_evidence_id=evidence_id,
                device_props=exif_data.get("forensic_summary", {}).get("device_info", {}),
            )
            location_id = graph.upsert_location(
                case_id=case_id,
                lat=coords["lat"],
                lon=coords["lon"],
                confidence=0.9,
                source_evidence_id=evidence_id,
            )
            graph.link_device_to_location(
                device_id=device_id,
                location_id=location_id,
                confidence=0.9,
                source_evidence_id=evidence_id,
                timestamp=exif_data.get("forensic_summary", {}).get("timestamps", {}).get("DateTimeOriginal", ""),
            )

        # LLaVA vision analysis
        vision_result = analyze_image(ev["file_bytes"], evidence_id, mime_type=ev["mime_type"])

        # Link evidence to case graph
        graph.link_evidence_to_case(evidence_id, case_id, ev["sha256_hash"], ev["mime_type"])

        # Compute risk score
        flags = vision_result.get("structured_observations", {}).get("forensic_flags", [])
        risk_score = 10 + (len(flags) * 5)
        if vision_result.get("structured_observations", {}).get("people_count", 0) > 0:
            risk_score += 10

        return {
            "evidence_id": evidence_id,
            "type": "image",
            "risk_score": min(100, risk_score),
            "vision_analysis": vision_result,
            "exif_data": exif_data,
            "device_fingerprint": fingerprint,
            "coordinates": coords,
            "forensic_flags": flags,
        }

    async def _analyze_video(self, ev: dict, case_id: str, graph: GraphWriteService) -> dict:
        """Extract keyframes from video and analyze each with LLaVA."""
        evidence_id = ev["evidence_id"]
        frames_analyzed = []

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(ev["file_bytes"])
            tmp_path = tmp.name

        try:
            # Extract keyframes every 30 seconds
            frames_dir = tempfile.mkdtemp()
            subprocess.run(
                ["ffmpeg", "-i", tmp_path, "-vf", "fps=1/30", f"{frames_dir}/frame_%04d.jpg"],
                capture_output=True, timeout=120,
            )

            import glob
            frame_files = sorted(glob.glob(f"{frames_dir}/frame_*.jpg"))[:10]  # Max 10 frames

            for frame_path in frame_files:
                with open(frame_path, "rb") as f:
                    frame_bytes = f.read()
                frame_result = analyze_image(frame_bytes, evidence_id, mime_type="image/jpeg")
                frames_analyzed.append(frame_result)

            # Clean up
            import shutil
            shutil.rmtree(frames_dir)
        finally:
            os.unlink(tmp_path)

        flags = [flag for r in frames_analyzed for flag in r.get("forensic_flags", [])]
        risk_score = 10 + len(set(flags)) * 5

        graph.link_evidence_to_case(evidence_id, case_id, ev["sha256_hash"], ev["mime_type"])

        return {
            "evidence_id": evidence_id,
            "type": "video",
            "risk_score": min(100, risk_score),
            "frames_analyzed": len(frames_analyzed),
            "forensic_flags": list(set(flags)),
        }

    async def _analyze_audio(self, ev: dict, case_id: str, graph: GraphWriteService) -> dict:
        """Transcribe audio and analyze the transcript."""
        evidence_id = ev["evidence_id"]
        transcript = transcribe_audio(ev["file_bytes"], evidence_id=evidence_id)

        graph.link_evidence_to_case(evidence_id, case_id, ev["sha256_hash"], ev["mime_type"])

        return {
            "evidence_id": evidence_id,
            "type": "audio",
            "risk_score": 15,  # Base score; further elevated by conversation agent if text is concerning
            "transcript": transcript,
            "duration_seconds": transcript.get("duration_seconds", 0),
            "language": transcript.get("language"),
        }

    def _create_lead(self, result: dict, ev: dict) -> dict:
        description = ""
        if result["type"] == "image":
            flags = result.get("forensic_flags", [])
            description = f"Image analysis: {len(flags)} forensic flags. Device: {result.get('device_fingerprint', 'unknown')}"
        elif result["type"] == "video":
            description = f"Video analysis: {result.get('frames_analyzed', 0)} frames, {len(result.get('forensic_flags', []))} unique flags"
        elif result["type"] == "audio":
            description = f"Audio: {result.get('duration_seconds', 0):.0f}s, language: {result.get('language', 'unknown')}"

        return {
            "agent": self.AGENT_NAME,
            "risk_score": result["risk_score"],
            "confidence_lower": result["risk_score"] * 0.7,
            "confidence_upper": min(100, result["risk_score"] * 1.3),
            "summary": f"Multimedia evidence analysis: {description}",
            "detailed_analysis": json.dumps(result.get("vision_analysis", {}), default=str)[:3000],
            "lead_type": f"multimedia_{result['type']}",
            "evidence_citations": [
                {
                    "evidence_id": ev["evidence_id"],
                    "sha256_hash": ev["sha256_hash"],
                    "confidence": result["risk_score"] / 100,
                    "mime_type": ev["mime_type"],
                }
            ],
        }
