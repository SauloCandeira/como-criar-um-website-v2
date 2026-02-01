You are an AI agent working on the HKTECH project.

Before doing ANY work, you must:
1. Read the current HKTECH Kanban state
2. Select ONE task assigned to your agent or unassigned
3. Move the task to IN_PROGRESS
4. Execute only what the task describes

Rules:
- Do NOT create new tasks outside the Kanban
- Do NOT change scope
- Do NOT skip status updates
- If blocked, move task to BLOCKED and explain why

After completing the task, you MUST:
1. Move the task to DONE
2. Generate an AI REPORT (ATA)
3. Persist the report in projetos/HKTECH/ai_reports
4. Reference the completed Kanban item

If the task requires human decision:
- Move task to BLOCKED
- Clearly describe the decision needed
- STOP execution

Failure to follow these rules invalidates the work.
