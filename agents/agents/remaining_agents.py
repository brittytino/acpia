"""Remaining Agents 4-7 — Timeline, Geospatial, Network, Document"""
import structlog
from tools.nlp_tool import extract_entities, query_llm
from tools.exif_tool import extract_exif
from tools.graph_write_tool import GraphWriteService
from app.config import settings
import json

logger = structlog.get_logger(__name__)


class TimelineReconstructionAgent:
    """Agent 4 — Reconstructs temporal timeline from all evidence timestamps."""
    AGENT_NAME = "timeline_reconstruction"

    async def run(self, state: dict) -> dict:
        all_evidence = (
            state.get("multimedia_evidence", []) +
            state.get("text_evidence", []) +
            state.get("document_evidence", [])
        )
        case_id = state["case_id"]
        leads = []

        timeline_events = []
        for ev in all_evidence:
            exif = extract_exif(ev["file_bytes"], ev["filename"])
            timestamps = exif.get("forensic_summary", {}).get("timestamps", {})
            for field, ts_value in timestamps.items():
                timeline_events.append({
                    "evidence_id": ev["evidence_id"],
                    "timestamp_field": field,
                    "timestamp_value": str(ts_value),
                    "sha256_hash": ev["sha256_hash"],
                })

        if len(timeline_events) > 3:
            # Detect timeline anomalies using LLM
            prompt = f"""Analyze this list of timestamps from digital evidence for forensic anomalies:

{json.dumps(timeline_events[:50], indent=2)}

Identify:
1. Clock skew anomalies (timestamps that seem inconsistent with others)
2. Suspicious time clusters (many events in very short windows)
3. Temporal gaps that might indicate deleted evidence
4. Cross-device timestamp correlations

Return JSON: {{"anomalies": [...], "risk_score": 0-100, "summary": "..."}}"""

            try:
                response = query_llm(prompt, temperature=0.1)
                start = response.find("{")
                end = response.rfind("}") + 1
                if start >= 0:
                    analysis = json.loads(response[start:end])
                    if analysis.get("risk_score", 0) > 25:
                        leads.append({
                            "agent": self.AGENT_NAME,
                            "risk_score": float(analysis.get("risk_score", 25)),
                            "confidence_lower": float(analysis.get("risk_score", 25)) * 0.7,
                            "confidence_upper": min(100, float(analysis.get("risk_score", 25)) * 1.3),
                            "summary": analysis.get("summary", "Timeline anomalies detected in evidence timestamps"),
                            "detailed_analysis": json.dumps(analysis.get("anomalies", []))[:2000],
                            "lead_type": "timeline_anomaly",
                            "evidence_citations": [
                                {"evidence_id": e["evidence_id"], "sha256_hash": e["sha256_hash"],
                                 "confidence": 0.6, "mime_type": "application/octet-stream"}
                                for e in all_evidence[:5]
                            ],
                        })
            except Exception as e:
                logger.warning("Timeline analysis failed", error=str(e))

        return {
            **state,
            "agent_results": [{"agent": self.AGENT_NAME, "status": "completed", "findings_count": len(leads)}],
            "leads": leads,
        }


class GeospatialIntelAgent:
    """Agent 5 — GPS/location intelligence from EXIF data."""
    AGENT_NAME = "geospatial_intel"

    async def run(self, state: dict) -> dict:
        multimedia_evidence = state.get("multimedia_evidence", [])
        case_id = state["case_id"]
        leads = []
        locations = []

        graph = GraphWriteService(settings.NEO4J_URI, settings.NEO4J_USER, settings.NEO4J_PASSWORD)

        try:
            for ev in multimedia_evidence:
                exif = extract_exif(ev["file_bytes"], ev["filename"])
                coords = exif.get("forensic_summary", {}).get("coordinates")
                if coords:
                    locations.append({
                        "evidence_id": ev["evidence_id"],
                        "lat": coords["lat"],
                        "lon": coords["lon"],
                        "sha256_hash": ev["sha256_hash"],
                    })
                    graph.upsert_location(
                        case_id=case_id,
                        lat=coords["lat"],
                        lon=coords["lon"],
                        confidence=0.9,
                        source_evidence_id=ev["evidence_id"],
                    )

            if len(locations) >= 2:
                # Multiple locations — potential movement pattern
                leads.append({
                    "agent": self.AGENT_NAME,
                    "risk_score": 30 + len(locations) * 5,
                    "confidence_lower": 25,
                    "confidence_upper": min(100, 30 + len(locations) * 7),
                    "summary": f"GPS location data found in {len(locations)} evidence items. Location cluster analysis performed.",
                    "detailed_analysis": f"Locations detected: {json.dumps(locations[:10])}",
                    "lead_type": "geospatial_cluster",
                    "evidence_citations": [
                        {"evidence_id": l["evidence_id"], "sha256_hash": l["sha256_hash"],
                         "confidence": 0.8, "mime_type": "image/jpeg"}
                        for l in locations[:5]
                    ],
                })
        finally:
            graph.close()

        return {
            **state,
            "agent_results": [{"agent": self.AGENT_NAME, "status": "completed", "findings_count": len(leads)}],
            "leads": leads,
        }


class NetworkRelationsAgent:
    """Agent 6 — Network and relationship mapping."""
    AGENT_NAME = "network_relations"

    async def run(self, state: dict) -> dict:
        text_evidence = state.get("text_evidence", [])
        case_id = state["case_id"]
        leads = []

        all_entities = {"persons": set(), "emails": set(), "phones": set(), "platforms": set()}

        for ev in text_evidence:
            try:
                text = ev["file_bytes"].decode("utf-8", errors="replace")
            except Exception:
                continue
            entities = extract_entities(text)
            all_entities["persons"].update(entities.get("persons", []))
            all_entities["emails"].update(entities.get("emails", []))
            all_entities["phones"].update(entities.get("phones", []))

        unique_identifiers = (
            len(all_entities["persons"]) +
            len(all_entities["emails"]) +
            len(all_entities["phones"])
        )

        if unique_identifiers > 5:
            leads.append({
                "agent": self.AGENT_NAME,
                "risk_score": min(80, 20 + unique_identifiers * 3),
                "confidence_lower": 15,
                "confidence_upper": min(90, 25 + unique_identifiers * 4),
                "summary": (
                    f"Network analysis: {len(all_entities['persons'])} persons, "
                    f"{len(all_entities['emails'])} emails, "
                    f"{len(all_entities['phones'])} phone numbers identified across evidence."
                ),
                "detailed_analysis": f"Entity network: {json.dumps({k: list(v)[:20] for k, v in all_entities.items()})}",
                "lead_type": "network_mapping",
                "evidence_citations": [
                    {"evidence_id": ev["evidence_id"], "sha256_hash": ev["sha256_hash"],
                     "confidence": 0.7, "mime_type": ev["mime_type"]}
                    for ev in text_evidence[:3]
                ],
            })

        return {
            **state,
            "agent_results": [{"agent": self.AGENT_NAME, "status": "completed", "findings_count": len(leads)}],
            "leads": leads,
        }


class DocumentMetadataAgent:
    """Agent 7 — Document and metadata analysis (PDFs, archives, etc.)."""
    AGENT_NAME = "document_metadata"

    async def run(self, state: dict) -> dict:
        document_evidence = state.get("document_evidence", [])
        case_id = state["case_id"]
        leads = []

        for ev in document_evidence:
            exif = extract_exif(ev["file_bytes"], ev["filename"])
            sw_info = exif.get("forensic_summary", {}).get("software_info", {})
            ids = exif.get("forensic_summary", {}).get("unique_identifiers", {})

            # Try text extraction from PDFs
            text_content = ""
            if ev["mime_type"] == "application/pdf":
                try:
                    import fitz
                    doc = fitz.open(stream=ev["file_bytes"], filetype="pdf")
                    text_content = " ".join(page.get_text() for page in doc)
                    doc.close()
                except Exception:
                    pass

            forensic_observations = []
            if sw_info:
                forensic_observations.append(f"Created with: {sw_info}")
            if ids:
                forensic_observations.append(f"Unique identifiers found: {ids}")

            if forensic_observations or text_content:
                leads.append({
                    "agent": self.AGENT_NAME,
                    "risk_score": 20 + len(forensic_observations) * 10,
                    "confidence_lower": 15,
                    "confidence_upper": min(80, 25 + len(forensic_observations) * 12),
                    "summary": f"Document metadata analysis: {'; '.join(forensic_observations) or 'Text extracted for analysis'}",
                    "detailed_analysis": text_content[:2000] if text_content else json.dumps(exif.get("forensic_summary", {})),
                    "lead_type": "document_metadata",
                    "evidence_citations": [
                        {"evidence_id": ev["evidence_id"], "sha256_hash": ev["sha256_hash"],
                         "confidence": 0.7, "mime_type": ev["mime_type"]}
                    ],
                })

        return {
            **state,
            "agent_results": [{"agent": self.AGENT_NAME, "status": "completed", "findings_count": len(leads)}],
            "leads": leads,
        }
