"""
Neo4j Knowledge Graph API
Returns graph data for the frontend Cytoscape.js explorer.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import structlog

from app.auth.keycloak import get_current_user, CurrentUser
from app.database import neo4j_session
from app.schemas.schemas import GraphResponse, GraphNode, GraphEdge

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Knowledge Graph"])


@router.get("/cases/{case_id}/graph", response_model=GraphResponse)
async def get_case_graph(
    case_id: str,
    depth: int = Query(2, ge=1, le=4, description="Graph traversal depth"),
    node_types: Optional[str] = Query(None, description="Comma-separated node types to include"),
    min_confidence: float = Query(0.3, ge=0.0, le=1.0),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get the knowledge graph subview for a case.
    Returns nodes and edges formatted for Cytoscape.js visualization.
    """
    allowed_types = set(node_types.split(",")) if node_types else {"Person", "Device", "Platform", "Location", "FileEvidence"}

    async with neo4j_session() as session:
        # Query all entities and relationships for this case
        result = await session.run(
            """
            MATCH (c:Case {case_id: $case_id})<-[:PART_OF]-(f:FileEvidence)
            WITH f
            MATCH path = (n)-[r]-(m)
            WHERE (n:Person OR n:Device OR n:Platform OR n:Location OR n:FileEvidence)
              AND (m:Person OR m:Device OR m:Platform OR m:Location OR m:FileEvidence)
              AND (n)-[:PART_OF|RELATED_TO*..3]-(:Case {case_id: $case_id})
              AND (r.confidence IS NULL OR r.confidence >= $min_confidence)
            RETURN DISTINCT
                id(n) AS src_id, labels(n)[0] AS src_label, properties(n) AS src_props,
                id(m) AS tgt_id, labels(m)[0] AS tgt_label, properties(m) AS tgt_props,
                id(r) AS rel_id, type(r) AS rel_type, properties(r) AS rel_props
            LIMIT 500
            """,
            case_id=case_id,
            min_confidence=min_confidence,
        )

        nodes_map = {}
        edges = []

        async for record in result:
            src_type = record["src_label"]
            tgt_type = record["tgt_label"]

            if src_type in allowed_types and src_type not in nodes_map:
                nodes_map[str(record["src_id"])] = GraphNode(
                    id=str(record["src_id"]),
                    label=_get_node_label(src_type, record["src_props"]),
                    type=src_type,
                    properties=dict(record["src_props"]),
                    risk_score=record["src_props"].get("risk_score"),
                )

            if tgt_type in allowed_types and tgt_type not in nodes_map:
                nodes_map[str(record["tgt_id"])] = GraphNode(
                    id=str(record["tgt_id"]),
                    label=_get_node_label(tgt_type, record["tgt_props"]),
                    type=tgt_type,
                    properties=dict(record["tgt_props"]),
                    risk_score=record["tgt_props"].get("risk_score"),
                )

            rel_props = dict(record["rel_props"])
            edges.append(GraphEdge(
                id=str(record["rel_id"]),
                source=str(record["src_id"]),
                target=str(record["tgt_id"]),
                relationship_type=record["rel_type"],
                properties=rel_props,
                confidence=float(rel_props.get("confidence", 0.5)),
                timestamp=rel_props.get("first_ts"),
            ))

    return GraphResponse(
        nodes=list(nodes_map.values()),
        edges=edges,
        total_nodes=len(nodes_map),
        total_edges=len(edges),
        case_id=case_id,
    )


@router.get("/cases/{case_id}/graph/persons/{person_id}")
async def get_person_neighbors(
    case_id: str,
    person_id: str,
    depth: int = Query(1, ge=1, le=3),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get all neighbors of a specific person node for drill-down exploration."""
    async with neo4j_session() as session:
        result = await session.run(
            """
            MATCH (p:Person {person_id: $person_id})
            MATCH (p)-[r*1..$depth]-(neighbor)
            RETURN p, r, neighbor
            LIMIT 100
            """,
            person_id=person_id,
            depth=depth,
        )
        records = [dict(r) async for r in result]

    return {"person_id": person_id, "neighbors": records}


def _get_node_label(node_type: str, props: dict) -> str:
    """Extract a display label from node properties."""
    if node_type == "Person":
        return props.get("display_alias", props.get("person_id", "Unknown Person"))[:30]
    elif node_type == "Device":
        return f"Device: {props.get('device_fingerprint', 'Unknown')[:20]}"
    elif node_type == "Platform":
        return props.get("name", "Platform")
    elif node_type == "Location":
        lat = props.get("lat", 0)
        lon = props.get("lon", 0)
        return f"({lat:.3f}, {lon:.3f})"
    elif node_type == "FileEvidence":
        return f"File: {props.get('mime_type', 'unknown')[:20]}"
    return props.get("name", node_type)
