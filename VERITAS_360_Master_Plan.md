# ACPIA → VERITAS
## The 360° Master Plan: surviving the adversarial evaluation

**Version 5.0 — Final.** This document answers every hostile question an evaluator can ask, and turns each one into a feature. Read with `ACPIA_FINAL_PHASE.md` for the build details that still stand.

---

## 0. THREE THINGS YOU MUST HEAR FIRST

You asked me to predict the hostile questions and broaden the scope to all cyber-fraud. I'll do the first completely. But on the second, I have to stop you, because the instinct behind it will lose you the evaluation.

### Hard truth #1 — "It works for everything" is the weakest possible answer

When an evaluator hears *"our tool handles child abuse AND bank fraud AND workplace defamation AND all cyber attacks,"* they do not think *"how versatile."* They think **"this team has no focus and has tested none of these deeply."** Breadth reads as immaturity. Every serious forensic product on the market is narrow: Griffeye does media triage, Cellebrite does extraction. Depth is what earns trust.

**The correct move is not to widen the mission. It's to widen the *engine* while keeping the mission sharp.** Your correlation-and-custody engine is genuinely general. Your *product* should stay pointed at child protection, with fraud and tampering as **proof that the engine generalises** — a roadmap slide, not a second front. You get the "it scales" credit without the "it's unfocused" penalty.

### Hard truth #2 — Your defamation example exposes a fatal flaw, and it's the best thing that's happened to this project

Read your own scenario again: a false complaint, a fabricated screenshot, an innocent person. Now ask what your current system does with it. **It takes the fabricated screenshot, hashes it, wraps it in a Section 63 certificate, and hands the accuser a court-admissible weapon.** Your integrity guarantee proves the file *wasn't changed after sealing* — it says **nothing** about whether the content was true when it was made. A perfectly-sealed lie is still a lie.

If you don't fix this before the demo, an evaluator will find it in ten seconds and your whole "chain of custody" pitch collapses. If you *do* fix it, you have the most sophisticated answer in the room. The fix is §3, and it's the core of this document.

### Hard truth #3 — You cannot detect deepfakes reliably, and claiming you can will end you

I checked the current research. A December 2025 systematic review found detectors that score 95–99% on benchmarks <cite index="5-1">declined sharply to 54–75% on realistic out-of-distribution data, with no tool reaching the minimum forensic suitability threshold</cite>, citing <cite index="5-1">poor generalisation, lack of confidence intervals and error documentation, limited explainability, and high false positive rates under realistic deployment conditions</cite>. A CSIRO study of 16 leading detectors found <cite index="8-1">none could perform reliably against a broad range of manipulation techniques</cite>.

So if a judge asks *"can you detect a fake screenshot?"* and you say yes, you are claiming something the entire field cannot do. The honest, and stronger, position comes straight from forensic practice: <cite index="11-1">one fake score is hardly able to stand up to rigorous cross-examination; rather, we have stack-independent signals that lead to the same conclusion</cite>, and you must <cite index="11-1">define limitations in simple terms, such as blur, low light or heavy compression noise, and record that innocent edits may resemble the signs of tampering</cite>. You don't render verdicts on authenticity. You surface *indicators* and *contradictions*, with confidence intervals, for a human to judge. That distinction is your armour.

---

## 1. THE NAME

**ACPIA** is an internal acronym — unpronounceable, and it hard-codes "child" so you can't show the engine generalising without seeming to abandon your mission.

**Recommended: VERITAS** — Latin for *truth*. Pronounceable, memorable, evaluator-friendly, and it names what the product actually defends: not a category of crime, but the integrity of evidence itself.

> **VERITAS** — Verified Evidence, Reliable Investigation, Trusted Authentication System
> *"Evidence you can trust. Investigation you can defend."*

Child protection is the **flagship deployment** of VERITAS, not the whole of it. This reframing solves your naming problem and your scope problem in one move: the platform is about evidentiary truth; the first and primary mission is protecting children.

If you prefer to keep continuity, **ACPIA can remain the child-protection module inside VERITAS.** Best of both.

---

## 2. THE SCOPE DECISION — ENGINE VS PRODUCT

```
┌──────────────────────────────────────────────────────────────┐
│  VERITAS ENGINE  (general — this is the platform)            │
│                                                              │
│  · Custody spine: hash-at-source, append-only ledger         │
│  · Correlation: cross-source identity + timeline + graph     │
│  · Authenticity indicators: tampering signals + confidence   │
│  · Contradiction detection: does the evidence disagree?      │
│  · Human gate: nothing is a finding without a logged human   │
└──────────────────────┬───────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┬───────────────────┐
       ▼               ▼               ▼                   ▼
  ┌─────────┐   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
  │ ACPIA   │   │ Financial   │  │ Workplace/   │  │ General      │
  │ child   │   │ fraud       │  │ defamation   │  │ cyber        │
  │ protect.│   │ (roadmap)   │  │ (roadmap)    │  │ (roadmap)    │
  │         │   │             │  │              │  │              │
  │ BUILT   │   │ SLIDE ONLY  │  │ SLIDE ONLY   │  │ SLIDE ONLY   │
  │ & DEMO'D│   │             │  │              │  │              │
  └─────────┘   └─────────────┘  └──────────────┘  └──────────────┘
```

**What you build and demo:** the child-protection module, exactly as specified in the previous documents, now sitting on a VERITAS engine.

**What you say about the rest:** *"The engine is domain-general — custody, correlation, authenticity, and contradiction detection apply to financial fraud, workplace disputes, any evidence-driven investigation. We deliberately went deep on child protection first, because it's the hardest problem, the highest stakes, and where existing tools are weakest. These others are roadmap. We'd rather demo one module that works than four that don't."*

That last sentence is the one that wins. It shows discipline, and discipline is what a "mature product" means.

---

## 3. THE CORE UPGRADE — FROM CUSTODY TO TRUTH

This section is what turns your project from a hackathon demo into something an evaluator remembers. Every hostile question you predicted is answered here.

### 3.1 The distinction your product currently misses

There are **two completely different questions** about any piece of evidence, and your system currently only answers the first:

| Question | What answers it | ACPIA v4 status |
|---|---|---|
| **Integrity** — was this changed *after* it entered the system? | SHA-256 hash chain | ✅ Solved |
| **Authenticity** — was this genuine when it was *created*? | Tampering indicators + provenance + contradiction analysis | ❌ **Missing — this is the gap** |

Your defamation scenario lives entirely in the second row. A fabricated WhatsApp screenshot is *high integrity* (nobody changed it after sealing) and *zero authenticity* (it was faked before sealing). **You must measure both, and show them as separate scores that never collapse into each other.**

### 3.2 The Authenticity Layer — what to build

A new analysis stage that runs on every ingested artifact and produces an **authenticity assessment**, distinct from the integrity hash. It never says "real" or "fake." It surfaces *indicators* with plain-language limitations, exactly as forensic practice requires.

```python
# app/agents/authenticity.py
from dataclasses import dataclass, field

@dataclass
class AuthenticityIndicator:
    signal: str            # what was checked
    result: str            # consistent | anomaly_detected | inconclusive
    detail: str            # plain language
    caveat: str            # innocent explanations — ALWAYS present

@dataclass
class AuthenticityReport:
    indicators: list[AuthenticityIndicator] = field(default_factory=list)
    contradiction_count: int = 0
    assessment: str = "inconclusive"   # NEVER "authentic"/"fake"
    confidence: float = 0.0
    limitations: list[str] = field(default_factory=list)
```

**The indicators for an image/screenshot:**

1. **Metadata coherence** — does EXIF exist, and is it internally consistent? A real camera photo has a rich, coherent EXIF block. A screenshot has none. A screenshot *presented as* a camera photo is an anomaly. *Caveat: social media strips EXIF, so absence alone proves nothing.*

2. **Error Level Analysis** — compression-anomaly detection. Note honestly that <cite index="12-1">ELA identifies compression anomalies</cite> but <cite index="11-1">innocent edits may resemble the signs of tampering</cite>. Surface it as one signal, never a verdict.

3. **Provenance chain** — the strongest signal, and the one only *you* have. If the file arrived through VERITAS Seal, you know its hash *and its sealing time*. A screenshot sealed six weeks after its claimed date is a temporal anomaly. This is why hash-at-source matters beyond integrity.

4. **Cross-source contradiction** — §3.3. The most powerful of all.

5. **Text-render analysis** for chat screenshots — do timestamps increment monotonically? Do font metrics stay constant? Fabricated chat images frequently break these. *Caveat: legitimate UI updates can also change rendering.*

**Every indicator carries a caveat. The report never concludes "fake."** It concludes *"three indicators warrant investigation; here they are; here's what could innocently explain each; a human must decide."*

### 3.3 Contradiction detection — the feature that answers everything

This is the single most important thing to build, and it's what makes VERITAS impartial by construction.

**The principle:** a fabricated piece of evidence is easy to make internally clean, but very hard to make consistent with *everything else in the case*. Truth is coherent across sources; fabrication contradicts them.

Your graph and timeline already hold multi-source data. Add an agent that actively hunts for **contradictions** between artifacts:

```python
# app/agents/contradiction.py
async def find_contradictions(case_id) -> list[Contradiction]:
    """Truth is consistent across sources. Fabrication contradicts them.
    This runs impartially over ALL evidence — it has no 'side'."""
    facts = await extract_atomic_facts(case_id)   # (who, what, when, where, source)
    contradictions = []

    for a, b in combinations(facts, 2):
        # Temporal: same actor, same time, two incompatible places
        if a.actor == b.actor and overlaps(a.when, b.when) \
           and a.where and b.where and a.where != b.where:
            contradictions.append(Contradiction(
                kind="temporal_impossibility",
                summary=f"{a.actor} placed at two locations at the same time",
                sources=[a.source, b.source], severity="high"))

        # Metadata vs claim: file's own EXIF date contradicts declarant's account
        if a.claimed_date and b.metadata_date \
           and a.source == b.source and abs(a.claimed_date - b.metadata_date) > DAY:
            contradictions.append(Contradiction(
                kind="metadata_claim_mismatch",
                summary="File's embedded date contradicts the stated date",
                sources=[a.source], severity="high"))

    return contradictions
```

**Why this answers your defamation scenario perfectly:**

The false accuser submits a fabricated screenshot. The accused submits their genuine evidence — location data, other messages, device logs. VERITAS doesn't take sides. It runs contradiction detection across *everything* and surfaces: *"The submitted screenshot's claimed timestamp contradicts the device's own activity log for that period."* **The fabrication reveals itself by failing to cohere with reality.** The investigator sees the contradiction, flagged with a confidence, and decides.

The tool didn't decide who's lying. It made lying *visible* — and it would do exactly the same if the accused were the liar. That symmetry is the entire answer to "who gets justice?"

### 3.4 The UI — two scores that never merge

On every evidence tile and in every report:

```
┌─────────────────────────────────────┐
│  ░░░░░  SEALED  ░░░░░               │
├─────────────────────────────────────┤
│ screenshot_whatsapp.jpg             │
│ image/jpeg · 840 KB                 │
│ sha 7c3f9a2b…                       │
│                                     │
│  INTEGRITY    ✓ verified            │  ← not changed after sealing
│  AUTHENTICITY ⚠ 2 indicators        │  ← may not be genuine — REVIEW
│                                     │
│  · No EXIF (expected: camera photo) │
│  · Sealed 41 days after claimed date│
│                                     │
│  ⚠ 1 contradiction with case log    │
│                                     │
│  [ Reveal — logs access ]           │
└─────────────────────────────────────┘
```

**Integrity green and authenticity amber on the same tile, at the same time.** That single visual is the answer to your entire adversarial section. It says: *we proved nobody tampered with this file, AND we're telling you it may still be fake.* No competitor shows both. Most don't even distinguish them.

---

## 4. THE ADVERSARIAL Q&A — EVERY HOSTILE QUESTION, ANSWERED

This is your evaluation-prep sheet. Rehearse these until they're reflexive.

### On impartiality and false accusation

**Q: "What stops a false accuser from sealing a fake screenshot and getting your certificate as a weapon?"**
> *"Two things. First, our certificate only ever attests integrity — that the file wasn't altered after sealing. It makes no claim about whether the content is genuine, and we're explicit about that in the certificate text itself. Second, the authenticity layer runs regardless: it checks metadata coherence, provenance timing, and — most importantly — contradictions against every other source in the case. A fabricated screenshot is easy to make internally clean but very hard to make consistent with the accused's genuine device data. The tool doesn't pick a side. It makes incoherence visible."*

**Q: "Then how does the innocent accused person get justice?"**
> *"By the same mechanism, in reverse. The accused submits their real evidence. VERITAS runs contradiction detection impartially across the whole case and surfaces where the accusation's evidence conflicts with reality — a timestamp that can't be true, a location that contradicts device logs. The system is symmetric by construction: it would expose the accused just as readily if they were the one fabricating. It surfaces contradictions; a human investigator judges them."*

**Q: "What if BOTH parties submit fabricated evidence?"**
> *"Then both sets generate authenticity flags and contradiction alerts, and the investigator sees a case where nothing coheres — which is itself a critical signal that human judgment and further investigation are needed. We never resolve that automatically. Our job is to surface the incoherence, not to declare a winner. Declaring a winner is the investigator's job and, ultimately, the court's."*

### On corruption and misuse (your sharpest question)

**Q: "What stops YOU — the platform operator — from taking money to feed false input and help a suspect?"**
> *"This is why the architecture matters more than any promise we could make. Three structural defences. One: VERITAS is air-gapped and on-premise inside the agency — we, the vendor, have no access to live cases at all. We can't tamper with what we can't reach. Two: the custody log is append-only, enforced at the database level — INSERT and SELECT only, UPDATE and DELETE revoked — so even an administrator can't silently alter history; any edit is a new, visible entry. Three: every action carries the identity of the human who took it. If someone feeds false input, the log shows exactly who did it and when. We didn't design a system you have to trust us to run honestly. We designed one where dishonesty leaves evidence."*

**Q: "But you built it — you could put a backdoor in."**
> *"Which is why the roadmap includes open-sourcing the core engine and an independent security audit. A closed forensic tool that asks courts to trust the vendor is exactly the wrong model. The append-only ledger, the human-attribution on every action, and the air-gap are all auditable in the source. Trust should come from inspection, not from our word."*

### On the AI itself

**Q: "Can your AI detect a deepfake or a fake screenshot?"**
> *"No tool can, reliably — the 2025 literature is clear that detectors dropping from 95% on benchmarks to the 50s and 60s on real-world data, and a CSIRO study found none of sixteen leading detectors performed reliably across manipulation types. So we don't claim to. We surface authenticity *indicators*, each with a confidence interval and the innocent explanations that could also cause it, and we lean hardest on contradiction analysis, which doesn't depend on pixel-level detection at all. One 'fake score' collapses under cross-examination. A stack of independent signals pointing the same way, each with stated limitations, is what survives it."*

**Q: "What's your accuracy?"**
> *"We haven't run a pilot, so we won't quote one — quoting a benchmark number for a forensic tool is exactly the failure the literature warns about. We'll show you throughput and our confirm/reject ratio, which is the metric that would actually catch precision problems in production. Measured accuracy against investigator ground truth is Phase 1."*

**Q: "Your AI could be biased against a group / a language / a demographic."**
> *"Yes, and that's a real risk we design around rather than deny. Every AI output is a lead with a confidence interval, never a finding, and every one requires a logged human confirmation. Nothing the model produces reaches a case record on its own. The human gate is a database constraint, not a policy — you cannot set a lead to 'confirmed' without a human actor recorded against it. And bias audits are on the roadmap before any real deployment."*

### On scope and focus

**Q: "This is just generic forensics — what's actually specific to children?"**
> *"The engine is general; the module is not. The child-protection module has behavioural-stage classification tuned to grooming trajectories, code-switch drift detection for how predators build intimacy in Indian languages, and a Seal flow written so a frightened teenager can use it without an account. Those are child-specific. We built the general engine because truth-verification is general — but we went deep on the child module first because it's the hardest and highest-stakes, and it's where we can show real depth rather than shallow breadth."*

**Q: "Why not just expand to all cyber-crime now — bigger market?"**
> *"Because a tool that claims to do everything convinces no one it does anything well. Every serious forensic product is narrow. We'd rather demo one module that genuinely works than four that half-work. The breadth is real and it's on the roadmap — but breadth is worthless without a proven core, and the core is what we're showing you today."*

### On privacy and data misuse

**Q: "Could your website leak or misuse the data people submit?"**
> *"The public Seal app never receives evidence bodies for the sensitive path — only hashes, computed in the browser. Open the network tab during our demo; you'll see about 200 bytes leave the phone. There's no evidence server to leak because there's no evidence on the server. The investigative side is air-gapped inside the agency. The design principle throughout is that we hold as little as legally and technically possible."*

**Q: "What about the citizen's own identity in the Seal app?"**
> *"No account required, and we don't ask for identifying details about any child. Contact information is optional and only collected at the reporting step, where it's legally necessary and goes to the official channel, not to us."*

---

## 5. THE MAIN OBJECTIVE

State it in one sentence, and make it about truth, not crime:

> **VERITAS exists to protect the integrity of digital evidence — from the moment a citizen captures it to the moment a court weighs it — so that the truth survives the journey, whoever it favours.**

And the flagship mission, stated with equal clarity:

> **Its first and primary deployment, ACPIA, defends children: compressing the investigation of online child exploitation from weeks to minutes, while ensuring no innocent person is convicted on evidence that only looked real.**

Note what both sentences do: they commit to protecting the *innocent accused* as explicitly as the *victim*. That is the impartiality an evaluator is probing for, stated as mission rather than defended as an afterthought.

---

## 6. SDG MAPPING

### Primary — SDG 16: Peace, Justice and Strong Institutions

This is the natural and honest home for the whole platform.

| Target | VERITAS mechanism | Measured how |
|---|---|---|
| **16.2** — end abuse and exploitation of children | ACPIA module compresses triage; starts custody at the citizen | Pipeline wall-clock; hash-verified citizen reports |
| **16.3** — rule of law, equal access to justice | **Impartial contradiction detection protects the falsely accused as much as the victim; BSA §63 certification** | Contradictions surfaced; certificates issued; integrity pass-rate |
| **16.6** — effective, accountable institutions | Append-only ledger; every action attributed; auditable engine | Custody entries; leads structurally 100% cited |
| **16.10** — public access to information | Seal makes reporting usable by any citizen without technical skill | Seal flow completion rate |
| **16.5** — reduce corruption and bribery | **Air-gap + append-only log + per-action attribution make operator tampering leave evidence** | Immutability of the ledger; zero vendor access to live cases |

Target **16.3** and **16.5** are your differentiators — most teams claim 16.2 and stop. Claiming that your architecture actively *resists corruption* and *protects the innocent accused* is what a 360° answer looks like.

### Secondary — SDG 3.4 (mental health)
Every artifact triaged out is one an investigator never sees. Measured live in the Impact Ledger.

### Tertiary — SDG 10.3 (equal opportunity / reduced inequalities)
Open-core, self-hostable on one consumer GPU, multilingual for Indian code-mixed speech. Capability for agencies priced out of Western tools.

---

## 7. WHAT TO BUILD NEXT — THE FINAL SPRINT

Everything from `ACPIA_FINAL_PHASE.md` still stands (ports, Tanglish engine, backend, three agents, demo dataset). This adds the adversarial-defence layer on top. Ordered by impact per hour.

### P0 — the differentiators (build these or the adversarial answers are empty)

| # | Task | Owner | Est. |
|---|---|---|---|
| 1 | **Authenticity Layer**: metadata coherence + provenance-timing + separate authenticity score | Tino | 1h30 |
| 2 | **Contradiction Agent**: atomic-fact extraction + temporal/location/metadata conflict detection | Tino | 2h |
| 3 | **Two-score UI**: integrity AND authenticity on every tile, never merged | Chinnaya | 1h |
| 4 | **Contradiction callout** in the lead queue, flowing through the human gate | Chinnaya | 45m |
| 5 | Certificate text: explicit line that it attests **integrity only, not authenticity** | Barath | 20m |
| 6 | `REVOKE UPDATE, DELETE ON custody_log` — verify it's actually enforced | Barath | 10m |

### P0 — everything from the previous document
Ports (478xx), schema + `CHECK` constraints, JWT, Seal/inbound, EventBus, Tanglish engine, three agents, pipeline. See `ACPIA_FINAL_PHASE.md` §§2–5.

### P1
BSA §63 certificate PDF, Impact Ledger, case report (confirmed findings only).

### The demo dataset gets a second scene
Add a **contradiction** to the synthetic persona: one screenshot whose claimed date conflicts with the device activity log. During the demo, this is what lets you show the tool catching a fabrication live — the moment that answers every impartiality question at once.

### Rename (mechanical, ~30m)
- Repo/app title → VERITAS; ACPIA becomes the child-protection module name
- Console header, Seal header, certificate title
- Keep code identifiers stable to avoid breakage; rename user-facing strings only

---

## 8. THE REVISED DEMO — ADD THE TRUTH SCENE

Keep the seven-minute flow from `ACPIA_FINAL_PHASE.md`. Insert this at 5:00, right after the Tanglish moment and before the close. It is your knockout.

**5:00 — THE IMPARTIALITY SCENE.**

> *"Now the question you're all thinking. What stops someone fabricating evidence and using our own certificate as a weapon?"*

Upload the contradiction artifact — the screenshot with the impossible date.

> *"Here's a submitted screenshot. Integrity check — green. Nobody altered it after sealing. But look at the second score: authenticity — amber, two indicators. No camera metadata, and it was sealed 41 days after its claimed date. And here — one contradiction with the case's own device log: it places this conversation at a time the device shows no activity.*
>
> *We are not telling you this is fake. No honest tool can — the 2025 research is clear that deepfake detectors collapse on real-world data. What we're doing is surfacing the contradiction, with its confidence and its caveats, for a human to judge.*
>
> *And this is symmetric. If the accused had fabricated evidence, the exact same engine would expose them. VERITAS has no side. It doesn't decide who's telling the truth — it makes lies fail to cohere. That's how the innocent get protected, not just the victim."*

**Then the close** (from the previous script), with one added line:

> *"And you asked what stops us taking a bribe to corrupt a case. The answer is in the architecture: we're air-gapped inside the agency with no access to live cases, the custody log is append-only at the database level so even an admin can't rewrite history, and every action carries the name of the human who took it. We didn't build a system you have to trust us to run honestly. We built one where dishonesty leaves evidence."*

---

## 9. FINAL CHECKLIST — ADVERSARIAL READINESS

**The two-score model**
- [ ] Every tile shows integrity AND authenticity, visually distinct, never merged
- [ ] Certificate text states explicitly: attests integrity, NOT authenticity
- [ ] Authenticity report always includes caveats; never concludes "fake" or "authentic"

**Contradiction engine**
- [ ] Runs impartially across all sources — no concept of "sides"
- [ ] Demo persona includes one planted contradiction (impossible date)
- [ ] Contradictions flow through the human gate like any other lead

**Anti-corruption architecture**
- [ ] `custody_log`: UPDATE/DELETE revoked, verified with a failed test-delete
- [ ] Every state-changing action writes an attributed custody entry
- [ ] Air-gap / on-prem posture stated in the pitch as the anti-tamper guarantee

**Honesty guardrails**
- [ ] No "deepfake detection" claim anywhere in UI or pitch
- [ ] No accuracy percentage anywhere
- [ ] Every authenticity indicator paired with an innocent-explanation caveat

**Scope discipline**
- [ ] Pitch says "one module deep," not "everything"
- [ ] Fraud/defamation framed as engine-generalises roadmap, not built features
- [ ] The "we'd rather demo one that works" line rehearsed

**Rehearsed cold** — every Q in §4, especially the three on corruption and the two on impartiality.

---

## 10. THE ONE-PARAGRAPH SUMMARY FOR YOUR PITCH DECK

> **VERITAS** protects the integrity of digital evidence from the citizen's phone to the courtroom. Its flagship module, **ACPIA**, defends children — compressing online-exploitation investigations from weeks to minutes in the languages Indians actually speak. But VERITAS is built for a harder problem than any single crime: it separates whether evidence was *tampered with* from whether it was ever *genuine*, and it hunts contradictions impartially across every source — so a fabricated accusation fails to cohere with reality, and the falsely accused are protected as fiercely as the victims. It is air-gapped, append-only, and attributes every action to a human, so even its operators cannot corrupt a case without leaving evidence. It never renders a verdict. It surfaces truth, with its uncertainty stated honestly, and leaves judgment where it belongs — with people. **Evidence you can trust. Investigation you can defend.**

---

*VERITAS v5. The truth survives the journey — whoever it favours.*
