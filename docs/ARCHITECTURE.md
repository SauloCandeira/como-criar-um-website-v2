# HKTECH AI Platform – Official System Architecture

## Overview
This document describes the real, running architecture of the HKTECH AI Platform, mapping all microservices, boundaries, and FinOps controls. It is the permanent reference for all future changes and AI agents.

---

## Microservice Communication Model

```
Frontend (GitHub Pages)
        ↓
Firebase Functions (LLM Orchestrator)
        ↓
HKTECH AI Gateway (VPS Express API)
        ↓
OpenClaw Runtime + Agents
        ↓
Cloud SQL + Telemetry
```

- **Each layer is a microservice.**
- **Responsibilities must NOT be merged.**

---

## Roles & Responsibilities

### Frontend (GitHub Pages)
- Admin panel and user interface
- No business logic or secrets

### Firebase Functions (LLM Orchestrator)
- Handles all LLM calls
- Enforces FinOps cost guard, kill switch, and telemetry
- All configuration/secrets via Firebase Params & Secret Manager
- No .env or process.env usage
- Exposes only orchestrator endpoints

### HKTECH AI Gateway (VPS Express API)
- API gateway for platform
- Aggregates telemetry, exposes /api/metrics/llm
- Never triggers LLM calls directly
- May use .env for non-sensitive configs only
- Maintains legacy and PM2 compatibility

### OpenClaw Runtime + Agents
- Executes agent logic and skills
- Reads runtime code first, compares with repo
- Never overwrites production logic blindly

### Cloud SQL + Telemetry
- Stores all LLM cost, usage, and telemetry data
- Used for FinOps enforcement and reporting

---

## FinOps & Cost Control
- **All LLM costs and limits are enforced in Firebase Functions.**
- Daily cost guard, token telemetry, kill switch, and budget limits are mandatory.
- Gateway only aggregates and exposes metrics, never triggers LLM loops.

---

## Environment & Secrets Policy
- **Primary:** Firebase Params & Secret Manager (Functions v2)
- **Secondary (VPS only):** .env for non-sensitive configs
- No process.env secrets in source code
- No hardcoded API keys
- No .env committed to git

---

## Folder Organization (Gateway)
```
core/
 ├── api/
 ├── middleware/
 ├── services/
 ├── utils/
agents/
contexts/
skills/
memory/
reports/
crons/
config/
docs/
```
- Do not delete existing files.
- Only organize and document responsibilities.

---

## Context System Design
- Architectural documentation must exist in:
  - contexts/system/
  - contexts/architecture/
  - contexts/agents/
- `ARCHITECTURE.md` is the global system context and decision guide.

---

## Safety Constraints
- Never perform destructive refactors.
- Preserve all production entrypoints (ai-gateway.js).
- Maintain PM2 and legacy endpoint compatibility.
- Never break auth, rate limit, or kill switch.

---

## Final Directive
- **STABILITY > CLARITY > ORGANIZATION > SAFETY > SCALABILITY**
- Respect the VPS as the live system of truth.
- All changes must be incremental and non-destructive.
