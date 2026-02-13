const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import type { IaConversation, IaMessage, IaChatResponse } from "./iaChatTypes";

export async function listIaConversations(adminId: string): Promise<IaConversation[]> {
  const res = await fetch(`${API_BASE}/ia/conversations?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar conversas IA");
  return res.json();
}

export async function createIaConversation(adminId: string, title?: string): Promise<IaConversation> {
  const res = await fetch(`${API_BASE}/ia/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, title }),
  });
  if (!res.ok) throw new Error("Falha ao criar conversa IA");
  return res.json();
}

export async function listIaMessages(adminId: string, conversationId: string): Promise<IaMessage[]> {
  const res = await fetch(
    `${API_BASE}/ia/conversations/${encodeURIComponent(conversationId)}/messages?adminId=${encodeURIComponent(adminId)}`
  );
  if (!res.ok) throw new Error("Falha ao carregar mensagens IA");
  return res.json();
}

export async function sendIaMessage(adminId: string, conversationId: string | null, message: string): Promise<IaChatResponse> {
  const res = await fetch(`${API_BASE}/ia/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, conversationId, message }),
  });
  if (!res.ok) throw new Error("Falha ao conversar com HK IA");
  return res.json();
}
