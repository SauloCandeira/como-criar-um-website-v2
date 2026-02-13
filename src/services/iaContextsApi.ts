const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import type { IaContext } from "./iaContextsTypes";

export async function listIaContexts(adminId: string): Promise<IaContext[]> {
  const res = await fetch(`${API_BASE}/ia/contexts?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar contextos IA");
  return res.json();
}

export async function createIaContext(adminId: string, payload: Omit<IaContext, "id" | "created_at">): Promise<IaContext> {
  const res = await fetch(`${API_BASE}/ia/contexts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...payload }),
  });
  if (!res.ok) throw new Error("Falha ao criar contexto IA");
  return res.json();
}

export async function updateIaContext(adminId: string, id: string, payload: Omit<IaContext, "id" | "created_at">): Promise<IaContext> {
  const res = await fetch(`${API_BASE}/ia/contexts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...payload }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar contexto IA");
  return res.json();
}

export async function deleteIaContext(adminId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ia/contexts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Falha ao remover contexto IA");
}
