# VERITAS
## The Final 360° Master Plan
### Evidence you can trust. Investigation you can defend. Justice that cuts both ways.

**Version 6.0 — FINAL. This supersedes every previous ACPIA document.**

---

## CONTENTS

1. [What this product actually is](#1-what-this-product-actually-is)
2. [The name](#2-the-name)
3. [**The core innovation: Blind Dual Submission**](#3-the-core-innovation)
4. [All five user roles — complete flows](#4-all-five-user-roles)
5. [Device acquisition — every possible path](#5-device-acquisition)
6. [Tamper-evident architecture](#6-tamper-evident-architecture)
7. [The two-score model: integrity vs authenticity](#7-the-two-score-model)
8. [The contradiction engine](#8-the-contradiction-engine)
9. [Complete adversarial Q&A](#9-complete-adversarial-qa)
10. [Main objective & SDG mapping](#10-main-objective--sdg-mapping)
11. [Technical architecture & build plan](#11-technical-architecture--build-plan)
12. [Demo script](#12-demo-script)
13. [Final checklist](#13-final-checklist)

---

## 1. WHAT THIS PRODUCT ACTUALLY IS

### The reframe that answers your evaluator

You were asked *"what's special for child?"* The honest answer is that the child-protection framing was too narrow **and** "all cyber attacks" is too broad. Here's the category that's exactly right:

> **VERITAS is a disputed digital evidence platform.**
> It operates wherever two parties present conflicting digital claims and someone must determine the truth.

Look at what that single definition covers:

| Scenario | Party A claims | Party B claims | VERITAS role |
|---|---|---|---|
| **Child grooming** | These messages show grooming | This is normal conversation | Behavioural trajectory + authenticity |
| **False harassment complaint** | He sent these messages | I never sent them; this is fabricated | Contradiction + provenance |
| **Bank fraud** | I never authorised this transfer | The transfer was authorised | Device/timeline correlation |
| **Cyberbullying** | This account harassed me | That's not my account | Identity resolution + stylometry |
| **Extortion / sextortion** | They threatened me | Fabricated screenshots | Authenticity + contradiction |
| **Workplace dispute** | This record proves misconduct | That record was created after the fact | Metadata vs claim analysis |

**One engine. One question: does this evidence cohere with reality?**

This is not "we do everything." It's *"we do the one thing that all of these have in common, and nobody else does it."* That distinction is what separates a focused product from an unfocused one — and it's the answer to your evaluator's question.

### Why nobody has built this

Every forensic tool on the market — Cellebrite, Griffeye, Magnet, Semantics21 — is built on an assumption they never state: **that the evidence handed to them is genuine.** They extract it, they index it, they classify it. Not one of them asks *"was this fabricated before it reached me?"*

That assumption held when evidence came from seized devices. It collapses in a world where anyone can fabricate a convincing screenshot in ninety seconds. **VERITAS is built for the world we're actually in.**

### The vertical structure

```
┌──────────────────────────────────────────────────────────────────┐
│  VERITAS PLATFORM                                                │
│  Custody · Authenticity · Contradiction · Correlation · Human gate│
└────────────┬─────────────────────────────────────────────────────┘
             │
   ┌─────────┼──────────┬──────────────┬──────────────┐
   ▼         ▼          ▼              ▼              ▼
┌────────┐┌────────┐┌───────────┐┌────────────┐┌────────────┐
│ GUARD  ││ FAIR   ││ TRACE     ││ CLAIM      ││ (further)  │
│ child  ││workplac││ financial ││ insurance  ││            │
│protect.││ &harass││ fraud     ││ & consumer ││            │
│        ││        ││           ││            ││            │
│ BUILT  ││ BUILT  ││ ROADMAP   ││ ROADMAP    ││            │
└────────┘└────────┘└───────────┘└────────────┘└────────────┘
```

**Build two modules for the demo: GUARD (child protection) and FAIR (workplace/harassment).** FAIR is where your defamation scenario lives, and it costs you almost nothing extra — it's the same engine with a different intake form. Two working modules proves the platform generalises. Four half-working ones proves nothing.

---

## 2. THE NAME

**VERITAS** — Latin for *truth*. Pronounceable, memorable, and it names what the product defends: not a crime category, but the integrity of evidence itself.

> **VERITAS**
> *Verified Evidence · Reliable Investigation · Trusted Adjudication System*
>
> **"Evidence you can trust. Investigation you can defend."**

Alternatives if VERITAS is taken in your context:
- **PRAMANA** (प्रमाण / பிரமாணம்) — Sanskrit/Tamil for *proof, valid evidence*. Strong Indian identity, excellent for a domestic govtech product.
- **SATYA** — *truth*. Shorter, instantly recognisable across India.

**Recommendation: VERITAS as the platform, with modules named GUARD and FAIR.** If you want the Indian identity, **PRAMANA** is the stronger choice for an Indian police procurement story — and "Pramana" is literally the Sanskrit legal term for *admissible evidence*, which is a remarkable fit.

---

## 3. THE CORE INNOVATION

### Blind Dual Submission — the thing that doesn't exist anywhere

This is your WOW. It is genuinely novel, it is simple to explain, and it is the complete answer to *"who gets justice?"*

**The problem with every existing system:** evidence flows one way. A complainant submits; an investigator receives. The accused has no structured channel to submit counter-evidence into the same analytical process. They can only deny.

**The VERITAS mechanism:**

```
   COMPLAINANT                              RESPONDENT
   (accuser)                                (accused)
        │                                        │
        │  receives code                         │  receives code
        │  VER-7K4M-2X9P-C                       │  VER-7K4M-2X9P-R
        ▼                                        ▼
   ┌─────────────┐                        ┌─────────────┐
   │ Seals their │                        │ Seals their │
   │ evidence.   │      ╳  BLIND  ╳       │ evidence.   │
   │ Hash-       │   neither can see      │ Hash-       │
   │ committed.  │   the other's until    │ committed.  │
   │             │   both are locked.     │             │
   └──────┬──────┘                        └──────┬──────┘
          │                                      │
          └──────────────┬───────────────────────┘
                         ▼
              ┌────────────────────────┐
              │  COMMITMENT LOCK       │
              │  Both submissions      │
              │  hash-sealed with      │
              │  timestamps. Neither   │
              │  can be swapped later. │
              └───────────┬────────────┘
                          ▼
              ┌────────────────────────┐
              │  CONTRADICTION ENGINE  │
              │  Runs across the UNION │
              │  of both submissions.  │
              │  Has no concept of     │
              │  "sides."              │
              └───────────┬────────────┘
                          ▼
              ┌────────────────────────┐
              │  INVESTIGATOR          │
              │  sees both + every     │
              │  contradiction, each   │
              │  with confidence and   │
              │  caveats. Judges.      │
              └────────────────────────┘
```

### Why "blind" is the load-bearing word

If the respondent could see the accusation's evidence before submitting, they could fabricate a rebuttal that fits it perfectly. If the complainant could see the rebuttal, same problem.

**Blind submission means both parties commit their evidence independently, and then coherence is tested against reality.** A truthful account will cohere with the other party's truthful account and with device metadata. A fabricated one will not — and it cannot be adjusted after the fact, because the hash was committed at submission time.

This is the same principle as a sealed-bid auction, applied to evidence. It is simple, it is cryptographically enforceable with the hashing you have already built, and **no forensic product does it.**

### Your defamation scenario, solved step by step

> *A female faculty member files a fabricated complaint against a male faculty member. He is innocent.*

1. The institution opens a **FAIR case**. VERITAS issues two codes — one to the complainant, one to the respondent.
2. **Complainant seals** her evidence: a fabricated WhatsApp screenshot. Hash committed at 14:02 on 12 August.
3. **Respondent seals** his: his actual phone's message database export, his location history, his device activity log. Hash committed at 09:41 on 13 August. He cannot see her submission; she cannot see his.
4. **Both lock.** Neither can now swap or amend.
5. **The engine runs impartially across both.** It surfaces:
   - *Authenticity, complainant artifact:* no camera EXIF; screenshot dimensions don't match any known device profile; sealed 41 days after the claimed conversation date.
   - *Contradiction:* the claimed message timestamp falls inside a window where the respondent's device log shows the phone was powered off.
   - *Contradiction:* the alleged thread ID does not appear anywhere in the respondent's message database, which was sealed as a complete export.
6. **The investigator sees three flagged contradictions with confidences and caveats** — and decides. VERITAS never says "she lied."

**And critically: the same engine would have exposed him.** If the respondent had fabricated his message export, the deletion gaps and inconsistent database sequence numbers would surface as contradictions in exactly the same way. **The system has no side.**

### The one-sentence version for your pitch

> *"Both parties submit evidence blind, sealed and time-committed. Then we test whether the accounts cohere with reality. Truth coheres. Fabrication doesn't. We don't decide who's lying — we make lying visible."*

---

## 4. ALL FIVE USER ROLES

### 4.1 Role matrix

| Role | Who | Access | Can they see the other side? |
|---|---|---|---|
| **Complainant** | Citizen, victim, parent, teacher | Seal + submit own evidence, track case | ❌ Never |
| **Respondent** | The accused | Seal + submit own evidence, track case | ❌ Never |
| **Investigator** | Cyber cell, HR panel, ICC officer | Full case, run pipeline, judge leads | ✅ Both |
| **Supervisor** | Senior officer | All investigator powers + co-sign destructive actions + audit | ✅ Both |
| **Auditor** | External, court-appointed, ombudsman | **Read-only.** Verify ledger integrity. Cannot see evidence content. | Metadata only |

The **Respondent** and **Auditor** roles are what make this defensible. Almost no evaluator will have seen either in a student project.

---

### 4.2 FLOW A — COMPLAINANT (layman, no account)

```
LANDING
  │  "Something happened. Let's make sure it counts."
  ▼
CHOOSE SITUATION
  ├─ A child is being contacted in a way that worries me   → GUARD
  ├─ Someone is harassing or threatening me                 → GUARD/FAIR
  ├─ A complaint has been made about me                     → RESPONDENT flow
  ├─ Money was taken from my account                        → TRACE (roadmap)
  └─ I was sent something illegal                           → hash-only path
  ▼
GUIDED INTAKE  (one question per screen, plain language)
  ▼
PRESERVE  (platform-specific export instructions + drop zone)
  ▼
SEAL  ← SHA-256 computed in the browser. File never leaves the device.
  ▼
STATEMENT  (their own words — never pre-written for them)
  ▼
COMMIT  ← hash + timestamp locked. "You cannot change this later, and
           neither can anyone else. That's what makes it trustworthy."
  ▼
CERTIFICATE  (PDF they keep)
  ▼
REPORT  (reference code + where to send it: 1098 / 1930 / cybercrime.gov.in)
  ▼
TRACK  (enter code any time to see case status — no account needed)
```

**Copy rules — this decides whether a layman can use it:**

| Never write | Write instead |
|---|---|
| "Upload evidence artifact" | "Add the file" |
| "Cryptographic hash generated" | "We made a fingerprint of this file" |
| "Chain of custody initiated" | "We recorded the date and time. This can't be changed later." |
| "Commitment locked" | "This is now locked in. Nobody can swap it — including you." |
| "Authentication required" | *(nothing — no account)* |

---

### 4.3 FLOW B — RESPONDENT (the innovation)

**This flow is your differentiator. Build it.**

```
NOTIFIED
  │  Receives code VER-7K4M-2X9P-R by SMS/email/letter from the
  │  investigating body. Not from the complainant.
  ▼
LANDING → "A complaint has been made about me"
  ▼
ENTER CODE
  ▼
WHAT YOU ARE TOLD  ← carefully scoped
  ┌────────────────────────────────────────────────────────┐
  │  A complaint has been registered concerning events      │
  │  between 1 July and 11 August 2026.                     │
  │                                                         │
  │  You may submit your own evidence. It will be sealed    │
  │  the same way and analysed by the same system.          │
  │                                                         │
  │  You will NOT see the complaint's evidence, and they    │
  │  will not see yours. This protects both of you: it      │
  │  means neither account can be adjusted to fit the       │
  │  other. Whatever is true will still be true.            │
  │                                                         │
  │  You are not required to submit anything. Not           │
  │  submitting is not evidence of anything.                │
  └────────────────────────────────────────────────────────┘
  ▼
WHAT HELPS  (plain guidance, no legal advice)
  · Your own message exports for that period
  · Your device's location history
  · Anything showing where you were or what you were doing
  ▼
PRESERVE → SEAL → STATEMENT → COMMIT
  ▼
CERTIFICATE + TRACK
```

**The three sentences that make this ethically sound**, and which you must display:
1. *You will not see their evidence and they will not see yours.*
2. *You are not required to submit anything.*
3. *Not submitting is not evidence of anything.*

That third line matters enormously. Without it, silence becomes an implied admission, and you've built something coercive.

---

### 4.4 FLOW C — INVESTIGATOR (real-time)

```
LOGIN (JWT)
  ▼
DASHBOARD
  ├─ Inbound sealed reports
  ├─ Cases awaiting both submissions   ← new
  ├─ Leads awaiting judgment
  └─ Exposure summary (welfare)
  ▼
OPEN CASE
  ▼
① INTAKE
   ├─ Accept complainant submission  → hash verify → INTEGRITY VERIFIED
   ├─ Accept respondent submission   → hash verify → INTEGRITY VERIFIED
   ├─ Device acquisition (§5)
   └─ Forensic export import (.zip / UFDR)
  ▼
② PIPELINE  (WebSocket — every step visible live)
   ├─ Artifact Agent      → sealed tiles appear
   ├─ Authenticity Agent  → integrity/authenticity split scores  ← new
   ├─ Narrative Agent     → escalation timeline draws
   ├─ Link Agent          → graph edges animate
   └─ Contradiction Agent → conflicts surface                     ← new
  ▼
③ REVIEW
   ├─ Escalation Timeline (with language band)
   ├─ Sealed evidence grid — reveal is logged
   ├─ CONTRADICTION BOARD  ← new, the centrepiece
   ├─ Lead queue → Confirm / Reject (J/K/C/X)
   └─ Knowledge graph
  ▼
④ OUTPUT
   ├─ Case report (confirmed findings only)
   ├─ BSA §63 certificate (integrity, explicitly not authenticity)
   └─ Full custody ledger export
```

---

### 4.5 FLOW D — SUPERVISOR

- Everything an investigator can do
- **Co-signature required** for: deleting a case, overriding an integrity failure, exporting full evidence
- Reviews the confirm/reject ratio per investigator — the metric that catches rubber-stamping
- Cannot alter the custody ledger. Nobody can. See §6.

### 4.6 FLOW E — AUDITOR (read-only, external)

```
AUDITOR LOGIN (separate credential, issued by the agency)
  ▼
LEDGER VERIFICATION
  ┌──────────────────────────────────────────────────────┐
  │  CASE VER-2026-0114                                   │
  │                                                        │
  │  Custody entries          1,284                        │
  │  Hash chain               ✓ INTACT                     │
  │  First entry    2026-08-12T09:11:04Z                   │
  │  Last entry     2026-08-14T17:42:19Z                   │
  │                                                        │
  │  Human decisions           47                          │
  │  · confirmed               31                          │
  │  · rejected                16                          │
  │  Confirm ratio           0.66  (flag if > 0.95)        │
  │                                                        │
  │  AI-written findings        0  ← structurally impossible│
  │                                                        │
  │  [ Re-verify chain from genesis ]                     │
  └──────────────────────────────────────────────────────┘
```

**The auditor sees metadata and the chain — never evidence content.** They can independently prove nobody rewrote history, without being exposed to the material. This role is the structural answer to *"what if you take a bribe?"*

---

## 5. DEVICE ACQUISITION

You keep asking for this to work with your phone. Here is every path, ranked by demo reliability.

| # | Method | Platform | Reliability | Use |
|---|---|---|---|---|
| **1** | **QR pairing → phone browser** | Any | ★★★★★ | **Primary demo** |
| 2 | Pre-staged export zip | Any | ★★★★★ | Fallback |
| 3 | ADB over USB | Android | ★★★☆☆ | The "wow" moment |
| 4 | ADB over Wi-Fi | Android | ★★★☆☆ | No-cable alternative |
| 5 | Forensic export import (UFDR) | Any | ★★★★★ | Real field path |

### 5.1 QR pairing — build this, it always works

Console displays a QR code. The phone scans it and opens the Seal app with the case pre-linked. The person seals directly from the phone, in the room, live.

```python
@router.post("/api/v1/cases/{case_id}/pair")
async def create_pairing(case_id: UUID, user=Depends(current_user), db=Depends(get_db)):
    token = secrets.token_urlsafe(24)
    db.add(PairingToken(
        case_id=case_id, token=token, created_by=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    ))
    await db.commit()
    return {"url": f"{settings.seal_url}/pair/{token}", "expires_in": 900}
```

```tsx
import QRCode from "react-qr-code";

export function PairPanel({ url }: { url: string }) {
  return (
    <div className="rounded border border-[var(--rule)] bg-[var(--slate-hi)] p-6 text-center">
      <div className="inline-block bg-white p-3">
        <QRCode value={url} size={180} />
      </div>
      <p className="mt-3 font-mono text-xs text-[var(--text-dim)]">
        Scan to add evidence from a phone · expires in 15 minutes
      </p>
    </div>
  );
}
```

**Why this beats USB for the demo:** works on iPhone and Android, no cable, no drivers, no USB-debugging prompt, no hub failure. And it's visually excellent — you hold up a phone, scan, and evidence appears on the projected Console in real time. **This is the moment judges will film.**

### 5.2 ADB over USB — the forensic-realism moment

Keep this from `ACPIA_FINAL_PHASE.md`. Scope is unchanged and the limits are non-negotiable:

**Does:** consented logical acquisition from a device whose owner enabled USB debugging and accepted the on-device prompt. Allowlisted paths only. SHA-256 at acquisition, on the workstation, before transmission.

**Never does:** bypass a lock, PIN or encryption; root or exploit a device; log into anyone's cloud account with credentials. Cloud data comes from legal process served on the provider — building credential-based extraction would make this stalkerware, and any informed evaluator will say so. **Refusing that capability out loud is a credibility signal.**

### 5.3 ADB over Wi-Fi — no cable

```bash
adb tcpip 5555
adb connect 192.168.1.42:5555      # phone's IP
```

Same allowlist, same hashing. Useful when the cable fails and you still want the acquisition-agent moment.

### 5.4 iPhone

ADB does not exist on iOS. The realistic paths are the **QR/browser flow** (§5.1) or an iTunes backup via `libimobiledevice`, which is heavy for a hackathon. **Use QR for iPhone.** If asked: *"iOS acquisition in the field goes through Cellebrite or GrayKey under legal authority — we sit downstream of those tools, which is where a triage layer belongs."*

---

## 6. TAMPER-EVIDENT ARCHITECTURE

### This section is the complete answer to "what if you take a bribe?"

Do not answer that question with a promise. Answer it with architecture.

### 6.1 Hash-chained custody ledger

Each entry contains the hash of the previous entry. Alter or delete anything and the chain breaks — detectably, forever.

```sql
ALTER TABLE custody_log
  ADD COLUMN prev_hash  CHAR(64),
  ADD COLUMN entry_hash CHAR(64) NOT NULL;

CREATE INDEX ON custody_log (case_id, id);
```

```python
# app/core/custody.py
import hashlib, json
from datetime import datetime, timezone

async def write_custody(db, case_id, actor_id, action, target_type,
                        target_id=None, detail=None):
    """Append a tamper-evident entry. Each links to the previous by hash."""
    prev = (await db.execute(
        select(CustodyLog.entry_hash)
        .where(CustodyLog.case_id == case_id)
        .order_by(CustodyLog.id.desc()).limit(1)
    )).scalar_one_or_none()

    genesis = "0" * 64
    prev_hash = prev or genesis
    at = datetime.now(timezone.utc)

    payload = json.dumps({
        "prev": prev_hash, "case": str(case_id), "actor": str(actor_id),
        "action": action, "target_type": target_type,
        "target_id": str(target_id) if target_id else None,
        "detail": detail or {}, "at": at.isoformat(),
    }, sort_keys=True, separators=(",", ":"))

    entry_hash = hashlib.sha256(payload.encode()).hexdigest()

    db.add(CustodyLog(
        case_id=case_id, actor_id=actor_id, action=action,
        target_type=target_type, target_id=target_id, detail=detail or {},
        at=at, prev_hash=prev_hash, entry_hash=entry_hash,
    ))
    return entry_hash


async def verify_chain(db, case_id) -> dict:
    """Walk the chain from genesis. Any tampering shows up here."""
    rows = (await db.execute(
        select(CustodyLog).where(CustodyLog.case_id == case_id)
        .order_by(CustodyLog.id)
    )).scalars().all()

    expected_prev = "0" * 64
    for i, row in enumerate(rows):
        if row.prev_hash != expected_prev:
            return {"intact": False, "broken_at": i,
                    "reason": "previous-hash mismatch — an entry was altered or removed"}

        payload = json.dumps({
            "prev": row.prev_hash, "case": str(row.case_id),
            "actor": str(row.actor_id), "action": row.action,
            "target_type": row.target_type,
            "target_id": str(row.target_id) if row.target_id else None,
            "detail": row.detail, "at": row.at.isoformat(),
        }, sort_keys=True, separators=(",", ":"))

        if hashlib.sha256(payload.encode()).hexdigest() != row.entry_hash:
            return {"intact": False, "broken_at": i,
                    "reason": "entry content does not match its hash"}
        expected_prev = row.entry_hash

    return {"intact": True, "entries": len(rows), "head": expected_prev}
```

### 6.2 Database-enforced append-only

```sql
REVOKE UPDATE, DELETE ON custody_log FROM veritas_app;
GRANT INSERT, SELECT ON custody_log TO veritas_app;
```

Test it. Try a `DELETE` as the app user, watch it fail, and mention that you tested it. *"We didn't just design it append-only — we verified the database refuses the operation."*

### 6.3 The five structural anti-corruption defences

| # | Defence | What it stops |
|---|---|---|
| 1 | **Air-gapped on-prem** | The vendor has no network path to live cases. We cannot tamper with what we cannot reach. |
| 2 | **Hash-chained ledger** | Any alteration or deletion breaks the chain, permanently and detectably. |
| 3 | **Per-action attribution** | Every action carries the identity of the human who took it. False input is traceable to a person. |
| 4 | **Dual control** | Destructive actions require a supervisor co-signature. One corrupt actor is not enough. |
| 5 | **External auditor role** | An independent party can verify the chain without seeing evidence content. |

**The line to say:** *"We didn't build a system you have to trust us to run honestly. We built one where dishonesty leaves evidence."*

### 6.4 Data-misuse defences (the website question)

- **No evidence bodies on the public server** for the sensitive path — hashes only, computed in-browser. There is no evidence database to breach.
- **No accounts** in the public app. No password store, no email list.
- **Blind separation** — complainant and respondent submissions are isolated at the query layer, not just the UI.
- **Auto-purge** of unclaimed sealed reports after a defined retention window.
- **Rate limiting** on every unauthenticated endpoint.
- **Console is air-gapped** — not reachable from the internet at all.

---

## 7. THE TWO-SCORE MODEL

The single most important conceptual upgrade. Your previous design conflated two entirely different questions.

| Question | Answered by | Displayed as |
|---|---|---|
| **Integrity** — changed after it entered the system? | SHA-256 chain | ✓ / ✗ — binary, certain |
| **Authenticity** — genuine when created? | Indicators + provenance + contradiction | ⚠ indicator count — never binary |

**They must never merge into one score.** A fabricated screenshot has perfect integrity and zero authenticity. Showing green and amber on the same tile at the same time is what makes your certificate honest.

```
┌─────────────────────────────────────┐
│  ░░░░░  SEALED  ░░░░░               │
├─────────────────────────────────────┤
│ screenshot_whatsapp.jpg             │
│ image/jpeg · 840 KB                 │
│ sha 7c3f9a2b…                       │
│                                     │
│  INTEGRITY     ✓ verified           │
│  AUTHENTICITY  ⚠ 2 indicators       │
│                                     │
│  · No camera metadata present       │
│    (caveat: platforms strip EXIF)   │
│  · Sealed 41 days after claimed date│
│                                     │
│  ⚠ 1 contradiction with case data   │
│                                     │
│  [ Reveal — logs access ]           │
└─────────────────────────────────────┘
```

### The certificate must say this explicitly

> *"This certificate attests to the **integrity** of the listed records — that their SHA-256 values are unchanged since the moment of sealing. It makes **no assertion** as to whether the content of any record is genuine, accurate, or truthful. Authenticity indicators, where present, are recorded separately and require human evaluation."*

An evaluator who reads that line will understand you thought harder than everyone else in the room.

### Never claim deepfake detection

The 2025 literature is unambiguous: detectors scoring 95–99% on benchmarks fall to 54–75% on realistic out-of-distribution data, with none reaching forensic suitability; a CSIRO assessment of sixteen leading detectors found none reliable across manipulation types. Forensic practice is clear that one "fake score" collapses under cross-examination, and that innocent edits routinely resemble tampering.

**So: every authenticity indicator ships with its innocent explanation.** You surface signals, not verdicts.

---

## 8. THE CONTRADICTION ENGINE

```python
# app/agents/contradiction.py
from dataclasses import dataclass
from itertools import combinations

@dataclass
class Contradiction:
    kind: str
    summary: str
    sources: list[str]
    severity: str        # high | medium | low
    confidence: float
    caveat: str          # ALWAYS present


async def find_contradictions(case_id) -> list[Contradiction]:
    """Impartial. Runs across ALL submissions. Has no concept of 'sides'."""
    facts = await extract_atomic_facts(case_id)   # (actor, action, when, where, source)
    out: list[Contradiction] = []

    for a, b in combinations(facts, 2):
        # 1. Same person, same moment, two places
        if a.actor == b.actor and overlaps(a.when, b.when) \
           and a.where and b.where and a.where != b.where:
            out.append(Contradiction(
                kind="temporal_impossibility",
                summary=f"{a.actor} placed in two locations at the same time",
                sources=[a.source, b.source], severity="high", confidence=0.78,
                caveat="Timezone handling or an imprecise timestamp can cause this."))

        # 2. Claimed date vs the file's own embedded date
        if a.claimed_when and b.metadata_when and a.source == b.source \
           and abs(a.claimed_when - b.metadata_when) > timedelta(days=1):
            out.append(Contradiction(
                kind="metadata_claim_mismatch",
                summary="File's embedded date differs from the stated date",
                sources=[a.source], severity="high", confidence=0.71,
                caveat="Re-saving or transferring a file can rewrite its timestamps."))

        # 3. Event claimed during a period the device shows as inactive
        if a.kind == "message_claimed" and b.kind == "device_inactive" \
           and a.actor == b.actor and within(a.when, b.window):
            out.append(Contradiction(
                kind="device_activity_conflict",
                summary="Message claimed during a period the device logs as inactive",
                sources=[a.source, b.source], severity="high", confidence=0.74,
                caveat="Device logs can be incomplete after a reset or update."))

        # 4. Referenced thread absent from a submitted complete export
        if a.kind == "thread_referenced" and b.kind == "complete_export" \
           and a.thread_id not in b.thread_ids:
            out.append(Contradiction(
                kind="absent_from_complete_export",
                summary="Referenced conversation does not appear in the full export",
                sources=[a.source, b.source], severity="high", confidence=0.69,
                caveat="Deletion before export, or an incomplete export, explains this too."))

    return out
```

**Every contradiction carries a caveat.** That is not hedging — it's what makes the output survive cross-examination. A contradiction with no innocent explanation offered is an accusation, and accusations are the investigator's job, not the tool's.

### The Contradiction Board (UI centrepiece)

```
┌────────────────────────────────────────────────────────────────┐
│  CONTRADICTION BOARD              3 conflicts · 2 high severity │
├────────────────────────────────────────────────────────────────┤
│  ▲ HIGH   Device activity conflict                    0.74±0.11│
│    Message claimed 03 Aug 21:14; device log shows the handset  │
│    powered off 03 Aug 19:02 – 04 Aug 07:30.                    │
│    Sources: submission-A/screenshot_01 · submission-B/devlog    │
│    Caveat: device logs can be incomplete after a reset.        │
│    [ Confirm as material ]  [ Dismiss ]                        │
├────────────────────────────────────────────────────────────────┤
│  ▲ HIGH   Absent from complete export                 0.69±0.14│
│    Referenced thread absent from the full message export.      │
│    Caveat: deletion before export explains this equally.       │
│    [ Confirm as material ]  [ Dismiss ]                        │
├────────────────────────────────────────────────────────────────┤
│  ● MED    Metadata / claim mismatch                   0.71±0.09│
│    Embedded date 22 Jun; stated date 03 Aug.                   │
│    Caveat: re-saving a file can rewrite timestamps.            │
│    [ Confirm as material ]  [ Dismiss ]                        │
└────────────────────────────────────────────────────────────────┘

  Contradictions are surfaced impartially across all submissions.
  VERITAS does not determine which party is truthful.
```

That footer line is doing enormous work. Keep it visible.

---

## 9. COMPLETE ADVERSARIAL Q&A

Rehearse until reflexive. These are the questions that decide your evaluation.

### Impartiality

**"What stops a false accuser sealing a fake screenshot and using your certificate as a weapon?"**
> *"Three things. Our certificate attests integrity only — that the file wasn't altered after sealing — and it says so explicitly in its own text. The authenticity layer separately flags indicators like missing camera metadata or a sealing date long after the claimed date. And the respondent has their own submission channel, so the contradiction engine tests both accounts against reality. A fabricated screenshot is easy to make internally clean but very hard to make cohere with the other party's genuine device data."*

**"How does the innocent accused get justice?"**
> *"Through the respondent flow — which is the part no other forensic tool has. They get their own code, seal their own evidence blind, and the same engine runs across both submissions. In your faculty example, his message export and device logs would surface three contradictions in her artifact. And to be clear: it's symmetric. If he were the one fabricating, his export's deletion gaps would surface identically."*

**"What if both sides fabricate?"**
> *"Then both generate authenticity flags and mutual contradictions, and the investigator sees a case where nothing coheres — which is itself a critical signal that more investigation is needed. We never resolve that automatically. We surface incoherence; humans and ultimately courts judge."*

**"Isn't blind submission unfair to the accused — they don't know the charge?"**
> *"They're told the scope: the date range and the nature of the complaint. They're not shown the artifacts, and neither is the complainant shown theirs. That symmetry is the fairness. And we display three lines prominently: you won't see their evidence, you're not required to submit anything, and not submitting is not evidence of anything. Due process at the formal stage is the tribunal's job — we're the evidence layer beneath it."*

### Corruption

**"What stops YOU taking money from a suspect to feed false input?"**
> *"Architecture, not promises. One: we're air-gapped on-premise inside the agency — the vendor has no network path to a live case. Two: the custody ledger is hash-chained, each entry containing the previous entry's hash, so any alteration or deletion breaks the chain permanently and detectably. Three: UPDATE and DELETE are revoked at the database level, and we tested that. Four: destructive actions need a supervisor co-signature. Five: there's an external auditor role that can verify the chain without seeing evidence. We didn't build a system you have to trust us to run honestly — we built one where dishonesty leaves evidence."*

**"You wrote the code — you could put in a backdoor."**
> *"Which is why the core engine is open-source on the roadmap, with an independent security audit before any real deployment. A closed forensic tool asking courts to trust the vendor is the wrong model. The append-only ledger, the attribution, and the air-gap are all inspectable in source. Trust should come from inspection, not our word."*

**"A corrupt investigator could just rubber-stamp everything."**
> *"That's why the auditor view surfaces the confirm/reject ratio per investigator. An investigator confirming 98% of AI leads is behaving very differently from one confirming 60%, and that's visible to a supervisor and an external auditor without anyone reading a case file."*

### The AI

**"Can you detect deepfakes or fake screenshots?"**
> *"No, and neither can anyone else reliably — a 2025 systematic review found detectors falling from 95% on benchmarks to the 50s and 60s on real-world data, none reaching forensic suitability, and CSIRO found none of sixteen leading detectors reliable across manipulation types. So we don't claim it. We surface authenticity indicators, each with the innocent explanations that could also produce them, and we lean on contradiction analysis, which doesn't depend on pixel-level detection at all. One fake score dies under cross-examination. A stack of independent signals with stated limitations survives it."*

**"What's your accuracy?"**
> *"We haven't run a pilot, so we won't quote one — quoting a benchmark figure for a forensic tool is exactly the failure the literature warns about. We show throughput and confirm/reject ratio, which is the metric that actually catches precision drift in production."*

**"Your AI could be biased."**
> *"Yes, which is why no AI output can become a finding. Every lead needs a logged human confirmation, and that's a database constraint — you cannot set status to confirmed without a human actor recorded. Bias audit is on the roadmap before real deployment."*

### Scope

**"What's actually special for children here?"**
> *"The platform is general because evidence-truth is general. The GUARD module is child-specific: behavioural-stage classification tuned to grooming trajectories, code-switch drift detection for how intimacy builds in Indian code-mixed language, and a reporting flow written so a frightened teenager can use it without an account. Those are child-specific. We built the general engine because your defamation question proved it had to be general — but we went deep on children first because it's the hardest problem and the highest stakes."*

**"Why not just do all cyber-crime?"**
> *"We do cover the category that unifies all your examples — disputed digital evidence. What we don't do is claim depth we haven't built. We're demoing two working modules rather than five slideware ones. Breadth without a proven core convinces nobody."*

### Privacy

**"Could your website leak the data people submit?"**
> *"For the sensitive path there's nothing to leak — hashes are computed in the browser and only about 200 bytes leave the phone. Open the network tab during our demo. No accounts, so no password store. The investigative side is air-gapped and unreachable from the internet."*

---

## 10. MAIN OBJECTIVE & SDG MAPPING

### The objective, in one sentence

> **VERITAS exists to determine whether digital evidence is true — protecting victims and the falsely accused with equal force — by making fabrication fail to cohere with reality.**

And the flagship mission:

> **Its first module, GUARD, defends children: compressing online-exploitation investigations from weeks to minutes, in the languages Indians actually speak, while ensuring no innocent person is convicted on evidence that only looked real.**

Both sentences commit to protecting the *accused* as explicitly as the *victim*. That is the impartiality an evaluator is probing for — stated as mission, not defended as an afterthought.

### SDG mapping

**PRIMARY — SDG 16: Peace, Justice and Strong Institutions**

| Target | Mechanism | Measured |
|---|---|---|
| **16.1** — reduce violence | Faster identification in exploitation and harassment cases | Time-to-lead |
| **16.2** — end abuse and exploitation of children | GUARD module; citizen-origin custody | Pipeline wall-clock; verified citizen reports |
| **16.3** — rule of law, equal access to justice | **Blind dual submission + impartial contradiction detection protects the falsely accused** | Respondent submissions; contradictions surfaced |
| **16.5** — reduce corruption and bribery | **Hash-chained ledger, air-gap, dual control, external auditor** | Chain integrity; zero vendor access |
| **16.6** — accountable institutions | Every action attributed; every lead cited | Custody entries; 100% cited leads (structural) |
| **16.10** — public access to information | Layman-usable reporting; case tracking without an account | Flow completion rate |

**SECONDARY — SDG 5: Gender Equality**
Target **5.2** (eliminate violence against women and girls). The workplace module supports genuine harassment complainants — the majority of whom are women — with properly preserved, admissible evidence that survives challenge. And by protecting the falsely accused under 16.3, the system strengthens rather than undermines confidence in genuine complaints. **Both targets are served by the same impartiality.** Say this carefully and it lands well.

**SECONDARY — SDG 3.4** (mental health). Every artifact triaged out is one an investigator never sees. Measured live in the Impact Ledger.

**TERTIARY — SDG 9.5 / 10.3.** Open-core, self-hostable on one consumer GPU, multilingual for Indian code-mixed speech — capability for agencies priced out of Western tooling.

**Claim 16.3 and 16.5 loudly.** Every team claims 16.2. Almost none can explain how their architecture protects the falsely accused and resists its own operators.

---

## 11. TECHNICAL ARCHITECTURE & BUILD PLAN

### 11.1 Ports (478 series)

| Service | Port |
|---|---|
| PostgreSQL + pgvector | **47800** |
| Ollama | **47801** |
| FastAPI backend | **47802** |
| VERITAS Seal (public) | **47803** |
| VERITAS Console (investigator) | **47804** |

Bind Postgres and Ollama to `127.0.0.1`. Full config in `ACPIA_FINAL_PHASE.md` §2.

### 11.2 Models

```bash
docker exec veritas-ollama ollama pull moondream          # ~1.7 GB  vision
docker exec veritas-ollama ollama pull qwen2.5:3b         # ~1.9 GB  text, multilingual
docker exec veritas-ollama ollama pull nomic-embed-text   # ~0.3 GB  embeddings
```
~3.9 GB total — all resident on 6 GB, no eviction, no stalls. Warm with `keep_alive: -1` at startup.

### 11.3 Five agents

| Agent | Job | Emits |
|---|---|---|
| **Artifact** | EXIF, OCR (`-l tam+eng`), vision description, embedding | `artifact.processed` |
| **Authenticity** | Metadata coherence, provenance timing, render checks | `authenticity.assessed` |
| **Narrative** | Stage classification, trajectory, **code-switch drift** | `narrative.stage_classified` |
| **Link** | Stylometry (Tamil-share weighted), temporal, metadata, embedding | `link.proposed` |
| **Contradiction** | Cross-submission conflict detection | `contradiction.found` |

### 11.4 Build order — do not deviate

| Phase | Tasks | Owner | Est. |
|---|---|---|---|
| **0** | Ports, rename to VERITAS, schema + CHECK constraints, JWT | Barath | 2h |
| **1** | **Hash-chained custody ledger + verify_chain** | Barath | 1h15 |
| **2** | Seal endpoints, dual-code issuance, commitment lock | Barath | 1h30 |
| **3** | EventBus + WebSocket | Barath | 45m |
| **4** | Tanglish engine (detect / normalize / drift / stylometry) | Tino | 2h |
| **5** | Artifact + Narrative + Link agents | Tino | 3h |
| **6** | **Authenticity Agent** (two-score model) | Tino | 1h30 |
| **7** | **Contradiction Agent** | Tino | 2h |
| **8** | **Respondent flow** in Seal | Chinnaya | 1h30 |
| **9** | **Two-score tiles** + **Contradiction Board** | Chinnaya | 2h |
| **10** | **QR pairing** panel + phone flow | Chinnaya | 1h |
| **11** | Auditor view (chain verify + confirm ratio) | Chinnaya | 1h |
| **12** | BSA §63 certificate with the integrity-only clause | Barath | 1h30 |
| **13** | Impact Ledger | Barath | 30m |

**Cut order if short:** Auditor view → graph → Impact Ledger → QR pairing.
**Never cut:** Respondent flow, Contradiction Board, two-score model, hash-chained ledger, Escalation Timeline.

### 11.5 Demo dataset — now with two submissions

**Submission A (complainant):** the fabricated screenshot. No EXIF. Claimed date 03 Aug 21:14. Sealed 41 days later.

**Submission B (respondent):** a device activity log showing the handset powered off 03 Aug 19:02 – 04 Aug 07:30, and a complete message export where the referenced thread ID does not appear.

Plus the GUARD persona from `ACPIA_FINAL_PHASE.md` §7 — 58 messages over six weeks, Tamil share climbing 22% → 84%, entirely benign content so the signal is purely structural.

**Everything synthetic. Factory-reset demo handset. No personal device in the room.**

---

## 12. DEMO SCRIPT — EIGHT MINUTES

**0:00 — The problem nobody else solves.**
> *"Every forensic tool on the market assumes the evidence it receives is genuine. Cellebrite extracts it, Griffeye classifies it. Not one asks whether it was fabricated before it arrived. That assumption held when evidence came from seized devices. It collapses in a world where anyone can fake a convincing screenshot in ninety seconds. We built for the world we're actually in."*

**0:45 — Seal, from a phone via QR.** Scan the Console's QR code, seal a file live.
> *"Watch the network tab. Two hundred bytes — a hash and a size. The file never left this phone."*

**1:30 — The handover.** Type the reference code into Console. `INTEGRITY VERIFIED` renders green.

**2:15 — The GUARD case and the pipeline.** Tiles appear sealed. Timeline draws dot by dot.
> *"Nothing is pre-rendered — every event arrived over a WebSocket in the last ninety seconds."*

**3:00 — The Tanglish moment.**
> *"Look at the language band. This conversation starts at 22% Tamil and ends at 84% — code-switch drift, language moving toward intimacy over six weeks. Cellebrite is American, Griffeye Swedish, Semantics21 British. Given 'idha yaarukkum sollaadha ok va' they don't return a low score — they return nothing, because they can't tokenise it. Half a billion Indians chat like this."*

**4:00 — THE IMPARTIALITY SCENE. This is your knockout.**
Switch to the FAIR case.
> *"Now the question you're all waiting to ask. A false complaint against an innocent person. Here's a submitted screenshot. Integrity — green: nobody altered it after sealing. But authenticity — amber, two indicators: no camera metadata, sealed 41 days after its claimed date.*
>
> *And here's what nobody else has. The accused got their own code and sealed their own evidence — blind. Neither party saw the other's submission, so neither could shape their account to fit."*

Open the Contradiction Board.
> *"Three conflicts. The message is claimed at 21:14 on 3 August; his device log shows the phone powered off from 19:02 that evening until 07:30 the next morning. The referenced thread doesn't appear in his complete export.*
>
> *We are not saying she lied. No honest tool can — the 2025 research shows deepfake detectors collapsing from 95% to the 50s on real data. Every contradiction here ships with its innocent explanation. We surface incoherence; a human judges.*
>
> *And it's symmetric. If he had fabricated his export, the deletion gaps would surface identically. VERITAS has no side."*

**5:30 — The corruption answer.**
Open the Auditor view. Click **Re-verify chain from genesis**.
> *"You'll ask what stops us taking a bribe to corrupt a case. The ledger is hash-chained — every entry contains the previous entry's hash, so any alteration breaks it permanently. UPDATE and DELETE are revoked at the database level; we tested it. We're air-gapped inside the agency with no path to a live case. Destructive actions need a supervisor co-signature. And an external auditor can verify all of this without ever seeing evidence content. We didn't build a system you have to trust us to run honestly. We built one where dishonesty leaves evidence."*

**6:45 — The Impact Ledger.**
> *"847 processed, 23 surfaced. 824 files a human never had to look at. Measured this session — we haven't run a pilot, so we won't claim an accuracy figure."*

**7:30 — Close.**
> *"VERITAS protects the integrity of digital evidence from the citizen's phone to the courtroom. GUARD defends children. FAIR protects both sides of a workplace complaint. The engine is the same, because the question is the same: does this evidence cohere with reality? Truth coheres. Fabrication doesn't. We don't decide who's lying — we make lying visible. That protects the victim and the falsely accused with exactly equal force. Evidence you can trust. Investigation you can defend."*

---

## 13. FINAL CHECKLIST

**Innovation (the things that win)**
- [ ] Respondent flow live, with all three fairness sentences displayed
- [ ] Blind separation enforced at the query layer, not just the UI
- [ ] Commitment lock — hashes time-committed, unswappable
- [ ] Contradiction Board with impartiality footer visible
- [ ] Two-score model on every tile; scores never merge
- [ ] Hash-chained ledger + working `verify_chain`
- [ ] Auditor view with chain verification and confirm/reject ratio

**Anti-corruption**
- [ ] `REVOKE UPDATE, DELETE ON custody_log` — tested, failure confirmed
- [ ] Every state change writes an attributed, chained custody entry
- [ ] Dual-control on destructive actions

**Honesty guardrails**
- [ ] No deepfake-detection claim anywhere
- [ ] No accuracy percentage anywhere
- [ ] Every authenticity indicator and contradiction carries a caveat
- [ ] Certificate states explicitly: integrity only, not authenticity

**Real-time**
- [ ] All models resident, `nvidia-smi` under 5 GB
- [ ] WebSocket events arrive within 2 seconds
- [ ] Timeline draws dot by dot, not in a batch

**Phone**
- [ ] QR pairing works on both an Android and an iPhone
- [ ] ADB acquisition tested; RSA prompt pre-accepted
- [ ] `demo_export.zip` fallback staged

**Safety**
- [ ] All demo data synthetic; content benign; signal purely structural
- [ ] Factory-reset handset; no personal device in the room
- [ ] Seal never outputs a verdict, never says "safe", shows 1098 on every screen
- [ ] Golden path run end-to-end twice
- [ ] Fallback video recorded

---

*VERITAS v6. Truth coheres. Fabrication doesn't.*
*We don't decide who's lying — we make lying visible.*
