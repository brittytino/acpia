"""Authenticity Agent — the second half of the two-score model (VERITAS §7).

Integrity (SHA-256 chain) and authenticity are never the same number.
Integrity is binary and certain. Authenticity is an indicator count, never
a score, and every indicator ships with its innocent explanation — because
no detector, ours included, can tell a fabricated screenshot from a real
one with forensic reliability. We surface signals; a human weighs them.
"""
import logging
from datetime import timedelta
from typing import Optional

log = logging.getLogger(__name__)


def assess_authenticity(evidence_record) -> list[dict]:
    """Returns a list of {kind, detail, caveat, severity} indicators for one
    Evidence row. Never returns a verdict, a score, or a boolean."""
    indicators: list[dict] = []
    mime = evidence_record.mime_type or ""
    exif = evidence_record.exif or {}

    if mime.startswith("image/"):
        if not exif.get("gps_lat") and not exif.get("make") and not exif.get("model"):
            indicators.append({
                "kind": "no_camera_metadata",
                "detail": "No camera make, model, or GPS metadata is present in this image.",
                "caveat": "Messaging platforms routinely strip EXIF data on upload - "
                          "this is common for genuine screenshots too, not just fabricated ones.",
                "severity": "low",
            })

    claimed_at = getattr(evidence_record, "claimed_at", None)
    sealed_at = getattr(evidence_record, "created_at", None)
    if claimed_at and sealed_at:
        gap = abs((sealed_at - claimed_at).total_seconds())
        if gap > timedelta(days=1).total_seconds():
            days = round(gap / 86400, 1)
            indicators.append({
                "kind": "sealed_long_after_claimed",
                "detail": f"Sealed {days} days after the claimed date of the underlying event.",
                "caveat": "Delayed reporting is extremely common for genuine victims and does "
                          "not, by itself, indicate fabrication.",
                "severity": "medium" if days > 14 else "low",
            })

    exif_dt = exif.get("datetime")
    if exif_dt and claimed_at:
        try:
            from datetime import datetime
            embedded = datetime.strptime(exif_dt, "%Y:%m:%d %H:%M:%S").replace(
                tzinfo=claimed_at.tzinfo
            )
            gap = abs((embedded - claimed_at).total_seconds())
            if gap > timedelta(days=1).total_seconds():
                indicators.append({
                    "kind": "metadata_claim_mismatch",
                    "detail": "The file's own embedded date differs from the claimed date by "
                              f"more than a day ({round(gap / 86400, 1)} days).",
                    "caveat": "Re-saving, forwarding, or transferring a file can rewrite its "
                              "embedded timestamp without any intent to deceive.",
                    "severity": "high",
                })
        except (ValueError, TypeError):
            pass

    return indicators
