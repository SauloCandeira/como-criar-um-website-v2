const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import type { IaPromptItem } from "./iaPromptsTypes";

export async function listIaPrompts(adminId: string, category?: string): Promise<IaPromptItem[]> {
  const qs = new URLSearchParams({ adminId });
  if (category) qs.set("category", category);
  const res = await fetch(`${API_BASE}/ia/prompts?${qs.toString()}`);
  if (!res.ok) throw new Error("Falha ao carregar prompts IA");
  return res.json();
}

export async function fetchIaPrompt(adminId: string, id: string): Promise<IaPromptItem> {
  const res = await fetch(`${API_BASE}/ia/prompts/${encodeURIComponent(id)}?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar prompt IA");
  return res.json();
}

export async function listIaPromptVersions(adminId: string, id: string): Promise<{ id: string; version: number; storage_url: string; created_at?: string }[]> {
  const res = await fetch(`${API_BASE}/ia/prompts/${encodeURIComponent(id)}/versions?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar versões do prompt IA");
  return res.json();
}

export async function activateIaPromptVersion(adminId: string, id: string, version: number, reembed?: boolean): Promise<{ id: string; version: number; storage_url: string }> {
  const res = await fetch(`${API_BASE}/ia/prompts/${encodeURIComponent(id)}/activate-version`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, version, reembed }),
  });
  if (!res.ok) throw new Error("Falha ao ativar versão do prompt IA");
  return res.json();
}

export async function updateIaPrompt(
  adminId: string,
  id: string,
  payload: { title: string; category: string; description?: string; content: string; is_active?: boolean; reembed?: boolean }
): Promise<{ id: string; version: number; storage_url: string }>
{
  const res = await fetch(`${API_BASE}/ia/prompts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...payload }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar prompt IA");
  return res.json();
}

export async function reembedIaPrompt(adminId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ia/prompts/${encodeURIComponent(id)}/re-embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Falha ao re-embutir prompt IA");
}
