# HKTech — Domain & API Stabilization (Deliverable 2)

> Objective: Define stable contracts, versioning, and domain separation to protect MyAlien integrity and MyBot constraints while enabling evolution.

## 1) Problem
Current endpoints and DTOs risk drifting as the platform expands. Without explicit contracts and versioning, changes can break MyAlien compatibility or blur MyAlien/MyBot separation.

## 2) Proposed Solution
### 2.1 Domain Separation (API Surface)
- **Identity (MyAlien)**: endpoints strictly for identity metadata and immutable ownership.
- **Intelligence (MyBot)**: endpoints for learning, memory, and user‑scoped guidance.
- **Learning Events**: append‑only, auditable events with reversible deltas.
- **Marketplace**: listing, purchase, and fulfillment with clear product types.
- **Education**: course access, progress, and completion signals.
- **Admin/Metrics**: privileged endpoints with strict role gating.

### 2.2 Versioning Strategy
- **Path‑based versioning**: `/api/v1/...` for stable contracts.
- **Deprecation policy**: minimum 90 days overlap; new fields are additive only.
- **Breaking changes**: only in `/v2` with migration notes and test harness.

### 2.3 Contract Artifacts
- **DTO definitions** in a shared spec document (or OpenAPI).
- **Change log** per version.
- **Backward compatibility checklist** (mandatory for MyAlien/identity).

## 3) Suggested DTOs (Conceptual, Non‑Code)
### Identity (MyAlien)
- `MyAlienDTO`: `id`, `userId`, `cpfHash`, `createdAt`, `metadata` (immutable), `status`.
- Rules: no intelligence data, no learning metrics.

### Intelligence (MyBot)
- `MyBotDTO`: `id`, `userId`, `stage`, `stats`, `visualMeta`, `createdAt`, `updatedAt`.
- Rules: user‑scoped only; no cross‑user identifiers.

### Learning Event
- `LearningEventDTO`: `eventId`, `userId`, `eventType`, `payload`, `timestamp`, `reversible`, `deltaRef`.
- Rules: eventType must be from allowed registry; payload must be minimal.

### Marketplace
- `ProductDTO`: `id`, `type`, `title`, `price`, `status`, `metadata`.
- `ListingDTO`: `id`, `productId`, `sellerId`, `price`, `status`.

### Education
- `CourseDTO`: `id`, `title`, `level`, `kitDependency`.
- `CourseProgressDTO`: `userId`, `courseId`, `status`, `progress`.

## 4) Trade‑offs
- **Pros:** Stability, safer evolutions, clear ownership boundaries.
- **Cons:** Upfront documentation and governance work.

## 5) Priority
- **Immediate:** Domain separation and v1 contract baseline.
- **Short‑term:** OpenAPI spec and CI validation.

## 6) Next Concrete Steps
1. Draft OpenAPI or DTO spec file for `/api/v1`.
2. Enforce MyAlien/MyBot separation in routing and docs.
3. Define deprecation policy and change log structure.
4. Proceed to Deliverable 3: MyBot Memory Governance.
