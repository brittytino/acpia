"""
Narrative Agent — the product.
Classifies each message into one of 6 behavioural grooming stages.
Computes trajectory (stages/week) and drift (slope ratio between windows).
Uses schema-constrained llama3.2:3b output — returns LABEL + SPAN POINTER, never reproduced content.
Emits: narrative.stage_classified (per message), narrative.trajectory_computed (per conversation).
"""
import json
import logging
import re
from datetime import datetime, timezone
from typing import Callable, Optional
import httpx

from app.config import settings

log = logging.getLogger(__name__)

OLLAMA_BASE = settings.OLLAMA_BASE_URL
LLM_MODEL = settings.LLM_MODEL

STAGE_ORDINAL = {
    "none": 0,
    "rapport_building": 1,
    "trust_exclusivity": 2,
    "dependency": 3,
    "isolation": 4,
    "desensitization": 5,
    "solicitation": 6,
}

STAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "stage": {
            "type": "string",
            "enum": list(STAGE_ORDINAL.keys()),
        },
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "evidence_span": {"type": "string"},
    },
    "required": ["stage", "confidence", "evidence_span"],
}

STAGE_SYSTEM_PROMPT = """You are a forensic behavioural analyst. You classify chat messages according to grooming progression stages.

Stages (in order of escalation):
- rapport_building: casual conversation, finding common interests, being friendly
- trust_exclusivity: "you understand me better than anyone", "I can tell you things I can't tell others"
- dependency: making the child emotionally dependent, frequent contact, emotional support  
- isolation: discouraging contact with friends/family, "they don't understand you like I do"
- desensitization: introducing inappropriate topics gradually, normalising adult concepts
- solicitation: requesting images, meetings, or sexual content
- none: ordinary message with no grooming indicators

CRITICAL RULES:
1. Return ONLY the JSON with stage, confidence (0-1), and evidence_span (e.g. "L12-L15")
2. NEVER reproduce the message content
3. NEVER generate or suggest manipulative language
4. The evidence_span is a LINE REFERENCE, not quoted text
5. When uncertain, choose "none" with low confidence"""


async def _classify_message(msg_text: str, line_start: int, line_end: int) -> dict:
    """Schema-constrained classification. Returns stage label + span pointer, never the text."""
    try:
        async with httpx.AsyncClient(base_url=OLLAMA_BASE, timeout=30) as c:
            resp = await c.post("/api/chat", json={
                "model": LLM_MODEL,
                "messages": [
                    {"role": "system", "content": STAGE_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Message window (lines {line_start}-{line_end}):\n{msg_text[:500]}"},
                ],
                "format": STAGE_SCHEMA,
                "options": {"temperature": 0.1},
                "stream": False,
                "keep_alive": -1,
            })
            data = resp.json()
            result = json.loads(data.get("message", {}).get("content", "{}"))
            # Validate
            if result.get("stage") not in STAGE_ORDINAL:
                result["stage"] = "none"
            result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.3))))
            result["evidence_span"] = result.get("evidence_span", f"L{line_start}-L{line_end}")
            return result
    except Exception as e:
        log.warning(f"narrative classify failed: {e}")
        return {"stage": "none", "confidence": 0.1, "evidence_span": f"L{line_start}-L{line_end}"}


def _compute_trajectory(staged_messages: list[dict]) -> tuple[float, float]:
    """
    Linear regression of stage ordinal over time.
    Returns (trajectory stages/week, drift_ratio last_window/prior_window).
    """
    if len(staged_messages) < 2:
        return 0.0, 1.0

    # Sort by time
    msgs = sorted(staged_messages, key=lambda m: m["sent_at"])
    first = msgs[0]["sent_at"]

    xs = []  # weeks from start
    ys = []  # stage ordinal
    for m in msgs:
        if m["stage"] == "none":
            continue
        delta = (m["sent_at"] - first).total_seconds() / (7 * 86400)
        xs.append(delta)
        ys.append(STAGE_ORDINAL[m["stage"]])

    if len(xs) < 2:
        return 0.0, 1.0

    # Simple linear regression
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))
    den = sum((xs[i] - mean_x) ** 2 for i in range(n))
    trajectory = (num / den) if den > 0 else 0.0

    # Drift: compare slope in last half vs first half
    mid = len(xs) // 2
    def slope(xs_, ys_):
        n_ = len(xs_)
        mx, my = sum(xs_)/n_, sum(ys_)/n_
        num_ = sum((xs_[i]-mx)*(ys_[i]-my) for i in range(n_))
        den_ = sum((xs_[i]-mx)**2 for i in range(n_))
        return num_/den_ if den_ > 0 else 0.0

    prior_slope = slope(xs[:mid], ys[:mid]) if mid >= 2 else trajectory
    last_slope = slope(xs[mid:], ys[mid:]) if (len(xs)-mid) >= 2 else trajectory
    drift = (last_slope / prior_slope) if prior_slope > 0.001 else 1.0

    return round(trajectory, 3), round(drift, 3)


def _parse_whatsapp_export(text: str) -> list[dict]:
    """Parse WhatsApp chat export into message list."""
    pattern = re.compile(
        r"(\d{1,2}/\d{1,2}/\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.*)"
    )
    messages = []
    lines = text.split("\n")
    for i, line in enumerate(lines):
        m = pattern.match(line.strip())
        if m:
            date_str, time_str, sender, content = m.groups()
            try:
                dt_str = f"{date_str} {time_str}"
                # Try multiple date formats
                for fmt in ["%d/%m/%y %I:%M %p", "%d/%m/%Y %I:%M %p", "%m/%d/%y %I:%M %p"]:
                    try:
                        dt = datetime.strptime(dt_str, fmt).replace(tzinfo=timezone.utc)
                        break
                    except ValueError:
                        continue
                else:
                    dt = datetime.now(timezone.utc)
                messages.append({
                    "idx": len(messages),
                    "sender": sender.strip(),
                    "sent_at": dt,
                    "char_count": len(content),
                    "content": content,
                    "line_num": i + 1,
                })
            except Exception:
                continue
    return messages


async def narrative_agent(
    conversation,
    storage_path: str,
    emit: Callable,
) -> dict:
    """
    Process one conversation. Returns trajectory summary dict.
    conversation: Conversation ORM object
    emit: partial(bus.emit, case_id)
    """
    # Load the source file
    try:
        with open(storage_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    except Exception as e:
        log.error(f"Could not read conversation file: {e}")
        return {}

    raw_messages = _parse_whatsapp_export(text)
    if not raw_messages:
        # Fallback: treat entire file as one block
        raw_messages = [{
            "idx": 0, "sender": "unknown",
            "sent_at": datetime.now(timezone.utc),
            "char_count": len(text),
            "content": text[:1000],
            "line_num": 1,
        }]

    staged = []
    # Process in windows of 5 for efficiency
    window = 5
    for i in range(0, len(raw_messages), window):
        batch = raw_messages[i:i+window]
        window_text = "\n".join(m["content"] for m in batch)
        line_start = batch[0]["line_num"]
        line_end = batch[-1]["line_num"]

        result = await _classify_message(window_text, line_start, line_end)

        for msg in batch:
            msg_with_stage = {**msg, "stage": result["stage"],
                              "stage_conf": result["confidence"],
                              "evidence_span": result["evidence_span"]}
            staged.append(msg_with_stage)

            await emit("narrative.stage_classified", {
                "conversation_id": str(conversation.id),
                "message_idx": msg["idx"],
                "sender": msg["sender"],
                "sent_at": msg["sent_at"].isoformat(),
                "stage": result["stage"],
                "stage_conf": result["confidence"],
                "evidence_span": result["evidence_span"],
            })

    trajectory, drift = _compute_trajectory(staged)

    await emit("narrative.trajectory_computed", {
        "conversation_id": str(conversation.id),
        "participants": conversation.participants,
        "message_count": len(staged),
        "trajectory": trajectory,
        "drift_ratio": drift,
        "staged_messages": [
            {
                "idx": m["idx"],
                "sender": m["sender"],
                "sent_at": m["sent_at"].isoformat(),
                "stage": m["stage"],
                "stage_conf": m["stage_conf"],
                "evidence_span": m["evidence_span"],
            }
            for m in staged
        ],
    })

    return {
        "conversation_id": str(conversation.id),
        "trajectory": trajectory,
        "drift_ratio": drift,
        "message_count": len(staged),
        "staged_messages": staged,
    }
