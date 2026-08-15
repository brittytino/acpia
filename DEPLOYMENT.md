# Deploying ACPIA — Vercel + Render + Neon + OpenRouter (all free tier)

> Azure is no longer the deployment target. This guide replaces the old
> Azure App Service path. `infra/azure-provision-data-tier.sh` is left in
> the repo but unused — ignore it.

Three pieces, three platforms, one GitHub repo. Every platform watches the
repo directly and redeploys on every push to `main` — **no GitHub Actions,
no SSH, no server to manage.**

| Piece | Platform | Why |
|---|---|---|
| `backend` (FastAPI) | **Render** — free Docker web service | Needs tesseract/exiftool/ffmpeg system binaries (Docker) and a persistent WebSocket connection — Vercel's serverless functions can't do either |
| `seal` (Next.js) | **Vercel** | Native Next.js hosting, instant free tier |
| `police-console` (Next.js) | **Vercel** (second project, same repo) | Same |
| Postgres + pgvector | **Neon** | Serverless Postgres, free tier, pgvector built in, in GitHub Student Pack |
| Evidence files | **Cloudinary** | Render's free tier has no persistent disk — anything written to local disk vanishes on every restart/redeploy. Evidence uploaded to a case goes to Cloudinary instead. (The seal app never uploads file bodies — only a hash+size — so it's unaffected.) |
| AI — text + vision | **OpenRouter**, free models, 5-model fallback chain | Replaces Ollama. See `backend/app/agents/openrouter.py` |
| AI — embeddings | **Google Gemini** (`text-embedding-004`), free tier | OpenRouter has no embeddings endpoint |

Final URLs (adjust if you picked different subdomains):

- `https://seal.acpia.tinobritty.me` — the sealing app
- `https://console.acpia.tinobritty.me` — the police console
- `https://api.acpia.tinobritty.me` — the backend API

## 0. Create free accounts

All free, none require a credit card except where the platform itself asks
for identity verification (Render/Vercel sometimes do for abuse
prevention — a card is never charged on the free tier).

1. **Neon** — [neon.tech](https://neon.tech) (also reachable via the
   [GitHub Student Developer Pack](https://education.github.com/pack) for
   extra free storage)
2. **Render** — [render.com](https://render.com)
3. **Vercel** — [vercel.com](https://vercel.com)
4. **OpenRouter** — [openrouter.ai](https://openrouter.ai) → Settings → Keys
5. **Google AI Studio** (Gemini) — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
6. **Cloudinary** — [cloudinary.com](https://cloudinary.com)

Push the repo to GitHub if it isn't already there — Render and Vercel both
connect by picking the repo from your GitHub account.

## 1. Neon — Postgres + pgvector

1. Create a project. Note the connection string Neon shows you.
2. **Important:** Neon gives you two connection strings — a pooled one
   (`...-pooler.neon.tech`) and a direct one. **Use the direct one** for
   both `DATABASE_URL` and `DATABASE_URL_APP` below. asyncpg (this backend's
   driver) uses server-side prepared statements, which break under
   PgBouncer's transaction-mode pooling — the pooled endpoint will produce
   intermittent "prepared statement already exists" errors under any
   concurrency. The direct endpoint has no pooling limit low enough to
   matter at this app's scale.
3. In Neon's SQL editor, run once: `CREATE EXTENSION IF NOT EXISTS vector;`
   (the backend's own startup DDL creates tables, but extensions need
   superuser/owner rights the app's runtime role won't have).
4. You'll use this same Neon connection string twice in Render's env vars
   below — once as `DATABASE_URL` (the admin/owner role Neon gave you, used
   only for migrations/DDL) — `DATABASE_URL_APP` is a **separate**
   least-privilege role the backend provisions for itself on first boot
   (see `backend/app/database.py::_provision_app_role` and
   `config.py`'s comments) using `DATABASE_URL`'s admin rights once. Set
   `DATABASE_URL_APP` to the same host/database but with `DB_APP_ROLE`
   (`veritas_app`) as the username and `DB_APP_PASSWORD` (pick a strong
   random one — `openssl rand -base64 24`) as the password; the app creates
   that role/password combination itself on startup, it doesn't need to
   pre-exist in Neon.

## 2. Cloudinary — evidence file storage

1. Create an account → Dashboard shows an **API Environment variable**
   string: `cloudinary://<api_key>:<api_secret>@<cloud_name>`. Copy it
   whole — that's your `CLOUDINARY_URL`.
2. Nothing else to configure. Free tier: 25GB storage, 25GB bandwidth/month.

## 3. OpenRouter — text + vision AI

1. Settings → Keys → create a key. That's `OPENROUTER_API_KEY`.
2. **Before deploying, check <https://openrouter.ai/models?max_price=0>**
   for the current free model list — free-tier model availability changes
   over time, and the defaults baked into `backend/app/config.py`
   (`OPENROUTER_TEXT_MODELS`, `OPENROUTER_VISION_MODELS`) may be stale by
   the time you read this. If any default model has been retired, override
   it with a comma-separated list via the same-named env var in Render —
   no code change or redeploy needed, Render just restarts with the new
   value.
3. No payment method needed for `:free`-suffixed models. They're
   rate-limited (fewer requests/minute than paid tiers) — that's exactly
   why the backend tries 5 models in sequence rather than one: if the first
   is rate-limited or briefly down, it falls through to the next
   automatically.

## 4. Google AI Studio — Gemini embeddings

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create
   API key. That's `GEMINI_API_KEY`. Free tier is generous (1500
   requests/day) and needs no card.

## 5. Render — backend

**Easiest path — Blueprint:** the repo root has `render.yaml` already
configured for this. Render dashboard → New → Blueprint → pick this repo →
Render reads `render.yaml` and creates the `acpia-backend` service. It will
prompt you for every env var marked `sync: false` in that file — paste in:

| Env var | Value |
|---|---|
| `SECRET_KEY` | `openssl rand -base64 48` (or just mash your keyboard) |
| `DATABASE_URL` | `postgresql://neondb_owner:npg_kpPxWy9UDX3o@ep-solitary-glade-ayvwuq1w-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `DATABASE_URL_SYNC` | `postgresql://neondb_owner:npg_kpPxWy9UDX3o@ep-solitary-glade-ayvwuq1w-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `DATABASE_URL_APP` | `postgresql://neondb_owner:npg_kpPxWy9UDX3o@ep-solitary-glade-ayvwuq1w-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `DB_APP_PASSWORD` | `npg_kpPxWy9UDX3o` |
| `OPENROUTER_API_KEY` | `(Paste your OpenRouter sk-or... key here)` |
| `GEMINI_API_KEY` | `(Paste your Gemini AQ... key here)` |
| `CLOUDINARY_URL` | `cloudinary://537392247936717:OqKXTkTkiCDNSA05l8C5EtuVdQc@dekitmlm7` |

Everything else (`CORS_ORIGINS`, `SEAL_URL`, `CONSOLE_URL`, `DB_SSL_REQUIRE`,
etc.) is already set as a plain value in `render.yaml` — edit that file and
push if your subdomains differ from `*.acpia.tinobritty.me`.

**No Blueprint support on your Render plan?** Create the Web Service
manually: New → Web Service → pick the repo → Environment: **Docker** →
Dockerfile path `backend/Dockerfile` → Docker context `backend` → Plan:
**Free** → Health Check Path `/health` → then add every env var from the
table above (plus the plain-value ones from `render.yaml`) by hand in the
Environment tab.

Once created, Render builds and deploys automatically. **Every subsequent
push to `main` redeploys it automatically too** — that's Render's default
behavior for a GitHub-connected service, no extra config.

**Custom domain:** Render service → Settings → Custom Domains → add
`api.acpia.tinobritty.me`. Render shows you the exact CNAME target
(typically `<service-name>.onrender.com`) — add that at your DNS host (§7).

## 6. Vercel — seal and police-console (two projects, one repo)

Repeat this twice, once per app:

1. Vercel dashboard → Add New → Project → import this GitHub repo.
2. **Root Directory**: set to `seal` for the first project, `police-console`
   for the second. Vercel auto-detects Next.js — no other build settings
   needed.
3. Project → Settings → Environment Variables (apply to Production +
   Preview):
   - **seal project**: `NEXT_PUBLIC_API_URL` = `https://api.acpia.tinobritty.me`
   - **police-console project**: `NEXT_PUBLIC_API_URL` = `https://api.acpia.tinobritty.me`,
     `NEXT_PUBLIC_WS_URL` = `wss://api.acpia.tinobritty.me`
   - These are inlined into the client bundle at Vercel's build time — set
     them before the first deploy (or trigger a redeploy after adding
     them, since editing env vars alone doesn't rebuild an already-built
     app).
4. Deploy. Vercel redeploys automatically on every push to `main` from
   here on — its default GitHub integration behavior, nothing to configure.
5. **Custom domain:** Project → Settings → Domains → add
   `seal.acpia.tinobritty.me` (or `console.acpia.tinobritty.me` for the
   second project). Vercel shows the CNAME target (`cname.vercel-dns.com`)
   — add that at your DNS host (§7).

## 7. DNS — add these records at your host for `tinobritty.me`

| Host (subdomain) | Type | Value |
|---|---|---|
| `seal.acpia` | CNAME | `cname.vercel-dns.com` (confirm exact value in the Vercel project's Domains tab) |
| `console.acpia` | CNAME | `cname.vercel-dns.com` |
| `api.acpia` | CNAME | whatever Render's Custom Domains tab shows (typically `<service>.onrender.com`) |

Three independent records — no wildcard, no zone delegation needed. DNS
propagation is usually minutes, occasionally up to ~an hour.

## 8. Verify

- `curl https://api.acpia.tinobritty.me/health` → `{"status":"ok",...}`.
  **First request after any period of inactivity takes 30–60 seconds** —
  Render's free tier sleeps a service after ~15 minutes idle and wakes it
  on the next request. This is expected, not a bug; it only affects the
  first request after a gap.
- Open `https://seal.acpia.tinobritty.me`, complete a seal flow, confirm
  the browser network tab never sends the file body — only hash + size —
  to the backend.
- Open `https://console.acpia.tinobritty.me`, log in (see § demo accounts
  below), open a case, upload a real evidence file, and watch
  `artifact.processed` arrive over the WebSocket with a real AI-generated
  description — confirms OpenRouter is wired up end to end.
- Check the Cloudinary dashboard → Media Library → the uploaded file should
  be there. Restart the Render service (Manual Deploy → Restart) and
  confirm the evidence is still listed in the console afterward — proves
  the file survived a restart (the whole reason Cloudinary is in the
  stack).
- Log in as the `auditor` demo role and confirm
  `GET /api/v1/cases/{id}/evidence` returns 403 — the "auditors never see
  content" guarantee.

## About demo accounts (`SEED_DEMO_USERS`)

`render.yaml` sets this to `false`, matching every other template in this
repo — correct for anything holding real cases. If this deployment is a
judge-facing demo and you want investigators/auditor logins to just work
without you distributing a password separately, temporarily set
`SEED_DEMO_USERS=true` in Render's Environment tab, let it restart once,
then set it back to `false` and restart again. See
`backend/scripts/seed.py` for the accounts it creates.

## About SMTP

Off by default (`SMTP_ENABLED=false`) — the app runs fully without it,
email links (QR pairing, dispute notifications) just won't send. To enable:
a Gmail account → [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
→ create an app password → set `SMTP_ENABLED=true`, `SMTP_USER`,
`SMTP_PASSWORD` in Render.

## Local development

`docker compose up` still works for local dev — it now talks to the same
real free APIs production uses (OpenRouter/Gemini/Cloudinary) instead of a
local Ollama container, so:

1. Copy `.env.example` → `.env`, fill in `OPENROUTER_API_KEY`,
   `GEMINI_API_KEY`, `CLOUDINARY_URL` (same free keys from steps 2–4 above
   — nothing stops you from using the same keys for local dev and
   production, the free tiers are generous enough for hackathon-scale use).
2. `docker compose up` — Postgres runs locally in a container as before;
   the backend and both frontends build and run against it.
3. If you'd rather not run Postgres locally either, point `DATABASE_URL` /
   `DATABASE_URL_APP` at a Neon **dev branch** (Neon supports branching a
   database like git branches a repo) instead, and drop the `postgres`
   service from `docker-compose.yml`.
