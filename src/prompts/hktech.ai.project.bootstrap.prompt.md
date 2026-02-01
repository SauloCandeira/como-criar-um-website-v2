You are acting as a senior software architect and AI project systems engineer.

This project already has:
- Firestore database named "projetos"
- SQL Cloud database in production
- Admin panel implemented
- Multiple projects already working
- Existing Kanban boards per project

Your task is to EXTEND the CURRENT SYSTEM
without breaking or refactoring existing projects.

DO NOT assume a greenfield project.

────────────────────────────────────
OBJECTIVE
────────────────────────────────────

Create a SPECIAL INTERNAL PROJECT named "HKTECH"
inside the existing "projetos" database.

This project:
- Is NOT a user project
- Is NOT visible to regular users
- Is visible ONLY in the Admin panel
- Is controlled and updated by AI agents
- Acts as the central coordination hub for AI-driven development

────────────────────────────────────
DATA STORAGE STRATEGY
────────────────────────────────────

Use Firestore as the primary store for:
- AI project state
- Kanban board
- AI task updates
- AI reports (ATA-style)

Do NOT duplicate transactional data from SQL Cloud.
Reference existing project/user IDs where needed.

────────────────────────────────────
PROJECT STRUCTURE (FIRESTORE)
────────────────────────────────────

Create (or ensure) the following structure:

Collection: projetos
Document ID: HKTECH

projetos/HKTECH
{
  type: "AI_MANAGED_PROJECT",
  visibility: "ADMIN_ONLY",
  status: "ACTIVE",
  createdBy: "SYSTEM",
  managedByAI: true,
  currentSprint: "SPRINT_01",
  lastConsensusAt: Timestamp,
  riskLevel: "LOW"
}

Subcollection: kanban

projetos/HKTECH/kanban/{columnId}
{
  name: "TODO | IN_PROGRESS | REVIEW | BLOCKED | DONE",
  order: number
}

Subcollection: kanban_items

projetos/HKTECH/kanban_items/{itemId}
{
  title: string,
  description: string,
  status: "TODO | IN_PROGRESS | REVIEW | BLOCKED | DONE",
  assignedAgent: "copilot | chatgpt | gemini | antigravity",
  relatedDocs: [string],
  createdAt: Timestamp,
  updatedAt: Timestamp
}

Subcollection: ai_reports

projetos/HKTECH/ai_reports/{reportId}
{
  agent: "copilot | chatgpt | gemini | antigravity",
  reportType: "SPRINT_REPORT | TASK_REPORT | RISK_REPORT | CONSENSUS_ATA",
  summary: string,
  decisions: [string],
  risks: [string],
  nextActions: [string],
  createdAt: Timestamp,
  shared: true
}

────────────────────────────────────
KANBAN RULES
────────────────────────────────────

- Every AI action MUST update a Kanban item
- Status transitions must be explicit
- Blocked items must include reason
- DONE items must reference an AI report (ATA)

────────────────────────────────────
AI REPORT (ATA) RULES
────────────────────────────────────

Every AI agent MUST generate a FINAL REPORT after:
- Completing a task
- Finishing a sprint
- Identifying a blocking risk

This report:
- Must be written in clear technical language
- Must be persisted in projetos/HKTECH/ai_reports
- Must be readable by all other AI agents
- Acts as an official project record (meeting minutes / ATA)

────────────────────────────────────
ADMIN PANEL INTEGRATION
────────────────────────────────────

Extend the existing Admin panel to:
- Display the HKTECH project
- Show its Kanban board
- Show AI reports (read-only)
- Highlight risks and blocked items

Do NOT change the UI for regular projects.

────────────────────────────────────
IMPLEMENTATION CONSTRAINTS
────────────────────────────────────

- Reuse existing project and kanban models where possible
- Add feature flags or project type checks if needed
- Avoid schema breaking changes
- Prefer additive changes only
- Follow existing coding conventions

────────────────────────────────────
DELIVERABLES
────────────────────────────────────

1. Firestore structure creation logic (migration or bootstrap)
2. Backend logic to identify HKTECH as admin-only project
3. Kanban update helpers for AI usage
4. AI report (ATA) persistence logic
5. Admin panel visibility rules

Explain assumptions clearly before writing code.
Generate code incrementally.
You are acting as a senior software architect and AI project systems engineer.

This project already has:
- Firestore database named "projetos"
- SQL Cloud database in production
- Admin panel implemented
- Multiple projects already working
- Existing Kanban boards per project

Your task is to EXTEND the CURRENT SYSTEM
without breaking or refactoring existing projects.

DO NOT assume a greenfield project.

────────────────────────────────────
OBJECTIVE
────────────────────────────────────

Create a SPECIAL INTERNAL PROJECT named "HKTECH"
inside the existing "projetos" database.

This project:
- Is NOT a user project
- Is NOT visible to regular users
- Is visible ONLY in the Admin panel
- Is controlled and updated by AI agents
- Acts as the central coordination hub for AI-driven development

────────────────────────────────────
DATA STORAGE STRATEGY
────────────────────────────────────

Use Firestore as the primary store for:
- AI project state
- Kanban board
- AI task updates
- AI reports (ATA-style)

Do NOT duplicate transactional data from SQL Cloud.
Reference existing project/user IDs where needed.

────────────────────────────────────
PROJECT STRUCTURE (FIRESTORE)
────────────────────────────────────

Create (or ensure) the following structure:

Collection: projetos
Document ID: HKTECH

projetos/HKTECH
{
  type: "AI_MANAGED_PROJECT",
  visibility: "ADMIN_ONLY",
  status: "ACTIVE",
  createdBy: "SYSTEM",
  managedByAI: true,
  currentSprint: "SPRINT_01",
  lastConsensusAt: Timestamp,
  riskLevel: "LOW"
}

Subcollection: kanban

projetos/HKTECH/kanban/{columnId}
{
  name: "TODO | IN_PROGRESS | REVIEW | BLOCKED | DONE",
  order: number
}

Subcollection: kanban_items

projetos/HKTECH/kanban_items/{itemId}
{
  title: string,
  description: string,
  status: "TODO | IN_PROGRESS | REVIEW | BLOCKED | DONE",
  assignedAgent: "copilot | chatgpt | gemini | antigravity",
  relatedDocs: [string],
  createdAt: Timestamp,
  updatedAt: Timestamp
}

Subcollection: ai_reports

projetos/HKTECH/ai_reports/{reportId}
{
  agent: "copilot | chatgpt | gemini | antigravity",
  reportType: "SPRINT_REPORT | TASK_REPORT | RISK_REPORT | CONSENSUS_ATA",
  summary: string,
  decisions: [string],
  risks: [string],
  nextActions: [string],
  createdAt: Timestamp,
  shared: true
}

────────────────────────────────────
KANBAN RULES
────────────────────────────────────

- Every AI action MUST update a Kanban item
- Status transitions must be explicit
- Blocked items must include reason
- DONE items must reference an AI report (ATA)

────────────────────────────────────
AI REPORT (ATA) RULES
────────────────────────────────────

Every AI agent MUST generate a FINAL REPORT after:
- Completing a task
- Finishing a sprint
- Identifying a blocking risk

This report:
- Must be written in clear technical language
- Must be persisted in projetos/HKTECH/ai_reports
- Must be readable by all other AI agents
- Acts as an official project record (meeting minutes / ATA)

────────────────────────────────────
ADMIN PANEL INTEGRATION
────────────────────────────────────

Extend the existing Admin panel to:
- Display the HKTECH project
- Show its Kanban board
- Show AI reports (read-only)
- Highlight risks and blocked items

Do NOT change the UI for regular projects.

────────────────────────────────────
IMPLEMENTATION CONSTRAINTS
────────────────────────────────────

- Reuse existing project and kanban models where possible
- Add feature flags or project type checks if needed
- Avoid schema breaking changes
- Prefer additive changes only
- Follow existing coding conventions

────────────────────────────────────
DELIVERABLES
────────────────────────────────────

1. Firestore structure creation logic (migration or bootstrap)
2. Backend logic to identify HKTECH as admin-only project
3. Kanban update helpers for AI usage
4. AI report (ATA) persistence logic
5. Admin panel visibility rules

Explain assumptions clearly before writing code.
Generate code incrementally.
