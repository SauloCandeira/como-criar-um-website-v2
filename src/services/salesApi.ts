const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface SaleDTO {
  id: string;
  user: string;
  value: string;
  date: string;
}

const formatCurrencyBR = (amount: number) => {
  const fixed = amount.toFixed(2).replace('.', ',');
  return `R$ ${fixed}`;
};

const formatDateBR = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const normalizeSale = (sale: any): SaleDTO => ({
  id: sale.id,
  user: sale.user ?? sale.customerName ?? sale.customer_name ?? 'Sem nome',
  value: formatCurrencyBR(Number(sale.amount ?? sale.value ?? 0)),
  date: sale.date ?? formatDateBR(sale.created_at ?? new Date().toISOString()),
});

const buildError = async (res: Response, fallback: string) => {
  const details = await res.text().catch(() => "");
  const suffix = details ? `: ${details}` : "";
  return new Error(`${fallback} (status ${res.status})${suffix}`);
};

export async function fetchSales(): Promise<SaleDTO[]> {
  const res = await fetch(`${API_BASE}/sales`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar vendas");
  const data = await res.json();
  return data.map(normalizeSale);
}

export async function createSale(payload: { user: string; amount: number; currency?: string }) {
  const res = await fetch(`${API_BASE}/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: payload.user,
      amount: payload.amount,
      currency: payload.currency ?? "BRL",
    }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao criar venda");
  const data = await res.json();
  return normalizeSale(data);
}

export async function updateSale(id: string, payload: { user: string; amount: number; currency?: string }) {
  const res = await fetch(`${API_BASE}/sales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: payload.user,
      amount: payload.amount,
      currency: payload.currency ?? "BRL",
    }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao editar venda");
  const data = await res.json();
  return normalizeSale(data);
}

export async function deleteSale(id: string) {
  const res = await fetch(`${API_BASE}/sales/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await buildError(res, "Falha ao excluir venda");
}
