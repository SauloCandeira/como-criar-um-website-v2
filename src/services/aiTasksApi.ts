const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import type { AiTask } from "./aiTaskTypes";

export async function listAiTasks(adminId: string): Promise<AiTask[]> {
  const res = await fetch(`${API_BASE}/ia/tasks?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar tarefas de IA");
  return res.json();
}

export async function createIaTask(adminId: string, payload: Partial<AiTask> & { title: string }): Promise<AiTask> {
  const mapped = {
    ...payload,
    linked_agent_id: payload.linkedAgentId,
    context_reference: payload.contextReference,
    execution_logs: payload.executionLogs,
    specialist_type: payload.specialistType,
  } as any;
  const res = await fetch(`${API_BASE}/ia/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...mapped }),
  });
  if (!res.ok) throw new Error("Falha ao criar tarefa de IA");
  return res.json();
}

export async function updateIaTask(adminId: string, id: string, payload: Partial<AiTask> & { title: string }): Promise<AiTask> {
  const mapped = {
    ...payload,
    linked_agent_id: payload.linkedAgentId,
    context_reference: payload.contextReference,
    execution_logs: payload.executionLogs,
    specialist_type: payload.specialistType,
  } as any;
  const res = await fetch(`${API_BASE}/ia/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...mapped }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar tarefa de IA");
  return res.json();
}
