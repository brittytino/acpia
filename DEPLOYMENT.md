# Deploying VERITAS/ACPIA to Azure App Service

Three independently deployable pieces (`backend`, `seal`, `police-console`)
plus a data tier (Postgres, Ollama) that App Service can't host itself.
Everything below deploys from GitHub — **no SSH required anywhere**.

## Decide which path you're on

| DevOps gives you | Use |
|---|---|
| 3 App Services, "Docker Container" stack | **Path A** (primary, recommended) — `.github/workflows/deploy.yml`, automatic on every push to `main` |
| Fewer App Services, or "Code" stack only | **Path B** for the two frontends — `.github/workflows/deploy-azure-zip.yml`, manually triggered. The **backend still needs Path A / a container** — see why below. |

**Why the backend can't do a plain zip deploy:** it shells out to
`tesseract-ocr`, `exiftool`, and `ffmpeg` (see `backend/Dockerfile`). A
code-only Azure App Service (Oryx zip deploy) installs your Python
packages but has no reliable way to `apt-get install` those binaries. If
you only get one App Service, put the **backend** on it as a container
and run the two frontends somewhere lighter (e.g. Azure Static Web Apps,
or Path B on a second free-tier App Service) — don't try to zip-deploy
the backend.

## 0. Provision the data tier once

From [shell.azure.com](https://shell.azure.com) (browser-based, no SSH):

```bash
# review the CONFIG block at the top of the script first
bash infra/azure-provision-data-tier.sh
```

This creates: a resource group, a Postgres Flexible Server with the
`vector` extension enabled (public access restricted to Azure services —
no VNet needed for this one), and Ollama as a Container Instance on a
private subnet with no public IP (it has no authentication of its own, so
it must never be internet-reachable). It prints the connection values you
need for step 2. Keep the printed Postgres password — it isn't retrievable
afterward.

Pull the three models into the running Ollama container once, from Cloud
Shell (`az container exec` reaches it without SSH or a public IP):

```bash
az container exec --resource-group acpia-prod-rg --name acpia-ollama --exec-command "ollama pull moondream"
az container exec --resource-group acpia-prod-rg --name acpia-ollama --exec-command "ollama pull qwen2.5:3b"
az container exec --resource-group acpia-prod-rg --name acpia-ollama --exec-command "ollama pull nomic-embed-text"
```

## 1. Create the App Services

In the Azure Portal (or `az webapp create`), create three Linux App
Services: `<name>-backend`, `<name>-seal`, `<name>-console`. For Path A,
set publish type to **Docker Container** on all three (you'll point them
at GHCR images below — no image exists yet, that's fine, the first deploy
creates it).

Download each one's **publish profile** (Overview → "Get publish
profile") — you'll paste these into GitHub as secrets, not use them for
SSH.

## 2. GitHub repo configuration

**Settings → Secrets and variables → Actions → Secrets:**

| Secret | Value |
|---|---|
| `AZURE_BACKEND_PUBLISH_PROFILE` | contents of the backend App Service's publish profile XML |
| `AZURE_SEAL_PUBLISH_PROFILE` | same, for seal |
| `AZURE_CONSOLE_PUBLISH_PROFILE` | same, for console |

**Settings → Secrets and variables → Actions → Variables:**

| Variable | Example value |
|---|---|
| `AZURE_BACKEND_APP_NAME` | `acpia-backend` |
| `AZURE_SEAL_APP_NAME` | `acpia-seal` |
| `AZURE_CONSOLE_APP_NAME` | `acpia-console` |
| `SEAL_NEXT_PUBLIC_API_URL` | `https://acpia-backend.azurewebsites.net` |
| `CONSOLE_NEXT_PUBLIC_API_URL` | `https://acpia-backend.azurewebsites.net` |
| `CONSOLE_NEXT_PUBLIC_WS_URL` | `wss://acpia-backend.azurewebsites.net` |
| `SHOW_DEMO_CREDENTIALS` | `false` (see note below) |

These are read at **build time** and baked into the Next.js bundle — that's
why they're workflow variables, not just App Service settings (Next.js
inlines `NEXT_PUBLIC_*` values into the client JS when the image is built,
not when the container starts).

**Settings → Environments:** create an environment named `production` if
you want a manual-approval gate before deploys run — the workflows already
reference `environment: production`; without configuring protection rules
there, it's currently a no-op and deploys proceed automatically.

## 3. App Service Application Settings

**Backend** (`AZURE_BACKEND_APP_NAME`) → Configuration → Application settings:

```
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<openssl rand -base64 48>
DATABASE_URL=<from step 0>
DATABASE_URL_SYNC=<from step 0>
DB_SSL_REQUIRE=true
DB_APP_PASSWORD=<openssl rand -base64 24>
OLLAMA_BASE_URL=http://<ollama-private-ip-from-step-0>:11434
SEED_DEMO_USERS=false
CORS_ORIGINS=["https://acpia-seal.azurewebsites.net","https://acpia-console.azurewebsites.net"]
SEAL_URL=https://acpia-seal.azurewebsites.net
CONSOLE_URL=https://acpia-console.azurewebsites.net
SMTP_ENABLED=false
WEBSITES_PORT=47802
```

Leave `DATABASE_URL_APP` **unset** — the app provisions that role itself
on first boot, using `DATABASE_URL` once with admin rights, then never
touches admin credentials again (see `database.py::_provision_app_role`).

The app will **refuse to start** if any of `SECRET_KEY`, `DB_APP_PASSWORD`,
`DATABASE_URL`, `CORS_ORIGINS`, `SEAL_URL`, or `CONSOLE_URL` are left at
their insecure/localhost defaults while `ENVIRONMENT=production` — that's
intentional (`config.py::get_settings`), so a misconfigured deploy fails
loudly in the log stream instead of silently serving broken CORS or a
guessable JWT secret.

You must also VNet-integrate this App Service into the data tier's VNet so
it can reach the private Ollama IP — the provisioning script prints the
exact command once you know this App Service's name.

**Seal** (`AZURE_SEAL_APP_NAME`) → Application settings:

```
WEBSITES_PORT=3000
```

(`NEXT_PUBLIC_API_URL` is already baked into the image at build time —
nothing else needed here for Path A.)

**Console** (`AZURE_CONSOLE_APP_NAME`) → Application settings:

```
WEBSITES_PORT=3000
```

## 4. Deploy

**Path A:** push to `main`. `deploy.yml` builds all three images, pushes
them to `ghcr.io/<your-username>/acpia-{backend,seal,console}`, and
deploys each to its App Service. Watch the Actions tab.

**Path B (frontends only, if needed):** Actions tab → "Deploy to Azure App
Service (zip / Oryx)" → Run workflow → pick `seal`, `console`, or `both`.
Before the first run, on each target App Service set Stack to Node 20,
`SCM_DO_BUILD_DURING_DEPLOYMENT=true`, and the `NEXT_PUBLIC_*` Application
Settings listed in the workflow file's header comment — Oryx builds
inside the App Service this time, so those need to be real App Settings
here, not just GitHub Actions variables.

## 5. Verify

- `https://<backend>.azurewebsites.net/health` → `{"status": "ok", ...}`
- Open the seal app, seal a test file, confirm the network tab shows only
  a hash/size payload (never the file body) — the thing the whole
  certification story rests on.
- Log into the console. If you left `SEED_DEMO_USERS=false` (correct for
  a real deployment) there are no accounts yet — run
  `python -m scripts.seed` once via `az webapp ssh`-free alternative:
  Kudu console (`https://<backend>.scm.azurewebsites.net`) → Debug
  Console, or temporarily set `SEED_DEMO_USERS=true`, restart, then set it
  back to `false` and restart again.
- Auditor role: confirm `GET /api/v1/cases/{id}/evidence` returns 403 for
  an auditor token — that's the "auditors never see content" guarantee.

## About `SHOW_DEMO_CREDENTIALS` / `SEED_DEMO_USERS`

If this deployment is a **judge-facing demo** rather than a real
production instance, it's reasonable to set both to `true` so evaluators
can log in without you handing out a password separately. If this
deployment will ever hold a real case, set both to `false` — that's
already the default in every template in this repo.
