# HKTech — Architectural Action Plan (Deliverable 1)

> Scope: Immediate and future changes to mitigate risks, preserve MyAlien compatibility, enforce MyBot non‑autonomy, ensure LGPD alignment, and prepare for modular scaling without premature complexity.

## 1) Problem
The platform is expanding across multiple domains (education, marketplace, identity, AI). Risks include vendor lock‑in, LGPD exposure (CPF + learning data), perceived MyBot autonomy, and technical debt from rapid growth.

## 2) Proposed Solution (Concrete Changes)
### Immediate (0–4 weeks)
1. **Documented Domain Boundaries**
   - Define explicit domain boundaries: Identity (MyAlien), Intelligence (MyBot), Learning/Memory, Marketplace, Education, Admin/Metrics.
   - Publish as internal doc for devs and product.

2. **API Contract Baseline**
   - Freeze current v1 DTOs and endpoints in a contract document.
   - Add explicit separation for MyAlien vs MyBot endpoints.

3. **Data Isolation Rules**
   - Formalize per‑user access rules for Firestore collections and API checks.
   - Establish audit logging for sensitive operations (CPF, memory updates).

4. **MyBot Non‑Autonomy Guardrails**
   - Define response constraints (no autonomous actions, no emotional simulation).
   - Add a policy doc linked to MyBot outputs and UX copy.

5. **Memory Governance Draft**
   - Draft retention and deletion policies by memory layer (short/mid/long).
   - Provide a user‑visible policy summary (LGPD alignment).

### Short‑Term (1–3 months)
6. **Event Schema Registry**
   - Define allowed learning events, required fields, and redaction rules.
   - Add “reversibility” mechanics (rollback of learning events).

7. **Observability Baseline**
   - Define domain KPIs and audit logs; add trace IDs in API responses.
   - Implement minimal dashboards (errors, latency, learning event volume).

8. **Vendor Lock‑in Mitigation Design**
   - Create abstraction for storage and auth at the service layer.
   - Plan a thin adapter interface to decouple from Firebase/GCP.

### Mid‑Term (3–6 months)
9. **Modular Service Readiness**
   - Identify potential Cloud Run boundaries by domain.
   - Keep runtime in a modular monolith until scale requires split.

10. **Compliance Tooling**
   - Build user data export/delete flows for memory and learning events.
   - Add verification audit trail for LGPD requests.

## 3) Impact & Rationale
- **Risk reduction:** Formal governance and contracts prevent accidental violations.
- **Backward compatibility:** Protects MyAlien identity stability while MyBot evolves.
- **Scalability:** Enables modular growth without premature microservices.
- **Compliance:** Builds LGPD mechanisms into architecture, not as add‑ons.

## 4) Trade‑offs
- **Documentation overhead** vs faster iteration. Mitigated by scoped, living docs.
- **Short‑term slowdown** to define contracts. Offsets long‑term stability gains.
- **Partial abstraction** may not fully remove lock‑in but reduces risk.

## 5) Priority
- **Immediate:** Items 1–5
- **Short‑Term:** Items 6–8
- **Mid‑Term:** Items 9–10

## 6) Next Concrete Steps
1. Approve this action plan.
2. Proceed to Deliverable 2: Domain & API Stabilization.
3. Proceed to Deliverable 3: MyBot Memory Governance.
4. Proceed to Deliverables 4–7 in sequence.
