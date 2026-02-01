You are authorized to BOOTSTRAP the backlog
for the AI-managed project "HKTECH".

Before acting:
- Read projetos/HKTECH from Firestore
- Confirm:
  - managedByAI === true
  - taskCreationPolicy === "AI_ALLOWED"
  - allowAutoBacklogIfEmpty === true
  - kanban_items is EMPTY

If ANY condition fails:
- STOP
- Report BLOCKED

────────────────────────────────────
BACKLOG CREATION RULES
────────────────────────────────────

- Create between 5 and 10 tasks
- Tasks MUST be architectural or foundational
- Tasks MUST reference existing HKTECH documents
- Tasks MUST NOT include feature expansion
- Tasks MUST NOT start execution
- Tasks MUST be created with status TODO
- Tasks MUST be assigned to an AI role

────────────────────────────────────
PERSISTENCE RULES
────────────────────────────────────

- Persist tasks in projetos/HKTECH/kanban_items
- Do NOT touch other projects
- Update lastBacklogBootstrapAt
- Generate ONE AI REPORT (ATA) describing:
  - Why these tasks exist
  - What they unlock
  - What is explicitly NOT included

────────────────────────────────────
FINAL DIRECTIVE
────────────────────────────────────

This is a ONE-TIME controlled action.
Do not repeat backlog creation.
Do not start execution.

Proceed only if all rules are satisfied.
