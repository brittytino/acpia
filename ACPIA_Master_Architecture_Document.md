# ACPIA — Agentic Child Protection Investigation Assistant
## Complete Technical Architecture & Master Solution Document

> **Platform:** AI-assisted Digital Evidence Intelligence System for Authorized Law Enforcement
> **SDG Alignment:** SDG 16 (Primary) · SDG 3 (Secondary) · SDG 10 (Tertiary)
> **Deployment Model:** Fully Local · Air-Gapped · Zero Mandatory Cloud Dependency
> **License Posture:** Open-core, built entirely on open-source components
> **Document Status:** Architecture & solution design — this is a technical proposal, not a shipped, audited, or field-deployed product. Any numbers labeled "illustrative" are estimates for planning, not measured production data.

---

## A NOTE ON SCOPE AND HONESTY

Before the architecture: two things worth being upfront about, because a "final product" document that oversells itself stops being trustworthy the moment a technical reviewer checks it against reality.

1. **This document describes a design, not a deployed, validated system.** Nothing in here should be read as "already built and proven." Every performance figure, accuracy claim, or "reduction in investigation time" number is a *target* or *estimate* based on component-level benchmarks (e.g., published Whisper WER, LLaVA benchmark scores), not a measurement of ACPIA in production — because ACPIA in production doesn't exist yet. Real numbers only come from a real pilot with real evaluation data, and that has to happen before anyone claims them.
2. **No genuinely "real-time" statistics exist for a system that hasn't been deployed.** What I *can* give you — and what actually makes a system trustworthy — is a fully specified observability stack (Prometheus + Grafana + OpenTelemetry) that would produce real, live, non-fabricated metrics once the system is running against real casework. That's what's in Section 8. I will not invent fake dashboards with made-up percentages and present them as live data; that would be the opposite of trustworthy.

With that grounding, here is the full architecture.

---

## TABLE OF CONTENTS

1. [Problem Statement](#1-problem-statement)
2. [SDG Goals Alignment](#2-sdg-goals-alignment)
3. [Our Solution — The Core Idea](#3-our-solution--the-core-idea)
4. [Key Innovations](#4-key-innovations)
5. [Solution Architecture & Flow](#5-solution-architecture--flow)
6. [Process Flowchart](#6-process-flowchart)
7. [Technical Stack](#7-technical-stack)
8. [Observability & Real-Time Operational Metrics](#8-observability--real-time-operational-metrics)
9. [Data Model & Schemas](#9-data-model--schemas)
10. [API Contracts](#10-api-contracts)
11. [Security, Governance & Chain of Custody](#11-security-governance--chain-of-custody)
12. [Deployment Topology & Scalability](#12-deployment-topology--scalability)
13. [Feasibility & Viability](#13-feasibility--viability)
14. [Potential Challenges & Risks](#14-potential-challenges--risks)
15. [Strategies for Overcoming Challenges](#15-strategies-for-overcoming-challenges)
16. [Impact & Benefits](#16-impact--benefits)
17. [Roadmap](#17-roadmap)

---

## 1. PROBLEM STATEMENT

### Overview

Child protection investigations are among the most complex, time-sensitive, and resource-intensive operations in modern law enforcement. Investigators analyze massive volumes of digital evidence collected from mobile devices, laptops, cloud storage accounts, social media platforms, messaging applications, email archives, and other digital sources.

### The Scale of the Problem

- Reporting volume to national tipline programs has grown into the tens of millions of reports per year across major jurisdictions (exact current-year figures should be sourced from the relevant national body's published statistics at time of citation, not assumed).
- A single investigation case can involve tens of thousands to hundreds of thousands of individual digital evidence items — images, video files, audio recordings, chat transcripts, email threads, documents, and metadata archives.
- Manual review time per case commonly runs into weeks or months.
- Investigators must correlate information across many different platforms and devices per case.
- Evidence is unstructured, multilingual, and spread across incompatible formats.
- Existing point tools (individual forensic viewers, keyword search, hash-matching against known-CSAM databases) handle individual evidence types but do not correlate behavior and identity across sources.

### Why Manual Investigation Struggles at Scale

1. **Volume overload** — the number of files exceeds what human analysts can review within legal and operational timeframes.
2. **Cross-source fragmentation** — the same person may use different identities on different platforms; connecting those manually is slow and error-prone.
3. **Hidden behavioral signals** — grooming is gradual. The signal is a *pattern across many messages over time*, not any single message, so keyword search alone under-detects it.
4. **Multimedia complexity** — images, video, and audio each need different specialized processing (classification, metadata extraction, transcription), each consuming analyst time per item.
5. **Documentation burden** — every finding must be sourced and presented in a form that survives evidentiary scrutiny, which itself consumes a large share of investigator time.

### The Consequence

Investigation delay has a direct human cost: longer exposure for victims, more time for cross-platform identities to remain unconnected, and a higher chance that a slow-building behavioral pattern goes unnoticed until too late. The goal of a system like this is not to replace investigator judgment — every jurisdiction's rules of evidence require a human decision-maker — but to compress the mechanical, cross-referencing, and triage workload so investigators spend their time on judgment calls instead of manual correlation.

---

## 2. SDG GOALS ALIGNMENT

### SDG 16 — Peace, Justice and Strong Institutions *(Primary)*

**Relevant targets:** 16.2 (end abuse and exploitation of children), 16.3 (rule of law and access to justice), 16.6 (effective, accountable, transparent institutions), 16.10 (access to information, protection of freedoms).

**How the design contributes:**
- Strengthens investigative capacity through AI-assisted triage and correlation, keeping a human decision-maker at every substantive step.
- Aims to reduce case backlog time, which — if realized — shortens the window victims remain unidentified.
- Produces a structured, sourced evidence package intended to improve completeness of what's submitted for prosecutorial review.
- Full audit logging and explainable-AI evidence citations are built in specifically so AI-assisted findings remain reviewable and contestable, not black-box.

### SDG 3 — Good Health and Well-Being *(Secondary)*

**Relevant targets:** 3.4 (mental health and well-being), 3.d (health risk capacity).

**How the design contributes:**
- Faster identification is designed to shorten time-to-intervention, which matters because duration of undetected abuse correlates with cumulative harm.
- Investigator well-being is a first-class design concern: automated severity classification, tiered access controls that shield staff from unnecessary exposure to graphic material, and mandatory rotation/support prompts built into workflow — not an afterthought bolted on later.

### SDG 10 — Reduced Inequalities *(Tertiary)*

**Relevant target:** 10.3 (equal opportunity, reduced inequality).

**How the design contributes:**
- Commercial forensic suites can carry substantial annual licensing costs that put them out of reach for many smaller agencies and departments in lower-resource jurisdictions.
- An open-core, self-hostable architecture with no mandatory per-seat cloud billing is intended to lower that barrier.
- Multilingual open-weight LLMs (e.g., Llama-3.1-class models, Whisper's multilingual variants) extend usefulness beyond well-resourced, English-first jurisdictions.

---

## 3. OUR SOLUTION — THE CORE IDEA

### The Central Idea: Temporal-Graph Agentic Intelligence

Most digital-forensics tooling answers *"what is in this evidence?"* — classification, hash-matching, keyword flags.

ACPIA is designed to additionally answer: **"who is this person, how does their behavior change across time and platforms, and where does the pattern point?"** — a question that requires modeling evidence as a connected, time-ordered graph rather than a pile of independently classified files.

Three design pillars make this possible:

#### Pillar 1 — Behavioral-Stage Classification Over Time
Grooming behavior researched in child-safety literature is commonly described in escalating stages (rapport-building → trust/exclusivity → dependency-creation → isolation → desensitization → solicitation). Rather than flagging individual "bad" messages, the system classifies each message's likely stage and tracks the *trajectory* across a conversation timeline — because a slow escalation over weeks is a stronger and more specific signal than any single message, and is invisible to keyword search.

*(Consistent with child-safety guidance, this document intentionally stays at the level of naming these stages descriptively — it does not enumerate specific grooming phrases, scripts, or verbatim manipulative language, since that level of detail has no investigative value here and only risks functioning as a usable script.)*

#### Pillar 2 — Cross-Platform Identity Resolution
Offenders often operate under different handles on different platforms. Rather than relying on matching usernames, the system is designed to correlate accounts using several independent forensic signals that persist across pseudonyms:
- **Stylometric fingerprinting** — vocabulary richness, sentence-length distribution, punctuation habits.
- **Device and file metadata artifacts** — EXIF fields, embedded device identifiers, clock-skew patterns in file timestamps.
- **Temporal activity correlation** — accounts on different platforms that are consistently online/offline in the same windows.

Each signal alone is weak; combined into a scored, evidenced graph edge with a confidence interval, they become a defensible lead for a human investigator to verify — never an automatic conclusion.

#### Pillar 3 — Behavioral Drift Analysis
Because the system models evidence as a time series per identity, it can highlight when the *same* identity's tactics change across different conversations or victims over time (e.g., faster escalation in later contacts vs. earlier ones) — a pattern that is extremely labor-intensive to reconstruct by hand across a large case file, but mechanical for a system that already has everything time-stamped and graphed.

**Design principle that runs through all three pillars:** every output is a *scored lead with cited source evidence*, not an accusation. The system is built to accelerate investigator review, not to make determinations. Final judgment always rests with a qualified human investigator, and that constraint is enforced architecturally (Section 11), not just stated as policy.

---

## 4. KEY INNOVATIONS

| Innovation | What it does | Why it matters |
|---|---|---|
| Behavioral-stage classification | Labels each message with a likely grooming-stage category and tracks the trend across a conversation | Surfaces the *pattern*, which single-message keyword search misses |
| Cross-platform identity resolution | Links accounts across platforms using stylometry + file/device metadata + temporal correlation, each with a confidence score | Connects the same person across aliases without relying on username reuse |
| Behavioral drift analysis | Compares an identity's tactics across different time windows / conversations | Flags likely repeat-offense patterns for investigator review |
| Temporal knowledge graph | Neo4j graph with timestamped, confidence-scored edges between all entities | Enables time-bounded queries ("who was in contact with this device before date X") |
| Explainable-AI evidence chains | Every score/flag links back to the specific evidence fragment(s) that produced it | Makes AI-assisted findings reviewable, contestable, and auditable — not a black box |
| Air-gapped local deployment | Runs entirely on local infrastructure via Ollama/self-hosted models | No data leaves agency custody; works without external network access |
| Multi-agent parallel pipeline | Specialist agents (multimedia, conversation, identity, timeline, network, docs) run concurrently via LangGraph | Cuts wall-clock analysis time versus a single serial pipeline |
| Human-in-the-loop gating | Every AI-derived lead requires explicit investigator confirmation before it can move into the case file as an actionable finding | Keeps a qualified human as the actual decision-maker, which the legal process requires anyway |

---

## 5. SOLUTION ARCHITECTURE & FLOW

ACPIA is organized as six layers. Each layer has one job and passes a structured, typed output to the next — this keeps every stage independently testable, auditable, and swappable.

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 6 — INVESTIGATOR DASHBOARD (React + TypeScript + D3.js,       │
│  packaged via Electron for air-gapped desktop use)                   │
│  Case management · Knowledge-graph explorer · Evidence viewer ·      │
│  Report generation · Mandatory human review/override on every AI     │
│  lead before it becomes part of the case record                      │
└──────────────────────────────┬───────────────────────────────────────┘
                                │ Confirmed findings, annotations, overrides
┌──────────────────────────────▼───────────────────────────────────────┐
│  LAYER 5 — INTELLIGENCE SYNTHESIS & EXPLAINABLE AI (XAI)             │
│  Lead prioritization · Risk scoring with confidence intervals ·      │
│  Evidence citation-chain assembly · Court-oriented report drafting · │
│  Contradiction detection across agent outputs · Audit-log compiler   │
└──────────────────────────────┬───────────────────────────────────────┘
                                │ Consolidated, scored agent outputs
┌──────────────────────────────▼───────────────────────────────────────┐
│  LAYER 4 — TEMPORAL KNOWLEDGE GRAPH (Neo4j 5.x, Community Edition)   │
│  Nodes: Person · Device · Location · Platform · File · Event         │
│  Edges: typed relationship + timestamp + confidence score + source   │
│  Graph algorithms (via GDS library): centrality, community           │
│  detection, temporal shortest-path, anomaly scoring                  │
└──────────────────────────────┬───────────────────────────────────────┘
                                │ Extracted entities & relationships
┌──────────────────────────────▼───────────────────────────────────────┐
│  LAYER 3 — AGENTIC REASONING LAYER (LangGraph orchestration)         │
│  Agent 1 · Multimedia Analyst      Agent 5 · Geospatial Intelligence │
│  Agent 2 · Conversation Intelligence Agent 6 · Network & Relationships│
│  Agent 3 · Identity Resolution      Agent 7 · Document & Metadata    │
│  Agent 4 · Timeline Reconstruction  Agent 8 · Case Synthesis & Report│
└──────────────────────────────┬───────────────────────────────────────┘
                                │ Normalized, classified evidence
┌──────────────────────────────▼───────────────────────────────────────┐
│  LAYER 2 — MULTIMODAL ANALYSIS ENGINE                                │
│  Vision-language model → image/video frame description & tagging    │
│  Whisper → audio transcription + speaker diarization                │
│  spaCy + local LLM → text semantics, NER, stylometric features       │
│  Tesseract OCR → text extraction from images/scans                   │
└──────────────────────────────┬───────────────────────────────────────┘
                                │ Normalized evidence files
┌──────────────────────────────▼───────────────────────────────────────┐
│  LAYER 1 — EVIDENCE INGEST & CHAIN OF CUSTODY                        │
│  SHA-256 hashing · append-only timestamp ledger · MIME detection ·   │
│  format normalization · deduplication · case ID assignment ·         │
│  known-CSAM hash-list matching (PhotoDNA/CSAI-Match-equivalent,      │
│  hash-only comparison — see Section 11)                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Design rationale for the layering

- **Separation of ingest from analysis (Layer 1 vs 2/3):** chain-of-custody integrity must never depend on the correctness of any ML model. Hashing and the immutable ledger happen before any AI touches the file, and are independently verifiable.
- **Agents run on *normalized* evidence, not raw files (Layer 2 → 3):** this keeps each agent's prompt/context small and lets Layer 2 be replaced (e.g., swap Whisper for a different ASR model) without touching agent logic.
- **The graph is the single source of truth for cross-referencing (Layer 4):** every agent writes into the same graph rather than maintaining separate silos, which is what actually enables cross-platform correlation.
- **Synthesis is separated from raw agent output (Layer 5):** this is where contradictions between agents get surfaced explicitly rather than silently overwritten, and where every claim gets its evidence citation attached before a human ever sees it.
- **A human always sits above the AI layers (Layer 6):** nothing in Layers 2–5 writes a "confirmed" finding into the case record; only an investigator action does that.

---

## 6. PROCESS FLOWCHART

### End-to-End Investigation Pipeline

```
                        ┌─────────────────────┐
                        │  INVESTIGATOR         │
                        │  Uploads Evidence      │
                        │  (drag & drop, batch)  │
                        └──────────┬────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  INGEST & VERIFICATION          │
                   │  • SHA-256 hash generated       │
                   │  • Timestamp recorded (ledger)  │
                   │  • Case ID assigned              │
                   │  • Chain-of-custody entry begun  │
                   │  • MIME/file type detected        │
                   │  • Known-hash-list check          │
                   └───────────────┬───────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   EVIDENCE ROUTER              │
                    │   (by MIME + content type)     │
                    └──┬────────┬────────┬──────────┘
                       │        │        │
          ┌────────────▼─┐ ┌───▼────┐ ┌─▼──────────┐
          │  MULTIMEDIA   │ │  TEXT   │ │  DOCUMENTS │
          │  Images        │ │  Chats  │ │  PDFs      │
          │  Video          │ │  Email  │ │  Archives  │
          │  Audio          │ │  Logs   │ │  Metadata  │
          └────────┬───────┘ └───┬────┘ └──────┬─────┘
                   │              │              │
          ┌────────▼──────────────▼──────────────▼─────┐
          │        MULTIMODAL ANALYSIS ENGINE            │
          │  Vision-language model │ Whisper ASR         │
          │  spaCy + local LLM     │ Tesseract OCR        │
          └───────────────────┬──────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────────┐
          │        LANGGRAPH ORCHESTRATOR                │
          │   dispatches normalized evidence to agents   │
          └──┬──────┬──────┬──────┬──────┬──────┬───────┘
             │      │      │      │      │      │
     ┌───────▼─┐ ┌──▼───┐ ┌▼────┐ ┌▼───┐ ┌▼──┐ ┌▼──────────┐
     │ Agent 1 │ │Agent2│ │Ag.3 │ │Ag.4│ │Ag5│ │  Agent 6   │
     │Multimed.│ │Conv. │ │Iden.│ │Time│ │Geo│ │  Network   │
     │Analyst  │ │Intel.│ │Resol│ │line│ │Int│ │& Relations │
     └────┬────┘ └──┬───┘ └┬────┘ └┬───┘ └┬──┘ └────┬───────┘
          │         │      │       │      │          │
          └─────────┴──────┴───────┴──────┴──────────┘
                              │
                              ▼
          ┌───────────────────────────────────────────┐
          │         NEO4J KNOWLEDGE GRAPH                │
          │  (Person)-[COMMUNICATED_WITH {ts, conf}]->   │
          │  (Person)-[USED_DEVICE {ts}]->(Device)        │
          │  (Device)-[LOCATED_AT {ts, conf}]->(Location) │
          │  (Person)-[ACTIVE_ON {ts}]->(Platform)         │
          │  (Platform)-[CONTAINS]->(File)                 │
          │  Every edge carries: timestamp, confidence,    │
          │  and a pointer back to source evidence          │
          └───────────────────┬───────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────────┐
          │        INTELLIGENCE SYNTHESIS (Agent 8)      │
          │  • Cross-agent output correlation             │
          │  • Contradiction detection & flagging          │
          │  • Risk scoring per entity (0–100, with CI)     │
          │  • Lead prioritization queue                    │
          │  • XAI evidence-citation chain generation        │
          └───────────────────┬───────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────────┐
          │     INVESTIGATOR DASHBOARD (human review)     │
          │  • Every lead shown with cited source evidence  │
          │  • Investigator: confirm / reject / annotate     │
          │  • Only confirmed items enter the case record      │
          │  • Report generator drafts a sourced summary        │
          │    for prosecutorial / supervisory review             │
          └───────────────────────────────────────────────┘
```

---

## 7. TECHNICAL STACK

Everything below is a currently-maintained, actively-developed open-source project. Version numbers are the "as of design time" targets — pin exact versions in `requirements.txt` / `package.json` and re-verify against upstream release notes before build, since these all move fast.

### 7.1 Ingest & Storage

| Component | Tool | Purpose |
|---|---|---|
| Object storage | **MinIO** (self-hosted, S3-compatible) | Immutable evidence blob storage |
| Relational metadata store | **PostgreSQL 16** | Case metadata, users, audit log, chain-of-custody ledger |
| Graph database | **Neo4j 5.x Community/Enterprise** + **Graph Data Science (GDS) library** | Temporal knowledge graph, centrality/community detection |
| Search index | **OpenSearch** (Apache 2.0 fork of Elasticsearch) | Full-text search across transcripts/OCR output |
| File hashing | **hashlib (Python stdlib)** / `sha256sum` | SHA-256 chain-of-custody hashing |
| Deduplication | **imagededup**, custom hash-index on MinIO | Perceptual + cryptographic dedup |

### 7.2 Multimodal Analysis Engine

| Modality | Tool | Notes |
|---|---|---|
| Vision-language captioning/tagging | **LLaVA** (or **Qwen2-VL**, open weights) served via **Ollama** or **vLLM** | Frame/image description, scene tagging |
| Audio transcription | **OpenAI Whisper** (open-source, self-hosted, `whisper.cpp` or `faster-whisper` for speed) | Multilingual transcription |
| Speaker diarization | **pyannote.audio** | Separates speakers in multi-party audio |
| OCR | **Tesseract OCR** | Text extraction from images/scans |
| NLP / NER / stylometry features | **spaCy**, **NLTK**, custom stylometric feature extractors | Entity extraction, writing-style fingerprinting |
| General-purpose local LLM reasoning | **Llama 3.1 (open weights)** or **Mistral/Mixtral**, served via **Ollama** | Summarization, classification, agent reasoning backend |
| Metadata/EXIF extraction | **ExifTool** | Camera/device fingerprint fields |
| Video frame sampling | **FFmpeg** | Keyframe extraction for vision-model input |

### 7.3 Agentic Orchestration

| Component | Tool | Purpose |
|---|---|---|
| Multi-agent graph orchestration | **LangGraph** | Stateful, parallel agent dispatch and control flow |
| Agent role/crew framework | **CrewAI** (optional, for role-based agent teams) | Task decomposition across the 8 specialist agents |
| Tool-calling / function interface | **LangChain** tool abstractions | Wraps ML models and DB queries as callable agent tools |
| Local model serving | **Ollama** and/or **vLLM** | Serves open-weight LLMs with an OpenAI-compatible API, fully offline |

### 7.4 Backend Services

| Component | Tool | Purpose |
|---|---|---|
| API layer | **FastAPI** (Python) | REST + WebSocket endpoints |
| Async task queue | **Celery** + **Redis** (or RabbitMQ) | Long-running ingest/analysis jobs |
| Workflow scheduling | **Apache Airflow** (optional, for batch/cron pipelines) | Recurring hash-list updates, nightly re-index |
| Containerization | **Docker** + **Docker Compose** (single-agency deploy) / **Kubernetes** (multi-node) | Deployment and scaling |
| Service mesh / ingress | **Traefik** or **NGINX** | Reverse proxy, TLS termination |

### 7.5 Frontend / Dashboard

| Component | Tool | Purpose |
|---|---|---|
| UI framework | **React** + **TypeScript** | Dashboard application |
| Graph visualization | **D3.js** or **Cytoscape.js** | Interactive knowledge-graph explorer |
| Desktop packaging (air-gapped) | **Electron** | Offline desktop app for isolated networks |
| Charting | **Recharts** or **Chart.js** | Case statistics, risk-score trends |
| Design system | **Tailwind CSS** + **shadcn/ui** | Component styling |

### 7.6 Observability & Ops

| Component | Tool | Purpose |
|---|---|---|
| Metrics | **Prometheus** | Time-series metrics collection |
| Dashboards | **Grafana** | Real operational dashboards (see Section 8) |
| Tracing | **OpenTelemetry** + **Jaeger** | Distributed tracing across agent pipeline |
| Log aggregation | **Loki** + **Promtail** | Centralized log search |
| Alerting | **Alertmanager** | On-call/ops alerting for pipeline failures |

### 7.7 Security

| Component | Tool | Purpose |
|---|---|---|
| Secrets management | **HashiCorp Vault** | Credential/key storage |
| Auth | **Keycloak** (OpenID Connect / SAML) | SSO, role-based access control |
| Encryption at rest | **LUKS** (disk) + **PostgreSQL pgcrypto** / MinIO SSE | Data-at-rest encryption |
| Audit logging | **PostgreSQL append-only table** + **OpenTelemetry logs**, write-once storage target | Immutable audit trail |

---

## 8. OBSERVABILITY & REAL-TIME OPERATIONAL METRICS

This is the honest version of a "real-time stats" section: not fabricated dashboard numbers, but the actual metrics pipeline that would produce genuine, live, verifiable numbers once ACPIA is running against real casework. Every metric below is something Prometheus can actually scrape from a running system — nothing here is a placeholder dressed up as a live figure.

### 8.1 What gets instrumented

| Layer | Example Prometheus metrics (real, scraped, not invented) |
|---|---|
| Ingest | `acpia_evidence_ingested_total`, `acpia_hash_verification_failures_total`, `acpia_dedup_ratio` |
| Multimodal engine | `acpia_whisper_transcription_seconds` (histogram), `acpia_vision_inference_seconds`, `acpia_ocr_pages_processed_total` |
| Agent layer | `acpia_agent_task_duration_seconds{agent="conversation_intel"}`, `acpia_agent_errors_total`, `acpia_langgraph_active_runs` |
| Graph layer | `acpia_neo4j_query_duration_seconds`, `acpia_graph_nodes_total`, `acpia_graph_edges_total` |
| Synthesis | `acpia_leads_generated_total`, `acpia_leads_confirmed_total`, `acpia_leads_rejected_total` (this ratio is the real proxy for model precision — computed from actual investigator decisions, not asserted) |
| System | standard `node_exporter` CPU/GPU/memory/disk metrics, GPU utilization via `dcgm-exporter` if NVIDIA GPUs are used |

### 8.2 Why `leads_confirmed / leads_generated` matters more than any accuracy claim

Any accuracy percentage in this document that isn't computed from investigator confirm/reject decisions on real cases is a projection, not a fact. The system is designed so that this precision ratio is computed automatically and continuously, per agent and per case type, and surfaced directly in Grafana — so the tool's real performance is always visible to the agency running it, not asserted by the vendor.

### 8.3 Grafana dashboard layout (design, not live data)

- **Ops health panel:** ingest throughput, queue depth, agent error rate, GPU utilization.
- **Case throughput panel:** cases opened vs. closed per week, median time-to-first-lead, median time-to-case-synthesis.
- **Model precision panel:** confirm/reject ratio per agent type, trended over time — this is the panel that actually earns trust, because it's derived from human decisions, continuously, in production.
- **Audit panel:** chain-of-custody hash-verification pass rate (should be 100%; any failure is a hard alert, not a metric to average away).

### 8.4 Alerting

Alertmanager rules should include, at minimum: hash-verification failure (page immediately — this is a chain-of-custody integrity event), agent pipeline stall beyond SLA, disk/storage capacity thresholds, and authentication anomaly detection (e.g., access outside approved investigator roster).

---

## 9. DATA MODEL & SCHEMAS

### 9.1 Relational schema (PostgreSQL) — core tables

```sql
CREATE TABLE cases (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT UNIQUE NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL CHECK (status IN ('open','under_review','closed','archived')),
    lead_investigator_id UUID REFERENCES users(user_id),
    jurisdiction TEXT NOT NULL
);

CREATE TABLE evidence_items (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(case_id),
    sha256_hash CHAR(64) NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ingested_by UUID NOT NULL REFERENCES users(user_id),
    storage_path TEXT NOT NULL,
    UNIQUE (case_id, sha256_hash)
);

CREATE TABLE chain_of_custody_log (
    log_id BIGSERIAL PRIMARY KEY,
    evidence_id UUID NOT NULL REFERENCES evidence_items(evidence_id),
    actor_id UUID NOT NULL REFERENCES users(user_id),
    action TEXT NOT NULL,
    action_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    prior_hash CHAR(64),
    resulting_hash CHAR(64) NOT NULL
    -- append-only: no UPDATE/DELETE grants on this table, enforced at DB role level
);

CREATE TABLE leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(case_id),
    generated_by_agent TEXT NOT NULL,
    risk_score NUMERIC(5,2) NOT NULL,
    confidence_interval NUMRANGE,
    status TEXT NOT NULL CHECK (status IN ('pending','confirmed','rejected')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    evidence_citation_ids UUID[] NOT NULL
);
```

### 9.2 Graph schema (Neo4j) — node & relationship types

```cypher
// Node labels
(:Person {person_id, display_alias, first_seen, last_seen})
(:Device {device_id, device_fingerprint, first_seen})
(:Platform {platform_id, name})
(:Location {location_id, lat, lon, precision_meters})
(:FileEvidence {evidence_id, sha256_hash, mime_type})
(:Case {case_id, case_number})

// Relationship types (every relationship carries ts + confidence + source)
(:Person)-[:COMMUNICATED_WITH {first_ts, last_ts, message_count, confidence}]->(:Person)
(:Person)-[:USED_DEVICE {ts, confidence}]->(:Device)
(:Device)-[:LOCATED_AT {ts, confidence}]->(:Location)
(:Person)-[:ACTIVE_ON {first_ts, last_ts}]->(:Platform)
(:Platform)-[:CONTAINS]->(:FileEvidence)
(:Person)-[:LIKELY_SAME_AS {confidence, signal_types[]}]->(:Person)  // cross-platform identity resolution edge
(:FileEvidence)-[:PART_OF]->(:Case)
```

### 9.3 Example investigative graph query

```cypher
// Find all persons in contact with a given device before a given date,
// ranked by confidence, with evidence pointers for citation.
MATCH (d:Device {device_id: $deviceId})<-[u:USED_DEVICE]-(p:Person)
MATCH (p)-[c:COMMUNICATED_WITH]->(other:Person)
WHERE c.first_ts < $cutoffDate
RETURN other.person_id, c.confidence, c.first_ts, c.last_ts
ORDER BY c.confidence DESC;
```

---

## 10. API CONTRACTS

FastAPI backend, OpenAPI-documented, versioned under `/api/v1`. All endpoints require an authenticated, role-scoped bearer token issued by Keycloak.

```
POST   /api/v1/cases                         Create a case
GET    /api/v1/cases/{case_id}                Retrieve case summary
POST   /api/v1/cases/{case_id}/evidence        Upload evidence (multipart, triggers ingest pipeline)
GET    /api/v1/cases/{case_id}/evidence/{id}    Retrieve evidence metadata + chain-of-custody log
POST   /api/v1/cases/{case_id}/analyze          Trigger/re-trigger agent pipeline for a case
GET    /api/v1/cases/{case_id}/leads             List generated leads (status filterable)
PATCH  /api/v1/leads/{lead_id}                   Investigator confirm/reject/annotate a lead
GET    /api/v1/cases/{case_id}/graph              Retrieve graph subview for visualization
GET    /api/v1/cases/{case_id}/report             Generate/download sourced case report (PDF)
GET    /api/v1/audit/{evidence_id}                 Full chain-of-custody audit trail
WS     /api/v1/cases/{case_id}/stream               Live pipeline progress (WebSocket)
```

Example response — a lead object, showing the mandatory evidence citation chain:

```json
{
  "lead_id": "b6e2...",
  "case_id": "a1f9...",
  "generated_by_agent": "conversation_intelligence",
  "risk_score": 78.4,
  "confidence_interval": [71.2, 84.9],
  "status": "pending",
  "summary": "Escalating contact pattern detected across 3 platforms for linked identity cluster #12.",
  "evidence_citations": [
    {"evidence_id": "e1...", "excerpt_ref": "msg_range:4021-4098", "sha256_hash": "..."},
    {"evidence_id": "e2...", "excerpt_ref": "frame_ts:00:12:44", "sha256_hash": "..."}
  ]
}
```

---

## 11. SECURITY, GOVERNANCE & CHAIN OF CUSTODY

### 11.1 Architectural guardrails (not just policy)

- **Human confirmation is enforced at the schema level.** The `leads` table's `status` field only transitions from `pending` via an authenticated investigator action through `PATCH /leads/{id}`; no service account or agent process has write access to set `status = 'confirmed'`. This is a database permission, not a UI convention.
- **Chain-of-custody table is append-only** at the PostgreSQL role level (no `UPDATE`/`DELETE` grants), and every row's `resulting_hash` is independently re-verifiable against the object in MinIO.
- **Known-CSAM handling stays strictly at the hash level.** Ingest checks file hashes against established hash-list databases (e.g., PhotoDNA-style perceptual hashes, NCMEC hash lists, obtained only through the appropriate authorized-access channel for law enforcement / NCMEC-registered organizations) — this is a hash comparison, not content viewing, and matched files should be handled per the agency's existing legal protocol, not surfaced for open review.
- **Role-based access control via Keycloak:** severity-tiered access so junior staff can be scoped away from the most graphic material by policy, enforced technically through row-level security in PostgreSQL and property-level access in Neo4j.
- **Air-gapped by default:** all model inference (Ollama/vLLM) and databases run on agency-controlled infrastructure with no outbound internet dependency required for core operation. Any optional external service (e.g., pulling a hash-list update) is an explicit, logged, agency-approved network exception — not a default open connection.

### 11.2 Legal and process constraints this design assumes

- Deployment is restricted to authorized law-enforcement or child-protection agencies operating under applicable legal authority for this kind of evidence handling — this is not a general-purpose consumer or public tool.
- All AI-generated leads are explicitly non-determinative: they are investigative leads requiring human verification, not findings of fact, and the report generator should carry this framing into every exported document.
- Data retention, cross-border transfer, and disclosure follow the deploying agency's existing legal framework — the architecture doesn't presume a specific jurisdiction's rules and should be configured per deployment with legal counsel involved.

### 11.3 Independent audit

Given the sensitivity of the domain, an actual deployment should go through independent security review and, ideally, a formal model-evaluation/bias audit before operational use — this document specifies the architecture that would make such an audit tractable (everything logged, everything sourced, nothing silently auto-confirmed), not a substitute for doing it.

---

## 12. DEPLOYMENT TOPOLOGY & SCALABILITY

### 12.1 Single-agency deployment (Docker Compose)

Suited to smaller departments: one or a few GPU-equipped servers, `docker-compose.yml` bringing up FastAPI, Celery workers, Redis, PostgreSQL, Neo4j, MinIO, Ollama, and the observability stack on a single LAN, air-gapped from the internet except for an explicitly controlled update channel.

### 12.2 Multi-node deployment (Kubernetes)

For larger agencies or shared regional infrastructure:
- **GPU node pool** running Ollama/vLLM for LLM and vision-model inference, autoscaled by queue depth (Celery queue length as the HPA custom metric).
- **CPU node pool** for FastAPI, Celery workers handling non-GPU tasks (OCR, hashing, graph writes).
- **StatefulSets** for Neo4j, PostgreSQL, MinIO with persistent volumes and regular encrypted backups.
- **NetworkPolicies** restricting pod-to-pod traffic to only the required paths (defense in depth even within an air-gapped cluster).

### 12.3 Scalability characteristics by design

- **Horizontal scaling of the multimodal engine:** Whisper/vision-model inference is embarrassingly parallel across files — additional GPU workers linearly increase throughput.
- **LangGraph agent parallelism:** the 8 specialist agents operate on independent slices of normalized evidence and can run concurrently per case, and across cases via worker pool scaling.
- **Neo4j as the bottleneck to watch:** graph writes are the most likely serialization point at very high ingest volume; mitigated via batched writes and, if needed, Neo4j Enterprise's clustering for read scaling.
- **Storage scaling:** MinIO scales out horizontally (erasure-coded distributed mode) as evidence volume grows across cases.

---

## 13. FEASIBILITY & VIABILITY

- **Technical feasibility:** every component listed in Section 7 is a mature, actively maintained open-source project with existing production deployments elsewhere (Whisper, Neo4j, FastAPI, Kubernetes, etc.) — the engineering risk is in integration and tuning, not in unproven technology.
- **Cost viability:** no mandatory recurring cloud/API billing; primary cost is one-time hardware (particularly GPU capacity for local LLM/vision inference) plus ongoing maintenance/staffing, which is a materially different cost profile than per-seat commercial forensic suites.
- **Operational viability:** requires a pilot phase with a real agency, real (properly authorized) casework, and a defined evaluation protocol before any performance claim can be trusted — this should be treated as a hard prerequisite to "final product" status, not a nice-to-have.
- **Adoption path:** starts as an assistive triage/correlation tool layered alongside existing forensic workflows (not a replacement for certified forensic tools used for evidentiary extraction itself), which lowers the bar for a pilot agency to try it without disrupting existing certified processes.

---

## 14. POTENTIAL CHALLENGES & RISKS

| Risk | Description |
|---|---|
| False positives/negatives in behavioral classification | Grooming-stage classifiers can misclassify benign conversation as escalating, or miss real escalation — especially across languages/cultures not well represented in training data |
| Identity-resolution false linking | Stylometric/temporal correlation is probabilistic; conflating two different real people carries serious consequences if not clearly flagged as low-confidence |
| Evidentiary admissibility | Courts vary in how they treat AI-assisted findings; without a clean chain of custody and explainability, output may be challenged or excluded |
| Investigator over-reliance ("automation bias") | Risk that busy investigators start treating AI-generated leads as conclusions rather than leads requiring verification |
| Investigator psychological load | Even with severity tiering, staff reviewing flagged content are still exposed to traumatic material |
| Model/infrastructure drift | Local LLM and vision models need periodic re-evaluation as platforms, slang, and offender tactics evolve |
| Data security | A single system aggregating this much sensitive case data becomes a high-value target if compromised |
| Resourcing for smaller agencies | Even "no licensing cost" software still needs GPU hardware and staff capable of running/maintaining it |

---

## 15. STRATEGIES FOR OVERCOMING CHALLENGES

- **Treat every AI output as a lead, never a finding** — enforced architecturally (Section 11.1), not just in a training manual.
- **Publish confidence intervals, not point estimates**, on every risk score and identity-resolution edge, and surface low-confidence links distinctly in the UI so investigators don't anchor on them.
- **Continuous precision monitoring via the confirm/reject ratio** (Section 8.2) — if an agent's real-world precision degrades, that shows up in Grafana automatically and can trigger retraining/retuning before it causes harm.
- **Mandatory human confirmation before anything enters the case record**, with the confirming investigator's identity logged — this both prevents automation bias from becoming procedural and creates individual accountability for the final call.
- **Structured rotation and support prompts** for staff reviewing high-severity content, tied into the severity-tiering system, not left to informal team norms.
- **Independent security and bias audits before operational deployment**, with findings feeding back into the model-selection and confidence-threshold configuration.
- **Regional/agency partnership model for hardware costs** — shared regional deployments (Section 12.2) let smaller agencies pool GPU infrastructure rather than each buying their own.

---

## 16. IMPACT & BENEFITS

- **For investigators:** less time spent on manual cross-referencing across platforms and file types, more time on judgment-intensive verification work; a defensible, sourced trail for every AI-assisted lead.
- **For victims:** the intended effect of faster, better-correlated triage is earlier identification and intervention — though this is a target outcome to be measured in a real pilot, not an assumed result.
- **For institutions:** an audit-friendly, explainable system that agencies can actually defend under legal and public scrutiny, rather than an opaque black-box tool.
- **For under-resourced agencies:** a credible open-source alternative to expensive commercial forensic suites, expanding capability without expanding recurring cost.
- **For the field generally:** an architecture pattern — normalized multimodal ingest → typed knowledge graph → human-gated synthesis — that's reusable well beyond this specific domain wherever cross-source correlation with strict accountability requirements matters.

---

## 17. ROADMAP

1. **Phase 0 — Design validation:** legal review, security architecture review, and a synthetic/red-team dataset to validate the pipeline end-to-end without touching real case material.
2. **Phase 1 — Controlled pilot:** single agency, narrow case-type scope, full human-in-the-loop gating, heavy logging, formal evaluation protocol defined up front (precision/recall against investigator ground truth, not vendor self-report).
3. **Phase 2 — Expand modalities/languages:** broaden ASR/vision-model language coverage based on pilot findings; tune grooming-stage classifier against pilot data with domain-expert review.
4. **Phase 3 — Multi-agency / regional deployment:** move to the Kubernetes topology (Section 12.2), add shared hash-list update channel with appropriate authorization controls.
5. **Phase 4 — Independent audit & publication:** publish (to the extent legally appropriate) methodology and evaluation results so the approach can be scrutinized and improved by the broader child-safety and forensics research community.

---

*End of document.*
