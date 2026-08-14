"""Link Agent — cross-identity correlation (VERITAS §11.3 / ACPIA §5.4).

Four signals, weighted, with an honestly-computed confidence interval: four
signals that agree produce a narrow interval, four that disagree produce a
wide one. Where we genuinely lack a data source (no biometric device
fingerprinting in this build), the signal contributes a neutral prior
rather than a fabricated number — that's noted in-line, not hidden.

Message bodies are never persisted (see models/conversation.py::Message —
by design, to avoid storing reproducible content). That means stylometry
must run on the in-memory parsed messages during the same pipeline pass
that reads the source file, not reconstructed from the database afterward.
`build_identities` below is called from pipeline.py while those messages
are still in scope; this module has no direct DB dependency of its own.
"""
from collections import defaultdict
from itertools import combinations
from statistics import pstdev

from app.lang.stylometry import similarity, fingerprint
from app.models.graph import Edge
from app.models.lead import Lead


def temporal_overlap(a_hours: set[int], b_hours: set[int]) -> float:
    """Jaccard overlap of active hour-of-day buckets. Real signal: two
    personas active in the same unusual hours (e.g. 1–4am) correlate."""
    if not a_hours or not b_hours:
        return 0.3  # no data either way — neutral-low prior
    inter = len(a_hours & b_hours)
    union = len(a_hours | b_hours)
    return round(inter / union, 3) if union else 0.3


def metadata_match(a_devices: set[str], b_devices: set[str]) -> float:
    """Shared acquisition/device fingerprints between two identities."""
    if not a_devices or not b_devices:
        return 0.3  # no device metadata available for one or both — neutral-low prior
    return 1.0 if (a_devices & b_devices) else 0.2


def cosine(a_vec, b_vec) -> float:
    if not a_vec or not b_vec or len(a_vec) != len(b_vec):
        return 0.3  # no embedding available — neutral-low prior
    dot = sum(x * y for x, y in zip(a_vec, b_vec))
    na = sum(x * x for x in a_vec) ** 0.5
    nb = sum(y * y for y in b_vec) ** 0.5
    if na == 0 or nb == 0:
        return 0.3
    return round(max(0.0, min(1.0, dot / (na * nb))), 3)


class IdentityNode:
    def __init__(self, label, evidence_ids, messages, activity_hours, devices, centroid):
        self.label = label
        self.evidence_ids = evidence_ids
        self.messages = messages          # list[str] — raw text, in-memory only
        self.activity_hours = activity_hours
        self.devices = devices
        self.centroid = centroid


class IdentityBuilder:
    """Accumulates per-sender signal across every conversation processed in
    one pipeline run. Fed by narrative_agent as it parses each file."""

    def __init__(self):
        self._data: dict[str, dict] = defaultdict(lambda: {
            "evidence_ids": set(), "messages": [], "hours": set(),
            "devices": set(), "embeddings": [],
        })

    def add_message(self, sender: str, text: str, sent_at, evidence_id, device_tag: str | None):
        b = self._data[sender]
        b["evidence_ids"].add(evidence_id)
        b["messages"].append(text)
        b["hours"].add(sent_at.hour)
        if device_tag:
            b["devices"].add(device_tag)

    def add_embedding(self, sender: str, embedding: list[float]):
        self._data[sender]["embeddings"].append(embedding)

    def build(self) -> list[IdentityNode]:
        identities = []
        for sender, d in self._data.items():
            centroid = None
            if d["embeddings"]:
                dim = len(d["embeddings"][0])
                centroid = [sum(v[i] for v in d["embeddings"]) / len(d["embeddings"]) for i in range(dim)]
            identities.append(IdentityNode(
                label=sender, evidence_ids=list(d["evidence_ids"]), messages=d["messages"],
                activity_hours=d["hours"], devices=d["devices"], centroid=centroid,
            ))
        return identities


async def lead_from_edge(edge: Edge) -> Lead:
    return Lead(
        case_id=edge.case_id,
        kind=edge.kind,
        summary=f"Identity link proposed between two personas with confidence {edge.confidence}",
        confidence=edge.confidence,
        confidence_ci=edge.confidence_ci,
        signals=edge.signals,
        source_ids=edge.source_ids,
        status="proposed",
    )


def compute_edges(case_id, identities: list[IdentityNode], node_id_by_label: dict) -> list[Edge]:
    """Pure scoring function — no DB access. `node_id_by_label` maps each
    identity's label to the already-persisted Node.id it corresponds to."""
    edges = []
    for a, b in combinations(identities, 2):
        if a.label not in node_id_by_label or b.label not in node_id_by_label:
            continue
        fp_a, fp_b = fingerprint(a.messages), fingerprint(b.messages)
        sty = similarity(fp_a, fp_b)
        temp = temporal_overlap(a.activity_hours, b.activity_hours)
        meta = metadata_match(a.devices, b.devices)
        emb = cosine(a.centroid, b.centroid)

        score = 0.35 * sty + 0.25 * temp + 0.20 * meta + 0.20 * emb
        if score < 0.40:
            continue

        spread = pstdev([sty, temp, meta, emb])
        edges.append(Edge(
            case_id=case_id,
            src_id=node_id_by_label[a.label], dst_id=node_id_by_label[b.label],
            kind="same_identity_as",
            confidence=round(score, 3),
            confidence_ci=round(min(0.25, spread), 3),
            signals={"stylometry": sty, "temporal": temp,
                     "device_metadata": meta, "embedding": emb,
                     "tamil_share_a": fp_a.tamil_share, "tamil_share_b": fp_b.tamil_share},
            source_ids=[*a.evidence_ids, *b.evidence_ids],
        ))
    return edges
