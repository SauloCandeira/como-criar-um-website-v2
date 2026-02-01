# HKTech — Security & Isolation Review (Deliverable 5)

> Objective: Validate user data isolation, identify attack vectors, and propose mitigations aligned with LGPD and MyBot non‑autonomy.

## 1) Problem
The platform stores CPF‑linked identity data and learning signals. Any isolation failure risks LGPD violations, cross‑user leakage, and trust loss.

## 2) Proposed Solution
### 2.1 Isolation Validation Checklist
- **Auth enforcement:** all API calls must verify Firebase Auth tokens.
- **User scope:** every read/write is scoped to `userId` derived from token.
- **Admin access:** explicit role checks; no shared user collections.
- **MyAlien/MyBot separation:** identity data never mixed with learning memory.

### 2.2 Attack Vectors & Mitigations
- **Token replay / theft** → short token TTL, refresh flow, revoke on anomaly.
- **IDOR (insecure direct object reference)** → strict server‑side ownership checks.
- **Over‑permissive Firestore rules** → deny‑by‑default, explicit allowlist per doc path.
- **Sensitive logs exposure** → scrub CPF and memory payloads from logs.
- **Event spam** → rate limiting and schema validation on learning events.

### 2.3 Privacy Controls
- **CPF handling:** hash/tokenize at earliest boundary; never log raw CPF.
- **Memory access:** only the owner can access memory data; admin access is audited.
- **Export/delete:** enforce user requests with verification and traceable logs.

## 3) Trade‑offs
- **Stricter checks** add latency but prevent critical breaches.
- **Minimal logging** can reduce debugging detail; offset with structured, redacted logs.

## 4) Priority
- **Immediate:** enforce ownership checks and Firestore rule hardening.
- **Short‑term:** redacted logs and rate limiting.
- **Mid‑term:** anomaly detection and abuse monitoring.

## 5) Next Concrete Steps
1. Review Firestore security rules for deny‑by‑default.
2. Add centralized ownership guard middleware on APIs.
3. Implement log redaction policy for CPF/memory fields.
4. Proceed to Deliverable 6: Observability & Metrics.
