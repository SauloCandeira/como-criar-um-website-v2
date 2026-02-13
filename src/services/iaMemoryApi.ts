const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import type { IaMemoryItem, IaMemoryStats } from "./iaMemoryTypes";

export async function fetchIaMemoryStats(adminId: string): Promise<IaMemoryStats> {
  const res = await fetch(`${API_BASE}/ia/memory/stats?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar estatísticas de memória IA");
  return res.json();
}

export async function createIaMemory(adminId: string, payload: { content: string; context_type?: string; related_task_id?: string | null }): Promise<IaMemoryItem> {
  const res = await fetch(`${API_BASE}/ia/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...payload }),
  });
  if (!res.ok) throw new Error("Falha ao criar memória IA");
  return res.json();
}

export async function searchIaMemory(adminId: string, payload: { query: string; topK?: number; context_type?: string }): Promise<IaMemoryItem[]> {
  const res = await fetch(`${API_BASE}/ia/memory/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...payload }),
  });
  if (!res.ok) throw new Error("Falha ao buscar memória IA");
  return res.json();
}
