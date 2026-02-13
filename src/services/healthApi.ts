const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type HealthStatusDTO = {
  status: string;
  database: string;
  version?: string | null;
};

export async function fetchHealthStatus(): Promise<HealthStatusDTO> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Falha ao carregar status de saúde");
  return res.json();
}
