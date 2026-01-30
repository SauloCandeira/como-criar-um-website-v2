const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function fetchMasterEmail(): Promise<string> {
  const res = await fetch(`${API_BASE}/settings/master`);
  if (!res.ok) throw new Error("Falha ao carregar master_email");
  const data = await res.json();
  return String(data.value || "");
}
