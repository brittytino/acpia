"""
Case Synthesis Agent — ACPIA Layer 5, Agent 8 (Final Aggregator)
Runs AFTER all 7 specialist agents.
Cross-correlates their findings, detects contradictions, computes risk profiles,
deduplicates leads, and produces a final executive summary.
"""
import os
import structlog
from typing import List

logger = structlog.get_logger("case_synthesis")


class CaseSynthesisAgent:
    AGENT_NAME = "case_synthesis"

    SYNTHESIS_PROMPT = """You are a senior intelligence analyst. You have received findings from 7 specialist agents
who analyzed evidence from a digital forensics investigation.

Agent Findings Summary:
{findings_summary}

Total leads from agents: {lead_count}
Highest risk score: {max_risk}
Average risk score: {avg_risk}

Your task: Synthesize all findings into a unified intelligence assessment.

Respond ONLY in valid JSON:
{{
  "executive_summary": "2-3 sentence overall case assessment",
  "risk_tier": "critical/high/medium/low",
  "overall_risk_score": 0-100,
  "key_findings": ["top 3-5 most important findings across all agents"],
  "corroborating_evidence": ["which findings reinforce each other"],
  "contradictions": ["any inconsistencies between agent findings"],
  "recommended_actions": ["next investigative steps"],
  "confidence": 0.0-1.0
}}"""

    async def run(self, state: dict) -> dict:
        """Synthesize all agent findings into a final intelligence report."""
        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from tools.ai_tools import call_ollama_text, extract_json_from_response, make_lead

        all_leads = state.get("leads", [])
        agent_results = state.get("agent_results", [])
        errors = state.get("errors", [])

        if not all_leads and not agent_results:
            return {
                **state,
                "synthesis": {"status": "no_data"},
                "agent_results": agent_results + [{
                    "agent": self.AGENT_NAME,
                    "status": "skipped",
                    "reason": "no findings from specialist agents",
                    "findings_count": 0,
                }]
            }

        # Build a compact summary for the LLM
        findings_summary = self._build_findings_summary(all_leads, agent_results)
        max_risk = max((l.get("risk_score", 0) for l in all_leads), default=0)
        avg_risk = (
            sum(l.get("risk_score", 0) for l in all_leads) / len(all_leads)
            if all_leads else 0
        )

        prompt = self.SYNTHESIS_PROMPT.format(
            findings_summary=findings_summary[:3000],
            lead_count=len(all_leads),
            max_risk=max_risk,
            avg_risk=round(avg_risk, 1),
        )

        raw = call_ollama_text(prompt, temperature=0.2)
        synthesis = extract_json_from_response(raw)

        # Generate a synthesis meta-lead if risk is significant
        synthesis_leads = []
        overall_risk = float(synthesis.get("overall_risk_score", avg_risk))
        if overall_risk >= 40 or synthesis.get("risk_tier") in ("critical", "high"):
            synthesis_lead = make_lead(
                agent_name=self.AGENT_NAME,
                summary=synthesis.get("executive_summary", "Multi-source intelligence synthesis completed"),
                risk_score=overall_risk,
                evidence_ids=list({
                    cit.get("evidence_id") for l in all_leads
                    for cit in l.get("evidence_citations", [])
                    if cit.get("evidence_id")
                }),
                detailed_analysis=(
                    f"Risk tier: {synthesis.get('risk_tier', 'unknown')}\n"
                    f"Key findings: {synthesis.get('key_findings', [])}\n"
                    f"Recommended actions: {synthesis.get('recommended_actions', [])}\n"
                    f"Contradictions: {synthesis.get('contradictions', [])}\n"
                    f"Corroborating evidence: {synthesis.get('corroborating_evidence', [])}"
                ),
                lead_type="synthesis",
                confidence_lower=max(0.0, overall_risk - 8.0),
                confidence_upper=min(100.0, overall_risk + 5.0),
            )
            synthesis_leads.append(synthesis_lead)

        # Write knowledge graph entities to Neo4j
        await self._write_to_neo4j(state)

        return {
            **state,
            "synthesis": synthesis,
            "leads": all_leads + synthesis_leads,
            "agent_results": agent_results + [{
                "agent": self.AGENT_NAME,
                "status": "completed",
                "findings_count": len(synthesis_leads),
                "overall_risk": overall_risk,
                "risk_tier": synthesis.get("risk_tier", "unknown"),
            }]
        }

    def _build_findings_summary(self, leads: list, agent_results: list) -> str:
        """Build a compact textual summary of all agent findings for the synthesis prompt."""
        lines = []
        for i, lead in enumerate(leads[:20], 1):  # cap at 20 for context window
            lines.append(
                f"Lead {i} [{lead.get('agent', '?')}] "
                f"Risk={lead.get('risk_score', 0):.0f}/100: "
                f"{lead.get('summary', '')[:150]}"
            )

        lines.append("\nAgent completion status:")
        for result in agent_results:
            lines.append(
                f"  {result.get('agent', '?')}: {result.get('status', '?')} "
                f"({result.get('findings_count', 0)} findings)"
            )

        return "\n".join(lines)

    async def _write_to_neo4j(self, state: dict):
        """Write all extracted graph entities to Neo4j."""
        import os
        neo4j_uri = os.environ.get("NEO4J_URI", "bolt://localhost:7688")
        neo4j_user = os.environ.get("NEO4J_USER", "neo4j")
        neo4j_password = os.environ.get("NEO4J_PASSWORD", "acpiaGraph!2024")
        case_id = state.get("case_id", "")

        sys_path_added = False
        try:
            import sys
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from tools.ai_tools import write_to_neo4j
            sys_path_added = True
        except ImportError:
            return

        # Write Case node
        write_to_neo4j(
            "MERGE (c:Case {case_id: $case_id})",
            {"case_id": case_id},
            neo4j_uri, neo4j_user, neo4j_password
        )

        # Write extracted entities
        for entity in state.get("graph_entities", []):
            entity_type = entity.get("type", "Unknown")

            if entity_type == "Person":
                write_to_neo4j(
                    """MERGE (p:Person {display_alias: $alias})
                    ON CREATE SET p.first_seen = datetime(), p.source = $source
                    WITH p
                    MATCH (c:Case {case_id: $case_id})
                    MERGE (f:FileEvidence {evidence_id: $evidence_id})
                    MERGE (f)-[:PART_OF]->(c)
                    MERGE (p)-[:MENTIONED_IN]->(f)""",
                    {
                        "alias": entity.get("display_alias", "Unknown")[:100],
                        "source": entity.get("source", "agent"),
                        "case_id": case_id,
                        "evidence_id": entity.get("evidence_id", ""),
                    },
                    neo4j_uri, neo4j_user, neo4j_password
                )

            elif entity_type == "Location":
                write_to_neo4j(
                    """MERGE (l:Location {lat: $lat, lon: $lon})
                    WITH l
                    MATCH (f:FileEvidence {evidence_id: $evidence_id})
                    MERGE (f)-[:CAPTURED_AT]->(l)""",
                    {
                        "lat": entity.get("lat", 0.0),
                        "lon": entity.get("lon", 0.0),
                        "evidence_id": entity.get("evidence_id", ""),
                    },
                    neo4j_uri, neo4j_user, neo4j_password
                )

            elif entity_type == "FileEvidence":
                write_to_neo4j(
                    """MERGE (f:FileEvidence {evidence_id: $evidence_id})
                    ON CREATE SET f.mime_type = $mime_type, f.scene = $scene
                    WITH f
                    MATCH (c:Case {case_id: $case_id})
                    MERGE (f)-[:PART_OF]->(c)""",
                    {
                        "evidence_id": entity.get("evidence_id", ""),
                        "mime_type": entity.get("mime_type", ""),
                        "scene": entity.get("scene", "")[:200],
                        "case_id": case_id,
                    },
                    neo4j_uri, neo4j_user, neo4j_password
                )
