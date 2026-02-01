# HKTech — AI Sprint 1 (MVP-Scoped)

## Scope & Assumptions
- Use HKTech orchestrator as source of truth.
- No code changes yet; deliverables are documentation + validation artifacts.
- Firestore collection `projetos` already exists.

## Sprint Goal
Establish MVP-safe architecture artifacts that enable immediate implementation without violating MyAlien/MyBot constraints or LGPD.

## Sprint Backlog (5–8 tasks)
1) Create v1 API contract spec (OpenAPI/DTO) aligned with domain separation.
2) Publish learning event registry + schema rules.
3) Draft redacted audit log schema for memory/admin actions.
4) Define metrics naming/tagging + redaction policy.
5) Draft user-facing memory policy summary (non-legal).
6) Review current MyAlien/MyBot route separation (audit only).

## Definition of Done (per task)
- Document exists in /docs or /prompts with clear scope and constraints.
- No new features introduced.
- Explicitly distinguishes design vs implementation.

## Risks & Dependencies
- Legal approval required before enforcing retention/deletion timelines.
- Current backend route layout must be reviewed before code enforcement.

## Deliverables
- Documentation artifacts only; no code changes.
