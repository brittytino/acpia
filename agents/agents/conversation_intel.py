"""
Agent 2 — Conversation Intelligence
Analyzes text chats, emails, and logs for behavioral stage progression.
"""
import json
import structlog
from datetime import datetime
from typing import Optional
from tools.nlp_tool import extract_entities, classify_grooming_stage, extract_stylometric_features, query_llm
from tools.graph_write_tool import GraphWriteService
from app.config import settings

logger = structlog.get_logger(__name__)


class ConversationIntelAgent:
    """
    Analyzes text-based evidence (chats, emails, message logs) for:
    - Behavioral stage classification and trajectory
    - Entity extraction (participants, platforms, dates)
    - Stylometric features for identity fingerprinting
    - Escalation pattern detection
    """

    AGENT_NAME = "conversation_intelligence"

    async def run(self, state: dict) -> dict:
        text_evidence = state.get("text_evidence", [])
        case_id = state["case_id"]
        run_id = state["run_id"]

        progress_cb = state.get("progress_callback")
        if progress_cb:
            progress_cb({
                "type": "agent_update",
                "agent": self.AGENT_NAME,
                "status": "running",
                "progress": 15,
                "message": f"Analyzing {len(text_evidence)} text evidence items...",
            })

        if not text_evidence:
            return {
                **state,
                "agent_results": [{"agent": self.AGENT_NAME, "status": "no_evidence", "findings_count": 0}],
                "leads": [],
            }

        graph = GraphWriteService(settings.NEO4J_URI, settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        leads = []
        all_results = []

        try:
            for ev in text_evidence:
                result = await self._analyze_conversation(ev, case_id, graph)
                all_results.append(result)

                # Generate lead if concerning patterns found
                if result.get("escalation_detected") and result.get("risk_score", 0) > 30:
                    lead = self._create_lead(result, ev)
                    leads.append(lead)

            # Cross-conversation analysis: check for escalation trajectory across multiple conversations
            if len(all_results) > 1:
                trajectory_lead = self._analyze_trajectory(all_results, case_id, text_evidence)
                if trajectory_lead:
                    leads.append(trajectory_lead)

        finally:
            graph.close()

        if progress_cb:
            progress_cb({
                "type": "agent_update",
                "agent": self.AGENT_NAME,
                "status": "complete",
                "progress": 100,
                "message": f"Conversation analysis complete. {len(leads)} leads generated.",
            })

        return {
            **state,
            "agent_results": [{"agent": self.AGENT_NAME, "status": "completed", "findings_count": len(leads)}],
            "leads": leads,
        }

    async def _analyze_conversation(self, evidence: dict, case_id: str, graph: GraphWriteService) -> dict:
        """Analyze a single conversation/text file."""
        evidence_id = evidence["evidence_id"]
        file_bytes = evidence["file_bytes"]

        # Decode text
        try:
            text = file_bytes.decode("utf-8", errors="replace")
        except Exception:
            text = file_bytes.decode("latin-1", errors="replace")

        # Extract entities
        entities = extract_entities(text)

        # Extract stylometric features
        style_features = extract_stylometric_features(text)

        # Classify behavioral stage
        stage_result = classify_grooming_stage(text, context=f"Evidence ID: {evidence_id}")

        # Write participants to graph
        for username in entities.get("usernames", []):
            person_id = graph.upsert_person(
                case_id=case_id,
                display_alias=username,
                confidence=0.7,
                source_evidence_id=evidence_id,
                additional_props={"stylometric_features": style_features},
            )

        # Determine risk score based on stage
        stage_risk_map = {
            "neutral": 5,
            "rapport_building": 20,
            "trust_deepening": 35,
            "dependency_creation": 50,
            "isolation": 65,
            "boundary_testing": 75,
            "escalation": 90,
            "unclear": 15,
        }
        stage = stage_result.get("stage", "unclear")
        base_risk = stage_risk_map.get(stage, 15)
        confidence = stage_result.get("confidence", 0.5)
        risk_score = base_risk * confidence

        return {
            "evidence_id": evidence_id,
            "stage": stage,
            "stage_confidence": confidence,
            "risk_score": risk_score,
            "escalation_detected": stage in ("escalation", "boundary_testing", "isolation"),
            "entities": entities,
            "style_features": style_features,
            "stage_result": stage_result,
        }

    def _create_lead(self, result: dict, evidence: dict) -> dict:
        stage_result = result.get("stage_result", {})
        return {
            "agent": self.AGENT_NAME,
            "risk_score": result["risk_score"],
            "confidence_lower": result["risk_score"] * 0.8,
            "confidence_upper": min(100, result["risk_score"] * 1.2),
            "summary": (
                f"Behavioral pattern detected: {result['stage']} stage "
                f"(confidence: {result['stage_confidence']:.0%}). "
                f"Evidence: {evidence['filename']}"
            ),
            "detailed_analysis": stage_result.get("reasoning", ""),
            "lead_type": "behavioral_stage_detection",
            "evidence_citations": [
                {
                    "evidence_id": evidence["evidence_id"],
                    "sha256_hash": evidence["sha256_hash"],
                    "confidence": result["stage_confidence"],
                    "mime_type": evidence["mime_type"],
                    "excerpt_ref": "full_document",
                }
            ],
        }

    def _analyze_trajectory(self, results: list, case_id: str, evidence_items: list) -> Optional[dict]:
        """Detect escalation trajectory across multiple conversations."""
        stage_order = {
            "neutral": 0, "unclear": 0, "rapport_building": 1,
            "trust_deepening": 2, "dependency_creation": 3,
            "isolation": 4, "boundary_testing": 5, "escalation": 6,
        }

        stages = [
            (r["stage"], r["stage_confidence"], r["evidence_id"])
            for r in results
            if r.get("stage")
        ]

        if len(stages) < 2:
            return None

        # Sort by evidence order and check if stage is increasing
        stage_values = [stage_order.get(s, 0) for s, _, _ in stages]
        is_escalating = stage_values[-1] > stage_values[0] and max(stage_values) > 2

        if is_escalating:
            max_risk = max(r.get("risk_score", 0) for r in results)
            return {
                "agent": self.AGENT_NAME,
                "risk_score": min(95, max_risk * 1.2),
                "confidence_lower": max_risk * 0.7,
                "confidence_upper": min(100, max_risk * 1.4),
                "summary": (
                    f"Escalating behavioral trajectory detected across {len(stages)} conversations. "
                    f"Stage progression: {' → '.join(s for s, _, _ in stages)}"
                ),
                "detailed_analysis": (
                    f"Cross-conversation analysis shows a behavioral pattern progressing through "
                    f"stages: {', '.join(s for s, _, _ in stages)}. "
                    f"This escalation pattern is the key investigative signal."
                ),
                "lead_type": "escalation_trajectory",
                "evidence_citations": [
                    {
                        "evidence_id": eid,
                        "sha256_hash": next(
                            (e["sha256_hash"] for e in evidence_items if e["evidence_id"] == eid), ""
                        ),
                        "confidence": conf,
                        "mime_type": "text/plain",
                    }
                    for _, conf, eid in stages
                ],
            }
        return None
