"""
Agent 3 — Identity Resolution
Cross-platform identity linking using stylometry + EXIF + temporal correlation.
"""
import json
import structlog
from itertools import combinations
from tools.nlp_tool import compute_stylometric_similarity
from tools.graph_write_tool import GraphWriteService
from app.config import settings

logger = structlog.get_logger(__name__)


class IdentityResolutionAgent:
    AGENT_NAME = "identity_resolution"
    SIMILARITY_THRESHOLD = 0.75  # Minimum similarity score to generate identity link

    async def run(self, state: dict) -> dict:
        # Collect stylometric profiles from agent results
        agent_results = state.get("agent_results", [])
        case_id = state["case_id"]
        leads = []

        # Extract stylometric profiles from conversation intel results
        profiles = self._extract_profiles(agent_results, state)

        if len(profiles) < 2:
            return {
                **state,
                "agent_results": [{"agent": self.AGENT_NAME, "status": "insufficient_profiles", "findings_count": 0}],
                "leads": [],
            }

        graph = GraphWriteService(settings.NEO4J_URI, settings.NEO4J_USER, settings.NEO4J_PASSWORD)

        try:
            # Compare all pairs of profiles
            for (alias_a, profile_a), (alias_b, profile_b) in combinations(profiles.items(), 2):
                if alias_a == alias_b:
                    continue

                sim_score = compute_stylometric_similarity(
                    profile_a.get("style_features", {}),
                    profile_b.get("style_features", {}),
                )

                # Check device fingerprint overlap
                device_match = (
                    profile_a.get("device_fingerprint")
                    and profile_a.get("device_fingerprint") == profile_b.get("device_fingerprint")
                )

                # Determine signals used
                signals = []
                if sim_score >= self.SIMILARITY_THRESHOLD:
                    signals.append("stylometry")
                if device_match:
                    signals.append("device_metadata")

                if not signals:
                    continue

                # Compute combined confidence
                confidence = sim_score * 0.6 + (0.4 if device_match else 0)
                confidence = min(0.95, confidence)

                # Get Neo4j person IDs
                person_id_a = profile_a.get("person_id")
                person_id_b = profile_b.get("person_id")

                if person_id_a and person_id_b:
                    graph.create_identity_resolution_edge(
                        person_id_a=person_id_a,
                        person_id_b=person_id_b,
                        confidence=confidence,
                        signal_types=signals,
                        source_evidence_id=profile_a.get("evidence_id", ""),
                    )

                    if confidence > 0.5:
                        risk_score = confidence * 70
                        leads.append({
                            "agent": self.AGENT_NAME,
                            "risk_score": risk_score,
                            "confidence_lower": risk_score * 0.7,
                            "confidence_upper": min(100, risk_score * 1.3),
                            "summary": (
                                f"Possible identity link between '{alias_a}' and '{alias_b}' "
                                f"(confidence: {confidence:.0%}, signals: {', '.join(signals)}). "
                                f"Stylometric similarity: {sim_score:.0%}."
                            ),
                            "detailed_analysis": (
                                f"Cross-platform identity resolution detected similar writing style "
                                f"between accounts '{alias_a}' and '{alias_b}'. "
                                f"This is a probabilistic lead requiring investigator verification. "
                                f"Signals: {json.dumps(signals)}. "
                                f"Stylometric similarity score: {sim_score:.4f}."
                            ),
                            "lead_type": "identity_resolution",
                            "evidence_citations": [
                                {
                                    "evidence_id": profile_a.get("evidence_id", ""),
                                    "sha256_hash": profile_a.get("sha256_hash", ""),
                                    "confidence": confidence,
                                    "mime_type": "text/plain",
                                },
                                {
                                    "evidence_id": profile_b.get("evidence_id", ""),
                                    "sha256_hash": profile_b.get("sha256_hash", ""),
                                    "confidence": confidence,
                                    "mime_type": "text/plain",
                                },
                            ],
                            "neo4j_node_ids": {
                                "person_a": person_id_a,
                                "person_b": person_id_b,
                            },
                        })
        finally:
            graph.close()

        return {
            **state,
            "agent_results": [{"agent": self.AGENT_NAME, "status": "completed", "findings_count": len(leads)}],
            "leads": leads,
        }

    def _extract_profiles(self, agent_results: list, state: dict) -> dict:
        """Extract stylometric profiles from conversation intelligence results."""
        profiles = {}
        for result in agent_results:
            if result.get("agent") == "conversation_intelligence":
                for profile in result.get("profiles", []):
                    alias = profile.get("alias")
                    if alias:
                        profiles[alias] = profile
        return profiles
