# AGENTS-IMPROVEMENT-SPEC.md

Audit of agent-guidance quality for `www-travler7282-com`.
Date: 2026-04-24

---

## Audit Summary

### What Was Found

| Artifact | Status |
|---|---|
| `AGENTS.md` | ❌ Missing — created in this session |
| `.ona/skills/` | ❌ Not present |
| `.cursor/rules/` | ❌ Not present |
| `README.md` | ✅ Exists, reasonably detailed |
| `.devcontainer/devcontainer.json` | ⚠️ Exists but minimal |

No agent-specific guidance existed before this session. The `README.md` is the
only source of project context, but it is written for human readers, not agents.

---

## What's Good

1. **README.md is thorough for humans.** Architecture, branch mapping, workspace
   scripts, and app descriptions are all present. An agent can extract basic
   context from it.

2. **Monorepo structure is clean and consistent.** `apps/*` and `backends/*`
   follow predictable patterns. Workspace names match directory names.

3. **TypeScript version is pinned globally** via root `overrides`, preventing
   version drift across workspaces.

4. **CI/CD workflows are explicit.** Both `deploy_dev.yml` and `deploy_prod.yml`
   are self-contained and document the full deploy pipeline.

5. **Node version is enforced three ways** (`.nvmrc`, `.node-version`, `engines`),
   making it hard for an agent to use the wrong runtime.

---

## What's Missing

### 1. No `AGENTS.md` (fixed in this session)
Agents had no structured entry point. They would have to infer everything from
`README.md`, which omits conventions, constraints, and agent-specific warnings.

### 2. No devcontainer automations
`devcontainer.json` uses the 10 GB universal image with no `postCreateCommand`,
no `forwardPorts`, and no `customizations`. Agents starting a dev session have
no automated setup — they must manually run `npm install` and figure out which
port each app uses.

### 3. No per-app port documentation
The Vite default ports (5173, 5174, etc.) and Angular's default (4200) are not
documented anywhere. An agent running a dev server cannot tell the user the
correct preview URL without guessing.

### 4. No linting or formatting config on landing-page
`apps/landing-page` has no ESLint config (unlike `react-app`). An agent editing
landing-page code has no linting baseline to follow or verify against.

### 5. No test coverage on frontend apps
Only `angular-app` has a test script (`ng test`). The other three apps have no
tests. An agent cannot verify frontend changes beyond "it builds."

### 6. No `CODEOWNERS` or PR template
No `.github/CODEOWNERS` or `.github/pull_request_template.md`. Agents creating
PRs have no guidance on required reviewers or PR description format.

### 7. Backend versioning is manual and undocumented
Both backends are at `0.1.0` with no changelog or versioning policy. An agent
bumping a version has no guidance on when/how to do so, or whether semver is
expected.

### 8. `.gitignore` is Angular-centric
The root `.gitignore` was clearly generated for Angular. It is missing common
patterns for Python (`__pycache__/`, `*.pyc`, `.venv/`), general Node artifacts
(`*.log`), and editor files (`.vscode/`, `.DS_Store`).

### 9. No environment variable documentation
The workflows reference 9 GitHub Secrets. There is no `.env.example` or
documentation listing what each secret is for, making it impossible for an agent
(or new contributor) to set up a local or fork environment.

---

## What's Wrong

### 1. `deploy/` directory is not in `.gitignore`
The CI pipeline creates a `deploy/` directory at the repo root during build.
If an agent runs the build locally, `deploy/` will appear as untracked files.
It is not excluded by `.gitignore`.

### 2. `package-lock.json` is deleted in CI (`rm -f package-lock.json`)
Both workflows delete `package-lock.json` before `npm install`. This means
installs are not reproducible — any dependency with a loose version range can
silently upgrade between runs. An agent following the workflow locally will
produce a different lockfile than CI.

### 3. `devcontainer.json` uses the 10 GB universal image with no justification
The comment in `devcontainer.json` itself flags this as a problem ("For faster
startup, consider a smaller image"). For a Node 24 + Python 3.11 project, the
universal image is unnecessary. This slows every agent environment start.

### 4. `apps/landing-page` has no `vite.config.ts`
The other Vite apps all have `vite.config.ts`. The landing page relies on Vite
defaults. An agent adding a plugin or changing the base path has no config file
to edit and may create one inconsistently.

### 5. `README.md` workspace dev command for Angular is wrong
`README.md` says: `npm run start --workspace angular-app`
The correct npm workspaces syntax is: `npm run start --workspace=angular-app`
(with `=`). The `--workspace` flag without `=` is interpreted differently by
some npm versions and may silently fail.

---

## Improvement Spec

The following changes are prioritized by impact on agent reliability.

---

### P0 — Correctness fixes (do these first)

#### Fix `.gitignore`
Add the following to the root `.gitignore`:

```
# Build output (generated by CI and local builds)
/deploy/

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/

# Editor / OS
.vscode/
.idea/
.DS_Store
*.swp

# Logs
*.log
npm-debug.log*
```

#### Fix `README.md` Angular dev command
Change:
```
npm run start --workspace angular-app
```
To:
```
npm run start --workspace=angular-app
```
Apply the same `=` fix to all other `--workspace` examples in `README.md`.

---

### P1 — Agent reliability (high value, low effort)

#### Add `postCreateCommand` to `devcontainer.json`
```json
{
  "postCreateCommand": "npm install"
}
```
This ensures dependencies are installed automatically when an agent environment
starts, without requiring a manual step.

#### Add `forwardPorts` to `devcontainer.json`
```json
{
  "forwardPorts": [4200, 5173, 5174, 5175, 3000]
}
```
Documents and pre-opens the ports used by each app so agents can provide correct
preview URLs.

#### Switch `devcontainer.json` to a Node-specific image
Replace the 10 GB universal image with:
```json
{
  "image": "mcr.microsoft.com/devcontainers/javascript-node:24"
}
```
Add a feature for Python since `roboarm-fastapi-app` requires it:
```json
{
  "features": {
    "ghcr.io/devcontainers/features/python:1": { "version": "3.11" }
  }
}
```

#### Add `apps/landing-page/vite.config.ts`
Create a minimal config to give agents a consistent file to edit:
```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  // base: '/' — set to '/subpath/' if deploying under a subdirectory
})
```

---

### P2 — Agent guidance (medium value, medium effort)

#### Add `.env.example`
Create a root-level `.env.example` documenting every GitHub Secret used in CI:
```
# AWS
AWS_REGION=us-east-1
AWS_DEV_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME
AWS_PROD_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME
AWS_DEV_BUCKET_NAME=your-dev-bucket
AWS_PROD_BUCKET_NAME=your-prod-bucket
AWS_DEV_CLOUDFRONT_ID=DISTRIBUTION_ID
AWS_PROD_CLOUDFRONT_ID=DISTRIBUTION_ID

# Docker Hub
DOCKERHUB_USERNAME=travler7282
DOCKERHUB_TOKEN=your-token
```

#### Add `.github/pull_request_template.md`
```markdown
## Summary
<!-- What changed and why -->

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Infrastructure / CI
- [ ] Docs

## Testing
<!-- How was this verified? -->

## Checklist
- [ ] Tested locally against dev environment
- [ ] No secrets committed
- [ ] `npm run build:all` passes
```

#### Add ESLint config to `apps/landing-page`
Copy the pattern from `apps/react-app/eslint.config.js`, removing React-specific
plugins. This gives agents a linting baseline for landing-page edits.

---

### P3 — Long-term quality (lower urgency)

#### Restore `package-lock.json` to CI
Remove `rm -f package-lock.json` from both workflows. Commit a valid
`package-lock.json` to the repo root. Use `npm ci` instead of `npm install` in
CI for reproducible installs.

#### Add a versioning policy to `AGENTS.md`
Document when and how to bump backend versions (e.g., semver patch for bug
fixes, minor for new endpoints) so agents don't make arbitrary version changes.

#### Add frontend smoke tests
Add at minimum a build-verification test to `landing-page`, `react-app`, and
`vue-app` (e.g., Vitest with a single render test). This gives agents a
verification step beyond "it builds."

#### Add `CODEOWNERS`
```
# .github/CODEOWNERS
* @travler7282
```
Ensures PRs always request review from the owner, even when created by an agent.

---

## Priority Order

| Priority | Item | Effort |
|---|---|---|
| P0 | Fix `.gitignore` (add `deploy/`, Python, editor patterns) | 5 min |
| P0 | Fix `README.md` `--workspace` syntax | 2 min |
| P1 | `devcontainer.json`: add `postCreateCommand`, `forwardPorts` | 10 min |
| P1 | `devcontainer.json`: switch to Node image + Python feature | 15 min |
| P1 | Add `apps/landing-page/vite.config.ts` | 5 min |
| P2 | Add `.env.example` | 10 min |
| P2 | Add `.github/pull_request_template.md` | 10 min |
| P2 | Add ESLint to `apps/landing-page` | 20 min |
| P3 | Restore `package-lock.json` and use `npm ci` in CI | 30 min |
| P3 | Add versioning policy to `AGENTS.md` | 10 min |
| P3 | Add frontend smoke tests | 60 min |
| P3 | Add `CODEOWNERS` | 2 min |
