# ACPIA — 3-Hour Hackathon Final Crunch Plan
## Code Red: End-to-End Product in < 3 Hours (3 Developers, Parallel Tracks)

**Team:**
- **Tino** — AI / Multi-Agent Pipeline (GPU Laptop)
- **Barath** — Backend, Infrastructure, Data, Security
- **Chinnaya** — Frontend, UI, Dashboard, Demo Experience

**The Strategy:**
You have less than 3 hours. The codebase is already heavily scaffolded by your AI agents, but the pieces are not connected. You are all on the same Wi-Fi. 
**Barath's laptop will act as the Main Server (Databases + API).**
**Tino's laptop will act as the AI Inference Server.**
**Chinnaya will run the Frontend and connect to Barath's API.**

---

## HOUR 1: Unblocking & Infrastructure (0:00 - 1:00)

### ⚙️ Barath (The Main Server)
1. **Find your IP Address:** Get your local Wi-Fi IP (e.g., `192.168.1.15`). Post it in the team chat. **Tino and Chinnaya will use this IP.**
2. **Fix the Docker Blocker:** The Docker daemon is rejecting bind mounts. 
   - Open `docker-compose.yml`.
   - **Remove ALL host bind-mounts** (`- ./...:/...`) for Postgres, Keycloak, etc. Replace them with named Docker volumes or just remove the volumes entirely if you don't mind data loss on container restart.
   - Run `docker compose up -d postgres neo4j minio redis opensearch keycloak`.
3. **Database Migrations:** 
   - Install backend dependencies (`pip install -r requirements.txt`).
   - Run Alembic migrations: `alembic upgrade head`.
   - Run the seed script: `python scripts/seed.py` to create the admin/investigator users.
4. **Start the API:** Run the FastAPI backend natively on your laptop (`uvicorn app.main:app --host 0.0.0.0 --port 8000`).

### 🧠 Tino (The AI Server)
1. **Pull the AI Models Immediately:** Open your terminal and run:
   - `ollama pull llama3.1:8b`
   - `ollama pull llava:13b`
   - `ollama pull nomic-embed-text`
   *(This takes time. Start it NOW while you do step 2).*
2. **Configure Environment:** Create your `.env` file for the Celery workers. 
   - Point `POSTGRES_HOST`, `NEO4J_URI`, `REDIS_URL`, and `MINIO_ENDPOINT` to **Barath's IP address** (e.g., `192.168.1.15`).
   - Set `OLLAMA_BASE_URL=http://localhost:11434` (since Ollama runs on your machine).
3. **Start Celery Workers:** Once Barath says his databases are up, start the Celery workers on your machine: `celery -A app.workers.celery_app worker --loglevel=info`.

### 🎨 Chinnaya (The Client)
1. **Setup Frontend:** Go to the `frontend` directory. Run `npm install`.
2. **Configure Environment:** Create a `.env.local` file.
   - Set `NEXT_PUBLIC_API_URL=http://<BARATH_IP>:8000`.
   - Set `NEXT_PUBLIC_KEYCLOAK_URL=http://<BARATH_IP>:8080`.
3. **Start UI & Fix CORS:** Run `npm run dev`. Try to log in using `admin` / `Admin@acpia1`.
   - *If you get CORS errors*, tell Barath immediately so he can add your IP to the FastAPI CORS origins list.

---

## HOUR 2: Core Feature Completion (1:00 - 2:00)

### ⚙️ Barath (Backend)
1. **Implement PDF Report Endpoint:** The frontend report page needs a backend API. Write a simple endpoint at `GET /api/v1/cases/{id}/report`. Use a lightweight library (like `fpdf2` or `xhtml2pdf`) to generate a basic PDF showing the case summary and confirmed leads. 
2. **Test File Ingestion:** Send a mock image file to your own ingestion endpoint. Check MinIO (at `localhost:9001`) to see if the file uploaded, and check Postgres to ensure the `EvidenceItem` and `ChainOfCustodyLog` were created.
3. **Monitor Celery:** Ensure that when you upload a file, the `analyze_evidence` task is successfully pushed to Redis (which Tino's machine will pick up).

### 🧠 Tino (AI Agents)
1. **Unit Test Agents:** Your models should be downloaded by now. Manually trigger one of the agent python scripts (e.g., `python agents/agents/multimedia_analyst.py`) with a sample hardcoded image path. Verify that LLaVA returns a valid JSON response.
2. **Monitor the Pipeline:** Watch your Celery worker logs. When Barath uploads a file, your worker should pick it up and run the LangGraph pipeline.
3. **Debug AI Errors:** If the LLM returns malformed JSON or times out, tweak the prompt or temperature in the agent files. This is your primary focus: making sure the AI pipeline doesn't crash on real data.

### 🎨 Chinnaya (Frontend UI)
1. **UI Polish:** 
   - Check the Graph Explorer (`/cases/{id}/graph`). Does Cytoscape render correctly? Add some dummy nodes to test it if Barath's DB is empty.
   - Check the Evidence drag-and-drop. Is the progress bar working?
2. **Prep Demo Data:** Find 3-5 real, legal, non-sensitive sample files to use for the demo (e.g., a sample image with EXIF data, a dummy chat log text file). Do NOT use real sensitive data. Put them in a folder ready for the live demo.

---

## HOUR 3: End-to-End Testing & Demo Prep (2:00 - 3:00)

**This hour requires all 3 of you communicating constantly.**

1. **The Golden Path Test (2:00 - 2:20):**
   - Chinnaya logs into the frontend (hitting Barath's server).
   - Chinnaya creates a new Case.
   - Chinnaya uploads a sample image from her demo folder.
   - Barath verifies the API receives it, hashes it, saves to MinIO, and dispatches to Celery.
   - Tino verifies his Celery worker picks up the task, queries Ollama on his GPU, extracts entities, and writes to Neo4j.
   - Chinnaya refreshes the Dashboard and verifies the Lead appears and the Knowledge Graph populates.
   - Chinnaya clicks "Download Report" and verifies Barath's PDF endpoint works.

2. **Squash Showstopper Bugs (2:20 - 2:40):**
   - Whatever broke in the Golden Path test, fix it immediately. 
   - If an AI agent is failing, bypass it or hardcode a fallback response so the demo doesn't crash.
   - If CORS is blocking the PDF download, fix the headers.

3. **Record the Fallback Demo (2:40 - 3:00):**
   - **CRITICAL:** Live AI demos fail. The Wi-Fi will drop, or the GPU will OOM (Out of Memory). 
   - Chinnaya shares her screen. Run through the Golden Path flawlessly and **record it as a video (MP4)**. 
   - During the actual presentation, do it live, but if *anything* hangs for more than 10 seconds, smoothly switch to playing the recorded video. The judges won't penalize you for having a backup plan.

---

## Quick Reference / Troubleshooting

| Issue | Who Fixes It | How to Fix |
|---|---|---|
| Frontend says "Network Error" or "CORS" | Barath | Update FastAPI `CORSMiddleware` to allow `*` or Chinnaya's IP. |
| Keycloak Login Fails | Barath | Ensure the Realm was imported correctly and `acpia_token` is being set. |
| AI Pipeline crashes with "JSON Decode Error" | Tino | The LLM hallucinated text outside the JSON block. Add strict JSON formatting instructions to the prompt, or use regex to extract `{...}`. |
| File Upload Hangs at 99% | Barath & Chinnaya | Chinnaya checks Network tab for 500 error. Barath checks FastAPI logs for MinIO connection issues. |
| Cytoscape Graph is blank | Chinnaya & Tino | Tino verifies Neo4j actually has data. Chinnaya checks if the API returned an empty array `[]`. |
