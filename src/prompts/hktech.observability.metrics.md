# HKTech — Observability & Metrics (Deliverable 6)

> Objective: Define domain‑level metrics, audit logs, and actionable monitoring for compliance, reliability, and learning traceability.

## 1) Problem
Without consistent telemetry, the platform cannot detect learning anomalies, security issues, or performance regressions across domains. LGPD demands auditability, but logging must avoid sensitive data exposure.

## 2) Proposed Solution
### 2.1 Domain‑Level Metrics
**Identity (MyAlien)**
- New MyAlien activations
- Activation failures
- CPF hash collisions (should be zero)

**Intelligence (MyBot)**
- MyBot stage distribution
- Learning events processed/day
- MyBot response latency
- Memory read/write counts

**Learning/Memory**
- Events accepted vs rejected
- Rollback operations
- Memory resets/exports/deletes

**Marketplace**
- Listings created
- Purchases completed
- Conversion rate by product type

**Education**
- Course starts/completions
- Drop‑off rate

**Admin/Metrics**
- Admin actions by type
- Moderation events

### 2.2 Audit Logs (Redacted)
- User‑scoped actions: memory writes, resets, exports, deletes.
- MyBot learning events: event id, type, timestamp, reversible flag.
- Admin actions: actor, target, timestamp, reason.
- **Redaction:** no raw CPF or learning payloads stored in logs.

### 2.3 Monitoring & Alerts
- Error rate spikes by domain
- Latency p95 by endpoint
- Event rejection rate anomalies
- Unauthorized access attempts

## 3) Trade‑offs
- **More telemetry** increases storage and processing costs.
- **Redaction** reduces debugging detail; compensate with correlation IDs.

## 4) Priority
- **Immediate:** define metric schema + redaction policy.
- **Short‑term:** dashboards and alerts for core domains.

## 5) Next Concrete Steps
1. Define metric naming conventions and tags.
2. Add correlation/trace IDs to all API responses.
3. Implement log scrubbing for CPF and memory payloads.
4. Proceed to Deliverable 7: Scalability Preparation.
