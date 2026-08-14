# ACPIA — Agentic Child Protection Investigation Assistant
### SRCAS Hackathon 2024

> AI-assisted digital evidence intelligence for authorized law enforcement.

---

## 🏗️ Architecture: Who Runs What

```
┌─────────────────────────────────────────────────────────────┐
│  TINO's Laptop (192.168.11.209) — THE SERVER                │
│  RTX 3050 6GB GPU                                           │
│                                                             │
│  Docker containers (ALL databases + AI):                    │
│  • PostgreSQL      :54327                                   │
│  • Neo4j           :7688  (browser :7575)                   │
│  • Redis           :63799                                   │
│  • MinIO           :9200  (console :9201)                   │
│  • Keycloak        :8180                                    │
│  • Ollama (GPU)    :11535                                   │
│                                                             │
│  Tino also runs: Celery AI workers + AI pipeline            │
├─────────────────────────────────────────────────────────────┤
│  BARATH's Laptop — Backend Developer                        │
│  Runs ONLY: FastAPI backend on port 8765                    │
│  Points to Tino's databases via .env                        │
├─────────────────────────────────────────────────────────────┤
│  CHINNAYA's Laptop — Frontend Developer                     │
│  Runs ONLY: Next.js frontend on port 3737                   │
│  Points to Tino's backend API via .env.local                │
└─────────────────────────────────────────────────────────────┘
```

**NO ONE except Tino needs Docker.**

---

## ⚡ Quick Start by Role

### 🖥️ TINO (You — AI Pipeline & Infrastructure)

```bash
# 1. Start all Docker services (databases + Keycloak + Ollama)
cd "/mnt/Data/SRCAS HACKATHON/acpia"
bash start_acpia.sh

# 2. Start Celery AI workers
cd backend
source .venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2 -Q ingest,analysis,default

# 3. Pull AI models (in a separate terminal — takes 10-20 min)
docker exec acpia-ollama ollama pull llama3.1:8b
docker exec acpia-ollama ollama pull llava:7b
docker exec acpia-ollama ollama pull nomic-embed-text
```

---

### ⚙️ BARATH (Backend Developer)

#### First time setup:
```bash
# Clone and enter the backend branch
git clone https://github.com/brittytino/acpia.git
cd acpia
git checkout backend

# Create Python virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Linux/Mac
# .venv\Scripts\activate     # Windows

# Install all dependencies
pip install fastapi "uvicorn[standard]" sqlalchemy asyncpg psycopg2-binary \
  python-multipart "python-jose[cryptography]" "passlib[bcrypt]" \
  pydantic-settings structlog celery redis minio neo4j \
  langchain langgraph httpx python-dotenv fpdf2 websockets aiofiles python-magic

# Create your .env from template (NEVER commit .env)
cp .env.example .env
# No changes needed — it already points to Tino's machine!

# Start the backend
uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload
```

#### Every day:
```bash
cd acpia/backend
git pull origin backend
git merge dev  # get latest shared code from dev
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload
```

#### Your tasks (backend branch):
- [ ] Implement `GET /api/v1/cases/{id}/report` endpoint (PDF generation with fpdf2)
- [ ] Make sure all API routes in `app/api/v1/` are working with real DB data
- [ ] Implement Keycloak realm setup (create acpia realm, clients, roles via admin API)
- [ ] Add CORS — confirm Chinnaya can reach your API from her browser
- [ ] When done: `git push origin backend` then open PR to `dev`

---

### 🎨 CHINNAYA (Frontend Developer)

#### First time setup:
```bash
# Clone and enter the frontend branch
git clone https://github.com/brittytino/acpia.git
cd acpia
git checkout frontend

# Install dependencies
cd frontend
npm install

# Create your .env.local from template (NEVER commit .env.local)
cp .env.example .env.local
# No changes needed — it already points to Tino's machine!

# Start the frontend
npm run dev -- -p 3737
```

#### Every day:
```bash
cd acpia/frontend
git pull origin frontend
git merge dev  # get latest shared code from dev
npm run dev -- -p 3737
```

#### Your URL: `http://localhost:3737`

#### Your tasks (frontend branch):
- [ ] Fix any login page issues — connect to Keycloak at `http://192.168.11.209:8180`
- [ ] Cases list page — make sure it loads real data from `http://192.168.11.209:8765/api/v1/cases`
- [ ] Evidence upload page — test the file drop works end-to-end
- [ ] Leads review page — confirm/reject buttons call the real API
- [ ] Graph explorer page — Cytoscape renders real Neo4j data
- [ ] When done: `git push origin frontend` then open PR to `dev`

---

## 🌐 Service URLs (all hosted on Tino's machine)

| Service | URL | Credentials |
|---|---|---|
| **API (FastAPI)** | http://192.168.11.209:8765 | — |
| **API Docs** | http://192.168.11.209:8765/docs | — |
| **Frontend** | http://192.168.11.209:3737 | — |
| **Keycloak** | http://192.168.11.209:8180 | admin / acpia_keycloak_admin |
| **MinIO Console** | http://192.168.11.209:9201 | acpiaMinio / acpiaMinioSec2024! |
| **Neo4j Browser** | http://192.168.11.209:7575 | neo4j / acpiaGraph!2024 |
| **Grafana** | http://192.168.11.209:3838 | admin / acpia_grafana |

---

## 🔀 Git Branch Strategy

```
main          ← final production (DO NOT push directly)
  └─ dev      ← integration branch (Tino manages, PRs merge here)
       ├─ backend   ← Barath's branch (FastAPI, DB, PDF report)
       └─ frontend  ← Chinnaya's branch (Next.js, UI, graph)
```

**Rules:**
1. Each person works on THEIR branch only.
2. Never force-push. Never push to `main` directly.
3. When you complete a feature → `git push origin <your-branch>`
4. Tell Tino → he reviews and merges your branch to `dev`

---

## 🧪 Test the connection

**Barath & Chinnaya — run this to verify you can reach Tino's server:**
```bash
curl http://192.168.11.209:8765/health
# Expected: {"status":"ok","service":"acpia-backend","port":8765}
```

If this doesn't work, tell Tino — his firewall may be blocking the port.

---

## 🔥 Demo Credentials (for testing)

```
Username: admin           Password: Admin@acpia1
Username: investigator1   Password: Inv@acpia1
```

---

## 📦 Port Reference Card (hackathon-unique, avoids WiFi conflicts)

| Service | Port | Purpose |
|---|---|---|
| FastAPI Backend | **8765** | All REST API calls |
| Next.js Frontend | **3737** | Web interface |
| PostgreSQL | **54327** | Primary database |
| Neo4j Bolt | **7688** | Graph DB protocol |
| Neo4j Browser | **7575** | Graph web UI |
| Redis | **63799** | Cache & Celery broker |
| MinIO API | **9200** | File storage |
| MinIO Console | **9201** | Storage web UI |
| Keycloak | **8180** | Authentication |
| Ollama AI | **11535** | LLM inference |
| Grafana | **3838** | Metrics dashboards |
| Prometheus | **9191** | Metrics collection |
