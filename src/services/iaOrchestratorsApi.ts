const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import type { IaOrchestrator, IaOrchestratorContent, IaOrchestratorExecution, IaOrchestratorSummary } from "./iaOrchestratorsTypes";

export async function listIaOrchestrators(adminId: string): Promise<IaOrchestrator[]> {
  const res = await fetch(`${API_BASE}/ia/orchestrators?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar orquestradores IA");
  return res.json();
}

export async function fetchActiveIaOrchestrator(adminId: string): Promise<IaOrchestrator | null> {
  const res = await fetch(`${API_BASE}/ia/orchestrators/active?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar orquestrador ativo");
  return res.json();
}

export async function fetchIaOrchestratorSummary(adminId: string): Promise<IaOrchestratorSummary> {
  const res = await fetch(`${API_BASE}/ia/orchestrators/summary?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar resumo do orquestrador IA");
  return res.json();
}

export async function listIaOrchestratorExecutions(
  adminId: string,
  params?: { orchestratorId?: string; limit?: number }
): Promise<IaOrchestratorExecution[]> {
  const qs = new URLSearchParams({ adminId });
  if (params?.orchestratorId) qs.set("orchestratorId", params.orchestratorId);
  if (params?.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE}/ia/orchestrators/executions?${qs.toString()}`);
  if (!res.ok) throw new Error("Falha ao carregar execuções do orquestrador IA");
  return res.json();
}

export async function fetchIaOrchestratorContent(adminId: string, id: string): Promise<IaOrchestratorContent> {
  const res = await fetch(`${API_BASE}/ia/orchestrators/${encodeURIComponent(id)}/content?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar conteúdo do orquestrador IA");
  return res.json();
}

export async function createIaOrchestrator(
  adminId: string,
  payload: { name: string; supreme_prompt: string; execution_flow?: unknown; is_active?: boolean }
): Promise<IaOrchestrator> {
  const res = await fetch(`${API_BASE}/ia/orchestrators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminId,
      name: payload.name,
      supremePrompt: payload.supreme_prompt,
      executionFlow: payload.execution_flow ?? [],
      isActive: payload.is_active ?? true,
    }),
  });
  if (!res.ok) throw new Error("Falha ao criar orquestrador IA");
  return res.json();
}

export async function updateIaOrchestrator(
  adminId: string,
  id: string,
  payload: { name: string; supreme_prompt: string; execution_flow?: unknown; is_active?: boolean }
): Promise<IaOrchestrator> {
  const res = await fetch(`${API_BASE}/ia/orchestrators/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminId,
      name: payload.name,
      supremePrompt: payload.supreme_prompt,
      executionFlow: payload.execution_flow ?? [],
      isActive: payload.is_active ?? true,
    }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar orquestrador IA");
  return res.json();
}

export async function activateIaOrchestrator(adminId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ia/orchestrators/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Falha ao ativar orquestrador IA");
}
