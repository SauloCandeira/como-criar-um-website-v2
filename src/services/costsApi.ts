const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface CostDTO {
  id: string;
  name: string;
  costValue: string;
  billingCycle: 'monthly' | 'annual';
}

const normalizeCost = (cost: any): CostDTO => ({
  id: cost.id,
  name: cost.name,
  costValue: cost.costValue ?? cost.cost_value ?? "",
  billingCycle: (cost.billingCycle ?? cost.billing_cycle ?? 'monthly') as 'monthly' | 'annual',
});

const buildError = async (res: Response, fallback: string) => {
  const details = await res.text().catch(() => "");
  const suffix = details ? `: ${details}` : "";
  return new Error(`${fallback} (status ${res.status})${suffix}`);
};

export async function fetchCosts(): Promise<CostDTO[]> {
  const res = await fetch(`${API_BASE}/costs`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar custos");
  const data = await res.json();
  return data.map(normalizeCost);
}

export async function createCost(payload: Omit<CostDTO, "id">) {
  const res = await fetch(`${API_BASE}/costs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      costValue: payload.costValue,
      billingCycle: payload.billingCycle,
    }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao criar custo");
  const data = await res.json();
  return normalizeCost(data);
}

export async function updateCost(id: string, payload: Omit<CostDTO, "id">) {
  const res = await fetch(`${API_BASE}/costs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      costValue: payload.costValue,
      billingCycle: payload.billingCycle,
    }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao editar custo");
  const data = await res.json();
  return normalizeCost(data);
}

export async function deleteCost(id: string) {
  const res = await fetch(`${API_BASE}/costs/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await buildError(res, "Falha ao excluir custo");
}
