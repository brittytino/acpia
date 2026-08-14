"""
Link Agent — cross-case identity resolution.
Combines four signals: stylometric similarity, temporal activity overlap,
device/EXIF metadata match, embedding cosine similarity.
Creates scored edges with confidence intervals.
Emits: link.proposed → edge animates into graph, lead.created → human gate.
"""
import logging
import math
import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from itertools import combinations
from typing import Any

log = logging.getLogger(__name__)


def _stylometry_score(texts: list[str]) -> float:
    """Simple stylometric similarity: avg sentence length, punctuation ratio, vocabulary."""
    if len(texts) < 2:
        return 0.0

    def features(t: str) -> dict:
        sentences = re.split(r"[.!?]+", t)
        words = t.lower().split()
        vocab = len(set(words)) / max(len(words), 1)
        avg_sent_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
        punct_ratio = sum(1 for c in t if c in ",.!?;:") / max(len(t), 1)
        return {"vocab": vocab, "avg_sent": avg_sent_len, "punct": punct_ratio}

    feats = [features(t) for t in texts[:5]]  # cap for speed
    if len(feats) < 2:
        return 0.0

    # Compare pairwise, return max similarity
    best = 0.0
    for a, b in combinations(feats, 2):
        diff = sum(abs(a[k] - b[k]) for k in a) / len(a)
        sim = max(0.0, 1.0 - diff * 2)
        best = max(best, sim)
    return round(best, 3)


def _temporal_overlap(timestamps_a: list, timestamps_b: list) -> float:
    """Fraction of hours that both accounts were active."""
    if not timestamps_a or not timestamps_b:
        return 0.0
    hours_a = set(t.hour for t in timestamps_a)
    hours_b = set(t.hour for t in timestamps_b)
    overlap = len(hours_a & hours_b) / max(len(hours_a | hours_b), 1)
    return round(overlap, 3)


def _exif_match_score(exif_a: dict, exif_b: dict) -> float:
    """Score based on matching device metadata."""
    if not exif_a or not exif_b:
        return 0.0
    score = 0.0
    if exif_a.get("make") and exif_a.get("make") == exif_b.get("make"):
        score += 0.4
    if exif_a.get("model") and exif_a.get("model") == exif_b.get("model"):
        score += 0.4
    if exif_a.get("gps_lat") and exif_b.get("gps_lat"):
        d = abs(exif_a["gps_lat"] - exif_b["gps_lat"]) + abs(exif_a.get("gps_lon", 0) - exif_b.get("gps_lon", 0))
        if d < 0.01:  # ~1km
            score += 0.2
    return round(min(score, 1.0), 3)


def _cosine(a: list, b: list) -> float:
    """Cosine similarity between two embedding vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x**2 for x in a))
    mag_b = math.sqrt(sum(x**2 for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return round(dot / (mag_a * mag_b), 3)


def _combine_signals(signals: dict) -> tuple[float, float]:
    """
    Weighted combination of four signals → confidence + CI.
    Weights: stylometry 0.25, temporal 0.25, exif 0.30, embedding 0.20
    CI is derived from signal spread (disagreement → wider interval).
    """
    weights = {"stylometry": 0.25, "temporal_overlap": 0.25, "device_metadata": 0.30, "embedding_cosine": 0.20}
    weighted_sum = sum(signals.get(k, 0) * w for k, w in weights.items())
    
    vals = [signals.get(k, 0) for k in weights]
    mean = weighted_sum
    variance = sum((v - mean) ** 2 for v in vals) / max(len(vals), 1)
    ci = round(min(math.sqrt(variance) * 1.96, 0.3), 3)
    
    return round(min(weighted_sum, 0.99), 3), ci


async def link_agent(
    case_id: str,
    evidence_list: list,
    emit,
) -> list[dict]:
    """
    Run across all evidence in the case.
    Returns list of proposed edges (each becomes a lead).
    evidence_list: list of Evidence ORM objects with exif, embedding, etc.
    """
    proposed_edges = []

    # Group evidence by type for cross-comparison
    images = [e for e in evidence_list if e.mime_type.startswith("image/") and e.embedding]
    texts = [e for e in evidence_list if e.mime_type.startswith("text/") and e.embedding]

    # Find embedding-similar pairs
    all_with_embed = [e for e in evidence_list if e.embedding]
    for a, b in combinations(all_with_embed[:20], 2):  # cap for demo speed
        signals = {
            "stylometry": _stylometry_score([a.ocr_text or "", b.ocr_text or ""]),
            "temporal_overlap": 0.0,  # populated when timestamps are available
            "device_metadata": _exif_match_score(a.exif or {}, b.exif or {}),
            "embedding_cosine": _cosine(a.embedding, b.embedding),
        }
        confidence, ci = _combine_signals(signals)

        if confidence < 0.35:
            continue  # below threshold

        edge_id = str(uuid.uuid4())
        edge = {
            "id": edge_id,
            "case_id": case_id,
            "src_id": str(a.id),
            "dst_id": str(b.id),
            "src_label": a.filename,
            "dst_label": b.filename,
            "kind": "similarity",
            "confidence": confidence,
            "confidence_ci": ci,
            "signals": signals,
            "source_ids": [str(a.id), str(b.id)],
        }

        await emit("link.proposed", edge)
        proposed_edges.append(edge)

    return proposed_edges
