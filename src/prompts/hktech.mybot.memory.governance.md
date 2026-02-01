# HKTech — MyBot Memory Governance (Deliverable 3)

> Objective: Define retention, reset, export, and delete policies per memory layer with LGPD alignment, ensuring user control and auditability.

## 1) Problem
MyBot memory spans sensitive learning and behavioral data tied to CPF‑anchored identity. Without explicit governance, the platform risks LGPD non‑compliance, user trust erosion, and uncontrolled data growth.

## 2) Proposed Solution
### 2.1 Memory Layers & Retention
**Short‑Term (Session)**
- **Retention:** max 24 hours.
- **Storage:** ephemeral session store; no CPF stored.
- **Purpose:** immediate conversational context.

**Mid‑Term (Preferences & Patterns)**
- **Retention:** 6–12 months, rolling.
- **Storage:** Firestore under user scope.
- **Purpose:** recurring preferences, recent behaviors.

**Long‑Term (Skills & Profile)**
- **Retention:** indefinite while account active; re‑evaluate every 12 months.
- **Storage:** Firestore user‑scoped.
- **Purpose:** skill evolution, learning style, technical profile.

### 2.2 Reset, Export & Delete
- **Reset (Soft):** clears short‑term and mid‑term memory; long‑term remains.
- **Reset (Hard):** clears all memory layers; requires explicit confirmation.
- **Export:** user can export all memory layers in a structured JSON report.
- **Delete (Account):** removes all memory and learning events after retention grace period defined by legal requirements.

### 2.3 LGPD Alignment
- **Lawful basis:** consent + legitimate interest; user controls override.
- **Data minimization:** only store fields necessary for learning objectives.
- **Transparency:** explain memory use in UI and policy docs.
- **Auditability:** log memory writes and deletes with timestamps and operator.

## 3) Trade‑offs
- **Short retention** can reduce personalization, but improves privacy.
- **Hard reset** requires UX friction to prevent accidental loss.
- **Exports** add operational cost but increase compliance and trust.

## 4) Priority
- **Immediate:** publish policy and implement reset mechanisms.
- **Short‑term:** export endpoint and audit logs.
- **Mid‑term:** automated retention enforcement and legal review.

## 5) Next Concrete Steps
1. Define Firestore collections per memory layer with TTL where possible.
2. Add reset/export/delete flows to API and UI.
3. Implement audit logging for memory operations.
4. Proceed to Deliverable 4: Event‑Driven Learning Model.
