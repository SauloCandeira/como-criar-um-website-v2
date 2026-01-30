const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface AccessDTO {
  id: string;
  source: string;
  date: string;
}

const formatDateBR = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const normalizeAccess = (access: any): AccessDTO => ({
  id: access.id,
  source: access.source ?? 'web',
  date: formatDateBR(access.created_at ?? new Date().toISOString()),
});

const buildError = async (res: Response, fallback: string) => {
  const details = await res.text().catch(() => "");
  const suffix = details ? `: ${details}` : "";
  return new Error(`${fallback} (status ${res.status})${suffix}`);
};

export async function fetchAccesses(): Promise<AccessDTO[]> {
  const res = await fetch(`${API_BASE}/accesses`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar acessos");
  const data = await res.json();
  return data.map(normalizeAccess);
}

export async function createAccess(source = 'web') {
  const res = await fetch(`${API_BASE}/accesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao criar acesso");
  const data = await res.json();
  return normalizeAccess(data);
}

export async function deleteAccess(id: string) {
  const res = await fetch(`${API_BASE}/accesses/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await buildError(res, "Falha ao excluir acesso");
}
