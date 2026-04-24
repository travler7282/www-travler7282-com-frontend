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
| Backend services | `backends/` | Node/Express (SDR) + Python/FastAPI (RoboArm) |
| Infrastructure | `infrastructure/` | AWS CloudFront configs + K8s manifests |
| CI/CD | `.github/workflows/` | GitHub Actions deploy to dev and prod |

---

## Monorepo Layout

```
apps/
  landing-page/   # Vite + TypeScript (no framework) — root of www.travler7282.com
  react-app/      # React 19 + Vite — RoboArm robotic arm controller
  vue-app/        # Vue 3 + Vite — WXStation weather monitor
  angular-app/    # Angular 19 + Angular Material — SDRx software-defined radio (WIP)

backends/
  sdr-express-app/        # Node 24 + Express + TypeScript — SDR control API
  roboarm-fastapi-app/    # Python 3.11+ + FastAPI — RoboArm BLE controller

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
- **Build tool**: Vite 8 (landing-page, react-app, vue-app); Angular CLI 19 (angular-app)

### Backends
- `sdr-express-app`: Node 24, Express 4, TypeScript, built with `tsc`
- `roboarm-fastapi-app`: Python ≥3.11, FastAPI, versioned via `pyproject.toml`

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

# Dev servers — individual workspaces
npm run dev --workspace landing-page
npm run dev --workspace react-app
npm run dev --workspace vue-app
npm run start --workspace angular-app   # Angular uses `start`, not `dev`

# SDR backend
npm run dev --workspace sdr-express-app
npm run build --workspace sdr-express-app
```

---

## CI/CD Pipeline

Both workflows (`deploy_dev.yml`, `deploy_prod.yml`) follow the same steps:

1. Resolve backend image versions from `package.json` (sdr-express-app) and
   `pyproject.toml` (roboarm-fastapi-app).
2. Build and push Docker images to Docker Hub with environment-tagged versions.
3. `npm install && npm run build:all` — builds all frontend apps.
4. Assemble a `deploy/` directory:
   - Landing page → `deploy/` (root)
   - React app → `deploy/react/`
   - Vue app → `deploy/vue/`
   - Angular app → `deploy/angular/`
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
| react-app | `/react/` | www.travler7282.com/react/ |
| vue-app | `/vue/` | www.travler7282.com/vue/ |
| angular-app | `/angular/` | www.travler7282.com/angular/ |

CloudFront functions handle subdirectory routing so S3 serves the correct
`index.html` for each SPA.

---

## Code Conventions

- **TypeScript**: strict mode expected; `~5.8.3` pinned across all packages.
- **No UI framework** on the landing page — plain TypeScript + Vite only.
- **React app**: React 19, functional components, hooks only.
- **Vue app**: Vue 3 Composition API.
- **Angular app**: Angular 19, Angular Material, standalone components preferred.
- **Backend (Express)**: `helmet` + `cors` + `morgan` middleware required on all routes.
- **Backend (FastAPI)**: Python ≥3.11, type hints required.
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

Agents must never commit directly to `main` or `dev`.

---

## Backend K8s Deployments

The K8s manifests in `backends/*/k8s/` and `infrastructure/k8s/` are applied
**manually** by the owner. Agents must not modify these files unless explicitly
asked, and must not assume any CI step deploys them.

---

## What Agents Should NOT Do

- Do not commit directly to `main`. Use a feature branch → `dev` → `main` flow.
- Do not hardcode or log any secret values (AWS ARNs, Docker credentials, etc.).
- Do not modify `.github/workflows/` without understanding the full deploy pipeline.
- Do not change the TypeScript version override in the root `package.json` without
  verifying compatibility across all four apps and both backends.
- Do not add a UI framework to `apps/landing-page` — it is intentionally framework-free.
- Do not delete or rename the `deploy/react/`, `deploy/vue/`, `deploy/angular/`
  subdirectory structure — CloudFront routing depends on it.
