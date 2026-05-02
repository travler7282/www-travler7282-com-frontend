# AGENTS.md - Agent Instructions for www-travler7282-com

This file tells coding agents how to work in this repository.

## Repository Overview

Personal portfolio website repository for https://www.travler7282.com.
Owner: Michael Hunt (travler7282).

This repository is now scoped to:

- Landing page frontend in `frontend/`
- Deployment/infrastructure assets in `infrastructure/`

Feature apps and backend services are maintained in separate repositories.

## Layout

```
frontend/                               # Vite + TypeScript landing page
  src/
  public/

infrastructure/
  aws/cloudfront/scripts/               # CloudFront router logic
  k8s/                                  # Shared manifests (manual apply only)

.github/workflows/
  deploy_dev.yml                        # Trigger: push to dev
  deploy_prod.yml                       # Trigger: push to main
```

## Branch and Environment Mapping

| Branch | Environment | Domain |
|---|---|---|
| `dev` | Development | dev.travler7282.com |
| `main` | Production | www.travler7282.com |

Feature branches should merge to `dev` first, then `dev` to `main`.

## Tech Stack

- Runtime: Node 24 (see `.nvmrc` and `.node-version`)
- Frontend: Vite 8 + TypeScript 5.8
- Hosting: AWS S3 + CloudFront
- DNS: AWS Route53

## Common Commands

Run from repository root unless stated otherwise.

```bash
# Install dependencies
cd frontend
npm ci

# Development
npm run dev

# Quality checks
npm run lint
npm run test
npm run test:coverage

# Production build
npm run build
```

## CI/CD Pipeline

Both workflows (`deploy_dev.yml`, `deploy_prod.yml`) do the following:

1. Install frontend dependencies.
2. Run lint, tests, and build in `frontend/`.
3. Sync `frontend/dist` to the environment S3 bucket.
4. Invalidate CloudFront cache.

Required GitHub Secrets:

- `AWS_REGION`
- `AWS_DEV_ROLE_ARN`
- `AWS_DEV_BUCKET_NAME`
- `AWS_DEV_CLOUDFRONT_ID`
- `AWS_PROD_ROLE_ARN`
- `AWS_PROD_BUCKET_NAME`
- `AWS_PROD_CLOUDFRONT_ID`

## Code Conventions

- Keep the landing page framework-free (no React/Vue/Angular additions).
- Use strict TypeScript patterns where applicable.
- Keep changes focused; avoid broad refactors unless requested.
- Do not commit generated artifacts such as `dist/`, coverage output, or `node_modules/`.

## Infrastructure Guardrails

- `infrastructure/k8s/` manifests are manually applied by the owner.
- Do not modify infra manifests or cloud routing scripts unless explicitly requested.
- Never print, commit, or log secret values.

## Git and PR Workflow

1. Create a GitHub issue for the work (label: `ai-generated`).
2. Create a feature branch from `main`.
3. Commit changes to that feature branch.
4. Open PR to `dev` (label: `ai-generated`).
5. Owner validates in dev and later promotes `dev` -> `main`.

Issue description format is required:

`As a <role>, I want to <capability>, so that <benefit>.`

## Multi-Agent Instruction Strategy

`AGENTS.md` is the canonical policy file.

- Keep shared policy here.
- Keep adapter files thin (`.github/copilot-instructions.md`, `.claude/CLAUDE.md`, `.cursor/rules/agents.mdc`).
- Update adapters in the same commit when this file changes.

## What Agents Should Not Do

- Do not commit directly to `main` or `dev`.
- Do not add references to in-repo `apps/*` or `backends/*`; those no longer exist here.
- Do not hardcode secrets, tokens, role ARNs, or account IDs.
- Do not change CI deployment targets or branch mapping without explicit request.
