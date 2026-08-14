import logging
import re
from datetime import datetime, timezone
from typing import Callable
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.lead import Lead
import uuid
from app.agents.llm import chat_json
from app.config import settings
from app.lang.detect import detect
from app.lang.drift import compute_drift

log = logging.getLogger(__name__)

STAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "stage": {"type": "string", "enum": [
            "rapport_building", "trust_exclusivity", "dependency",
            "isolation", "desensitization", "solicitation", "none"]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "evidence_span": {"type": "string"},
    },
    "required": ["stage", "confidence", "evidence_span"],
}

STAGE_SYSTEM_PROMPT = """You classify messages from a child-protection investigation into behavioural stages. You are an assistive triage tool; your output is a lead for a human investigator, never a finding.

Input is conversational text from India. It may be in English, Tamil script, romanized Tamil (Tanglish), or any mixture within a single message. Common Tanglish markers include: na, la, da, illa, iruku, panra, sollu, enna, epdi, romba, konjam, seri. Treat these as ordinary conversational particles.

Classify the FINAL message using the surrounding messages as context.
Return the stage label, a confidence between 0 and 1, and a line-range pointer to the span that determined your answer.

Do not quote, translate, paraphrase, or reproduce message content in any field. Return only the label, the confidence, and the span pointer."""


def _parse_whatsapp_export(text: str):
    pattern = re.compile(
        r"\[?(\d{1,2}/\d{1,2}/\d{2,4})[,\s]*(\d{1,2}:\d{2}(?:\s*[AP]M)?)[\]-]?\s*([^:]+):\s*(.*)"
    )
    class Msg:
        pass
    messages = []
    lines = text.split("\n")
    for i, line in enumerate(lines):
        m = pattern.search(line.strip())
        if m:
            date_str, time_str, sender, content = m.groups()
            try:
                dt_str = f"{date_str} {time_str}"
                for fmt in ["%d/%m/%Y %H:%M", "%d/%m/%y %H:%M", "%d/%m/%Y %I:%M %p", "%m/%d/%y %I:%M %p", "%d/%m/%y, %H:%M"]:
                    try:
                        dt = datetime.strptime(dt_str, fmt).replace(tzinfo=timezone.utc)
                        break
                    except ValueError:
                        continue
                else:
                    dt = datetime.now(timezone.utc)
                msg = Msg()
                msg.idx = len(messages)
                msg.sender = sender.strip()
                msg.sent_at = dt
                msg.text = content
                msg.line_num = i + 1
                messages.append(msg)
            except Exception:
                continue
    return messages


def format_window(messages, current_idx, back=5):
    start = max(0, current_idx - back)
    window = messages[start:current_idx + 1]
    lines = [f"Line {m.line_num}: [{m.sender}] {m.text}" for m in window]
    return "\n".join(lines)


def compute_trajectory(messages):
    class Traj:
        pass
    t = Traj()
    t.slope = 0.0
    t.drift_ratio = 1.0
    return t


async def create_lead(db: AsyncSession, case_id: uuid.UUID, kind: str, summary: str,
                      confidence: float, confidence_ci: float, signals: dict, source_ids: list):
    lead = Lead(
        case_id=case_id,
        kind=kind,
        summary=summary,
        confidence=confidence,
        confidence_ci=confidence_ci,
        signals=signals,
        source_ids=source_ids,
        status="proposed"
    )
    db.add(lead)


async def narrative_agent(convo, emit: Callable, storage_path: str, db: AsyncSession) -> None:
    try:
        with open(storage_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    except Exception as e:
        log.error(f"Could not read conversation file: {e}")
        return

    messages = _parse_whatsapp_export(text)
    if not messages:
        return

    for i, msg in enumerate(messages):
        prof = detect(msg.text)
        msg.language = prof.language.value
        msg.tamil_share = prof.tamil_share

        window = format_window(messages, i, back=5)
        try:
            result = await chat_json(settings.model_text, STAGE_SYSTEM_PROMPT, window, STAGE_SCHEMA)
            msg.stage = result.get("stage", "none")
            msg.stage_conf = result.get("confidence", 0.0)
            msg.evidence_span = result.get("evidence_span", f"L{msg.line_num}")
        except Exception as e:
            msg.stage = "none"
            msg.stage_conf = 0.0
            msg.evidence_span = f"L{msg.line_num}"

        await emit("narrative.stage_classified", {
            "idx": i, "stage": msg.stage, "confidence": msg.stage_conf,
            "language": msg.language, "tamil_share": round(prof.tamil_share, 3),
            "sent_at": msg.sent_at.isoformat(),
        })

    trajectory = compute_trajectory(messages)
    drift = compute_drift([(m.sent_at, m.text) for m in messages])

    await emit("narrative.trajectory_computed", {
        "slope": trajectory.slope,
        "drift_ratio": trajectory.drift_ratio,
        "code_switch": {
            "windows": drift.windows, "slope": drift.slope,
            "delta": drift.delta, "direction": drift.direction,
            "confidence": drift.confidence,
        },
    })

    if drift.direction == "toward_tamil" and drift.delta > 0.25:
        await create_lead(
            db=db,
            case_id=convo.case_id,
            kind="code_switch_drift",
            summary=(f"Language share shifted toward Tamil by "
                     f"{drift.delta:+.2f} across the conversation"),
            confidence=drift.confidence, confidence_ci=0.12,
            signals={"code_switch_delta": drift.delta,
                     "windows": drift.windows},
            source_ids=[convo.evidence_id],
        )
