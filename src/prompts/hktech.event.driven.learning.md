# HKTech — Event‑Driven Learning Model (Deliverable 4)

> Objective: Define allowed learning events, prevent over‑collection, and ensure traceability and reversibility across MyBot learning.

## 1) Problem
Learning signals are powerful but sensitive. Without a strict event model, the system risks excessive data collection, unclear provenance, and non‑reversible learning updates.

## 2) Proposed Solution
### 2.1 Allowed Learning Events (Registry)
**Core events (minimal set):**
- `content.accessed`
- `course.started`
- `course.completed`
- `project.created`
- `project.purchased`
- `marketplace.viewed`
- `marketplace.purchased`
- `tool.used`
- `user.feedback`

**Event rules:**
- Events must be user‑scoped.
- Payloads are minimal, no raw content or personal identifiers beyond `userId`.
- Each event includes `timestamp`, `source`, and `reversible` flag.

### 2.2 Data Minimization & Redaction
- Store only identifiers and aggregated metrics, never full content.
- Redact free‑text unless explicitly needed and consented.
- Avoid storing CPF in event payloads.

### 2.3 Traceability & Reversibility
- Every event produces a deterministic delta on MyBot stats.
- Store `deltaRef` for rollback.
- Allow admin and user‑initiated reversal within policy bounds.

### 2.4 Validation Rules
- Events must pass schema validation (required fields, allowed types).
- Reject out‑of‑range values (e.g., negative XP).
- Enforce rate limits to avoid abuse or noise.

## 3) Trade‑offs
- **Strict event set** limits experimentation but ensures compliance.
- **Minimal payloads** reduce personalization depth but protect privacy.

## 4) Priority
- **Immediate:** define registry and validation rules.
- **Short‑term:** implement event schema checks and rollback tool.

## 5) Next Concrete Steps
1. Publish the event registry as a shared spec.
2. Add schema validation at API boundaries.
3. Implement `deltaRef` tracking for reversals.
4. Proceed to Deliverable 5: Security & Isolation Review.
