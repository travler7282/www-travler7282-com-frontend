# AGENTS-IMPROVEMENT-SPEC.md

Audit of agent-guidance quality for `www-travler7282-com`.
Date: 2026-04-24
Last updated: 2026-04-26

---

## Audit Summary

### What Was Found

| Artifact | Status |
|---|---|
| `AGENTS.md` | ✅ Present |
| `.ona/skills/` | ❌ Not present |
| `.cursor/rules/` | ❌ Not present |
| `README.md` | ✅ Exists, reasonably detailed |
| `.devcontainer/devcontainer.json` | ✅ Exists with Node 24 image, Python feature, post-create install, and forwarded ports |

Agent-specific guidance now exists and should be treated as the canonical source
for repository conventions (`AGENTS.md` first, then `README.md` for user-facing context).

---

## Completed Since Initial Audit

1. Added `AGENTS.md` with repository structure, workflow, and constraints.
2. Hardened `.devcontainer/devcontainer.json` (Node 24 image + Python feature,
   `postCreateCommand`, and explicit port forwarding).
3. Fixed workspace command examples to use `--workspace=<name>` syntax.
4. Expanded `.gitignore` to include `/deploy/`, Python artifacts, editor files,
   and logs.
5. Added `apps/landing-page/vite.config.ts` for configuration consistency.
6. Added explicit live-ops runbook guardrails to `AGENTS.md`.
7. Completed P0: switched CI to reproducible `npm ci` installs and removed
   lockfile deletion from workflows.
8. Completed P0: added explicit local port mapping to `README.md` and resolved
   local `roboarm`/`devops-assistant` port conflict by assigning `8002` to
   `devops-assistant` local runs.
9. Completed P1: added `apps/landing-page/eslint.config.js`.
10. Completed P1: added frontend smoke tests for `landing-page`, `roboarm`, and
    `wxstation` and wired test scripts.
11. Completed P1: added thin adapter instruction files for Copilot, Claude,
    and Cursor that reference `AGENTS.md`.
12. Completed P2: `.env.example`, `.github/pull_request_template.md`, and
   `.github/CODEOWNERS` are present and aligned with current workflow.
13. Completed P3: added backend semantic versioning policy to `AGENTS.md`.

---

## Multi-Agent File Recommendation

Use `AGENTS.md` as the canonical instruction source for this repository.

Do **not** create full duplicate instruction files per tool by default.
Create thin adapter files only when a specific tool needs a native format/path.

Recommended pattern:
1. Maintain policy and workflow rules in `AGENTS.md`.
2. If needed, add minimal adapters (Copilot/Cursor/Claude) that point back to `AGENTS.md`.
3. Update canonical + adapters in the same commit to avoid drift.

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

## Remaining Gaps

### 1. Adapter files are not yet validated in real multi-agent runs
Thin adapters are now in place, but should be validated with active Cursor,
Claude, and Copilot sessions to confirm they are loaded as expected.

### 2. No frontend exists for `devops-assistant` backend
The backend API exists, but there is no dedicated frontend workspace to provide
an interactive UI for log ingestion, query prompts, and response display.

---

## What's Wrong

No open correctness issues remain from the original P0-P3 scope.

---

## Improvement Spec

The following changes are prioritized by impact on agent reliability.

---

### P0 — Correctness fixes

P0 items are complete.

---

### P1 — Agent reliability (high value, low effort)

P1 items are complete.

---

### P2 — Agent guidance (medium value, medium effort)

P2 items are complete.

---

### P2.5 - Operational guardrails (added 2026-04-26)

Implemented in `AGENTS.md` (local-vs-remote scope labeling, rollout triage
order, devops-assistant path/probe alignment, and secret-handling examples).

---

### P3 — Long-term quality (lower urgency)

P3 items are complete.

---

### P0 — Product expansion (new work)

#### Create a frontend app for `devops-assistant`
Add a new workspace under `apps/devops-assistant` (Vite + TypeScript) with:
1. API base URL configuration for dev/prod environments
2. Auth header input for `APP_API_KEY` testing
3. UI flows for submit logs, ask questions, and clear logs
4. Basic smoke tests and build integration in workspace scripts

---

## Priority Order

| Priority | Item | Effort |
|---|---|---|
| P0 | Create frontend app for `devops-assistant` backend | 3-5 hours |
| P2 | Validate adapter loading in Cursor/Claude/Copilot sessions | 15 min |
