# HKTECH AI Platform – System Context (AI)

## Purpose
This file provides the AI agent context for the real, running architecture of the HKTECH AI Platform. It must always reflect the current production system.

---

## Microservice Flow
- **Frontend (GitHub Pages):** UI only, no secrets
- **Firebase Functions:** LLM orchestration, FinOps, telemetry, all config via params/secrets
- **VPS Gateway:** API aggregation, metrics, legacy/PM2 compatibility, no LLM execution
- **OpenClaw Runtime:** Agent execution, runtime code is source of truth
- **Cloud SQL:** Telemetry and cost data

---

## Boundaries
- No merging of microservice responsibilities
- No hardcoded secrets or .env in Functions
- All LLM cost and safety logic in Firebase Functions
- Gateway only exposes metrics, never triggers LLM

---

## FinOps Safeguards
- Daily cost guard
- Token telemetry
- Kill switch
- Budget limit per day (USD)
- All enforced in Functions, not Gateway

---

## Documentation
- See /docs/ARCHITECTURE.md for the official architecture
- This file is for AI agent context and must be updated with any production change
