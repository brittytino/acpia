"""
Conversation Intelligence Agent — ACPIA Layer 3, Agent 2
Analyzes chat logs, emails, and text communications for suspicious patterns.
Uses LLaMA to identify grooming language, coded references, coordination signals.
"""
import os
import re
import structlog
from typing import List

logger = structlog.get_logger("conversation_intel")


class ConversationIntelAgent:
    AGENT_NAME = "conversation_intel"

    ANALYSIS_PROMPT = """You are a forensic AI assistant helping law enforcement analyze digital communications.
Analyze this conversation/text evidence for suspicious patterns.

Evidence content:
{content}

Respond ONLY with valid JSON:
{{
  "participants": ["list of identified usernames/names"],
  "communication_style": "description of tone and language patterns",
  "risk_indicators": ["grooming language", "coded references", "coordination signals", etc.],
  "risk_score": 0-100,
  "summary": "concise 2-sentence summary of findings",
  "key_phrases": ["list of suspicious or notable phrases"],
  "timeline_hints": ["any date/time references found"],
  "identity_signals": ["names, locations, identifiers mentioned"]
}}

Be precise and factual. If content is benign, risk_score should be low (0-20)."""

    async def run(self, state: dict) -> dict:
        text_evidence = state.get("text_evidence", [])
        leads = []
        graph_entities = []
        errors = []

        if not text_evidence:
            return {
                **state,
                "agent_results": state.get("agent_results", []) + [{
                    "agent": self.AGENT_NAME,
                    "status": "skipped",
                    "reason": "no text evidence",
                    "findings_count": 0,
                }]
            }

        logger.info(f"Analyzing {len(text_evidence)} text items")

        for evidence in text_evidence:
            try:
                result = self._analyze_text(evidence)
                if result.get("lead"):
                    leads.append(result["lead"])
                if result.get("entities"):
                    graph_entities.extend(result["entities"])
            except Exception as e:
                errors.append({"agent": self.AGENT_NAME, "error": str(e)})

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

    def _analyze_text(self, evidence: dict) -> dict:
        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from tools.ai_tools import call_ollama_text, extract_json_from_response, make_lead

        file_bytes = evidence.get("file_bytes", b"")
        evidence_id = evidence.get("evidence_id", "unknown")
        filename = evidence.get("filename", "")

        try:
            content = file_bytes.decode("utf-8", errors="replace")
        except Exception:
            content = str(file_bytes)

        # Truncate for LLM context window
        content_truncated = content[:4000]
        prompt = self.ANALYSIS_PROMPT.format(content=content_truncated)

        raw = call_ollama_text(prompt)
        analysis = extract_json_from_response(raw)

        risk_score = float(analysis.get("risk_score", 0))
        participants = analysis.get("participants", [])

        # Build Neo4j entities for participants
        entities = []
        for participant in participants[:10]:  # cap at 10
            entities.append({
                "type": "Person",
                "display_alias": participant[:100],
                "evidence_id": evidence_id,
                "source": "conversation_intel",
            })

        if risk_score >= 25 or analysis.get("risk_indicators"):
            lead = make_lead(
                agent_name=self.AGENT_NAME,
                summary=analysis.get("summary", f"Conversation analysis of {filename}"),
                risk_score=risk_score,
                evidence_ids=[evidence_id],
                detailed_analysis=(
                    f"Participants: {participants}\n"
                    f"Risk indicators: {analysis.get('risk_indicators', [])}\n"
                    f"Key phrases: {analysis.get('key_phrases', [])}\n"
                    f"Identity signals: {analysis.get('identity_signals', [])}"
                ),
                lead_type="conversation_finding",
            )
            return {"lead": lead, "entities": entities}

        return {"entities": entities}


class TimelineReconstructionAgent:
    """Reconstructs event timeline from all evidence timestamps and text references."""
    AGENT_NAME = "timeline_reconstruction"

    PROMPT = """Analyze this evidence and extract all temporal information.

Content: {content}
Filename: {filename}
Ingested at: {ingested_at}

Respond in JSON only:
{{
  "events": [
    {{"timestamp": "ISO or approximate datetime", "description": "what happened", "confidence": 0.0-1.0}}
  ],
  "time_range": {{"earliest": "datetime or null", "latest": "datetime or null"}},
  "timezone_hints": ["any timezone references"],
  "risk_score": 0-100,
  "summary": "brief timeline summary"
}}"""

    async def run(self, state: dict) -> dict:
        all_evidence = (
            state.get("multimedia_evidence", []) +
            state.get("text_evidence", []) +
            state.get("document_evidence", [])
        )

        if not all_evidence:
            return {**state, "agent_results": state.get("agent_results", []) + [{
                "agent": self.AGENT_NAME, "status": "skipped", "findings_count": 0,
            }]}

        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from tools.ai_tools import call_ollama_text, extract_json_from_response, make_lead

        leads = []
        all_events = []

        for evidence in all_evidence[:5]:  # process up to 5 items for timeline
            try:
                file_bytes = evidence.get("file_bytes", b"")
                content = file_bytes.decode("utf-8", errors="replace")[:2000] if file_bytes else ""
                prompt = self.PROMPT.format(
                    content=content,
                    filename=evidence.get("filename", ""),
                    ingested_at=evidence.get("ingested_at", ""),
                )
                raw = call_ollama_text(prompt)
                analysis = extract_json_from_response(raw)
                all_events.extend(analysis.get("events", []))

                risk_score = float(analysis.get("risk_score", 0))
                if risk_score >= 30:
                    lead = make_lead(
                        agent_name=self.AGENT_NAME,
                        summary=analysis.get("summary", "Timeline events identified"),
                        risk_score=risk_score,
                        evidence_ids=[evidence.get("evidence_id", "")],
                        detailed_analysis=f"Events: {analysis.get('events', [])[:5]}",
                        lead_type="timeline_finding",
                    )
                    leads.append(lead)
            except Exception as e:
                logger.error("Timeline agent failed", error=str(e))

        return {
            **state,
            "leads": state.get("leads", []) + leads,
            "agent_results": state.get("agent_results", []) + [{
                "agent": self.AGENT_NAME,
                "status": "completed",
                "findings_count": len(leads),
                "events_found": len(all_events),
            }]
        }


class GeospatialIntelAgent:
    """Extracts and correlates location data from EXIF, text, and metadata."""
    AGENT_NAME = "geospatial_intel"

    async def run(self, state: dict) -> dict:
        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from tools.ai_tools import make_lead

        all_evidence = (
            state.get("multimedia_evidence", []) +
            state.get("text_evidence", []) +
            state.get("document_evidence", [])
        )

        leads = []
        entities = []
        locations_found = []

        for evidence in all_evidence:
            # Check EXIF GPS data (pre-extracted in ingest step)
            exif = evidence.get("exif_metadata", {})
            gps_lat = exif.get("GPSLatitude")
            gps_lon = exif.get("GPSLongitude")

            if gps_lat and gps_lon:
                try:
                    lat = _dms_to_decimal(gps_lat, exif.get("GPSLatitudeRef", "N"))
                    lon = _dms_to_decimal(gps_lon, exif.get("GPSLongitudeRef", "E"))
                    locations_found.append({"lat": lat, "lon": lon, "evidence_id": evidence.get("evidence_id")})
                    entities.append({
                        "type": "Location",
                        "lat": lat,
                        "lon": lon,
                        "evidence_id": evidence.get("evidence_id"),
                        "source": "exif_gps",
                    })
                except Exception:
                    pass

        if len(locations_found) >= 2:
            lead = make_lead(
                agent_name=self.AGENT_NAME,
                summary=f"GPS coordinates found in {len(locations_found)} evidence items",
                risk_score=45.0,
                evidence_ids=[loc["evidence_id"] for loc in locations_found],
                detailed_analysis=f"Locations: {locations_found}",
                lead_type="geospatial_finding",
            )
            leads.append(lead)

        return {
            **state,
            "leads": state.get("leads", []) + leads,
            "graph_entities": state.get("graph_entities", []) + entities,
            "agent_results": state.get("agent_results", []) + [{
                "agent": self.AGENT_NAME,
                "status": "completed",
                "findings_count": len(leads),
                "locations_found": len(locations_found),
            }]
        }


class NetworkRelationsAgent:
    """Maps communication networks and social graphs from evidence."""
    AGENT_NAME = "network_relations"

    async def run(self, state: dict) -> dict:
        text_evidence = state.get("text_evidence", [])

        if not text_evidence:
            return {**state, "agent_results": state.get("agent_results", []) + [{
                "agent": self.AGENT_NAME, "status": "skipped", "findings_count": 0,
            }]}

        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from tools.ai_tools import call_ollama_text, extract_json_from_response, make_lead

        all_contacts = []
        leads = []

        for evidence in text_evidence:
            try:
                file_bytes = evidence.get("file_bytes", b"")
                content = file_bytes.decode("utf-8", errors="replace")[:3000]

                prompt = f"""Analyze this communication for network relationships.
Content: {content}

Respond in JSON:
{{
  "contacts": [{{"alias": "username", "platform": "platform", "role": "sender/receiver"}}],
  "communication_frequency": "high/medium/low",
  "network_type": "direct/group/chain",
  "suspicious_contacts": ["list of suspicious usernames"],
  "risk_score": 0-100
}}"""
                raw = call_ollama_text(prompt)
                analysis = extract_json_from_response(raw)
                all_contacts.extend(analysis.get("contacts", []))

                risk_score = float(analysis.get("risk_score", 0))
                if risk_score >= 35 and analysis.get("suspicious_contacts"):
                    leads.append(make_lead(
                        agent_name=self.AGENT_NAME,
                        summary=f"Network: {len(analysis.get('contacts', []))} contacts, {analysis.get('network_type', 'unknown')} type",
                        risk_score=risk_score,
                        evidence_ids=[evidence.get("evidence_id", "")],
                        detailed_analysis=f"Suspicious: {analysis.get('suspicious_contacts', [])}\nAll contacts: {all_contacts[:10]}",
                        lead_type="network_finding",
                    ))
            except Exception as e:
                logger.error("Network relations agent failed", error=str(e))

        return {
            **state,
            "leads": state.get("leads", []) + leads,
            "agent_results": state.get("agent_results", []) + [{
                "agent": self.AGENT_NAME,
                "status": "completed",
                "findings_count": len(leads),
                "contacts_mapped": len(all_contacts),
            }]
        }


class DocumentMetadataAgent:
    """Extracts metadata, hidden data, and forensic artifacts from documents."""
    AGENT_NAME = "document_metadata"

    async def run(self, state: dict) -> dict:
        doc_evidence = state.get("document_evidence", [])

        if not doc_evidence:
            return {**state, "agent_results": state.get("agent_results", []) + [{
                "agent": self.AGENT_NAME, "status": "skipped", "findings_count": 0,
            }]}

        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from tools.ai_tools import call_ollama_text, extract_json_from_response, make_lead

        leads = []

        for evidence in doc_evidence:
            try:
                file_bytes = evidence.get("file_bytes", b"")
                evidence_id = evidence.get("evidence_id", "unknown")
                filename = evidence.get("filename", "")

                # Try to extract text from PDF
                doc_text = ""
                if filename.lower().endswith(".pdf") or evidence.get("mime_type") == "application/pdf":
                    try:
                        import fitz  # PyMuPDF
                        doc = fitz.open(stream=file_bytes, filetype="pdf")
                        doc_text = "\n".join(page.get_text() for page in doc)[:3000]
                    except ImportError:
                        doc_text = "[PDF text extraction unavailable — PyMuPDF not installed]"
                    except Exception as e:
                        doc_text = f"[PDF extraction failed: {e}]"
                else:
                    doc_text = file_bytes.decode("utf-8", errors="replace")[:3000]

                prompt = f"""Analyze this document for forensic significance.
Filename: {filename}
Content: {doc_text}

Respond in JSON:
{{
  "document_type": "type of document",
  "author_hints": ["any author identifiers"],
  "creation_date_hints": ["any date references"],
  "embedded_links": ["URLs or references"],
  "risk_indicators": ["suspicious content"],
  "risk_score": 0-100,
  "summary": "brief summary"
}}"""
                raw = call_ollama_text(prompt)
                analysis = extract_json_from_response(raw)
                risk_score = float(analysis.get("risk_score", 0))

                if risk_score >= 30 or analysis.get("risk_indicators"):
                    leads.append(make_lead(
                        agent_name=self.AGENT_NAME,
                        summary=analysis.get("summary", f"Document analysis: {filename}"),
                        risk_score=risk_score,
                        evidence_ids=[evidence_id],
                        detailed_analysis=f"Document type: {analysis.get('document_type')}\nRisk indicators: {analysis.get('risk_indicators', [])}",
                        lead_type="document_finding",
                    ))
            except Exception as e:
                logger.error("Document metadata agent failed", error=str(e))

        return {
            **state,
            "leads": state.get("leads", []) + leads,
            "agent_results": state.get("agent_results", []) + [{
                "agent": self.AGENT_NAME,
                "status": "completed",
                "findings_count": len(leads),
            }]
        }


def _dms_to_decimal(dms, ref) -> float:
    """Convert GPS DMS format to decimal degrees."""
    try:
        if isinstance(dms, (list, tuple)) and len(dms) == 3:
            d, m, s = [float(x) for x in dms]
            decimal = d + m / 60 + s / 3600
            if ref in ("S", "W"):
                decimal = -decimal
            return round(decimal, 7)
    except Exception:
        pass
    return 0.0
