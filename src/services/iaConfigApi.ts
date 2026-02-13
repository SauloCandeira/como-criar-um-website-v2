const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type IaConfig = {
  managedByAI: boolean;
  taskCreationPolicy: "AI_ALLOWED" | string;
  allowAutoBacklogIfEmpty: boolean;
  maxTasksPerRun: number;
  maxExecutionsPerHour: number;
  cooldownMinutes?: number;
  updatedAt?: string;
  createdAt?: string;
};

export async function fetchIaConfig(adminId: string): Promise<IaConfig> {
  const res = await fetch(`${API_BASE}/ia/config?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar configuração de IA");
  return res.json();
}

export async function updateIaConfig(adminId: string, payload: Partial<IaConfig>): Promise<IaConfig> {
  const res = await fetch(`${API_BASE}/ia/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...payload }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar configuração de IA");
  return res.json();
}
