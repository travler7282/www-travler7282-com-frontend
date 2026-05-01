# AGENTS.md — Agent Instructions for www-travler7282-com

This file tells AI coding agents (Ona, Copilot, Cursor, etc.) how this repository
is structured and how to work within it correctly.

---

## Repository Overview

Personal portfolio monorepo for [www.travler7282.com](https://www.travler7282.com).
Owner: Michael Hunt (travler7282).

| Layer | Location | Description |
|---|---|---|
| Frontend apps | `apps/` | Four Vite/TypeScript SPAs |
| Backend services | `backends/` | Node/Express (SDRx) + Python/FastAPI (RoboArm, WXStation, DevOps Assistant) |
| Infrastructure | `infrastructure/` | AWS CloudFront configs + K8s manifests |
| CI/CD | `.github/workflows/` | GitHub Actions deploy to dev and prod |

---

## Monorepo Layout

```
apps/
  landing-page/   # Vite + TypeScript (no framework) — root of www.travler7282.com
  roboarm/        # React 19 + Vite — RoboArm robotic arm controller
  wxstation/      # Vue 3 + Vite — WXStation weather monitor
  sdrx/           # Angular 19 + Angular Material — SDRx software-defined radio (WIP)

backends/
  sdrx/       # Node 24 + Express + TypeScript — SDRx control API (port 8080)
  roboarm/    # Python 3.11+ + FastAPI — RoboArm BLE controller (port 8000)
  wxstation/  # Python 3.11+ + FastAPI — WXStation weather aggregator (port 8001, placeholder)
  devops-assistant/  # Python 3.11+ + FastAPI — DevOps Assistant API (K8s routed via /devops-assistant/api/v1)

infrastructure/
  aws/cloudfront/   # CloudFront distribution configs and routing function
  k8s/              # K3s manifests for backend microservices

.github/workflows/
  deploy_dev.yml    # Triggered on push to `dev` branch → dev.travler7282.com
  deploy_prod.yml   # Triggered on push to `main` branch → www.travler7282.com
```

---

## Branch and Environment Mapping

| Branch | Environment | Domain |
|---|---|---|
| `dev` | Development | dev.travler7282.com |
| `main` | Production | www.travler7282.com |

Feature branches are merged into `dev` first, then `dev` is merged into `main`
via pull request.

---

## Tech Stack

### Frontend
- **Runtime**: Node 24 (enforced via `.nvmrc`, `.node-version`, and `engines` in root `package.json`)
- **Package manager**: npm workspaces (root `package.json` covers `apps/*` and `backends/*`)
- **TypeScript**: `~5.8.3` pinned across all workspaces via root `overrides`
- **Build tool**: Vite 8 (landing-page, roboarm, wxstation); Angular CLI 19 (sdrx)

### Backends
- `backends/sdrx`: Node 24, Express 4, TypeScript, built with `tsc`, port 8080
- `backends/roboarm`: Python ≥3.11, FastAPI, BLE + camera, port 8000
- `backends/wxstation`: Python ≥3.11, FastAPI, weather aggregator, port 8001 (placeholder)
- `backends/devops-assistant`: Python ≥3.11, FastAPI, log ingestion + RAG query service, K8s ingress path prefix `/devops-assistant/api/v1`

### Infrastructure
- AWS S3 + CloudFront (static hosting + CDN)
- AWS Route53 (DNS), Let's Encrypt (TLS), Traefik (K8s ingress)
- Docker Hub (`travler7282/`) for backend container images

---

## Common Commands

Run from the **repository root** unless noted.

```bash
# Install all workspace dependencies
npm install

# Build every app and backend
npm run build:all

# Run all tests (workspaces that define a test script)
npm run test:all

# Run all workspace coverage scripts (where defined)
npm run test:all:coverage

# Create local Python virtual environment
python -m venv .venv

# Install Python backend dependencies into venv
.venv/Scripts/python.exe -m pip install -r backends/roboarm/requirements.txt -r backends/wxstation/requirements.txt -r backends/devops-assistant/requirements.txt

# Run Python backend unit tests from repo root
# DevOps Assistant tests require APP_CONFIG to point at its config file
APP_CONFIG=backends/devops-assistant/config.yaml .venv/Scripts/python.exe -m pytest backends/roboarm/tests backends/wxstation/tests backends/devops-assistant/tests

# Dev servers — frontend
npm run dev --workspace=landing-page
npm run dev --workspace=roboarm
npm run dev --workspace=wxstation
npm run start --workspace=sdrx        # Angular uses `start`, not `dev`

# Dev servers — backends
npm run dev:sdrx                      # SDRx Express backend (port 8080, workspace: sdrx-backend)
cd backends/roboarm && .venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000
cd backends/wxstation && .venv/Scripts/python.exe -m uvicorn main:app --reload --port 8001
cd backends/devops-assistant && .venv/Scripts/python.exe -m uvicorn main:app --reload --port 8002   # use 8002 locally to avoid roboarm port collision
```

---

## CI/CD Pipeline

Both workflows (`deploy_dev.yml`, `deploy_prod.yml`) follow the same steps:

1. Resolve backend image versions from `backends/sdrx/package.json` and
  `pyproject.toml` files for `roboarm`, `wxstation`, and `devops-assistant`.
2. Build and push Docker images to Docker Hub with environment-tagged versions.
3. `npm ci --include=optional && npm run build:all` — builds all frontend apps.
4. Assemble a `deploy/` directory:
   - Landing page → `deploy/` (root)
   - RoboArm → `deploy/roboarm/`
   - WXStation → `deploy/wxstation/`
   - SDRx → `deploy/sdrx/`
5. Sync `deploy/` to the appropriate S3 bucket.
6. Invalidate the CloudFront distribution cache.

**Required GitHub Secrets** (do not hardcode or log these):
`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `AWS_DEV_ROLE_ARN`, `AWS_PROD_ROLE_ARN`,
`AWS_REGION`, `AWS_DEV_BUCKET_NAME`, `AWS_PROD_BUCKET_NAME`,
`AWS_DEV_CLOUDFRONT_ID`, `AWS_PROD_CLOUDFRONT_ID`

---

## Deployment Path for Each App

| App | Deploy path | URL |
|---|---|---|
| landing-page | `/` | www.travler7282.com |
| roboarm | `/roboarm/` | www.travler7282.com/roboarm/ |
| wxstation | `/wxstation/` | www.travler7282.com/wxstation/ |
| sdrx | `/sdrx/` | www.travler7282.com/sdrx/ |

CloudFront functions handle subdirectory routing so S3 serves the correct
`index.html` for each SPA.

---

## Code Conventions

- **TypeScript**: strict mode expected; `~5.8.3` pinned across all packages.
- **No UI framework** on the landing page — plain TypeScript + Vite only.
- **roboarm** (React): React 19, functional components, hooks only.
- **wxstation** (Vue): Vue 3 Composition API.
- **sdrx** (Angular): Angular 19, Angular Material, standalone components preferred.
- **backends/sdrx** (Express): `helmet` + `cors` + `morgan` middleware required on all routes.
- **backends/roboarm** and **backends/wxstation** (FastAPI): Python ≥3.11, type hints required.
- Do not add new top-level dependencies without updating the relevant `package.json`
  or `pyproject.toml` and confirming Node/Python version compatibility.

---

## .gitignore Notes

The root `.gitignore` covers Angular-specific artifacts and `node_modules`.
`dist/` is excluded globally. Do not commit build output or `node_modules`.

---

## Git and PR Workflow

Agents follow the same flow as human contributors:

1. **Create a GitHub issue** describing the work (label: `ai-generated`).
2. **Create a feature branch** from `main` named after the issue
   (e.g., `42-fix-gitignore-deploy-dir`).
3. **Commit changes** to that branch.
4. **Open a PR** targeting `dev` (label: `ai-generated`).
5. The owner reviews, merges to `dev` → CI deploys to dev.travler7282.com.
6. The owner opens a PR from `dev` → `main` when satisfied → CI deploys to prod.

**Label:** `ai-generated` already exists in the repo. Apply it to PRs via
`github_update_pull_request` after creation. Issues cannot be labeled via the
integration token (403) — apply the label manually on the issue in GitHub.

**Issue description format (required):**
The first sentence of every issue description MUST use this user-story format:

`As a <role>, I want to <capability>, so that <benefit>.`

After that first sentence, include supporting sections such as scope,
acceptance criteria, implementation notes, and references.

Agents must never commit directly to `main` or `dev`.

---

## Backend K8s Deployments

The K8s manifests in `backends/*/k8s/` and `infrastructure/k8s/` are applied
**manually** by the owner. Agents must not modify these files unless explicitly
asked, and must not assume any CI step deploys them.

### Live Ops Guardrails

When troubleshooting deployments, agents MUST separate local repository edits
from live runtime changes and report both explicitly.

1. **Label scope clearly in every status update**
  - Local changes: file edits in this repository.
  - Remote changes: live cluster patches/applies via SSH + `kubectl`.
  - Always state whether local changes are committed.

2. **Use this rollout triage order (do not skip steps)**
  - `kubectl rollout status <resource>`
  - `kubectl get pods -o wide`
  - `kubectl describe pod <failing-pod>`
  - `kubectl logs --previous <failing-pod>`
  - `kubectl get deployment <name> -o yaml` to confirm effective probe paths

3. **DevOps Assistant path alignment rule (required)**
  - Ingress routes traffic under `/devops-assistant/api/v1`.
  - FastAPI routes and OpenAPI/docs are expected under the same prefix.
  - Readiness/liveness probes must target valid prefixed routes for the active image.

4. **Secret handling policy (hard requirement)**
  - Never print, echo, or commit secret values.
  - Allowed alternatives: rotate temporary test keys, run behavior-based auth checks,
    and provide user-run retrieval commands without posting values into chat.

### Multi-Agent Instruction Strategy

Use `AGENTS.md` as the single source of truth for shared repository guidance.

1. **Default approach**
  - Keep all shared rules in `AGENTS.md`.
  - Avoid duplicating the same policy text across tool-specific files.

2. **When to add tool-specific adapter files**
  - Add an adapter only when a tool cannot reliably consume `AGENTS.md`.
  - Keep adapter files thin and reference `AGENTS.md` as canonical guidance.

3. **Recommended adapter set (only if needed)**
  - `copilot-instructions.md`: brief pointer to `AGENTS.md` plus Copilot-only notes.
  - `.cursor/rules/*.mdc`: short compatibility rules that mirror `AGENTS.md` intent.
  - `.claude/` instruction files: minimal wrappers, no policy forks.

4. **Change control rule**
  - Update `AGENTS.md` first.
  - Then update any adapters in the same commit to prevent instruction drift.

### Backend Versioning Policy

Backend service versions MUST follow semantic versioning and be updated in the
service manifest file before release builds.

1. **Where to bump versions**
  - `backends/sdrx/package.json`
  - `backends/roboarm/pyproject.toml`
  - `backends/wxstation/pyproject.toml`
  - `backends/devops-assistant/pyproject.toml`

2. **When to bump**
  - Patch (`x.y.Z`): bug fixes, probe/path fixes, docs-only API behavior stability.
  - Minor (`x.Y.z`): new endpoints, backward-compatible features, non-breaking config additions.
  - Major (`X.y.z`): breaking API contract changes, removed endpoints, incompatible payload changes.

3. **Release tagging expectations**
  - Dev workflow appends `-dev` tags from the resolved service version.
  - Prod workflow publishes the plain resolved service version.
  - Do not merge release-impacting backend changes without an intentional version bump.

---

## What Agents Should NOT Do

- Do not commit directly to `main`. Use a feature branch → `dev` → `main` flow.
- Do not hardcode or log any secret values (AWS ARNs, Docker credentials, etc.).
- Do not modify `.github/workflows/` without understanding the full deploy pipeline.
- Do not change the TypeScript version override in the root `package.json` without
  verifying compatibility across all four apps and both backends.
- Do not add a UI framework to `apps/landing-page` — it is intentionally framework-free.
- Do not delete or rename the `deploy/roboarm/`, `deploy/wxstation/`, `deploy/sdrx/`
  subdirectory structure — CloudFront routing depends on it.
