from itertools import combinations
from statistics import pstdev
from app.lang.stylometry import similarity, fingerprint
from app.models.graph import Edge
from app.models.lead import Lead

def temporal_overlap(a_hours, b_hours) -> float:
    return 0.5  # Stub for real temporal logic

def metadata_match(a_devices, b_devices) -> float:
    return 0.5  # Stub for real metadata matching

def cosine(a_vec, b_vec) -> float:
    return 0.5  # Stub for embedding cosine similarity

class IdentityNode:
    def __init__(self, node_id, evidence_ids, messages, activity_hours, devices, centroid):
        self.node_id = node_id
        self.evidence_ids = evidence_ids
        self.messages = messages
        self.activity_hours = activity_hours
        self.devices = devices
        self.centroid = centroid

async def get_identities(case_id: str) -> list[IdentityNode]:
    # In real app, query database for chat participant nodes
    return []

async def lead_from_edge(edge: Edge) -> Lead:
    return Lead(
        case_id=edge.case_id,
        kind=edge.kind,
        summary=f"Identity link proposed with confidence {edge.confidence}",
        confidence=edge.confidence,
        confidence_ci=edge.confidence_ci,
        signals=edge.signals,
        source_ids=edge.source_ids,
        status="proposed"
    )

async def link_agent(case_id: str) -> list[Edge]:
    identities = await get_identities(case_id)
    edges = []

    for a, b in combinations(identities, 2):
        sty  = similarity(fingerprint(a.messages), fingerprint(b.messages))
        temp = temporal_overlap(a.activity_hours, b.activity_hours)
        meta = metadata_match(a.devices, b.devices)
        emb  = cosine(a.centroid, b.centroid)

        score = 0.35 * sty + 0.25 * temp + 0.20 * meta + 0.20 * emb
        if score < 0.40:
            continue

        spread = pstdev([sty, temp, meta, emb])
        edges.append(Edge(
            case_id=case_id,
            src_id=a.node_id, 
            dst_id=b.node_id, 
            kind="same_identity_as",
            confidence=round(score, 3),
            confidence_ci=round(min(0.25, spread), 3),
            signals={"stylometry": sty, "temporal": temp,
                     "device_metadata": meta, "embedding": emb,
                     "tamil_share_a": fingerprint(a.messages).tamil_share,
                     "tamil_share_b": fingerprint(b.messages).tamil_share},
            source_ids=a.evidence_ids + b.evidence_ids,
        ))
    return edges
