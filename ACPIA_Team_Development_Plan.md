# ACPIA — 3-Phase Team Development Plan
## From Current State to Working End-to-End Product (3 developers, parallel tracks)

**Team:**
- **Tino** — AI / Multi-Agent Pipeline (has the GPU laptop → owns everything that needs local model inference)
- **Barath** — Backend, Infrastructure, Data, Security
- **Chinnaya** — Frontend, Dashboard, Reporting, Demo Experience

**Core idea of this plan:** the reason teams collide is that everyone needs everyone else's half-finished work to test their own. So before anyone writes a feature, we lock the **contracts** between the three tracks (API shapes, DB schema, message queue topics, Docker network). Once those are locked, all three of you can build against **mocks/stubs** of each other's work and never block each other until integration day.

---

## 0. DAY ZERO — Fix the Docker Blocker (whole team, ~1–2 hours, do this together first)

This blocks everyone, so it's not part of anyone's individual track — knock it out together before splitting up.

**Root cause:** Docker Desktop (or Docker Engine) on this host has a restricted list of directories it's allowed to bind-mount from. `/mnt/Data/SRCAS HACKATHON/acpia` isn't in that allow-list.

**Fix — do whichever applies to your OS:**

- **Docker Desktop (Windows/Mac):** Settings → Resources → File Sharing → add `/mnt/Data` (or the specific project path) to the shared paths list → Apply & Restart.
- **Docker Engine (Linux, e.g. WSL2 backend):** bind-mount restrictions usually come from where the project sits relative to the WSL filesystem. **Simplest fix:** move the project directory *inside* the Linux filesystem (e.g. `~/acpia` inside WSL) instead of a Windows-mounted path like `/mnt/Data/...` — bind mounts from paths under `/mnt/c` or similar cross-OS mounts are exactly what trips this error.
- **If you truly cannot move the folder or edit Docker's settings:** switch strategy per Phase 1 below — bake source into images with `COPY` instead of bind-mounting, and use **named Docker volumes** (not host bind mounts) for anything that needs to persist (Postgres data, Neo4j data, MinIO data). Named volumes are always allowed regardless of host path restrictions.

**Action:** rename the project folder to something without spaces and move it under a plain path, e.g. `~/projects/acpia` or `C:\dev\acpia` — spaces in Docker bind-mount paths (`SRCAS HACKATHON`) are also a classic source of this exact failure independent of the sharing settings. Do this rename **before** anything else; it fixes two problems at once.

Once `docker compose up` boots cleanly with a trivial "hello world" service, move to the phases below.

---

## 1. THE CONTRACT LAYER (lock this first, ~half a day, all 3 together)

This is the single most important artifact for letting 3 people work without stepping on each other. Spend real time on it before splitting up.

### 1.1 Git branching strategy

```
main                  → always deployable, protected, merge via PR only
  ├─ tino/ai-pipeline      → Tino's entire track
  ├─ barath/backend-infra  → Barath's entire track
  └─ chinnaya/frontend     → Chinnaya's entire track
```

- Each person branches off `main`, commits freely on their own branch, opens a PR back to `main` at the end of each phase (not continuously — see integration checkpoints below).
- **Never rebase/force-push shared branches.** `main` only moves forward via PR merge.
- Add a `docker-compose.override.yml` per person locally if you need to run a subset of services (e.g. Chinnaya doesn't need Ollama running to build UI against mocked API responses).

### 1.2 The API contract (Barath owns and publishes this — everyone else builds against it, not against Barath's actual running code)

Barath writes the OpenAPI spec (FastAPI auto-generates this from Pydantic schemas + route signatures) **before** implementing full business logic. Stub every endpoint to return realistic fake JSON matching the final shape. Push this to `main` on day one of Phase 1.

This unblocks Tino and Chinnaya immediately:
- **Tino** doesn't need the real database — his agents write to a `GraphWriteService` interface and call a `LeadService.create_lead()` interface. He can build/test those interfaces against a local Neo4j + a stubbed Postgres, independent of Barath's auth/RBAC work.
- **Chinnaya** doesn't need real AI running — the frontend calls the same FastAPI endpoints, which return stub JSON matching the final response shape (see the `lead` object example below). She can build the entire dashboard against those stubs and swap to live data on integration day with zero UI code changes, because the *shape* never changes.

**Lock this JSON shape now (from the architecture doc) — nobody changes it without telling the other two:**

```json
{
  "lead_id": "uuid",
  "case_id": "uuid",
  "generated_by_agent": "conversation_intelligence",
  "risk_score": 78.4,
  "confidence_interval": [71.2, 84.9],
  "status": "pending | confirmed | rejected",
  "summary": "string",
  "evidence_citations": [
    {"evidence_id": "uuid", "excerpt_ref": "string", "sha256_hash": "string"}
  ]
}
```

### 1.3 The queue/topic contract (how Tino's agents and Barath's backend talk to each other)

Since Celery is already in place, lock the task names and payload shapes now:

```
Task: analyze_evidence(evidence_id: str, case_id: str, mime_type: str)
  → dispatched by Barath's ingestion endpoint after upload completes
  → consumed by Tino's LangGraph orchestrator entrypoint

Task: pipeline_progress_update(case_id: str, agent_name: str, status: str, pct: int)
  → published by Tino's agents as they run
  → consumed by Barath's WebSocket broadcaster (/api/v1/cases/{id}/stream)
  → displayed live by Chinnaya's frontend progress bar
```

Write these three signatures into a shared `CONTRACTS.md` in the repo root. Any change to a signature = a message in the team chat before pushing, not a silent change.

### 1.4 The Docker network contract

Barath owns `docker-compose.yml`. Every service name is fixed now so nobody hardcodes `localhost:PORT` anywhere — always use the service name (Docker's internal DNS resolves it):

```
postgres:5432   neo4j:7687   redis:6379   minio:9000
ollama:11434    opensearch:9200   keycloak:8080
backend:8000    frontend:3000     prometheus:9090   grafana:3001
```

---

## 2. PHASE 1 — Foundation (Week 1): each track becomes independently runnable

Goal by end of Phase 1: each person can run **their own slice** of the stack end-to-end using mocks for the other two tracks, on their own machine, without needing anyone else online.

### 🧠 Tino — AI / Multi-Agent Pipeline (GPU-dependent track)

| Task | Detail |
|---|---|
| Get Ollama running locally | `ollama pull llama3.1:8b`, `ollama pull llava:13b` (or `qwen2-vl` if faster on your GPU), `ollama pull nomic-embed-text`. Do these pulls **once**, early — they're large and this is the #1 thing that silently blocks a demo day. |
| Benchmark your GPU | Run a timed test transcription (Whisper) and a timed vision-caption call (LLaVA) on sample files. Record seconds-per-file — this number drives how many files you can realistically process live in a demo, so know it early, don't discover it on stage. |
| Stand up `faster-whisper` or `whisper.cpp` | Pick whichever runs faster on your specific GPU/VRAM — benchmark both if time allows, don't assume. |
| Build each of the 8 agents as an independent, testable function first | Don't build the LangGraph orchestration graph until each agent works standalone on a sample file with a hardcoded input. Test agent-by-agent before wiring the graph — this isolates bugs massively faster. |
| Wire the LangGraph orchestrator | Once all 8 agents work standalone, connect them in LangGraph with the parallel-dispatch structure from the architecture doc. |
| `GraphWriteService` | Build this against your **own local Neo4j instance** (not waiting for Barath) — Neo4j is stateless enough that you can run a throwaway local copy, test your Cypher writes work, and reconnect to the shared instance on integration day. |
| Stylometry + identity resolution scoring | This is pure Python (spaCy features + simple similarity scoring) — no GPU needed, can be developed even without Ollama running if you want a lighter dev loop. |
| Deliverable by end of Phase 1 | A CLI script: `python run_pipeline.py --file sample.jpg --case-id test123` that runs all 8 agents on one file and prints/writes the resulting leads + graph writes, entirely offline from Barath/Chinnaya's work. |

**What Tino needs from Barath by end of Phase 1:** nothing blocking — just the locked `CONTRACTS.md` task signatures from section 1.3.

### ⚙️ Barath — Backend, Infra, Data, Security

| Task | Detail |
|---|---|
| Fix Docker Compose per Phase 1 of the audit doc | Remove host bind mounts for `backend`/`frontend`; build them as proper images with `COPY . /app` in the Dockerfile. Use named volumes for Postgres/Neo4j/MinIO data (`volumes: pg_data:`, not `- ./data:/var/lib/postgresql/data`). |
| Alembic migrations | Generate and run migrations from the existing SQLAlchemy models so tables physically exist. Commit the migration files — this is how Tino and Chinnaya get a real schema to test against later. |
| Enforce append-only chain-of-custody at the DB role level | `REVOKE UPDATE, DELETE ON chain_of_custody_log FROM app_user;` — do this in a migration, not just in application code, per the architecture doc's Section 11.1 principle. |
| Keycloak realm setup | Import the ACPIA realm (roles: investigator/supervisor/admin), get JWT middleware validating real tokens instead of any temporary bypass. |
| Publish the OpenAPI stub contract (Section 1.2) | This is the highest-priority task in your whole track — Tino and Chinnaya are both waiting on the *shape*, not the real logic behind it. Do this on day 1–2, not last. |
| Ingestion endpoint | SHA-256 hash on upload, write to MinIO, write `EvidenceItem` + first `ChainOfCustodyLog` row, then publish the `analyze_evidence` Celery task (contract from Section 1.3) — stub the Celery consumer for now if Tino isn't ready yet, just prove the task gets published. |
| WebSocket progress endpoint | `/api/v1/cases/{id}/stream` — stub it broadcasting fake progress events first so Chinnaya can build the UI against it immediately. |
| Seed script | `scripts/seed.py` creates one admin + one investigator user, one demo case — everyone needs this to log in and test. |
| Deliverable by end of Phase 1 | `docker compose up` boots Postgres + Neo4j + MinIO + Redis + Keycloak + backend cleanly, with a working login, a working (stubbed) `/leads` endpoint returning the locked JSON shape, and a real ingestion endpoint that hashes + stores files. |

**What Barath needs from Tino/Chinnaya by end of Phase 1:** nothing blocking — just confirmation they're building against the published contract.

### 🎨 Chinnaya — Frontend, Dashboard, Reporting

| Task | Detail |
|---|---|
| Stand up Next.js against **mocked** API responses first | Use the locked JSON shapes from `CONTRACTS.md` — build a local mock server (e.g. `msw` — Mock Service Worker, or just a tiny JSON file served by `json-server`) so you never wait on Barath's real backend to build UI. |
| Login page | Wire to Keycloak once Barath's realm is importable — until then, mock the auth state so you can build every other screen. |
| Dashboard / analytics screen | Recharts visualizations against mock lead data (priority distribution, status breakdown) — this is pure frontend work, fully parallel. |
| Evidence upload UI | Drag-and-drop → hits `POST /cases/{id}/evidence` — build against Barath's real ingestion endpoint once it exists (should be ready early in his Phase 1), since this is the one piece worth integrating early rather than mocking, to catch multipart/CORS issues before demo week. |
| Human-in-the-loop review UI | The lead cards, risk score + confidence interval display, confirm/reject buttons — build entirely against the locked JSON shape and mock data. |
| Graph Explorer (Cytoscape.js) | Build against a **static sample graph JSON** you write by hand (a few nodes/edges matching the Neo4j schema in the architecture doc) — don't wait for real graph data to exist. |
| Live progress bar | Wire to the WebSocket contract (Section 1.3) — Barath's stub broadcaster is enough to build and test this fully. |
| Deliverable by end of Phase 1 | A fully click-through-able frontend running against mocks: login → dashboard → upload → (fake) live progress → lead review → graph explorer — nothing real yet, but every screen exists and works. |

**What Chinnaya needs from Barath by end of Phase 1:** the OpenAPI stub contract (should land day 1–2) and the ingestion endpoint (should land by end of week).

---

## 3. PHASE 2 — Integration (Week 2): swap mocks for real connections, one seam at a time

Goal by end of Phase 2: the three tracks are talking to each other for real, end-to-end, even if rough around the edges.

**Integration checkpoints — do these as small, scheduled syncs, not one giant merge day:**

| Checkpoint | Who | What |
|---|---|---|
| **Checkpoint A** (early Week 2) | Barath + Chinnaya | Swap Chinnaya's mocked API calls for Barath's real (still partially stubbed) backend. Fix CORS/auth/shape mismatches now, while the surface area is small. |
| **Checkpoint B** (mid Week 2) | Barath + Tino | Barath's ingestion endpoint publishes the real Celery task; Tino's pipeline actually consumes it and writes real leads to Postgres + real graph data to the shared Neo4j instance (not Tino's local throwaway copy anymore). |
| **Checkpoint C** (late Week 2) | All 3 | Full loop: upload evidence in the real UI → real Celery task → real LangGraph pipeline runs → real lead appears in Postgres → real WebSocket progress shows in the UI → investigator confirms the lead in the real review screen → real graph shows in Cytoscape. |

### Per-person Phase 2 focus

**Tino:**
- Replace the local throwaway Neo4j with writes to the shared instance; verify Cypher writes match the schema Barath migrated.
- Tune per-agent timeouts — Celery tasks need realistic time limits based on your Phase 1 GPU benchmarks, or long-running vision/audio jobs will get killed.
- Add retry/error handling per agent so one agent failing doesn't silently kill the whole case's pipeline — surface partial failures instead of nothing.

**Barath:**
- Remove the WebSocket/lead-endpoint stubs, wire to real data.
- Implement the `/report` endpoint (this was flagged as an open action item in the audit) — use **WeasyPrint** (HTML/CSS → PDF, easier to style nicely) or **ReportLab** (more control, more code) to generate the sourced case report PDF.
- Load-test the ingestion endpoint with a batch of files to catch Celery queue backpressure issues before demo day.
- Finalize RBAC — confirm supervisor/investigator/admin roles actually restrict what each can see/do, not just log in.

**Chinnaya:**
- Real-time progress bar against real WebSocket events (which will be bursty/uneven now, unlike the smooth mock) — handle that gracefully in the UI (spinners, partial states).
- Real graph data in Cytoscape — real data is messier than your hand-written sample, so this is where layout/performance tuning happens (large graphs need clustering/pagination, not naive full-render).
- Report download button → wired to Barath's new `/report` endpoint.
- Polish pass: loading states, error states, empty states — these get skipped in mock-driven dev and are the first thing that breaks demo credibility.

---

## 4. PHASE 3 — Hardening, Testing, and Launch (Week 3)

Goal: this is a genuinely working, demo-able, defensible end-to-end product — not just a happy-path click-through.

### 4.1 The five end-to-end flows from the audit doc — assign an owner to verify each, but test with all 3 present

| Flow | Primary owner for fixing bugs | 
|---|---|
| Ingestion flow (upload → MinIO → Postgres → Celery task) | Barath |
| Analysis flow (LangGraph → correct agent routing → Neo4j writes) | Tino |
| Intelligence flow (Case Synthesis agent → valid Lead with risk score) | Tino + Barath |
| Review flow (login → see lead → view graph → confirm) | Chinnaya |
| Reporting flow (generate + download sourced PDF) | Barath + Chinnaya |

Run each flow with **at least 3 different sample evidence files per modality** (image, audio, text/chat log) — not just the one sample file everyone got comfortable debugging against in Phase 1/2. Different file → different bugs, every time.

### 4.2 Observability pass (Barath, with input from Tino on what metrics matter)

- Wire up Prometheus + Grafana per the architecture doc's Section 8 — at minimum, get the ingest throughput panel and the agent error-rate panel live before demo day. A dashboard that shows *real* numbers (even small/boring ones from your own test runs) is far more convincing in a demo than a slide claiming performance numbers.
- Set up basic Alertmanager rules for hash-verification failure and pipeline stalls — even just logging to console for a hackathon demo is fine, the point is showing the architecture is real.

### 4.3 Security/chain-of-custody verification (Barath)

- Manually attempt to `UPDATE` a row in `chain_of_custody_log` as the app's DB user and confirm it's rejected — this is a two-minute test that proves your most important architectural claim actually holds.
- Confirm a rejected lead never appears as "confirmed" anywhere in the UI or DB.

### 4.4 Demo readiness (Chinnaya leads, all 3 contribute)

- Prepare **2–3 pre-loaded demo cases** with realistic (synthetic, not real casework — see note below) sample evidence, so the live demo doesn't depend on live GPU inference speed under pressure.
- Have a **fallback recorded walkthrough** of the full flow in case live Ollama inference is slow or the venue Wi-Fi/hardware has issues — this is standard practice for any GPU-dependent live demo, not a lack of confidence in the system.
- Rehearse the "what's real vs. what's a target metric" framing from the architecture doc's opening note — for a project in this domain, being precise about what's actually validated versus what's a design target is a strength in front of judges, not a weakness.

> **Important reminder carried over from the architecture document:** all sample/demo evidence used for testing and the live demo must be synthetic/fabricated test data your team creates, never real case material of any kind. This project's entire premise is safe, authorized handling of sensitive evidence — the demo data should reflect that same discipline.

### 4.5 Final merge to `main`

- Each person opens a final PR from their branch.
- Merge order that minimizes conflicts: **Barath's branch first** (it's the foundation everyone else's contract depends on) → **Tino's branch** (adds the pipeline logic on top) → **Chinnaya's branch** (frontend, least likely to conflict with backend/AI code).
- After each merge, `docker compose up` from a clean clone and re-run the 5 end-to-end flows — a merge isn't "done" until the full stack boots clean from scratch on a machine that isn't yours.

---

## 5. Quick-reference: who to bug when something's broken

| Symptom | Talk to |
|---|---|
| Docker won't boot / networking issues between containers | Barath |
| A lead never gets generated / agent silently fails | Tino |
| Model download stuck / GPU out of memory / inference too slow | Tino |
| Login broken / wrong role permissions | Barath |
| UI shows stale/wrong data despite backend looking right | Chinnaya (check the API contract shape hasn't drifted) |
| Graph explorer blank or frozen | Chinnaya (rendering) or Tino (if the underlying Neo4j data itself is wrong) |
| PDF report missing or malformed | Barath (endpoint) or Chinnaya (download wiring) |

---

## 6. Summary timeline

```
Day 0        : Fix Docker together, lock CONTRACTS.md together
Week 1        : Each person builds their track independently against mocks/stubs
Week 2 early : Checkpoint A — frontend ↔ backend real connection
Week 2 mid   : Checkpoint B — backend ↔ AI pipeline real connection
Week 2 late  : Checkpoint C — full loop working end-to-end
Week 3        : Hardening, multi-file testing, observability, security checks, demo prep
Week 3 end   : Final merge order (Barath → Tino → Chinnaya), clean-clone verification
```

*End of document.*
