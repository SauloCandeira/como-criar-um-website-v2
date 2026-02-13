const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import type { IaAgent, IaAgentExecutionResult } from "./iaAgentsTypes";

export async function listIaAgents(adminId: string): Promise<IaAgent[]> {
  const res = await fetch(`${API_BASE}/ia/agents?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar agentes IA");
  return res.json();
}

export async function createIaAgent(adminId: string, payload: Omit<IaAgent, "id" | "created_at">): Promise<IaAgent> {
  const res = await fetch(`${API_BASE}/ia/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...payload }),
  });
  if (!res.ok) throw new Error("Falha ao criar agente IA");
  return res.json();
}

export async function updateIaAgent(adminId: string, id: string, payload: Omit<IaAgent, "id" | "created_at">): Promise<IaAgent> {
  const res = await fetch(`${API_BASE}/ia/agents/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...payload }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar agente IA");
  return res.json();
}

export async function executeIaAgent(adminId: string, id: string, context_reference?: string): Promise<IaAgentExecutionResult> {
  const res = await fetch(`${API_BASE}/ia/agents/${encodeURIComponent(id)}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, context_reference }),
  });
  if (!res.ok) throw new Error("Falha ao executar agente IA");
  return res.json();
}
