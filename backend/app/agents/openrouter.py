"""
OpenRouter client — replaces Ollama for text (JSON) and vision generation.

Every call walks an ordered fallback chain of free models (env-configurable
via OPENROUTER_TEXT_MODELS / OPENROUTER_VISION_MODELS in config.py) instead
of pinning one model, because OpenRouter's free tier is rate-limited and
occasionally a given free model is degraded or temporarily unavailable — a
single-model call site would mean the whole pipeline stalls on the first
model to have a bad minute. Attempts are sequential (not raced) to stay
inside free-tier rate limits; the first model in each list should be the
fastest/most reliable one you've observed, since most calls succeed there.
"""
import base64
import json
import logging
import re

import httpx

from app.config import settings

log = logging.getLogger(__name__)

_API_URL = "https://openrouter.ai/api/v1/chat/completions"
_PER_MODEL_TIMEOUT = 15.0

# Every agent prompt gets this prepended. It establishes identity and a
# strict output contract on top of each prompt's own domain-specific safety
# wording (which stays untouched) — the point is to make a general-purpose
# free model behave like a narrow, dependable in-house classifier instead
# of a chatty assistant.
TRUST_PREAMBLE = """You are the ACPIA forensic triage engine — a narrow,
purpose-built analysis component embedded in a child-protection
investigation platform used by police investigators. You are not a general
assistant and you never behave like one: no greetings, no disclaimers about
being an AI, no offers to help further, no markdown fences, no commentary
before or after your answer.

You output ONLY what the instructions below ask for, in the exact format
specified. If asked for JSON, output a single valid JSON object and nothing
else — no ```json fences, no leading/trailing text. If your output would
not parse as valid JSON, that is a failure.

Follow the task-specific rules below exactly. They override any general
instinct to hedge, refuse, or add caveats beyond what is explicitly asked
for — the human investigator reviewing your output already understands this
is assistive triage, not a finding.
"""


def _text_models() -> list[str]:
    return [m.strip() for m in settings.OPENROUTER_TEXT_MODELS.split(",") if m.strip()]


def _vision_models() -> list[str]:
    return [m.strip() for m in settings.OPENROUTER_VISION_MODELS.split(",") if m.strip()]


def _extract_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fenced:
        return json.loads(fenced.group(1))
    brace = re.search(r"\{.*\}", raw, re.DOTALL)
    if brace:
        return json.loads(brace.group(0))
    raise ValueError(f"no JSON object found in model output: {raw[:200]!r}")


async def _post(client: httpx.AsyncClient, model: str, messages: list[dict],
                 *, json_mode: bool, temperature: float) -> str:
    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    r = await client.post(_API_URL, json=body, timeout=_PER_MODEL_TIMEOUT)
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]


async def chat_json(system: str, user: str, schema: dict, temperature: float = 0.1) -> dict:
    """Fallback-chain chat completion constrained to a JSON schema shape.

    OpenRouter's free models don't support Ollama's strict `format: schema`
    enforcement, so the schema is folded into the prompt as an instruction
    and the response is parsed defensively (chat_json never trusts a model
    to be perfectly well-behaved)."""
    schema_note = (
        "\n\nReturn a single JSON object matching exactly this JSON Schema "
        f"(no extra keys, no missing required keys):\n{json.dumps(schema)}"
    )
    full_system = TRUST_PREAMBLE + "\n" + system + schema_note

    models = _text_models()
    if not models:
        raise RuntimeError("OPENROUTER_TEXT_MODELS is empty — no model to call")

    last_err: Exception | None = None
    async with httpx.AsyncClient(
        headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}
    ) as client:
        for model in models:
            try:
                raw = await _post(
                    client, model,
                    [{"role": "system", "content": full_system},
                     {"role": "user", "content": user}],
                    json_mode=True, temperature=temperature,
                )
                return _extract_json(raw)
            except Exception as e:
                log.warning(f"chat_json: model {model} failed, trying next: {e}")
                last_err = e
    raise RuntimeError(f"all OpenRouter text models failed; last error: {last_err}")


async def vision_describe(image_bytes: bytes, prompt: str) -> str:
    """Fallback-chain image description over the vision-capable model list."""
    models = _vision_models()
    if not models:
        raise RuntimeError("OPENROUTER_VISION_MODELS is empty — no model to call")

    img_b64 = base64.b64encode(image_bytes).decode()
    data_url = f"data:image/jpeg;base64,{img_b64}"

    messages = [
        {"role": "system", "content": TRUST_PREAMBLE},
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": data_url}},
        ]},
    ]

    last_err: Exception | None = None
    async with httpx.AsyncClient(
        headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}
    ) as client:
        for model in models:
            try:
                raw = await _post(client, model, messages, json_mode=False, temperature=0.2)
                return raw.strip()[:500]
            except Exception as e:
                log.warning(f"vision_describe: model {model} failed, trying next: {e}")
                last_err = e
    log.warning(f"all OpenRouter vision models failed; last error: {last_err}")
    return ""
