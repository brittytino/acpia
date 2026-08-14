# ACPIA — Master Specification
## From the first screenshot to the courtroom: one unbroken chain.

**Agentic Child Protection Intelligence Architecture**
Version 3.0 — Final. This document supersedes all previous ACPIA documents.

---

## TABLE OF CONTENTS

1. [The Product in One Page](#1-the-product-in-one-page)
2. [Decision Log — Every Open Question, Answered](#2-decision-log)
3. [The Thesis: The Broken Chain](#3-the-thesis-the-broken-chain)
4. [Two Surfaces, One Spine](#4-two-surfaces-one-spine)
5. [Technology Stack — Final](#5-technology-stack--final)
6. [Complete User Flow A — ACPIA Seal (Public)](#6-user-flow-a--acpia-seal-public)
7. [Complete User Flow B — ACPIA Console (Police)](#7-user-flow-b--acpia-console-police)
8. [Screen Inventory & Wireframes](#8-screen-inventory--wireframes)
9. [Design System](#9-design-system)
10. [Data Model](#10-data-model)
11. [Complete API Surface](#11-complete-api-surface)
12. [The AI Pipeline](#12-the-ai-pipeline)
13. [Security, Legal & Safety Architecture](#13-security-legal--safety-architecture)
14. [SDG Impact Model](#14-sdg-impact-model)
15. [Build Plan & Task Assignment](#15-build-plan--task-assignment)
16. [Demo Script](#16-demo-script)
17. [Roadmap](#17-roadmap)

---

## 1. THE PRODUCT IN ONE PAGE

### What it is

ACPIA is a child-protection evidence system with two faces.

**ACPIA Seal** lets any ordinary person — a parent, a teacher, a teenager, a bystander — take something they've seen online and turn it into a properly preserved, cryptographically sealed, court-ready report in under three minutes, without needing to understand a single technical concept.

**ACPIA Console** lets a cyber-cell investigator receive that sealed report with its integrity intact, combine it with device evidence, and use local AI to surface behavioural patterns across months of conversation that no human could reconstruct by hand — with every finding cited, every decision logged, and every artifact hash-verified end to end.

### The one-sentence pitch

> **Every forensic tool tells you what's in the file. ACPIA tells you what happened over six months — and it starts the chain of custody at the citizen, not at the police station.**

### Why anyone should care

Right now a concerned parent screenshots something, forwards it on WhatsApp, and by the time it reaches a cyber cell the metadata is stripped, the timestamps are gone, and the material is legally worthless. Digital evidence in India fails in court on *certification*, not relevance. Meanwhile investigators drown: India is consistently the top country for NCMEC CyberTipline reports, and Indian CSAM cases rose roughly five-fold between 2021 and 2025.

ACPIA closes both ends of the same broken pipe.

### The three things a judge will remember

1. **The hash never leaves the browser.** Open the network tab during the demo — the file body was never transmitted. Trust demonstrated, not claimed.
2. **The Escalation Timeline.** Fifty-eight messages over six weeks, plotted by behavioural stage. Not one would trip a keyword filter. The signal is the slope.
3. **The Impact Ledger.** 847 artifacts processed, 23 surfaced to a human. 824 files a person never had to look at.

---

## 2. DECISION LOG

Every question you've raised, answered. No item is open.

| # | Question | **Decision** | Why |
|---|---|---|---|
| 1 | Police, cyber cells, or public? | **Both — two separate applications with different capabilities.** | §4 |
| 2 | Can the public use the analysis engine? | **No.** Public surface gets preservation + escalation only. No identity resolution, no risk scoring, no analysis of third parties. | §13.3 |
| 3 | Rust or stay on Next.js/Python? | **Stay.** Python + FastAPI + Next.js. | §5.1 |
| 4 | Host it live? | **Not required. Build for on-prem.** Optional sandbox flag exists but is not the deliverable. | §13.1 |
| 5 | Neo4j or Postgres? | **Postgres 16 + pgvector.** Graph as node/edge tables. | §5.2 |
| 6 | Keycloak? | **Deleted.** FastAPI JWT, ~40 lines. | §5.2 |
| 7 | Celery + Redis? | **Deleted.** `asyncio` background tasks + WebSocket. | §5.2 |
| 8 | MinIO / OpenSearch / Grafana / Prometheus? | **Deleted for MVP.** Local filesystem. Observability is a v2 concern. | §5.2 |
| 9 | Which models? | **`moondream` + `llama3.2:3b` + `nomic-embed-text`.** ~4 GB total, all resident on 6 GB. | §5.3 |
| 10 | How many agents? | **Three.** Artifact, Narrative, Link. | §12 |
| 11 | USB phone acquisition? | **Yes — local agent, prepared demo handset only, consented logical acquisition.** | §7.4 |
| 12 | Cloud account extraction (Google/iCloud)? | **Never.** That is account takeover, not forensics. | §13.3 |
| 13 | What's the signature feature? | **The Escalation Timeline.** Protect it above all else. | §8.9 |
| 14 | Real CSAM in the demo? | **Never, under any circumstance.** Synthetic persona, authored by the team. | §13.4 |

---

## 3. THE THESIS: THE BROKEN CHAIN

Every child-protection case follows the same path, and it breaks in the same two places.

```
  ①  A person notices something
      │
      ▼
  ┌────────────────────────────────────────────┐
  │  ⚠ BREAK ONE — EVIDENCE DIES HERE          │
  │                                             │
  │  Screenshot loses metadata. Forwarding      │
  │  strips EXIF. No hash, no timestamp, no     │
  │  provenance. By the time it reaches police  │
  │  it cannot be authenticated.                │
  └────────────────────────────────────────────┘
      │
      ▼
  ②  Report reaches a cyber cell
      │
      ▼
  ┌────────────────────────────────────────────┐
  │  ⚠ BREAK TWO — INVESTIGATION DROWNS HERE   │
  │                                             │
  │  One investigator. Tens of thousands of     │
  │  files. Behavioural patterns spread across  │
  │  months and platforms. Weeks of manual      │
  │  correlation. Severe psychological injury   │
  │  from reviewing the material.               │
  └────────────────────────────────────────────┘
      │
      ▼
  ③  Prosecution — often on evidence that
     fails certification under BSA §63
```

**ACPIA Seal repairs Break One. ACPIA Console repairs Break Two. The hash is the weld.**

Nobody else builds both ends. Cellebrite extracts devices. Griffeye and Semantics21 grade images. None of them start the chain at the citizen, and none of them reconstruct behaviour across time. That gap is the entire product.

---

## 4. TWO SURFACES, ONE SPINE

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│      ACPIA SEAL              │         │     ACPIA CONSOLE            │
│      (public web app)        │         │     (police, on-prem)        │
│                              │         │                              │
│  Who: parents, teachers,     │         │  Who: cyber cell             │
│       teenagers, bystanders  │         │       investigators          │
│                              │         │                              │
│  Register: calm, light,      │         │  Register: dark forensic     │
│       plain language         │         │       workstation            │
│                              │         │                              │
│  CAN:                        │         │  CAN:                        │
│  ✓ Hash locally in browser   │         │  ✓ Receive sealed reports    │
│  ✓ Seal own evidence         │         │  ✓ Device acquisition        │
│  ✓ Preservation certificate  │         │  ✓ Full AI pipeline          │
│  ✓ Guided reporting          │         │  ✓ Escalation Timeline       │
│  ✓ Helpline routing          │         │  ✓ Identity resolution       │
│                              │         │  ✓ BSA §63 certificate       │
│  CANNOT:                     │         │                              │
│  ✗ Analyse another person    │         │  Deployment:                 │
│  ✗ See any risk score        │         │  air-gapped LAN inside the   │
│  ✗ Scan someone's device     │         │  agency. No internet.        │
│  ✗ Upload illegal material   │         │                              │
└──────────────┬───────────────┘         └───────────▲──────────────────┘
               │                                     │
               │    ┌───────────────────────────┐    │
               └───►│   THE SPINE               │────┘
                    │   SHA-256 + custody log   │
                    │                            │
                    │   One hash lineage from    │
                    │   citizen to courtroom.    │
                    └───────────────────────────┘
```

### The handover — this is the WOW

1. Citizen seals evidence in **Seal**. Gets a **Reference Code**: `ACP-7K4M-2X9P`.
2. Citizen files at a police station or via NCRP, quoting the code.
3. Investigator enters the code in **Console**. The sealed package arrives with its original hash, original timestamp, and declarant statement.
4. Console recomputes the hash. Match → the chain is continuous from the citizen's device.
5. That continuity is what goes into the Section 63 BSA certificate.

**In the demo, do this live.** Seal something on a phone. Read the code aloud. Type it into Console on the laptop. Watch the hash verify green. That thirty seconds is worth more than any slide.

---

## 5. TECHNOLOGY STACK — FINAL

### 5.1 The Rust question — answered

**Stay on Python + Next.js. Do not introduce Rust.**

| Consideration | Verdict |
|---|---|
| Where is your time actually spent? | GPU inference — seconds per file. Rust saves microseconds. It optimises the wrong thing. |
| Ecosystem | Every model, OCR, EXIF, and stylometry library you need is Python. Rust would mean writing bindings under time pressure. |
| Team | You have hours, not months. A rewrite in an unfamiliar language guarantees a broken demo. |
| Does a judge care? | No judge has ever awarded points for implementation language. They award points for working software. |

**Where Rust *would* genuinely earn its place — say this if asked, it shows you thought about it:**
> *"The one place Rust makes sense is the field acquisition agent — a single static binary an investigator drops on a workstation with no Python runtime, no dependency hell, and a small auditable surface for something that touches evidence. That's on the roadmap. The server has no Rust-shaped problem: our latency is GPU-bound, not CPU-bound."*

### 5.2 Final stack

| Layer | Choice | Notes |
|---|---|---|
| **Public app** | Next.js 14 (App Router) + TypeScript + Tailwind | Static-friendly, fast first paint |
| **Console** | Next.js 14 + TypeScript + Tailwind + Cytoscape.js + Recharts | Cytoscape for the graph, Recharts for the timeline |
| **API** | FastAPI + Pydantic v2 + `asyncio` | Single service |
| **Live updates** | Native WebSocket | Powers the whole real-time feel |
| **Database** | PostgreSQL 16 + pgvector | Relational + graph + embeddings in one engine |
| **Migrations** | Alembic | Keep what you have |
| **Storage** | Local filesystem, path in Postgres | MinIO deleted |
| **Auth** | FastAPI JWT (`python-jose`) + `passlib[bcrypt]` | Keycloak deleted |
| **Inference** | Ollama | Three small resident models |
| **PDF** | `fpdf2` | Certificates and reports |
| **Acquisition agent** | Python CLI + `adb` | Runs on investigator's workstation |
| **Browser hashing** | WebCrypto `crypto.subtle.digest` | Zero dependencies, native, fast |

**Services running: three.** Postgres, Ollama, and your own app. Down from twelve. Full cold boot in under a minute.

### 5.3 Model configuration

```bash
ollama pull moondream            # ~1.7 GB — vision
ollama pull llama3.2:3b          # ~2.0 GB — classification + synthesis
ollama pull nomic-embed-text     # ~0.3 GB — embeddings
# Total ~4.0 GB. Fits 6 GB VRAM with headroom. No eviction, ever.
```

Warm them at startup and pin them:

```python
@app.on_event("startup")
async def warm_models():
    async with httpx.AsyncClient(base_url=settings.ollama_url, timeout=300) as c:
        for model in ("moondream", "llama3.2:3b", "nomic-embed-text"):
            await c.post("/api/generate", json={
                "model": model, "prompt": "ready", "stream": False,
                "keep_alive": -1,        # resident indefinitely
            })
            log.info("model_warm", model=model)
```

**Why small models are the correct choice, not a compromise:** classifying a message into one of six named stages is a constrained labelling task, where a 3B model performs close to an 8B. What you buy is three models resident simultaneously, no eviction stalls, and sub-second inference. Your system's intelligence lives in correlating thousands of cheap inferences across time — not in one expensive one. That is a real architectural argument. Use it.

### 5.4 Repository layout

```
acpia/
├─ backend/
│  ├─ app/
│  │  ├─ main.py                   # FastAPI app, startup, model warming
│  │  ├─ core/
│  │  │  ├─ config.py              # Settings
│  │  │  ├─ security.py            # JWT, password hashing
│  │  │  ├─ events.py              # EventBus
│  │  │  └─ custody.py             # Hashing + chain-of-custody writer
│  │  ├─ models/                   # SQLAlchemy
│  │  ├─ schemas/                  # Pydantic
│  │  ├─ agents/
│  │  │  ├─ artifact.py
│  │  │  ├─ narrative.py
│  │  │  └─ link.py
│  │  ├─ pipeline.py               # Orchestrator
│  │  └─ api/v1/
│  │     ├─ auth.py  cases.py  evidence.py  leads.py
│  │     ├─ graph.py  reports.py  stream.py
│  │     ├─ seal.py                # PUBLIC endpoints
│  │     └─ inbound.py             # Reference-code handover
│  └─ alembic/
├─ seal/                           # Public Next.js app
├─ console/                        # Police Next.js app
├─ agent/acquire.py                # USB acquisition agent
└─ docker-compose.yml              # postgres + ollama only
```

---

## 6. USER FLOW A — ACPIA SEAL (PUBLIC)

**Design constraint above all others:** the person using this may be frightened, may be a child, and may have no technical vocabulary whatsoever. Every screen has one job, one primary action, and no jargon.

### 6.1 The flow

```
  LANDING
    │  "Something happened. What do I do?"
    │  Three large cards, plain language.
    ▼
  ┌─────────────────┬─────────────────┬─────────────────┐
  │ Someone is      │ I'm worried     │ I was sent      │
  │ messaging a     │ about how       │ something       │
  │ child in a way  │ someone is      │ illegal         │
  │ that worries me │ treating me     │                 │
  └────────┬────────┴────────┬────────┴────────┬────────┘
           │                 │                 │
           ▼                 ▼                 ▼
      PATH 1            PATH 2            PATH 3
    (guardian)         (self)          (illegal material)
           │                 │                 │
           └────────┬────────┘                 │
                    ▼                          ▼
            ┌───────────────┐         ┌──────────────────┐
            │  PRESERVE     │         │  DO NOT UPLOAD   │
            │               │         │                  │
            │ Guided export │         │ Hash on device.  │
            │ per platform  │         │ Transmit hash    │
            │               │         │ only. Report to  │
            │ Drop the file │         │ NCRP immediately.│
            └───────┬───────┘         └────────┬─────────┘
                    │                          │
                    ▼                          │
            ┌───────────────┐                  │
            │  SEAL         │◄─────────────────┘
            │               │
            │ SHA-256 in    │
            │ your browser. │
            │ Nothing sent. │
            └───────┬───────┘
                    ▼
            ┌───────────────┐
            │  CERTIFICATE  │
            │               │
            │ PDF you keep. │
            │ Hash, time,   │
            │ statement.    │
            └───────┬───────┘
                    ▼
            ┌───────────────┐
            │  REPORT       │
            │               │
            │ Where to go.  │
            │ What to say.  │
            │ Reference     │
            │ code.         │
            └───────┬───────┘
                    ▼
            ┌───────────────┐
            │  SUPPORT      │
            │               │
            │ Childline 1098│
            │ NCRP 1930     │
            │ POCSO e-Box   │
            └───────────────┘
```

### 6.2 The critical technical move — hash in the browser

The file never leaves the person's device. This is simultaneously the strongest privacy guarantee, the cleanest legal position, and the best demo moment.

`seal/lib/seal.ts`:

```typescript
export interface SealResult {
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  filename: string;
  sealedAt: string;
}

/** Hashes entirely in-browser. No network call. The file never leaves the device. */
export async function sealFile(file: File): Promise<SealResult> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const sha256 = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    sha256,
    sizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    filename: file.name,
    sealedAt: new Date().toISOString(),
  };
}
```

**What gets transmitted for Path 3 (illegal material):** the hash, the file size, the MIME type, and the person's account of what happened. **Never the file body.** This matters legally — under s.15 POCSO and s.67B IT Act read with *Just Rights for Children Alliance v. S. Harish* (2024), receiving that material onto your server would put your organisation in possession of it. The hash is also the technically useful part: it is what matches against known-material databases.

**The demo moment:** open the browser network tab, seal a file, and point at the request. `{"sha256": "...", "size": 2411008}` — 180 bytes. *"The file never left the phone. We never saw it. That's not a policy, that's the architecture."*

### 6.3 Copy discipline

The single biggest determinant of whether a layman can use this is the words. Rules:

| Never write | Write instead |
|---|---|
| "Upload evidence artifact" | "Add the file" |
| "Cryptographic hash generated" | "We made a fingerprint of this file" |
| "Chain of custody initiated" | "We've recorded the time and date. This can't be changed later." |
| "Submit report to jurisdiction" | "Send this to the police" |
| "Authentication required" | (nothing — don't make them log in) |
| "Analysis complete" | "Here's what to do next" |

**No account required for the public app.** Requiring a frightened teenager to create an account with an email address is how you lose them. Identity is optional and only collected at the reporting step, where it is legally necessary.

### 6.4 Screen-by-screen

**S1 — Landing.** One sentence. Three cards. Helpline numbers visible without scrolling. No marketing copy, no feature list, no hero animation.

**S2 — Guided intake.** One question per screen. Large tap targets. A visible "I'm not sure" option on every question that routes to a human helpline rather than a dead end.

**S3 — Preserve.** Platform-specific instructions with screenshots for exporting a chat (WhatsApp → Export Chat, Instagram → Download Your Information, and so on). Drop zone. Explicit line: *"This stays on your device."*

**S4 — Seal.** Progress bar while hashing. Then the hash displayed in monospace — showing it makes the abstraction concrete and builds trust. *"This is your file's fingerprint. If anyone changes even one pixel, this number changes completely."*

**S5 — Certificate.** A downloadable PDF: filename, SHA-256, sealed timestamp, declarant's own statement, and a plain-English explanation of what the document is for. This is the artifact they carry to the police station.

**S6 — Report.** The exact channels with working links and numbers: **Childline 1098**, **National Cyber Crime helpline 1930**, **cybercrime.gov.in**, **POCSO e-Box**. Pre-written text they can copy. The Reference Code, large and copyable.

**S7 — Support.** Always reachable from every screen. Never a dead end anywhere in the flow.

### 6.5 Safety rules the public app must enforce

These are not suggestions. Build them as constraints.

- **Never output a verdict.** No risk score, no "this looks concerning," and critically **no "this appears safe."** A false reassurance is the worst possible failure mode for this product. Output is always: *here is what you preserved, here is who to contact.*
- **Never profile a third party.** No identity resolution, no stylometry, no behavioural scoring on the public surface. That capability is police-only, and the distinction is what separates a child-protection tool from a surveillance tool.
- **Never ask for identifying information about a child.** Not name, not school, not address. The police need that; you don't.
- **Always surface the helpline.** Persistent, on every screen, not buried in a footer.
- **Assume the user may be a minor.** Plain language, no dark patterns, no urgency manipulation, no account creation.

---

## 7. USER FLOW B — ACPIA CONSOLE (POLICE)

### 7.1 The flow

```
  LOGIN (JWT)
    │
    ▼
  DASHBOARD ─────────────────────────────────────┐
    │  Active cases · Inbound citizen reports ·   │
    │  Leads awaiting judgment · Exposure summary │
    └──────────────────────────────────────────────┘
    │
    ├──► INBOUND QUEUE ──► enter Reference Code
    │         │              hash verified ✓
    │         └──► accept into case (chain continues)
    │
    ▼
  CASE WORKSPACE
    │
    ├─ ① INGEST
    │    ├─ USB acquisition agent (consented, demo handset)
    │    ├─ Forensic export import (.zip / UFDR)
    │    └─ Direct file drop
    │       └─ Every artifact: SHA-256 → custody log → dedup
    │                          (before any AI touches it)
    │
    ├─ ② PIPELINE (live, streamed over WebSocket)
    │    ├─ Artifact Agent  → tiles appear, sealed
    │    ├─ Narrative Agent → timeline draws, dot by dot
    │    └─ Link Agent      → edges animate in, leads created
    │
    ├─ ③ REVIEW
    │    ├─ Escalation Timeline ◄── the signature view
    │    ├─ Sealed evidence grid (reveal = logged)
    │    ├─ Lead queue → Confirm / Reject (keyboard driven)
    │    └─ Knowledge graph
    │
    └─ ④ OUTPUT
         ├─ Case report (confirmed findings only)
         └─ BSA §63 certificate (every hash, full custody)
```

### 7.2 The human gate — enforced structurally

This is the most important behaviour in the system and it must be architectural, not procedural.

```python
class LeadStatus(str, Enum):
    PROPOSED  = "proposed"    # AI wrote this. Not in the case record.
    CONFIRMED = "confirmed"   # An investigator confirmed it. Logged.
    REJECTED  = "rejected"    # An investigator rejected it. Logged.


async def confirm_lead(lead_id: UUID, actor: User, db) -> Lead:
    lead = await db.get(Lead, lead_id)
    if lead.status is not LeadStatus.PROPOSED:
        raise HTTPException(409, "Lead has already been judged.")

    lead.status = LeadStatus.CONFIRMED
    lead.judged_by = actor.id
    lead.judged_at = datetime.now(timezone.utc)

    await write_custody(db, lead.case_id, actor.id,
                        action="LEAD_CONFIRMED", target=lead.id)
    await db.commit()
    await bus.emit(lead.case_id, "lead.confirmed",
                   {"id": str(lead.id), "actor": actor.username})
    return lead
```

**No code path anywhere may set `CONFIRMED` except an authenticated human action.** The case report and the certificate render only confirmed findings. Grep for it before you demo — if the pipeline can write a confirmed lead, your central claim is false.

### 7.3 Confidence must never render as a bare number

```tsx
export function Confidence({ score, ci }: { score: number; ci: number }) {
  const filled = Math.round(score * 10);
  const band = score >= 0.7 ? "Strong" : score >= 0.45 ? "Moderate" : "Weak";
  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <span aria-hidden>
        {"▰".repeat(filled)}
        <span className="text-[var(--text-faint)]">{"▱".repeat(10 - filled)}</span>
      </span>
      <span className="text-[var(--text-dim)]">
        {score.toFixed(2)} ± {ci.toFixed(2)}
      </span>
      <span className="uppercase tracking-widest text-[10px]">{band}</span>
    </div>
  );
}
```

A bare `73%` invites false certainty. `0.73 ± 0.06 · Strong` does not. Your own risk register names automation bias as a primary failure mode — this component is that concern made visible.

### 7.4 USB acquisition — scope and limits

**What it does:** consented logical acquisition over ADB from a device whose owner enabled USB debugging and accepted the on-device authorisation prompt. Reads an allowlist of user-data paths. Hashes every file at the moment of acquisition, on the workstation, before transmission. The server recomputes and compares; a mismatch quarantines the artifact as `INTEGRITY_FAILED`.

**What it must never do:**

| Capability | Verdict |
|---|---|
| Bypass a screen lock, PIN, or encryption | **Never.** That is the exploit market. |
| Root or exploit a device | **Never.** |
| Log into a suspect's cloud account with credentials | **Never.** Cloud data comes from legal process served on the provider, not from a tool holding passwords. Building it makes ACPIA indistinguishable from stalkerware. |

**Say this in the demo.** Refusing capability is a credibility signal, and an informed evaluator will notice you drew the line.

**Always build the folder-import fallback.** USB fails on stage constantly — cable, driver, hub, permission prompt. Pre-stage `demo_export.zip` with the identical dataset. If the phone doesn't enumerate in fifteen seconds, drop the zip and keep talking.

---

## 8. SCREEN INVENTORY & WIREFRAMES

### ACPIA Seal — public

| ID | Screen | Primary action |
|---|---|---|
| S1 | Landing | Choose a path |
| S2 | Guided intake | Answer one question |
| S3 | Preserve | Add the file |
| S4 | Seal | Watch the fingerprint form |
| S5 | Certificate | Download the PDF |
| S6 | Report | Copy the reference code |
| S7 | Support | Call for help |

### ACPIA Console — police

| ID | Screen | Primary action |
|---|---|---|
| C1 | Login | Sign in |
| C2 | Dashboard | Open a case or an inbound report |
| C3 | Inbound queue | Verify and accept a citizen report |
| C4 | Case workspace | Run the pipeline |
| C5 | Evidence grid | Reveal (logged) |
| C6 | **Escalation Timeline** | Inspect a stage classification |
| C7 | Lead queue | Confirm / Reject |
| C8 | Knowledge graph | Traverse relationships |
| C9 | Report & certificate | Generate |

### 8.1 S1 — Landing

```
┌────────────────────────────────────────────────────────────┐
│  ACPIA Seal                          Need help now? 1098   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│      Something happened online.                             │
│      Let's make sure it counts.                             │
│                                                             │
│      Three minutes. Nothing you share leaves your device    │
│      unless you choose to send it.                          │
│                                                             │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│   │              │ │              │ │              │      │
│   │  Someone is  │ │ I'm worried  │ │ I was sent   │      │
│   │  messaging a │ │ about how    │ │ something    │      │
│   │  child in a  │ │ someone is   │ │ illegal      │      │
│   │  way that    │ │ treating me  │ │              │      │
│   │  worries me  │ │              │ │              │      │
│   │              │ │              │ │              │      │
│   │  Start  →    │ │  Start  →    │ │  Start  →    │      │
│   └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                             │
│   Not sure which? Call Childline 1098. It's free, and       │
│   they will talk you through it.                            │
└────────────────────────────────────────────────────────────┘
```

Note what's absent: no navigation bar, no feature list, no sign-up, no marketing. A person in distress gets three doors and a phone number.

### 8.2 S4 — Seal

```
┌────────────────────────────────────────────────────────────┐
│  ← Back                                     Step 2 of 4    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│      Sealing your file                                      │
│                                                             │
│      ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱  84%                            │
│                                                             │
│      whatsapp_chat_export.txt · 340 KB                      │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  This is happening on your phone.                   │  │
│   │  The file is not being sent anywhere.               │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ─────────────────────────────────────────────────────    │
│                                                             │
│   Your file's fingerprint                                   │
│                                                             │
│   4f2a8c91b7e3d5a2  6c8f0b1d9e4a7352                       │
│   1a3b5c7d9e2f4068  8d0c2e4a6b8f1357                       │
│                                                             │
│   If anyone changes even one letter of this file, this      │
│   fingerprint changes completely. That's how the police     │
│   can prove it wasn't tampered with.                        │
│                                                             │
│                                   [  Continue  →  ]         │
└────────────────────────────────────────────────────────────┘
```

Showing the hash is a deliberate choice. It makes an abstraction concrete, and the plain-English explanation underneath converts it from intimidating to reassuring.

### 8.3 S6 — Report

```
┌────────────────────────────────────────────────────────────┐
│  ← Back                                     Step 4 of 4    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│      Your reference code                                    │
│                                                             │
│      ┌───────────────────────────────┐                     │
│      │      ACP-7K4M-2X9P            │  [ Copy ]           │
│      └───────────────────────────────┘                     │
│                                                             │
│      Give this to the police. They can pull up everything   │
│      you sealed, exactly as you sealed it.                  │
│                                                             │
│   ─────────────────────────────────────────────────────    │
│                                                             │
│   Where to send this                                        │
│                                                             │
│   ▸ Childline — 1098                    [ Call ]           │
│     Free, 24 hours. For anything involving a child.         │
│                                                             │
│   ▸ Cyber Crime helpline — 1930         [ Call ]           │
│     For online crimes, fraud, and harmful content.          │
│                                                             │
│   ▸ cybercrime.gov.in                   [ Open ]           │
│     File online. Takes about ten minutes.                   │
│                                                             │
│   ▸ POCSO e-Box (NCPCR)                 [ Open ]           │
│     Confidential complaints about child sexual abuse.       │
│                                                             │
│   [ Download your certificate ]  [ Copy what to say ]      │
└────────────────────────────────────────────────────────────┘
```

### 8.4 C2 — Dashboard

```
┌───────────┬────────────────────────────────────────────────┐
│  ACPIA    │  Good evening, Inspector Kumar                  │
│  CONSOLE  │                                                 │
│           │  ┌──────────────┐  ┌──────────────┐            │
│  ▸ Cases  │  │ INBOUND      │  │ AWAITING     │            │
│  ▸ Inbound│  │ 3 new        │  │ JUDGMENT     │            │
│  ▸ Reports│  │ citizen      │  │ 12 leads     │            │
│           │  │ reports      │  │              │            │
│  ─────────│  └──────────────┘  └──────────────┘            │
│  EXPOSURE │                                                 │
│  this week│  ACTIVE CASES                                   │
│           │  ┌────────────────────────────────────────────┐ │
│  Processed│  │ CASE-2026-0114  Kumar / multi-platform     │ │
│    4,208  │  │ 847 artifacts · 9 leads pending  ▮▮▮▮▱▱   │ │
│           │  ├────────────────────────────────────────────┤ │
│  Viewed   │  │ CASE-2026-0109  Inbound ACP-7K4M-2X9P      │ │
│      97   │  │ 12 artifacts · awaiting triage    ▮▱▱▱▱▱   │ │
│           │  └────────────────────────────────────────────┘ │
│  ▁▂▁▃▁▁▂  │                                                 │
└───────────┴────────────────────────────────────────────────┘
```

### 8.5 C3 — Inbound queue (the bridge)

```
┌────────────────────────────────────────────────────────────┐
│  INBOUND CITIZEN REPORT                                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Reference     ACP-7K4M-2X9P                               │
│  Sealed at     2026-08-14T09:12:44+05:30                   │
│  Declarant     Anonymous (contact provided to NCRP)         │
│  Path          "Someone is messaging a child"               │
│                                                             │
│  ── SEALED ARTIFACTS ──────────────────────────────────    │
│                                                             │
│  whatsapp_chat_export.txt          348,112 bytes           │
│    sealed  4f2a8c91b7e3d5a2…                               │
│    received 4f2a8c91b7e3d5a2…       ✓ INTEGRITY VERIFIED   │
│                                                             │
│  IMG_0417.jpg                    2,411,008 bytes           │
│    sealed  9d10be4c2a8f6031…                               │
│    received 9d10be4c2a8f6031…       ✓ INTEGRITY VERIFIED   │
│                                                             │
│  ── DECLARANT STATEMENT ───────────────────────────────    │
│  "I found these messages on my daughter's tablet. The       │
│   account started talking to her about six weeks ago."      │
│                                                             │
│         [ Accept into new case ]   [ Attach to case… ]     │
└────────────────────────────────────────────────────────────┘
```

That green `INTEGRITY VERIFIED` is the whole thesis rendered as one line of UI.

### 8.6 C5 — The sealed evidence tile

```
┌─────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░  │  ← 16px blur + desaturation
│  ░░░░░  SEALED  ░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────┤
│ IMG_0417.jpg            │
│ image/jpeg · 2.4 MB     │
│ sha 4f2a8c91b7…         │
│ EXIF · GPS present      │
│                         │
│ ▰▰▰▰▰▰▱▱▱▱ relevance    │
│                         │
│ [ Reveal — logs access ]│
└─────────────────────────┘
```

Two justifications, one component: a genuine investigator-welfare feature of the kind Semantics21 sells as a standalone product, *and* the access log a Section 63 certificate needs.

### 8.7 C6 — The Escalation Timeline (the signature)

```
┌────────────────────────────────────────────────────────────────┐
│  CONVERSATION   user_7741 ⇄ sam_k        6 weeks · 58 messages │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  solicitation │                                          ● ●   │
│  desensitis.  │                                    ●  ●        │
│  isolation    │                              ●  ●              │
│  dependency   │                  ●     ●  ●                     │
│  trust/excl.  │      ●     ●  ●     ●                          │
│  rapport      │ ● ● ●   ●                                       │
│               └─────────────────────────────────────────────    │
│                 W1     W2     W3     W4     W5     W6           │
│                                                                 │
│  ── trajectory ▲ +0.42 stage/week ─────────────────────────    │
│                                                                 │
│  ⚠ BEHAVIOURAL DRIFT   window 5 → 6: escalation rate ×2.1      │
│                                                                 │
│  Dot opacity = classification confidence.                       │
│  Click any point to see the source span.                        │
└────────────────────────────────────────────────────────────────┘
```

**This is the product.** A judge understands the entire value proposition in two seconds without narration. Build it with Recharts or plain SVG. Do not over-engineer it. Do not cut it.

Implementation: y-axis is the six stage labels as ordinals; x is timestamp; each dot is one message; opacity encodes confidence so low-confidence classifications visibly recede; the trend line is linear regression of stage ordinal over time; drift is the ratio of slopes between adjacent windows.

### 8.8 C7 — Lead queue with evidence basis

```
┌──────────────────────────────────┬──────────────────────────┐
│  LEAD QUEUE            9 pending │  EVIDENCE BASIS          │
│                                  │                          │
│  ▮ #7  Identity link             │  Lead #7                 │
│    s.kumar91 ⇄ user_7741        │  ──────────────────────  │
│    ▰▰▰▰▰▰▱▱▱▱ 0.61 ± 0.09       │  Derived from:           │
│    [Confirm] [Reject]            │                          │
│                                  │  ▸ chat_a.txt L12–47     │
│  ▮ #8  Behavioural drift         │    sha 4f2a8c…           │
│    escalation ×2.1 in W5→W6      │  ▸ chat_b.txt L3–29      │
│    ▰▰▰▰▱▱▱▱▱▱ 0.44 ± 0.14       │    sha 9d10be…           │
│    [Confirm] [Reject]            │                          │
│                                  │  Signals:                │
│  ▮ #9  Geospatial correlation    │  · stylometry      0.58  │
│    IMG_0417 EXIF ⇄ notes.txt    │  · temporal overlap 0.71 │
│    ▰▰▰▰▰▰▰▱▱▱ 0.73 ± 0.06       │  · device metadata  0.49 │
│    [Confirm] [Reject]            │  · embedding cosine 0.66 │
│                                  │                          │
│  J/K move · C confirm · X reject │  No lead renders without │
│                                  │  a citation.             │
└──────────────────────────────────┴──────────────────────────┘
```

The right panel is not chrome. It is the explainability principle rendered as UI — **the lead on the left cannot exist without the citation on the right.**

### 8.9 The Impact Ledger

```
┌─ SESSION IMPACT ──────────────────────────┐
│                                            │
│  Artifacts processed          847          │
│  Surfaced for human review     23          │
│  Human exposure avoided       97.3%        │
│                                            │
│  Pipeline wall-clock       6m 12s          │
│  Leads awaiting judgment        9          │
│  Confirmed by investigator      4          │
│                                            │
│  ⓘ Measured this session. Not a benchmark. │
└────────────────────────────────────────────┘
```

Every number is counted live from the event stream. `97.3%` is arithmetic on two counters you genuinely have — it is not an accuracy claim, and the footnote makes the distinction explicit. **This is how you get the SDG framing without fabricating anything.**

---

## 9. DESIGN SYSTEM

Two registers, one brand. A frightened parent must not land in a forensic workstation, and an investigator on hour nine of a shift must not be shouted at by a bright consumer app.

### 9.1 ACPIA Seal — light, calm, unhurried

```css
:root {
  --paper:      #F7F9FA;   /* cool soft paper, not cream */
  --card:       #FFFFFF;
  --ink:        #1A2430;
  --ink-soft:   #56646F;
  --ink-faint:  #93A0AA;
  --rule:       #E2E8EC;
  --calm:       #2E6E6B;   /* deep teal — primary action */
  --seal:       #B4762A;   /* wax-seal amber — the seal action only */
  --help:       #3D5A80;   /* helpline links */
}
```

No red anywhere. A person arriving here is already frightened; the interface must not add to it. The wax-seal amber appears exactly once per flow, on the action the whole app is named for.

Type: **IBM Plex Sans** at generous sizes — body 17px, line-height 1.65, headings 30/36. Hashes in **IBM Plex Mono**, spaced in four-character groups so they're readable and transcribable.

### 9.2 ACPIA Console — dark, cold, institutional

```css
:root {
  --void:       #0E1116;
  --slate:      #161B22;
  --slate-hi:   #1E252E;
  --rule:       #2A323D;
  --text:       #D6DEE8;
  --text-dim:   #7D8998;
  --text-faint: #4E5865;
  --steel:      #4A7FA5;   /* structure, links, graph edges */
  --pending:    #C9922E;   /* awaiting human judgment — signature state */
  --verified:   #3E8C7E;
  --rejected:   #8C4A52;
  --integrity:  #A8524F;   /* hash mismatch — the only true alarm */
}
```

**Why amber is the signature colour:** the defining state of this product is *"the AI produced something and a human has not yet judged it."* Red would imply confirmed danger, but nothing here is confirmed — and implying otherwise is exactly the automation bias your risk register names. Amber means *pending judgment*. It is semantically exact and it should be the most-seen colour in the interface.

### 9.3 Typography does structural work

**IBM Plex Sans** for interface, **IBM Plex Mono** for every immutable fact — SHA-256 values, ISO timestamps, case IDs, custody entries.

The rule: **facts in mono, interpretations in sans.** The typeface itself tells the investigator which things are measured and which are inferred. That is structure encoding meaning, and it costs nothing.

```
Display   Plex Sans 600, -0.02em   28/34
Heading   Plex Sans 600            18/24
Body      Plex Sans 400            14/21
Label     Plex Sans 500 upper, 0.08em   11/14
Data      Plex Mono 400            13/18
Hash      Plex Mono 400            11/16  --text-dim
```

### 9.4 Empty and failure states

Errors state what happened and what to do. They never apologise and never go vague.

| State | Copy |
|---|---|
| No evidence | **This case has no evidence.** Connect a device with the acquisition agent, or drop a forensic export here. |
| Running | **Analysing 47 artifacts.** The artifact agent is processing images; the narrative agent is queued. |
| Hash mismatch | **Integrity check failed.** The hash recorded at sealing doesn't match the hash on receipt. This artifact is quarantined and excluded from analysis. |
| No leads | **No leads met the confidence threshold.** Lower it in case settings, or add more evidence. |
| Model offline | **The inference worker isn't reachable.** Analysis is paused; nothing has been lost. Artifacts remain hashed and logged. |

### 9.5 Quality floor

- **Keyboard:** `J`/`K` through the lead queue, `C` confirm, `X` reject, `Enter` opens the basis panel. Investigators work queues.
- Visible focus rings everywhere: `outline: 2px solid var(--steel)`.
- `prefers-reduced-motion` respected; default to minimal motion regardless. Nothing here should bounce.
- Seal responsive to 360px — most citizens will arrive on a phone.
- Console responsive to 768px.
- Contrast ≥ 4.5:1 throughout, verified.

---

## 10. DATA MODEL

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── People & cases ────────────────────────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin','supervisor','investigator')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference   TEXT UNIQUE NOT NULL,            -- CASE-2026-0114
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open',
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Public sealing (ACPIA Seal) ───────────────────────────────
CREATE TABLE sealed_reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference     TEXT UNIQUE NOT NULL,          -- ACP-7K4M-2X9P
    path_taken    TEXT NOT NULL,                 -- guardian | self | illegal_material
    statement     TEXT,                          -- declarant's own words
    contact       TEXT,                          -- optional
    sealed_at     TIMESTAMPTZ NOT NULL,
    claimed_by    UUID REFERENCES cases(id),     -- set when police accept it
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sealed_artifacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id   UUID NOT NULL REFERENCES sealed_reports(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    size_bytes  BIGINT NOT NULL,
    sha256      CHAR(64) NOT NULL,               -- computed in the browser
    body_stored BOOLEAN NOT NULL DEFAULT FALSE,  -- FALSE for illegal_material path
    storage_path TEXT
);

-- ── Evidence & custody ────────────────────────────────────────
CREATE TABLE acquisitions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id        UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    method         TEXT NOT NULL,   -- adb_logical_consented | forensic_import
                                    -- | direct_upload | citizen_sealed
    device_profile JSONB NOT NULL DEFAULT '{}',
    operator_id    UUID REFERENCES users(id),
    started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ
);

CREATE TABLE evidence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    acquisition_id  UUID REFERENCES acquisitions(id),
    filename        TEXT NOT NULL,
    source_path     TEXT,
    mime_type       TEXT NOT NULL,
    size_bytes      BIGINT NOT NULL,
    sha256          CHAR(64) NOT NULL,
    client_sha256   CHAR(64),                    -- hash at acquisition
    integrity_ok    BOOLEAN NOT NULL DEFAULT TRUE,
    storage_path    TEXT NOT NULL,
    exif            JSONB DEFAULT '{}',
    description     TEXT,                        -- from moondream
    ocr_text        TEXT,
    embedding       vector(768),
    relevance       NUMERIC(4,3),
    revealed_count  INT NOT NULL DEFAULT 0,      -- drives the exposure ledger
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (case_id, sha256)                     -- dedup
);

CREATE TABLE custody_log (
    id          BIGSERIAL PRIMARY KEY,
    case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    actor_id    UUID REFERENCES users(id),
    action      TEXT NOT NULL,   -- INGESTED | HASH_VERIFIED | INTEGRITY_FAILED
                                 -- | VIEWED | LEAD_CONFIRMED | LEAD_REJECTED
                                 -- | REPORT_GENERATED | CERTIFICATE_GENERATED
    target_type TEXT NOT NULL,
    target_id   UUID,
    detail      JSONB NOT NULL DEFAULT '{}',
    at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Append-only. Grant INSERT and SELECT. Never UPDATE or DELETE.

-- ── Conversations & stages ────────────────────────────────────
CREATE TABLE conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    evidence_id   UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    platform      TEXT,
    participants  TEXT[] NOT NULL,
    first_at      TIMESTAMPTZ,
    last_at       TIMESTAMPTZ,
    message_count INT NOT NULL DEFAULT 0,
    trajectory    NUMERIC(5,3),     -- stages per week
    drift_ratio   NUMERIC(5,3)      -- slope(last window) / slope(prior)
);

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    idx             INT NOT NULL,
    sender          TEXT NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL,
    char_count      INT NOT NULL,
    stage           TEXT CHECK (stage IN (
        'rapport_building','trust_exclusivity','dependency',
        'isolation','desensitization','solicitation','none')),
    stage_conf      NUMERIC(4,3),
    evidence_span   TEXT           -- pointer, e.g. "L142-L147"
);
-- NOTE: message body is stored only when lawful and necessary; the classifier
-- returns a LABEL and a SPAN POINTER, never generated or reproduced content.

-- ── Knowledge graph ───────────────────────────────────────────
CREATE TABLE nodes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id    UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,  -- person|device|platform|file|location|event
    label      TEXT NOT NULL,
    props      JSONB NOT NULL DEFAULT '{}',
    embedding  vector(768)
);

CREATE TABLE edges (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    src_id        UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    dst_id        UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    observed_at   TIMESTAMPTZ,
    confidence    NUMERIC(4,3) NOT NULL,
    confidence_ci NUMERIC(4,3) NOT NULL,
    signals       JSONB NOT NULL DEFAULT '{}',
    source_ids    UUID[] NOT NULL,
    CHECK (cardinality(source_ids) > 0)     -- no uncited edge can exist
);

-- ── Leads (the human gate) ────────────────────────────────────
CREATE TABLE leads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,    -- identity_link | behavioural_drift
                                  -- | geospatial | timeline_conflict
    summary     TEXT NOT NULL,
    confidence  NUMERIC(4,3) NOT NULL,
    confidence_ci NUMERIC(4,3) NOT NULL,
    signals     JSONB NOT NULL DEFAULT '{}',
    source_ids  UUID[] NOT NULL,
    status      TEXT NOT NULL DEFAULT 'proposed'
                CHECK (status IN ('proposed','confirmed','rejected')),
    judged_by   UUID REFERENCES users(id),
    judged_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (cardinality(source_ids) > 0),
    CHECK ((status = 'proposed') = (judged_by IS NULL))
);
```

Those last two `CHECK` constraints are load-bearing. The first makes uncited leads structurally impossible. The second makes it impossible for a lead to be judged without a recorded human judge. Your explainability and human-gate claims become database invariants rather than promises.

### 10.1 Graph traversal without Neo4j

```sql
WITH RECURSIVE reachable AS (
    SELECT dst_id AS id, 1 AS depth, ARRAY[src_id] AS path
    FROM edges
    WHERE case_id = $1 AND src_id = $2 AND observed_at < $3

    UNION ALL

    SELECT e.dst_id, r.depth + 1, r.path || e.src_id
    FROM edges e JOIN reachable r ON e.src_id = r.id
    WHERE e.case_id = $1 AND e.observed_at < $3
      AND r.depth < 4 AND NOT e.dst_id = ANY(r.path)
)
SELECT DISTINCT n.* FROM reachable r JOIN nodes n ON n.id = r.id;
```

**If asked why not Neo4j:** *"Recursive CTEs handle our traversal depth at case scale and remove a service. The data model is already graph-shaped, so Neo4j is a swap rather than a rewrite when a regional deployment holds thousands of concurrent cases."*

---

## 11. COMPLETE API SURFACE

### Public — ACPIA Seal (no authentication)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/seal/reports` | Create a sealed report. Body: path, statement, artifact hashes. **Never the file body for the illegal-material path.** |
| `POST` | `/api/v1/seal/reports/{ref}/artifacts` | Attach a file body — permitted only for lawful paths |
| `GET` | `/api/v1/seal/reports/{ref}/certificate` | Preservation certificate PDF |
| `GET` | `/api/v1/seal/resources` | Helplines and reporting channels |

Rate-limit these. They are unauthenticated.

### Auth

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Issue JWT |
| `GET` | `/api/v1/auth/me` | Current user |

### Cases & inbound

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/cases` | List |
| `POST` | `/api/v1/cases` | Create |
| `GET` | `/api/v1/cases/{id}` | Detail + counters |
| `GET` | `/api/v1/inbound` | Unclaimed sealed reports |
| `GET` | `/api/v1/inbound/{ref}` | Detail with hash verification status |
| `POST` | `/api/v1/inbound/{ref}/accept` | Accept into a case; recompute and compare every hash |

### Evidence

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/cases/{id}/acquisitions` | Register an acquisition |
| `POST` | `/api/v1/cases/{id}/evidence` | Upload; server recomputes and compares `client_sha256` |
| `POST` | `/api/v1/cases/{id}/import` | Zip / forensic export (USB fallback) |
| `GET` | `/api/v1/cases/{id}/evidence` | List |
| `POST` | `/api/v1/evidence/{id}/reveal` | **Logs the view, increments exposure** |

### Pipeline & analysis

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/cases/{id}/analyze` | Start pipeline (background task) |
| `WS` | `/api/v1/cases/{id}/stream` | **Live event stream** |
| `GET` | `/api/v1/cases/{id}/conversations` | With trajectory and drift |
| `GET` | `/api/v1/conversations/{id}/timeline` | Escalation Timeline data |

### Leads & graph

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/cases/{id}/leads` | Queue |
| `POST` | `/api/v1/leads/{id}/confirm` | **Human gate** — logs actor |
| `POST` | `/api/v1/leads/{id}/reject` | **Human gate** — logs actor |
| `GET` | `/api/v1/cases/{id}/graph` | Cytoscape-shaped nodes/edges |

### Output

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/cases/{id}/report` | Case report PDF — **confirmed findings only** |
| `GET` | `/api/v1/cases/{id}/certificate` | **BSA §63 certificate** |
| `GET` | `/api/v1/cases/{id}/custody` | Full custody log |
| `GET` | `/api/v1/cases/{id}/impact` | Live Impact Ledger counters |

---

## 12. THE AI PIPELINE

### 12.1 Three agents

**① Artifact Agent** — per file. EXIF and GPS extraction, OCR, `moondream` description, `nomic-embed-text` embedding, relevance scoring.
Emits `artifact.processed` → a sealed tile appears.

**② Narrative Agent** — per conversation. Segments the transcript, classifies each message into one of six behavioural stages with a confidence and a span pointer, computes trajectory and drift.
Emits `narrative.stage_classified` per message, then `narrative.trajectory_computed`.
**This is the product.** No competitor sells it.

**③ Link Agent** — across the case. Combines stylometric similarity, temporal activity overlap, device/EXIF metadata match, and embedding cosine into scored edges with confidence intervals.
Emits `link.proposed` → an edge animates in, a lead is created.

### 12.2 Schema-constrained output kills the JSON crashes

```python
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

resp = await client.post("/api/chat", json={
    "model": "llama3.2:3b",
    "messages": [{"role": "system", "content": STAGE_SYSTEM_PROMPT},
                 {"role": "user", "content": message_window}],
    "format": STAGE_SCHEMA,          # constrained decoding
    "options": {"temperature": 0.1},
    "stream": False,
})
```

**Note what the schema does and does not permit.** It returns a *label* and a *pointer to the span*. It never generates or reproduces manipulative language. That constraint is deliberate and enforced at the API boundary rather than trusted to a prompt — consistent with the original architecture's commitment to describing grooming stages descriptively without enumerating phrases or scripts.

### 12.3 The event bus

```python
class EventBus:
    def __init__(self) -> None:
        self._subs: dict[str, set[WebSocket]] = defaultdict(set)

    async def subscribe(self, case_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._subs[case_id].add(ws)

    def unsubscribe(self, case_id: str, ws: WebSocket) -> None:
        self._subs[case_id].discard(ws)

    async def emit(self, case_id: str, event: str, payload: dict) -> None:
        msg = json.dumps({"event": event, "case_id": case_id,
                          "at": datetime.now(timezone.utc).isoformat(),
                          "payload": payload})
        dead = set()
        for ws in self._subs[case_id]:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        self._subs[case_id] -= dead

bus = EventBus()
```

### 12.4 Orchestrator

```python
async def run_pipeline(case_id: str) -> None:
    await bus.emit(case_id, "pipeline.started", {})

    artifacts = await get_unprocessed(case_id)
    sem = asyncio.Semaphore(3)          # bounded — don't thrash the GPU

    async def one(a):
        async with sem:
            await bus.emit(case_id, "artifact.processed", await artifact_agent(a))

    await asyncio.gather(*(one(a) for a in artifacts))

    for convo in await get_conversations(case_id):
        await narrative_agent(convo, emit=partial(bus.emit, case_id))

    for edge in await link_agent(case_id):
        await bus.emit(case_id, "link.proposed", edge)
        await bus.emit(case_id, "lead.created", await lead_from_edge(edge))

    await bus.emit(case_id, "pipeline.complete", await impact_summary(case_id))
```

### 12.5 Event vocabulary

| Event | What the judge sees |
|---|---|
| `ingest.hashed` | A row scrolls into the custody log |
| `artifact.processed` | A sealed tile appears |
| `narrative.stage_classified` | A dot lands on the timeline |
| `narrative.trajectory_computed` | The trend line draws itself |
| `link.proposed` | An edge animates into the graph |
| `lead.created` | A card slides into the queue |
| `lead.confirmed` / `lead.rejected` | Card moves state |
| `evidence.revealed` | Exposure counter ticks |
| `pipeline.complete` | Impact Ledger settles |

---

## 13. SECURITY, LEGAL & SAFETY ARCHITECTURE

### 13.1 Deployment posture

**ACPIA Console is on-premise and air-gapped.** This is not a preference; it is the legal basis of the entire product. Possession of child sexual exploitation and abuse material is an offence under s.15 POCSO and s.67B IT Act, and the Supreme Court in *Just Rights for Children Alliance v. S. Harish* (2024 INSC 716) held that even viewing without transmission is punishable. There is no vendor exemption. The DPDP Act's s.17(2)(a) exemption for state instrumentalities does not cascade to their private contractors — a processor still needs a valid contract under s.8(5).

**Therefore: the software goes to the evidence. The evidence never goes to the software.**

**ACPIA Seal may be public**, because it never receives illegal material — only hashes.

### 13.2 Before anything runs

- Rotate every credential. The previous README published working values for six services; treat all of them as compromised.
- `.env` in `.gitignore`. If secrets were ever committed they are in git history — rotate regardless.
- Console binds to the LAN only. Postgres and Ollama bind to `127.0.0.1`.
- `custody_log` granted `INSERT` and `SELECT` only. Never `UPDATE` or `DELETE`.
- Rate-limit every unauthenticated Seal endpoint.
- MIME allowlist and size caps on all upload paths.

### 13.3 Capability boundaries — non-negotiable

| Capability | Seal | Console | Ever? |
|---|---|---|---|
| Hash a file locally | ✓ | ✓ | |
| Analyse a conversation the user participates in | ✗ | ✓ | Console only |
| Identity resolution / stylometry on a third party | ✗ | ✓ | **Console only** |
| Risk scoring visible to a member of the public | ✗ | — | **Never** |
| Scan a device the user doesn't own | ✗ | ✗ | **Never** |
| Bypass a lock, PIN, or encryption | ✗ | ✗ | **Never** |
| Cloud account extraction with credentials | ✗ | ✗ | **Never** — that is account takeover, not forensics |
| Output "this appears safe" | ✗ | ✗ | **Never** — a false reassurance is the worst failure mode |

The Seal/Console boundary is what separates a child-protection tool from a surveillance tool. Say so in the pitch. Refusing capability is a credibility signal.

### 13.4 Demo data

Everything demonstrated must be authored by the team. Take a spare Android, **factory reset it**, sign into nothing, and load a synthetic persona: chat exports with a designed escalation *trajectory* (frequency, structure, shift toward one-to-one — never explicit or reproducible language), ordinary photos with EXIF GPS injected, a fabricated contact list, a scheduling note that corroborates one photo's location.

**Never plug in a personal phone.** You would project your own photos and your contacts' data to an audience that did not consent.

Say it out loud: *"This is a factory-reset device with a synthetic dataset we wrote. We have never touched real case material, and we won't until a supervised pilot with a defined evaluation protocol."*

### 13.5 Never claim an accuracy number

> *"We haven't run a pilot evaluation, so we won't quote one. We'll show you session-measured throughput and the confirm/reject ratio — which is the metric that would actually catch precision degradation in production. Measured accuracy is Phase 1 of the roadmap. We'd rather show you an architecture that makes evaluation tractable than a number we invented."*

That answer earns more respect than a fabricated 94%, and it is consistent with the discipline the original architecture document already committed to.

---

## 14. SDG IMPACT MODEL

### SDG 16 — Peace, Justice and Strong Institutions *(primary)*

| Target | Mechanism | Measured how |
|---|---|---|
| **16.2** — end abuse and exploitation of children | Compresses triage from weeks to minutes; starts custody at the citizen so evidence survives | Pipeline wall-clock; count of citizen reports that arrive hash-verified |
| **16.3** — rule of law, access to justice | Section 63 BSA certificate; unbroken hash lineage | Certificates generated; integrity-verification pass rate |
| **16.6** — effective, accountable institutions | Every lead cited; every decision logged and attributable | Custody log entries; leads with `cardinality(source_ids) > 0` — structurally 100% |
| **16.10** — access to information | Seal makes reporting legible to any citizen without technical knowledge | Completion rate through the Seal flow |

### SDG 3 — Good Health and Well-Being *(secondary)*

**Target 3.4 — mental health.** Investigators reviewing this material suffer documented, cumulative psychological injury; commercial products exist purely to track their exposure. Every artifact the system triages out is one a human never sees.
**Measured:** `artifacts_processed` vs `revealed_count` — the Impact Ledger's headline number.

### SDG 10 — Reduced Inequalities *(tertiary)*

**Target 10.3.** Open-core and self-hostable on a single consumer GPU. Commercial alternatives are priced and languaged for Western agencies. This puts capability in the hands of a district cyber cell with one desktop and no licensing budget.
**Measured:** hardware floor (one 6 GB GPU); zero recurring licence cost.

### The honesty that makes this credible

Every figure above is **counted, not claimed**. `97.3% exposure avoided` is arithmetic on two live counters. No accuracy percentage appears anywhere. Judges see impact *and* epistemic discipline — and the second is rarer than the first.

---

## 15. BUILD PLAN & TASK ASSIGNMENT

Ordered by impact per hour. If you run out of time, stop where you are — everything above the line you reach is still a coherent product.

### Tino — infrastructure, AI, pipeline

| # | Task | Est. |
|---|---|---|
| 1 | Strip `docker-compose.yml` to Postgres + Ollama. Delete Keycloak, Neo4j, MinIO, OpenSearch, Grafana, Prometheus, Redis. | 30m |
| 2 | Pull the three small models. Warm with `keep_alive: -1`. Verify all resident with `nvidia-smi`. | 30m |
| 3 | Collapse 8 agents → 3. Add `format=` schema-constrained output. | 2h |
| 4 | Replace Celery with the `asyncio` orchestrator emitting events. | 1h |
| 5 | Narrative Agent: stage classification + trajectory + drift. | 1h30 |
| 6 | Link Agent: four signals → scored edges with intervals. | 1h |

### Barath — backend

| # | Task | Est. |
|---|---|---|
| 1 | Postgres schema + Alembic migration (all tables in §10, including `CHECK`s). | 1h |
| 2 | `EventBus` + WebSocket endpoint. | 45m |
| 3 | JWT auth replacing Keycloak. | 40m |
| 4 | **Seal endpoints** — hash-only intake, no body on the illegal-material path. | 1h |
| 5 | **Inbound handover** — reference code, hash recompute, `INTEGRITY VERIFIED`. | 1h |
| 6 | `/reveal` endpoint — logs the view, increments exposure. | 20m |
| 7 | **BSA §63 certificate** — every hash, full custody, dual signature blocks. | 1h30 |
| 8 | `/impact` — live counters. | 30m |
| 9 | Case report PDF — confirmed findings only. | 45m |

### Chinnaya — both frontends

| # | Task | Est. |
|---|---|---|
| 1 | Design tokens for both registers; Plex Sans + Plex Mono. | 45m |
| 2 | **Seal S1–S7** with WebCrypto browser hashing. | 2h30 |
| 3 | **Escalation Timeline** (C6). *Never cut this.* | 2h |
| 4 | Sealed evidence grid + reveal + exposure counter (C5). | 1h15 |
| 5 | WebSocket client + live event log. | 45m |
| 6 | Lead queue + evidence basis panel + keyboard shortcuts (C7). | 1h15 |
| 7 | Inbound queue with `INTEGRITY VERIFIED` (C3). | 45m |
| 8 | Impact Ledger panel. | 40m |
| 9 | Synthetic persona + demo handset preparation. | 45m |
| 10 | Graph view (Cytoscape) (C8). | 1h |

### Cut order if time runs short

Graph view → live event log → Impact Ledger → inbound queue → sealed grid.
**Never cut: the Escalation Timeline, the human gate, browser-side hashing.**

---

## 16. DEMO SCRIPT — SEVEN MINUTES

**0:00 — The broken chain.**
> *"A parent sees something worrying on their child's tablet. They screenshot it and forward it on WhatsApp. By the time it reaches a cyber cell the metadata is gone and it can't be authenticated. That's break one. Break two is on the other side: one investigator, tens of thousands of files, behavioural patterns spread across months. India is consistently the top country for NCMEC CyberTipline reports. Indian CSAM cases went up roughly five-fold between 2021 and 2025. We built both ends of the same pipe."*

**0:45 — Seal, on a phone, held up.**
Open Seal. Choose "Someone is messaging a child." Drop the chat export.
> *"Watch the network tab."* — point at it — *"Two hundred bytes. A hash and a size. The file never left this phone. We never saw it. That's not a policy, that's the architecture."*
Show the certificate. Read the reference code aloud: **ACP-7K4M-2X9P**.

**1:45 — Console, the handover.**
Type the code. The hashes verify green.
> *"Same file, same fingerprint, unbroken from the moment that parent sealed it. That's what a Section 63 certificate under the Bharatiya Sakshya Adhiniyam needs, and it's why digital evidence in India usually fails — on certification, not relevance."*

**2:30 — Add device evidence.**
Plug in the prepared handset. Custody log scrolls, hashes compute live.
> *"Factory-reset device, synthetic dataset we wrote. We've never touched real case material."*

**3:00 — The pipeline, watched.**
Tiles appear sealed. Timeline dots land. Edges animate in.
> *"Nothing here is pre-rendered. Every one of those events arrived over a WebSocket in the last ninety seconds."*

**3:45 — The Escalation Timeline.** *Hold. Let it land.*
> *"Fifty-eight messages across six weeks, each classified by behavioural stage. Not one of them would trip a keyword filter. The signal is the slope. And here — window five to six — the escalation rate doubles. That's behavioural drift, and reconstructing it by hand across a real case file takes days."*

**4:45 — The human gate.**
Open lead #7. Show the basis panel.
> *"0.61, plus or minus 0.09. An interval, not a point estimate, because automation bias is the first item on our own risk register. Four independent signals, each with its source span. And nothing enters the case record until an investigator clicks Confirm and their name goes in the log. That's a database constraint, not a policy."*

**5:45 — The Impact Ledger.**
> *"847 artifacts processed. 23 surfaced to a human. 824 files a person never had to look at. Investigators who do this work suffer documented psychological injury — there are commercial products that exist purely to track their exposure. And that number is measured from this session. It's not a benchmark we're quoting at you. We haven't run a pilot, so we won't claim an accuracy figure."*

**6:30 — Close.**
> *"We're not another classifier — that market is solved and cheap. We're the correlation layer nobody sells, and we're the only ones who start the chain of custody at the citizen instead of the police station. The whole thing is air-gapped, because a private company legally cannot possess this material. The software goes to the evidence. The evidence never goes to the software."*

### Three answers to have cold

**"Why such small models?"** — §5.3.
**"What's your accuracy?"** — §13.5.
**"Isn't AI in policing dangerous?"**
> *"Yes, which is why the human gate is a database constraint rather than a paragraph in a training manual. Nothing in the AI layers can write a confirmed finding. Confidence intervals, not point estimates. Every claim cites its source span. If it can't be challenged in court, it shouldn't be in court."*

---

## 17. ROADMAP

**Phase 0 — Validation.** Legal review, security review, synthetic red-team dataset. No real case material.
**Phase 1 — Controlled pilot.** One agency, narrow case type, full human gating, evaluation protocol defined *before* the pilot: precision and recall against investigator ground truth, not vendor self-report.
**Phase 2 — Languages and modalities.** Tamil, Hindi, Telugu ASR and stage classification. This is where a domestic product beats Cellebrite, Griffeye, and Semantics21 — all foreign, all English-first.
**Phase 3 — Seal at scale.** Partner with Childline and NCPCR to route sealed reports into official channels. This is where the societal impact multiplies beyond a single agency.
**Phase 4 — Regional deployment.** Kubernetes, Neo4j swap-in, shared hash-list update channel under proper authorisation.
**Phase 5 — Independent audit and publication.** Security review and model-bias audit; publish methodology so the approach can be scrutinised and improved by the child-safety research community.

**Where Rust arrives:** Phase 1, as the field acquisition agent — one static binary, no Python runtime on the investigator's workstation, small auditable surface for the component that touches evidence.

---

## FINAL CHECKLIST

- [ ] `nvidia-smi` shows three models resident, under 5 GB total
- [ ] Full stack boots in under a minute
- [ ] Seal hashes in-browser; network tab shows no file body
- [ ] Reference code round-trips and shows `INTEGRITY VERIFIED`
- [ ] Escalation Timeline draws live, dot by dot
- [ ] Every media tile sealed on arrival; reveal writes a custody entry
- [ ] Impact Ledger counts up during the run
- [ ] No lead renders without a citation
- [ ] No bare percentage anywhere in either app
- [ ] Seal never outputs a verdict, never says "safe," always shows 1098
- [ ] `grep` confirms no code path sets `CONFIRMED` except a human action
- [ ] Demo persona entirely synthetic; no personal device in the room
- [ ] Every credential rotated
- [ ] Fallback video recorded

---

*ACPIA v3. Two surfaces, three agents, one unbroken chain.*
*From the first screenshot to the courtroom.*
