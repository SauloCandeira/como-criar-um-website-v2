# HKTech — Scalability Preparation (Deliverable 7)

> Objective: Propose domain‑based service boundaries for Cloud Run while avoiding premature microservices.

## 1) Problem
The platform is expanding across multiple domains. A monolith is efficient now but may limit scaling and isolation later. Premature microservices would add operational complexity.

## 2) Proposed Solution
### 2.1 Modular Monolith First
- Keep a single runtime but organize code by domain modules.
- Enforce explicit interfaces between domains.
- Use shared infrastructure adapters (auth, storage, logging) to reduce coupling.

### 2.2 Cloud Run Service Boundaries (Future)
**Candidate splits (when needed):**
1. Identity Service (MyAlien)
2. Intelligence Service (MyBot + Memory)
3. Learning Events Service
4. Marketplace Service
5. Education Service
6. Admin/Analytics Service

### 2.3 Migration Principles
- Extract one domain at a time.
- Preserve `/api/v1` contracts.
- Share auth and observability libraries across services.

## 3) Trade‑offs
- **Monolith now** = simpler ops, faster iteration.
- **Domain services later** = improved scale and isolation but higher ops overhead.

## 4) Priority
- **Immediate:** modular code boundaries within current runtime.
- **Mid‑term:** pilot a single extracted service if scale demands.

## 5) Next Concrete Steps
1. Define module boundaries and owner teams.
2. Add service‑ready interfaces in shared packages.
3. Identify which domain shows the highest scaling pressure.
