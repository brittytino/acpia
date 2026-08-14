# ACPIA — Final Phase
## Ports, the Tanglish Engine, and everything remaining

**Version 4.0 — Final build document.** Read with `ACPIA_MASTER_SPECIFICATION.md`.
Frontends are done. This document covers what is left: **ports, the code-mix engine, the backend, the AI pipeline, integration, and the demo.**

---

## CONTENTS

1. [Honest status — what's actually left](#1-honest-status)
2. [New port scheme](#2-new-port-scheme)
3. [**The Tanglish Engine** — your strongest differentiator](#3-the-tanglish-engine)
4. [Backend — remaining work](#4-backend--remaining-work)
5. [AI pipeline — the three agents](#5-ai-pipeline--the-three-agents)
6. [Frontend — remaining wiring](#6-frontend--remaining-wiring)
7. [Demo dataset — the Tanglish persona](#7-demo-dataset--the-tanglish-persona)
8. [Golden path integration test](#8-golden-path-integration-test)
9. [Updated demo script](#9-updated-demo-script)
10. [Final checklist](#10-final-checklist)

---

## 1. HONEST STATUS

### Done
Both Next.js apps, all 7 Seal screens with WebCrypto hashing, Console dashboard/inbound/workspace, Escalation Timeline (Recharts), Knowledge Graph (Cytoscape), design tokens, `docker-compose.yml`, `agent/acquire.py` stub.

### Not done — and this is the whole remaining project

You listed no backend work in this session. Your frontends currently have nothing to talk to. **Everything below is backend, AI, and integration.** Budget accordingly: the UI is roughly 40% of the effort and it's finished; the other 60% is ahead of you.

| Area | State | Priority |
|---|---|---|
| Postgres schema + migrations | ❌ | **P0** |
| JWT auth | ❌ | **P0** |
| Seal endpoints (hash-only intake) | ❌ | **P0** |
| Reference code + inbound hash verification | ❌ | **P0** |
| Evidence upload + custody log | ❌ | **P0** |
| EventBus + WebSocket | ❌ | **P0** |
| Pipeline orchestrator | ❌ | **P0** |
| **Tanglish engine** | ❌ | **P0** — new, and your moat |
| Three agents | ❌ | **P0** |
| Leads + human gate constraints | ❌ | **P0** |
| Impact ledger endpoint | ❌ | P1 |
| BSA §63 certificate PDF | ❌ | P1 |
| Case report PDF | ❌ | P2 |
| Tanglish demo persona | ❌ | **P0** |

**Sequence: ports → schema → auth → seal/inbound → events → Tanglish engine → agents → pipeline → certificate.** Do not build out of order; each step depends on the one before.

---

## 2. NEW PORT SCHEME

The **478 series**. Sequential, memorable, and nothing common binds here.

| Service | Port | Was |
|---|---|---|
| PostgreSQL + pgvector | **47800** | 5432 / 54327 |
| Ollama | **47801** | 11434 / 11535 |
| FastAPI backend | **47802** | 8000 / 8765 |
| ACPIA Seal (public) | **47803** | 3000 |
| ACPIA Console (police) | **47804** | 3001 |

### 2.1 `docker-compose.yml`

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: acpia-postgres
    environment:
      POSTGRES_DB: acpia
      POSTGRES_USER: acpia
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}
    ports:
      - "127.0.0.1:47800:5432"     # localhost-bound only
    volumes:
      - acpia_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U acpia -d acpia"]
      interval: 5s
      retries: 10

  ollama:
    image: ollama/ollama:latest
    container_name: acpia-ollama
    ports:
      - "127.0.0.1:47801:11434"
    volumes:
      - acpia_ollama:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  acpia_pgdata:
  acpia_ollama:
```

Note `127.0.0.1:` on both. Neither database nor inference should be reachable from the network.

### 2.2 `backend/.env`

```bash
DATABASE_URL=postgresql+asyncpg://acpia:${POSTGRES_PASSWORD}@localhost:47800/acpia
OLLAMA_URL=http://localhost:47801
JWT_SECRET=            # openssl rand -base64 48
API_PORT=47802
CORS_ORIGINS=http://localhost:47803,http://localhost:47804
STORAGE_ROOT=./storage
MODEL_VISION=moondream
MODEL_TEXT=qwen2.5:3b
MODEL_EMBED=nomic-embed-text
```

### 2.3 Frontend env

`seal/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:47802
```

`police-console/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:47802
NEXT_PUBLIC_WS_URL=ws://localhost:47802
```

### 2.4 Run commands

```bash
docker compose up -d
cd backend && uvicorn app.main:app --reload --port 47802
cd seal && npm run dev -- -p 47803
cd police-console && npm run dev -- -p 47804
```

### 2.5 Model note — swap the text model

```bash
docker exec acpia-ollama ollama pull moondream          # ~1.7 GB  vision
docker exec acpia-ollama ollama pull qwen2.5:3b         # ~1.9 GB  text
docker exec acpia-ollama ollama pull nomic-embed-text   # ~0.3 GB  embeddings
```

**Why `qwen2.5:3b` instead of `llama3.2:3b`:** Qwen's training has broader multilingual coverage, which matters now that your input is Tamil and code-mixed. Total is still ~3.9 GB — comfortably resident on 6 GB.

**Verify this rather than trusting it.** Build a 30-message labelled Tanglish set, run both models against it, keep whichever agrees with your labels more often. That takes twenty minutes and it turns a claim into a measurement. If a judge asks why you chose Qwen, *"we tested both on our code-mixed set and Qwen won"* is a far better answer than a benchmark you read somewhere.

---

## 3. THE TANGLISH ENGINE

### 3.1 Why this is the strongest thing in your product

Real conversation in Tamil Nadu is code-mixed. A single message might be Tamil script, romanized Tamil, English, or all three:

```
naan innaiku busy da, naalaiku pesalam ok va?
வாங்க நாளைக்கு பேசலாம்
ok fine but don't tell anyone la
```

Every incumbent forensic tool is English-first. This breaks them in three separate ways, and each break is an opportunity:

| Break | Why it happens | What ACPIA does |
|---|---|---|
| **Keyword filters return nothing** | Wordlists are English | Stage classification on semantics, not keywords |
| **Stylometry produces garbage** | Vocabulary-richness metrics assume one language | Language-aware, computed per segment |
| **A whole behavioural signal is invisible** | Nobody measures code-mix ratio | **Code-switch drift** — see §3.4 |

### 3.2 Language detection

`backend/app/lang/detect.py`:

```python
"""Language detection for Tamil / Tanglish / English code-mixed text."""
from __future__ import annotations
import re
from dataclasses import dataclass
from enum import Enum

TAMIL_BLOCK = re.compile(r"[\u0B80-\u0BFF]")

# High-signal romanized Tamil function words and discourse markers.
# Function words beat content words for detection: they appear constantly
# and rarely collide with English.
TANGLISH_LEXICON: frozenset[str] = frozenset("""
na la da di dhan than thaan illa ille illai iruku irukku irukka irukken
irukaa pannu panra panren panni pannitu sollu solli sonna sonnen sollala
enna epdi eppadi romba konjam seri sari vanakkam machan machi nee naan
avan ava avanga unga enga yaru enge epo eppo ipo ippo apram aprom appuram
vaa va po poi poitu varen vandhu vantha kuda koodu mattum mudiyala mudiyum
theriyum theriyala venum vendam adhu idhu ithu athu ennaku enaku unaku
kekala kekalai paaru paru paatha nalla kastam ivlo evlo sema pathi mari
maadhiri ozhunga summa yen edhuku ennamo aama amaam illainu nu nga ya
""".split())

# Frequent English tokens, to avoid scoring an English sentence as Tanglish
# just because it contains "la" or "da".
ENGLISH_COMMON: frozenset[str] = frozenset("""
the a an and or but if then is are was were be been being have has had
do does did will would can could should i you he she it we they me him
her us them my your his its our their this that these those to of in on
at for with from by about as not no yes ok okay
""".split())


class Language(str, Enum):
    TAMIL = "ta"          # Tamil script
    TANGLISH = "ta_latn"  # romanized Tamil
    ENGLISH = "en"
    MIXED = "mixed"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class LanguageProfile:
    language: Language
    tamil_script_ratio: float
    tanglish_ratio: float
    english_ratio: float
    token_count: int

    @property
    def tamil_share(self) -> float:
        """Total Tamil content — script plus romanized. The drift metric."""
        return self.tamil_script_ratio + self.tanglish_ratio


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[\w\u0B80-\u0BFF]+", text.lower())


def detect(text: str) -> LanguageProfile:
    tokens = _tokenize(text)
    if not tokens:
        return LanguageProfile(Language.UNKNOWN, 0.0, 0.0, 0.0, 0)

    tamil_script = sum(1 for t in tokens if TAMIL_BLOCK.search(t))
    tanglish = sum(1 for t in tokens
                   if not TAMIL_BLOCK.search(t) and t in TANGLISH_LEXICON)
    english = sum(1 for t in tokens if t in ENGLISH_COMMON)

    n = len(tokens)
    ts, tg, en = tamil_script / n, tanglish / n, english / n

    if ts > 0.5:
        lang = Language.TAMIL
    elif ts > 0.1 and (tg + en) > 0.1:
        lang = Language.MIXED
    elif tg >= 0.15:
        lang = Language.MIXED if en >= 0.20 else Language.TANGLISH
    elif en > 0.15:
        lang = Language.ENGLISH
    else:
        lang = Language.UNKNOWN

    return LanguageProfile(lang, ts, tg, en, n)
```

### 3.3 Normalisation

Romanized Tamil has enormous spelling variance — `iruka` / `irukka` / `irukaa` / `iruga` are one word. Normalise before any lexicon or stylometric comparison.

`backend/app/lang/normalize.py`:

```python
"""Normalise romanized Tamil so spelling variants collapse to one form."""
import re

_REPEATS = re.compile(r"(.)\1{2,}")          # "irukaaaa" -> "irukaa"
_DOUBLE_VOWEL = re.compile(r"([aeiou])\1")   # "irukaa"   -> "iruka"

_SUBSTITUTIONS = [
    (re.compile(r"dh"), "th"),   # dhan / than
    (re.compile(r"zh"), "l"),    # tamizh / tamil
    (re.compile(r"ck"), "k"),
    (re.compile(r"gg"), "g"),
    (re.compile(r"kk"), "k"),
    (re.compile(r"tt"), "t"),
    (re.compile(r"pp"), "p"),
    (re.compile(r"nn"), "n"),
    (re.compile(r"ee"), "i"),    # nee -> ni
    (re.compile(r"oo"), "u"),
]


def normalize_token(token: str) -> str:
    t = _REPEATS.sub(r"\1\1", token.lower())
    t = _DOUBLE_VOWEL.sub(r"\1", t)
    for pattern, repl in _SUBSTITUTIONS:
        t = pattern.sub(repl, t)
    return t


def normalize(text: str) -> str:
    return " ".join(normalize_token(t) for t in text.split())
```

Order matters: collapse repeats first, then doubled vowels, then consonant substitutions. Reversing that produces different results for the same input.

### 3.4 Code-switch drift — the original contribution

**The hypothesis:** in a code-mixed relationship, the share of Tamil rises as familiarity grows. A conversation that starts in English and moves toward Tanglish is showing an intimacy trajectory that no English-first tool can see.

**Frame it honestly.** This is a *signal surfaced to an investigator with a confidence*, not an established finding. It is exactly the kind of thing your human gate exists for. Say so — it strengthens the claim rather than weakening it.

`backend/app/lang/drift.py`:

```python
"""Code-switch drift: change in Tamil share across a conversation."""
from dataclasses import dataclass
from datetime import datetime
from statistics import mean

from app.lang.detect import detect


@dataclass
class CodeSwitchDrift:
    windows: list[float]        # Tamil share per time window
    slope: float                # change in share per window
    delta: float                # last window minus first
    direction: str              # toward_tamil | toward_english | stable
    confidence: float


def compute_drift(
    messages: list[tuple[datetime, str]],
    window_count: int = 6,
) -> CodeSwitchDrift:
    if len(messages) < window_count * 2:
        return CodeSwitchDrift([], 0.0, 0.0, "stable", 0.0)

    ordered = sorted(messages, key=lambda m: m[0])
    size = len(ordered) // window_count

    windows: list[float] = []
    for i in range(window_count):
        chunk = ordered[i * size : (i + 1) * size]
        shares = [detect(text).tamil_share for _, text in chunk]
        windows.append(mean(shares) if shares else 0.0)

    # Least-squares slope over window index
    n = len(windows)
    xbar, ybar = (n - 1) / 2, mean(windows)
    num = sum((i - xbar) * (y - ybar) for i, y in enumerate(windows))
    den = sum((i - xbar) ** 2 for i in range(n))
    slope = num / den if den else 0.0
    delta = windows[-1] - windows[0]

    direction = ("toward_tamil" if delta > 0.12
                 else "toward_english" if delta < -0.12
                 else "stable")

    # Confidence scales with sample size and effect magnitude, capped.
    confidence = min(0.85, abs(delta) * 1.6 + min(len(ordered) / 200, 0.30))

    return CodeSwitchDrift(windows, slope, delta, direction, round(confidence, 3))
```

### 3.5 Language-aware stylometry

Naive stylometry on code-mixed text produces noise. But **code-mix ratio is itself a strong personal fingerprint** — how much Tamil someone uses is highly individual and persists across platforms and pseudonyms. That makes it a *better* identity signal here than English-only vocabulary metrics.

`backend/app/lang/stylometry.py`:

```python
from dataclasses import dataclass
from statistics import mean, pstdev

from app.lang.detect import detect
from app.lang.normalize import normalize_token


@dataclass
class StyleFingerprint:
    tamil_share: float          # personal, persists across platforms
    avg_tokens: float
    token_sd: float
    type_token_ratio: float     # on normalized tokens only
    punctuation_rate: float
    emoji_rate: float
    laugh_marker_rate: float    # "aaa", "hehe", "😂" — highly individual


def fingerprint(messages: list[str]) -> StyleFingerprint:
    if not messages:
        return StyleFingerprint(0, 0, 0, 0, 0, 0, 0)

    shares, lengths, all_tokens = [], [], []
    punct = emoji = laugh = 0

    for m in messages:
        prof = detect(m)
        shares.append(prof.tamil_share)
        toks = m.split()
        lengths.append(len(toks))
        all_tokens.extend(normalize_token(t) for t in toks)
        punct += sum(1 for ch in m if ch in ".,!?;:")
        emoji += sum(1 for ch in m if ord(ch) > 0x1F000)
        laugh += m.lower().count("haha") + m.lower().count("hehe")

    total_chars = sum(len(m) for m in messages) or 1
    return StyleFingerprint(
        tamil_share=round(mean(shares), 3),
        avg_tokens=round(mean(lengths), 2),
        token_sd=round(pstdev(lengths), 2) if len(lengths) > 1 else 0.0,
        type_token_ratio=round(len(set(all_tokens)) / max(len(all_tokens), 1), 3),
        punctuation_rate=round(punct / total_chars, 4),
        emoji_rate=round(emoji / total_chars, 4),
        laugh_marker_rate=round(laugh / len(messages), 3),
    )


def similarity(a: StyleFingerprint, b: StyleFingerprint) -> float:
    """Weighted similarity. Tamil share is weighted heaviest — it's the
    most personal and most persistent feature across pseudonyms."""
    def close(x: float, y: float, scale: float) -> float:
        return max(0.0, 1.0 - abs(x - y) / scale)

    parts = [
        (close(a.tamil_share, b.tamil_share, 1.0),               0.30),
        (close(a.avg_tokens, b.avg_tokens, 25.0),                0.15),
        (close(a.token_sd, b.token_sd, 15.0),                    0.10),
        (close(a.type_token_ratio, b.type_token_ratio, 0.6),     0.15),
        (close(a.punctuation_rate, b.punctuation_rate, 0.12),    0.10),
        (close(a.emoji_rate, b.emoji_rate, 0.06),                0.10),
        (close(a.laugh_marker_rate, b.laugh_marker_rate, 1.5),   0.10),
    ]
    return round(sum(v * w for v, w in parts), 3)
```

### 3.6 Prompting the model for code-mixed input

```python
STAGE_SYSTEM_PROMPT = """You classify messages from a child-protection \
investigation into behavioural stages. You are an assistive triage tool; \
your output is a lead for a human investigator, never a finding.

Input is conversational text from India. It may be in English, Tamil script, \
romanized Tamil (Tanglish), or any mixture within a single message. Common \
Tanglish markers include: na, la, da, illa, iruku, panra, sollu, enna, epdi, \
romba, konjam, seri. Treat these as ordinary conversational particles.

Classify the FINAL message using the surrounding messages as context.
Return the stage label, a confidence between 0 and 1, and a line-range \
pointer to the span that determined your answer.

Do not quote, translate, paraphrase, or reproduce message content in any \
field. Return only the label, the confidence, and the span pointer."""

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
```

**The last paragraph of that prompt is deliberate and load-bearing.** The model returns a *label* and a *pointer*, never generated or reproduced content. Combined with `format=STAGE_SCHEMA`, the model is structurally incapable of emitting manipulative language into your database. This is the same commitment your original architecture made — now enforced at the API boundary rather than trusted to a prompt.

### 3.7 Schema additions

```sql
ALTER TABLE messages
  ADD COLUMN language        TEXT,        -- ta | ta_latn | en | mixed | unknown
  ADD COLUMN tamil_share     NUMERIC(4,3);

ALTER TABLE conversations
  ADD COLUMN code_switch_slope     NUMERIC(5,3),
  ADD COLUMN code_switch_delta     NUMERIC(5,3),
  ADD COLUMN code_switch_direction TEXT,
  ADD COLUMN language_profile      JSONB DEFAULT '{}';
```

### 3.8 Surfacing it in the UI

**On the Escalation Timeline** — add a thin band beneath the plot showing Tamil share per window:

```
  solicitation │                                          ● ●
  desensitis.  │                                    ●  ●
  isolation    │                              ●  ●
  dependency   │                  ●     ●  ●
  trust/excl.  │      ●     ●  ●     ●
  rapport      │ ● ● ●   ●
               └──────────────────────────────────────────────
                 W1     W2     W3     W4     W5     W6

  language     ▓▓░░░░  ▓▓▓░░░  ▓▓▓▓░░  ▓▓▓▓▓░  ▓▓▓▓▓▓  ▓▓▓▓▓▓
               22% ta  41% ta  58% ta  67% ta  81% ta  84% ta

  ⚠ CODE-SWITCH DRIFT   toward Tamil, +0.62 across the conversation
     Surfaced as a signal. Requires investigator verification.
```

**On each message** — a small language tag (`ta` / `ta_latn` / `en` / `mixed`) so the investigator can see instantly what the classifier was working with.

**As a lead type** — add `code_switch_drift` to the `leads.kind` enum. It flows through your existing human gate unchanged.

---

## 4. BACKEND — REMAINING WORK

### 4.1 Schema and migration — P0, ~1h

Take the full schema from `ACPIA_MASTER_SPECIFICATION.md` §10 and add §3.7 above. Two constraints are load-bearing:

```sql
CHECK (cardinality(source_ids) > 0)                    -- no uncited lead
CHECK ((status = 'proposed') = (judged_by IS NULL))    -- no unattributed judgment
```

These turn your explainability and human-gate claims into database invariants. Do not omit them — they're the difference between a promise and a guarantee, and a technical judge may ask.

```bash
cd backend
alembic revision --autogenerate -m "acpia v3 schema"
alembic upgrade head
python scripts/seed.py            # admin + investigator1
```

### 4.2 Auth — P0, ~40m

```python
# app/core/security.py
from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(p: str) -> str:
    return pwd.hash(p)

def verify_password(p: str, h: str) -> bool:
    return pwd.verify(p, h)

def issue_token(user_id: str, role: str) -> str:
    return jwt.encode(
        {"sub": user_id, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        settings.jwt_secret, algorithm="HS256")

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
```

Your Console login currently accepts any credentials. Wire it to this before the demo — a judge who types garbage and gets in will notice.

### 4.3 Seal endpoints — P0, ~1h

```python
# app/api/v1/seal.py
import secrets, string
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/seal", tags=["seal"])
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # no I/O/0/1 — read aloud safely


def generate_reference() -> str:
    part = lambda: "".join(secrets.choice(_ALPHABET) for _ in range(4))
    return f"ACP-{part()}-{part()}"


@router.post("/reports", status_code=201)
async def create_sealed_report(body: SealReportCreate, db=Depends(get_db)):
    """Accepts hashes and context. For the illegal-material path, NEVER a body."""
    store_bodies = body.path_taken != "illegal_material"

    report = SealedReport(
        reference=generate_reference(),
        path_taken=body.path_taken,
        statement=body.statement,
        contact=body.contact,
        sealed_at=body.sealed_at,
    )
    db.add(report)
    await db.flush()

    for a in body.artifacts:
        if len(a.sha256) != 64 or not all(c in "0123456789abcdef" for c in a.sha256):
            raise HTTPException(422, "Malformed hash.")
        db.add(SealedArtifact(
            report_id=report.id, filename=a.filename, mime_type=a.mime_type,
            size_bytes=a.size_bytes, sha256=a.sha256, body_stored=False,
        ))

    await db.commit()
    return {"reference": report.reference, "accepts_bodies": store_bodies}
```

**The `illegal_material` path must reject file bodies at the route level, not just hide the upload button.** A UI-only guard is not a legal position.

### 4.4 Inbound handover — P0, ~1h

This is your WOW moment. It must be correct.

```python
# app/api/v1/inbound.py
@router.post("/{reference}/accept")
async def accept_report(reference: str, body: AcceptRequest,
                        user=Depends(current_user), db=Depends(get_db)):
    report = await get_report(db, reference)
    if report is None:
        raise HTTPException(404, "No sealed report with that reference.")
    if report.claimed_by is not None:
        raise HTTPException(409, "This report has already been accepted into a case.")

    case = (await get_case(db, body.case_id) if body.case_id
            else await create_case(db, f"Inbound {reference}", user.id))

    results = []
    for artifact in report.artifacts:
        if artifact.body_stored and artifact.storage_path:
            actual = await sha256_of_file(artifact.storage_path)
            verified = (actual == artifact.sha256)
        else:
            actual, verified = None, None      # hash-only: nothing to recompute

        await write_custody(
            db, case.id, user.id,
            action="HASH_VERIFIED" if verified else
                   "INTEGRITY_FAILED" if verified is False else "HASH_ONLY_RECEIVED",
            target_type="sealed_artifact", target_id=artifact.id,
            detail={"sealed_sha256": artifact.sha256, "recomputed_sha256": actual},
        )
        results.append({"filename": artifact.filename,
                        "sealed_sha256": artifact.sha256,
                        "recomputed_sha256": actual, "verified": verified})

    report.claimed_by = case.id
    await db.commit()
    return {"case_id": str(case.id), "case_reference": case.reference,
            "artifacts": results}
```

Handle all three states in the UI: `verified: true` → green `INTEGRITY VERIFIED`; `false` → red `INTEGRITY FAILED`, quarantined; `null` → neutral `HASH ONLY — body not transmitted`. That third state is the illegal-material path, and showing it correctly is itself a talking point.

### 4.5 Event bus — P0, ~45m

```python
# app/core/events.py
import asyncio, json
from collections import defaultdict
from datetime import datetime, timezone
from fastapi import WebSocket

class EventBus:
    def __init__(self):
        self._subs: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, case_id: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._subs[case_id].add(ws)

    async def unsubscribe(self, case_id: str, ws: WebSocket):
        async with self._lock:
            self._subs[case_id].discard(ws)

    async def emit(self, case_id: str, event: str, payload: dict):
        msg = json.dumps({"event": event, "case_id": case_id,
                          "at": datetime.now(timezone.utc).isoformat(),
                          "payload": payload}, default=str)
        async with self._lock:
            targets = list(self._subs[case_id])
        dead = []
        for ws in targets:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._subs[case_id].discard(ws)

bus = EventBus()
```

```python
# app/api/v1/stream.py
@router.websocket("/api/v1/cases/{case_id}/stream")
async def case_stream(ws: WebSocket, case_id: str):
    await bus.subscribe(case_id, ws)
    try:
        while True:
            await asyncio.wait_for(ws.receive_text(), timeout=60)
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    finally:
        await bus.unsubscribe(case_id, ws)
```

### 4.6 Custody writer — P0, ~20m

Every state change goes through this. No exceptions.

```python
# app/core/custody.py
async def write_custody(db, case_id, actor_id, action: str,
                        target_type: str, target_id=None, detail: dict | None = None):
    db.add(CustodyLog(case_id=case_id, actor_id=actor_id, action=action,
                      target_type=target_type, target_id=target_id,
                      detail=detail or {}))
```

Grant the app's database role `INSERT` and `SELECT` on `custody_log` only:

```sql
REVOKE UPDATE, DELETE ON custody_log FROM acpia;
```

Append-only enforced by the database, not by discipline.

### 4.7 Impact ledger — P1, ~30m

```python
@router.get("/api/v1/cases/{case_id}/impact")
async def impact(case_id: UUID, db=Depends(get_db)):
    row = (await db.execute(text("""
        SELECT COUNT(*)                                        AS processed,
               COUNT(*) FILTER (WHERE revealed_count > 0)      AS revealed,
               COUNT(*) FILTER (WHERE NOT integrity_ok)        AS failed
        FROM evidence WHERE case_id = :cid
    """), {"cid": case_id})).mappings().one()

    leads = (await db.execute(text("""
        SELECT status, COUNT(*) AS n FROM leads
        WHERE case_id = :cid GROUP BY status
    """), {"cid": case_id})).mappings().all()

    processed, revealed = row["processed"], row["revealed"]
    avoided = round((1 - revealed / processed) * 100, 1) if processed else 0.0

    return {
        "artifacts_processed": processed,
        "surfaced_for_review": revealed,
        "exposure_avoided_pct": avoided,
        "integrity_failures": row["failed"],
        "leads": {r["status"]: r["n"] for r in leads},
        "note": "Measured this session. Not a benchmark.",
    }
```

That `note` field ships to the UI and renders under the panel. Keep it.

### 4.8 BSA §63 certificate — P1, ~1h30

```python
from fpdf import FPDF

def build_certificate(case, evidence_rows, custody_rows, officer) -> bytes:
    pdf = FPDF(); pdf.add_page(); pdf.set_auto_page_break(True, 15)

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "CERTIFICATE UNDER SECTION 63(4)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, "Bharatiya Sakshya Adhiniyam, 2023", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    for label, value in [
        ("Case reference", case.reference),
        ("Generated", datetime.now(timezone.utc).isoformat()),
        ("Producing system", f"ACPIA {settings.version} on {socket.gethostname()}"),
        ("Certifying officer", f"{officer.username} ({officer.role})"),
    ]:
        pdf.cell(45, 6, label); pdf.cell(0, 6, str(value), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5,
        "The electronic records listed below were produced by the above system "
        "in its ordinary course of operation. The system was operating properly "
        "throughout the relevant period. Each record's SHA-256 value was computed "
        "at the point of acquisition and re-verified on receipt.")

    pdf.ln(3)
    pdf.set_font("Courier", "B", 8)
    pdf.cell(70, 6, "FILENAME"); pdf.cell(22, 6, "BYTES")
    pdf.cell(0, 6, "SHA-256", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "", 7)
    for e in evidence_rows:
        pdf.cell(70, 5, e.filename[:40]); pdf.cell(22, 5, str(e.size_bytes))
        pdf.cell(0, 5, e.sha256, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Courier", "B", 8)
    pdf.cell(0, 6, "CHAIN OF CUSTODY", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "", 7)
    for c in custody_rows:
        pdf.cell(0, 5, f"{c.at.isoformat()}  {c.action:<22} {c.actor or 'system'}",
                 new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5,
        "AI-derived leads in the accompanying report are investigative leads "
        "requiring human verification. They are not findings of fact. Each was "
        "confirmed by a named investigator whose identity is recorded above.")

    pdf.ln(8)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(90, 6, "System operator: ______________________")
    pdf.cell(0, 6, "Expert: ______________________", new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())
```

Two signature blocks, because s.63(4) carries a dual-signature requirement. Getting that detail right is exactly what a legally-literate judge will notice.

---

## 5. AI PIPELINE — THE THREE AGENTS

### 5.1 Ollama client

```python
# app/agents/llm.py
import httpx
from app.core.config import settings

_client = httpx.AsyncClient(base_url=settings.ollama_url, timeout=120)

async def warm() -> None:
    for m in (settings.model_vision, settings.model_text, settings.model_embed):
        await _client.post("/api/generate",
            json={"model": m, "prompt": "ready", "stream": False, "keep_alive": -1})

async def chat_json(model: str, system: str, user: str, schema: dict,
                    temperature: float = 0.1) -> dict:
    r = await _client.post("/api/chat", json={
        "model": model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "format": schema, "options": {"temperature": temperature}, "stream": False,
    })
    r.raise_for_status()
    return json.loads(r.json()["message"]["content"])

async def embed(text: str) -> list[float]:
    r = await _client.post("/api/embeddings",
        json={"model": settings.model_embed, "prompt": text[:8000]})
    r.raise_for_status()
    return r.json()["embedding"]
```

Call `warm()` from your FastAPI `startup` handler. Without it, your first demo request pays a 15-second cold start on stage.

### 5.2 Artifact Agent

Per file: EXIF and GPS via `piexif`, OCR via `pytesseract` (use `-l tam+eng` so Tamil text in images is read), description via `moondream`, embedding via `nomic-embed-text`, relevance score.

Emits `artifact.processed`.

### 5.3 Narrative Agent

Per conversation, and this is where the Tanglish engine plugs in:

```python
async def narrative_agent(convo, emit) -> None:
    messages = await parse_messages(convo)

    for i, msg in enumerate(messages):
        prof = detect(msg.text)
        msg.language = prof.language.value
        msg.tamil_share = prof.tamil_share

        window = format_window(messages, i, back=5)
        result = await chat_json(settings.model_text, STAGE_SYSTEM_PROMPT,
                                 window, STAGE_SCHEMA)
        msg.stage = result["stage"]
        msg.stage_conf = result["confidence"]
        msg.evidence_span = result["evidence_span"]

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
            kind="code_switch_drift",
            summary=(f"Language share shifted toward Tamil by "
                     f"{drift.delta:+.2f} across the conversation"),
            confidence=drift.confidence, confidence_ci=0.12,
            signals={"code_switch_delta": drift.delta,
                     "windows": drift.windows},
            source_ids=[convo.evidence_id],
        )
```

Emitting per message is what makes the timeline draw dot by dot. Do not batch it.

### 5.4 Link Agent

Four signals, now language-aware:

```python
async def link_agent(case_id) -> list[Edge]:
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
            src_id=a.node_id, dst_id=b.node_id, kind="same_identity_as",
            confidence=round(score, 3),
            confidence_ci=round(min(0.25, spread), 3),
            signals={"stylometry": sty, "temporal": temp,
                     "device_metadata": meta, "embedding": emb,
                     "tamil_share_a": fingerprint(a.messages).tamil_share,
                     "tamil_share_b": fingerprint(b.messages).tamil_share},
            source_ids=a.evidence_ids + b.evidence_ids,
        ))
    return edges
```

Deriving the confidence interval from the spread across signals is the honest approach: four signals that agree produce a narrow interval; four that disagree produce a wide one. That is exactly what an interval should mean.

### 5.5 Orchestrator

```python
async def run_pipeline(case_id: str) -> None:
    await bus.emit(case_id, "pipeline.started", {})
    emit = partial(bus.emit, case_id)

    sem = asyncio.Semaphore(3)
    async def one(a):
        async with sem:
            await emit("artifact.processed", await artifact_agent(a))
    await asyncio.gather(*(one(a) for a in await get_unprocessed(case_id)))

    for convo in await get_conversations(case_id):
        await narrative_agent(convo, emit)

    for edge in await link_agent(case_id):
        await emit("link.proposed", edge.as_dict())
        await emit("lead.created", (await lead_from_edge(edge)).as_dict())

    await emit("pipeline.complete", await impact_summary(case_id))
```

`Semaphore(3)` matters — unbounded concurrency will exhaust 6 GB of VRAM and Ollama will start queueing unpredictably.

---

## 6. FRONTEND — REMAINING WIRING

Your components exist. These are the connections and additions.

### Seal
- [ ] Point `NEXT_PUBLIC_API_URL` at **47802**
- [ ] `POST /api/v1/seal/reports` from S5, display the returned reference on S6
- [ ] **Illegal-material path: no upload control at all.** Hash, transmit hash, route to NCRP.
- [ ] Certificate download from the API, not client-generated
- [ ] Helpline block persistent on all seven screens — verify on mobile, not just desktop

### Console
- [ ] Real JWT login; stop accepting arbitrary credentials
- [ ] WebSocket to `ws://localhost:47802/api/v1/cases/{id}/stream`
- [ ] Handle all three inbound states: verified / failed / hash-only
- [ ] **Timeline: add the language band and the code-switch drift callout** (§3.8)
- [ ] **Timeline: per-message language tag on hover**
- [ ] Reveal button → `POST /evidence/{id}/reveal`, then increment the counter from the event
- [ ] Impact Ledger reading `/impact`, rendering the `note` field verbatim
- [ ] Confidence component everywhere — remove every bare percentage
- [ ] Keyboard: `J`/`K`/`C`/`X` on the lead queue
- [ ] Evidence basis panel never empty when a lead is selected

### WebSocket client

```typescript
useEffect(() => {
  const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/api/v1/cases/${caseId}/stream`);
  ws.onmessage = (e) => {
    const { event, payload } = JSON.parse(e.data);
    switch (event) {
      case "artifact.processed":          addTile(payload); break;
      case "narrative.stage_classified":  addTimelinePoint(payload); break;
      case "narrative.trajectory_computed": setTrajectory(payload); break;
      case "link.proposed":               addGraphEdge(payload); break;
      case "lead.created":                addLead(payload); break;
      case "evidence.revealed":           bumpExposure(); break;
      case "pipeline.complete":           setImpact(payload); break;
    }
  };
  const ping = setInterval(() => ws.readyState === 1 && ws.send("ping"), 30_000);
  return () => { clearInterval(ping); ws.close(); };
}, [caseId]);
```

---

## 7. DEMO DATASET — THE TANGLISH PERSONA

### 7.1 The design principle that keeps you safe *and* proves your thesis

**The conversation content stays entirely benign.** Every signal your system detects comes from structure, not from anything explicit:

| Signal | How you encode it |
|---|---|
| Escalation trajectory | Message frequency rises; conversation shifts from group to one-to-one |
| Code-switch drift | Tamil share climbs from ~20% in week 1 to ~85% in week 6 |
| Temporal shift | Messages move from afternoons into late night |
| Isolation marker | References to keeping things private — phrased ordinarily |
| Identity link | Second handle shares punctuation habits, emoji rate, and Tamil share |

This is not a compromise. **It is a stronger demonstration**, because it proves the exact claim in your problem statement: no individual message is remarkable, and the signal exists only in the pattern. Write nothing explicit, nothing sexual, nothing that would function as a script. You don't need it and it would be a harmful artifact to have on disk.

### 7.2 File format

`demo/demo_chat_export.txt` — WhatsApp export format so your parser matches real exports:

```
[01/07/2026, 16:22] sam_k: hi, saw your post in the group
[01/07/2026, 16:40] user_7741: hey thanks
[01/07/2026, 16:41] sam_k: you also from coimbatore?
[01/07/2026, 17:02] user_7741: ya
...
[08/07/2026, 19:15] sam_k: enna panra?
[08/07/2026, 19:31] user_7741: nothing much da
...
[22/07/2026, 23:41] sam_k: nee still awake ah? naan too
[22/07/2026, 23:44] user_7741: ya seri sollu
...
[11/08/2026, 01:12] sam_k: idha yaarukkum sollaadha ok va, namma rendu per mattum
[11/08/2026, 01:19] user_7741: seri
```

Target roughly 58 messages across six weeks, with:
- **Week 1:** mostly English, daytime, sparse (4–6 messages)
- **Week 3:** mixed, evenings, more frequent (10–12)
- **Week 6:** mostly Tanglish, late night, dense (16–20)

`demo/demo_chat_platform_b.txt` — a second handle `s.kumar91`, ~25 messages, deliberately matching the first handle's punctuation habits, emoji rate, laugh markers, and Tamil share. That's what the Link Agent will catch.

### 7.3 Images

Three or four ordinary photos with EXIF GPS injected:

```python
import piexif
from PIL import Image

def dms(deg):
    d = int(abs(deg)); m = int((abs(deg) - d) * 60)
    s = round((abs(deg) - d - m / 60) * 3600, 4)
    return ((d, 1), (m, 1), (int(s * 100), 100))

LAT, LON = 11.0168, 76.9558          # Coimbatore

for name in ["IMG_0417.jpg", "IMG_0418.jpg", "IMG_0419.jpg"]:
    img = Image.open(name)
    exif = piexif.load(img.info.get("exif", piexif.dump({})))
    exif["GPS"] = {
        piexif.GPSIFD.GPSLatitudeRef: "N", piexif.GPSIFD.GPSLatitude: dms(LAT),
        piexif.GPSIFD.GPSLongitudeRef: "E", piexif.GPSIFD.GPSLongitude: dms(LON),
    }
    exif["0th"][piexif.ImageIFD.Make] = b"DemoPhone"
    exif["0th"][piexif.ImageIFD.Model] = b"ACPIA-DEMO-01"
    img.save(name, exif=piexif.dump(exif))
```

### 7.4 The device

Factory-reset a spare Android. Sign into nothing. Copy the files to `/sdcard/ACPIA_DEMO/`. Enable USB debugging and accept the RSA prompt on the demo laptop **now**, not on stage.

**Never plug in a personal phone.** You would project your own photos and your contacts' data to an audience that never consented.

Also build `demo/demo_export.zip` with identical contents as the USB fallback. USB fails on stage constantly.

---

## 8. GOLDEN PATH INTEGRATION TEST

Run this end to end at least twice before you present. Every step must pass.

```
□  1  docker compose up -d ; both containers healthy
□  2  All three models resident — nvidia-smi shows < 5 GB
□  3  Backend starts on 47802, /docs loads, warm() completed in logs
□  4  Seal loads on 47803
□  5  Console loads on 47804
□  6  Seal: choose a path, drop demo_chat_export.txt
□  7  Network tab: request body is hash + metadata only, ~200 bytes
□  8  Reference code returned, e.g. ACP-7K4M-2X9P
□  9  Certificate PDF downloads and contains the SHA-256
□ 10  Console: real login with investigator1 (wrong password rejected)
□ 11  Inbound: paste the code → INTEGRITY VERIFIED renders
□ 12  Accept into a new case
□ 13  Run acquisition agent OR drop demo_export.zip
□ 14  Custody log scrolls; hashes computed
□ 15  Trigger pipeline; WebSocket events arrive within 2s
□ 16  Tiles appear SEALED — no image renders unprompted
□ 17  Timeline draws dot by dot with stage colours
□ 18  Language band renders; Tamil share climbs W1 → W6
□ 19  Code-switch drift callout appears
□ 20  Graph edges animate in
□ 21  Leads appear; every one has a citation in the basis panel
□ 22  Reveal an artifact → exposure counter increments
□ 23  Confirm a lead → status changes, custody entry written
□ 24  Impact Ledger shows processed / revealed / avoided %
□ 25  BSA §63 certificate generates with hashes and both signature blocks
□ 26  Case report contains ONLY confirmed leads
```

**If step 15 fails**, nothing downstream matters — fix the WebSocket before anything else. It is the spine of the entire demo.

---

## 9. UPDATED DEMO SCRIPT

Insert the Tanglish moment at 4:00. It is your strongest thirty seconds.

**0:00 — The broken chain.** A parent screenshots something, forwards it on WhatsApp, and by the time it reaches a cyber cell the metadata is gone. That's break one. Break two is one investigator against tens of thousands of files. India is consistently the top country for NCMEC CyberTipline reports; Indian CSAM cases rose roughly five-fold from 2021 to 2025.

**0:45 — Seal, on a phone.** Drop the export. Point at the network tab. *"Two hundred bytes. A hash and a size. The file never left this phone."* Read the reference code aloud.

**1:45 — The handover.** Type the code into Console. Hashes verify green. *"Unbroken from the moment that parent sealed it. That's what a Section 63 certificate under the Bharatiya Sakshya Adhiniyam needs — and certification, not relevance, is why digital evidence usually fails in Indian courts."*

**2:30 — Device evidence.** Plug in the prepared handset. *"Factory-reset, synthetic dataset we wrote ourselves."*

**3:00 — The pipeline, watched.** *"Nothing is pre-rendered. Every event arrived over a WebSocket in the last ninety seconds."*

**3:40 — The Escalation Timeline.** *"Fifty-eight messages across six weeks. Not one would trip a keyword filter. The signal is the slope."*

**4:00 — THE TANGLISH MOMENT.** *Slow down here.*

> *"Now look at the band underneath. This conversation starts at 22% Tamil and ends at 84%. That's code-switch drift — the language moving toward intimacy over six weeks.*
>
> *Cellebrite is American. Griffeye is Swedish. Semantics21 is British. Their keyword lists are English. Their stylometry assumes one language. Given this conversation, they return nothing — not a low score, nothing, because they can't tokenise 'idha yaarukkum sollaadha ok va' at all.*
>
> *Half a billion Indians chat like this. We're the only ones who can read it.*
>
> *And note we're surfacing it as a signal with a confidence, not a conclusion. It goes through the same human gate as everything else."*

**4:45 — The human gate.** *"0.61, plus or minus 0.09. Four independent signals, each with its source span. Nothing enters the case record until an investigator clicks Confirm — and that's a database constraint, not a policy."*

**5:30 — The Impact Ledger.** *"847 processed, 23 surfaced. 824 files a person never had to look at. Measured this session — we haven't run a pilot, so we won't claim an accuracy figure."*

**6:15 — Close.** *"We're not another classifier. We're the correlation layer nobody sells, the only ones who start the chain of custody at the citizen, and the only ones who can read how India actually talks. Air-gapped, because a private company legally cannot possess this material. The software goes to the evidence. The evidence never goes to the software."*

### If asked "how do you know code-switch drift means anything?"

> *"We don't, yet — and that's why it's a lead with a confidence rather than a finding. The mechanism is plausible and it's measurable, but validating it needs a real pilot with investigator ground truth, which is Phase 1 of our roadmap. What we can say now is that no existing tool computes it at all, so the investigator currently has zero visibility into a signal that's sitting in the data."*

That answer is stronger than a confident claim would be. It shows you know the difference between a hypothesis and a result — which is exactly the discipline this domain requires.

---

## 10. FINAL CHECKLIST

**Infrastructure**
- [ ] Ports on 47800–47804 everywhere; no stale 8765/3000/3001 references
- [ ] Postgres and Ollama bound to `127.0.0.1`
- [ ] All credentials rotated; `.env` gitignored
- [ ] `REVOKE UPDATE, DELETE ON custody_log`

**Backend**
- [ ] Migration applied; both `CHECK` constraints present
- [ ] Real JWT auth; wrong password rejected
- [ ] `illegal_material` path rejects bodies at the route, not just the UI
- [ ] `grep -rn "confirmed"` confirms no pipeline code sets it

**Tanglish**
- [ ] Detection returns sensible profiles on all three sample lines
- [ ] Drift computes across six windows
- [ ] Stylometry weights Tamil share at 0.30
- [ ] Stage prompt names Tanglish explicitly and forbids reproducing content
- [ ] Model choice tested against your labelled set, not assumed

**Frontend**
- [ ] WebSocket events render live
- [ ] Language band and drift callout on the timeline
- [ ] Tiles sealed on arrival; reveal logs and increments
- [ ] No bare percentage anywhere
- [ ] Seal never outputs a verdict, never says "safe", shows 1098 on every screen

**Demo**
- [ ] Golden path passed twice
- [ ] Persona entirely synthetic and non-explicit
- [ ] Demo handset factory-reset; RSA prompt already accepted
- [ ] `demo_export.zip` fallback ready
- [ ] Fallback video recorded
- [ ] No personal device in the room

---

*ACPIA v4. Two surfaces, three agents, one unbroken chain — in the language people actually speak.*
