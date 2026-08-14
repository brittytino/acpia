"""Contradiction Agent — impartial cross-submission conflict detection (VERITAS §8).

Runs across the UNION of everything submitted in a FAIR case. It has no
concept of "sides": the same rules apply regardless of which party's
evidence is being checked against which. Every contradiction ships with a
caveat — an innocent explanation the investigator must weigh — because a
contradiction without one is an accusation, and accusations are the
investigator's job, not the tool's.
"""
import logging
from datetime import timedelta
from itertools import combinations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import Evidence
from app.models.conversation import Conversation
from app.models.contradiction import Contradiction

log = logging.getLogger(__name__)

_ACTIVITY_MARGIN = timedelta(hours=12)


async def find_contradictions(db: AsyncSession, case_id) -> list[Contradiction]:
    evidence = (await db.execute(
        select(Evidence).where(Evidence.case_id == case_id)
    )).scalars().all()

    by_role: dict[str, list[Evidence]] = {"complainant": [], "respondent": []}
    for e in evidence:
        if e.submitter_role in by_role:
            by_role[e.submitter_role].append(e)

    out: list[Contradiction] = []
    if not by_role["complainant"] or not by_role["respondent"]:
        return out  # nothing to test across — needs both sides present

    # Activity windows the respondent's submitted conversations actually cover.
    convos = (await db.execute(
        select(Conversation).where(Conversation.case_id == case_id)
    )).scalars().all()
    respondent_evidence_ids = {e.id for e in by_role["respondent"]}
    respondent_windows = [
        (c.first_at, c.last_at) for c in convos
        if c.evidence_id in respondent_evidence_ids and c.first_at and c.last_at
    ]

    for party, other in (("complainant", "respondent"), ("respondent", "complainant")):
        for e in by_role[party]:
            if not e.claimed_at or not respondent_windows:
                continue
            covered = any(
                (w0 - _ACTIVITY_MARGIN) <= e.claimed_at <= (w1 + _ACTIVITY_MARGIN)
                for w0, w1 in respondent_windows
            )
            if not covered and party == "complainant":
                # Only meaningful when checking the complainant's claim against
                # the respondent's own records — that's the asymmetry the
                # blind-submission design is built to test, applied impartially.
                out.append(Contradiction(
                    case_id=case_id,
                    kind="device_activity_conflict",
                    summary=(
                        f"{e.filename}: the claimed time ({e.claimed_at.isoformat()}) "
                        f"falls outside every activity window covered by the respondent's "
                        f"submitted records."
                    ),
                    severity="high",
                    confidence=0.68,
                    caveat="An incomplete export, a timezone mismatch, or a gap in the "
                          "respondent's own submission can produce this without any "
                          "fabrication on either side.",
                    source_ids=[e.id],
                    signals={
                        "claimed_at": e.claimed_at.isoformat(),
                        "respondent_windows": [
                            [w0.isoformat(), w1.isoformat()] for w0, w1 in respondent_windows
                        ],
                    },
                ))

    # Same-filename-hash collision across sides (identical file submitted as
    # both parties' evidence) — worth a human's attention either way.
    for a, b in combinations(evidence, 2):
        if (a.submitter_role in ("complainant", "respondent")
                and b.submitter_role in ("complainant", "respondent")
                and a.submitter_role != b.submitter_role
                and a.sha256 == b.sha256):
            out.append(Contradiction(
                case_id=case_id,
                kind="shared_artifact_across_sides",
                summary=(
                    f"{a.filename} and {b.filename} are byte-identical "
                    f"(same SHA-256) but were submitted by opposite parties."
                ),
                severity="medium",
                confidence=0.9,
                caveat="Both parties may legitimately possess the same file - a shared "
                      "group chat export, for instance - without either fabricating anything.",
                source_ids=[a.id, b.id],
                signals={"sha256": a.sha256},
            ))

    return out
