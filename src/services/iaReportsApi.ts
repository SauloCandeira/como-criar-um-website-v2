import type { AiReport } from "./aiReportTypes";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function listIaReports(adminId: string): Promise<AiReport[]> {
  const res = await fetch(`${API_BASE}/ia/reports?adminId=${encodeURIComponent(adminId)}`);
  if (!res.ok) throw new Error("Falha ao carregar relatórios de IA");
  return res.json();
}
