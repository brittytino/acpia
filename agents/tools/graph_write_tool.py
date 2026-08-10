"""
Neo4j Graph Write Tool
All agents use this to write their findings into the temporal knowledge graph.
Every entity and relationship carries: timestamp + confidence + source citation.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import structlog
import asyncio

logger = structlog.get_logger(__name__)


class GraphWriteService:
    """Service for writing entities and relationships to Neo4j."""

    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_password: str):
        from neo4j import GraphDatabase
        self._driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    def close(self):
        self._driver.close()

    def _session(self):
        return self._driver.session()

    # ─── Node creation ──────────────────────────────────

    def upsert_person(
        self,
        case_id: str,
        display_alias: str,
        confidence: float,
        source_evidence_id: str,
        additional_props: Optional[Dict] = None,
    ) -> str:
        """Create or merge a Person node. Returns the person_id."""
        now = datetime.now(timezone.utc).isoformat()
        person_id = str(uuid.uuid4())

        with self._session() as session:
            result = session.run(
                """
                MERGE (p:Person {display_alias: $alias, case_id: $case_id})
                ON CREATE SET
                    p.person_id = $person_id,
                    p.first_seen = $now,
                    p.last_seen = $now,
                    p.confidence = $confidence,
                    p.source_evidence_id = $source_id
                ON MATCH SET
                    p.last_seen = $now,
                    p.confidence = CASE WHEN $confidence > p.confidence THEN $confidence ELSE p.confidence END
                WITH p
                MATCH (c:Case {case_id: $case_id})
                MERGE (p)-[:ASSOCIATED_WITH]->(c)
                RETURN p.person_id AS person_id
                """,
                alias=display_alias,
                case_id=case_id,
                person_id=person_id,
                now=now,
                confidence=confidence,
                source_id=source_evidence_id,
            )
            record = result.single()
            return record["person_id"] if record else person_id

    def upsert_device(
        self,
        case_id: str,
        device_fingerprint: str,
        confidence: float,
        source_evidence_id: str,
        device_props: Optional[Dict] = None,
    ) -> str:
        """Create or merge a Device node."""
        now = datetime.now(timezone.utc).isoformat()
        device_id = str(uuid.uuid4())
        props = device_props or {}

        with self._session() as session:
            result = session.run(
                """
                MERGE (d:Device {device_fingerprint: $fingerprint, case_id: $case_id})
                ON CREATE SET
                    d.device_id = $device_id,
                    d.first_seen = $now,
                    d.confidence = $confidence,
                    d.source_evidence_id = $source_id,
                    d += $props
                ON MATCH SET
                    d.last_seen = $now
                RETURN d.device_id AS device_id
                """,
                fingerprint=device_fingerprint,
                case_id=case_id,
                device_id=device_id,
                now=now,
                confidence=confidence,
                source_id=source_evidence_id,
                props=props,
            )
            record = result.single()
            return record["device_id"] if record else device_id

    def upsert_platform(self, name: str, case_id: str) -> str:
        """Create or merge a Platform node."""
        platform_id = f"{case_id}:{name.lower()}"
        with self._session() as session:
            session.run(
                """
                MERGE (pl:Platform {platform_id: $platform_id})
                ON CREATE SET pl.name = $name, pl.case_id = $case_id
                RETURN pl.platform_id
                """,
                platform_id=platform_id,
                name=name,
                case_id=case_id,
            )
        return platform_id

    def upsert_location(
        self,
        case_id: str,
        lat: float,
        lon: float,
        precision_meters: Optional[int] = None,
        confidence: float = 0.5,
        source_evidence_id: str = "",
    ) -> str:
        """Create or merge a Location node based on coordinates (rounded to ~100m grid)."""
        # Round to ~100m precision for merging nearby locations
        lat_r = round(lat, 3)
        lon_r = round(lon, 3)
        location_id = f"{case_id}:{lat_r}:{lon_r}"
        now = datetime.now(timezone.utc).isoformat()

        with self._session() as session:
            session.run(
                """
                MERGE (l:Location {location_id: $location_id})
                ON CREATE SET
                    l.lat = $lat, l.lon = $lon,
                    l.precision_meters = $precision,
                    l.case_id = $case_id,
                    l.first_seen = $now,
                    l.confidence = $confidence
                ON MATCH SET l.observation_count = coalesce(l.observation_count, 0) + 1
                """,
                location_id=location_id,
                lat=lat_r,
                lon=lon_r,
                precision=precision_meters or 100,
                case_id=case_id,
                now=now,
                confidence=confidence,
            )
        return location_id

    def link_evidence_to_case(self, evidence_id: str, case_id: str, sha256_hash: str, mime_type: str):
        """Create FileEvidence node and link to Case."""
        with self._session() as session:
            session.run(
                """
                MERGE (f:FileEvidence {evidence_id: $evidence_id})
                ON CREATE SET f.sha256_hash = $sha256, f.mime_type = $mime_type
                WITH f
                MERGE (c:Case {case_id: $case_id})
                ON CREATE SET c.case_id = $case_id
                MERGE (f)-[:PART_OF]->(c)
                """,
                evidence_id=evidence_id,
                sha256=sha256_hash,
                mime_type=mime_type,
                case_id=case_id,
            )

    # ─── Relationship creation ────────────────────────────

    def link_person_to_person(
        self,
        person_id_a: str,
        person_id_b: str,
        relationship_type: str,
        confidence: float,
        source_evidence_id: str,
        timestamp: Optional[str] = None,
        properties: Optional[Dict] = None,
    ):
        """Create a relationship between two Person nodes."""
        now = timestamp or datetime.now(timezone.utc).isoformat()
        props = {
            "confidence": confidence,
            "source_evidence_id": source_evidence_id,
            "first_ts": now,
            "last_ts": now,
            "message_count": 1,
            **(properties or {}),
        }

        with self._session() as session:
            session.run(
                f"""
                MATCH (a:Person {{person_id: $person_id_a}})
                MATCH (b:Person {{person_id: $person_id_b}})
                MERGE (a)-[r:{relationship_type}]->(b)
                ON CREATE SET r = $props
                ON MATCH SET
                    r.message_count = coalesce(r.message_count, 0) + 1,
                    r.last_ts = $now,
                    r.confidence = CASE WHEN $confidence > r.confidence THEN $confidence ELSE r.confidence END
                """,
                person_id_a=person_id_a,
                person_id_b=person_id_b,
                props=props,
                now=now,
                confidence=confidence,
            )

    def link_person_to_device(
        self,
        person_id: str,
        device_id: str,
        confidence: float,
        source_evidence_id: str,
        timestamp: Optional[str] = None,
    ):
        """Link a Person to a Device (USED_DEVICE relationship)."""
        now = timestamp or datetime.now(timezone.utc).isoformat()
        with self._session() as session:
            session.run(
                """
                MATCH (p:Person {person_id: $person_id})
                MATCH (d:Device {device_id: $device_id})
                MERGE (p)-[r:USED_DEVICE]->(d)
                ON CREATE SET r.ts = $now, r.confidence = $confidence, r.source_evidence_id = $source_id
                ON MATCH SET r.confidence = CASE WHEN $confidence > r.confidence THEN $confidence ELSE r.confidence END
                """,
                person_id=person_id,
                device_id=device_id,
                now=now,
                confidence=confidence,
                source_id=source_evidence_id,
            )

    def link_device_to_location(
        self,
        device_id: str,
        location_id: str,
        confidence: float,
        source_evidence_id: str,
        timestamp: str,
    ):
        """Link a Device to a Location (LOCATED_AT relationship)."""
        with self._session() as session:
            session.run(
                """
                MATCH (d:Device {device_id: $device_id})
                MATCH (l:Location {location_id: $location_id})
                MERGE (d)-[r:LOCATED_AT]->(l)
                ON CREATE SET r.ts = $ts, r.confidence = $confidence, r.source_evidence_id = $source_id
                """,
                device_id=device_id,
                location_id=location_id,
                ts=timestamp,
                confidence=confidence,
                source_id=source_evidence_id,
            )

    def create_identity_resolution_edge(
        self,
        person_id_a: str,
        person_id_b: str,
        confidence: float,
        signal_types: List[str],
        source_evidence_id: str,
    ):
        """
        Create a LIKELY_SAME_AS edge between two Person nodes.
        This is a probabilistic identity resolution link.
        """
        with self._session() as session:
            session.run(
                """
                MATCH (a:Person {person_id: $person_id_a})
                MATCH (b:Person {person_id: $person_id_b})
                MERGE (a)-[r:LIKELY_SAME_AS]->(b)
                ON CREATE SET
                    r.confidence = $confidence,
                    r.signal_types = $signal_types,
                    r.source_evidence_id = $source_id,
                    r.created_at = datetime()
                ON MATCH SET
                    r.confidence = CASE WHEN $confidence > r.confidence THEN $confidence ELSE r.confidence END
                """,
                person_id_a=person_id_a,
                person_id_b=person_id_b,
                confidence=confidence,
                signal_types=signal_types,
                source_id=source_evidence_id,
            )
