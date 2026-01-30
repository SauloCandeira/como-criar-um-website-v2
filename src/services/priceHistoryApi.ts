const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface PriceHistoryPoint {
  price: number;
  recordedAt: string;
}

const normalizePoint = (row: any): PriceHistoryPoint => ({
  price: Number(row.price ?? 0),
  recordedAt: row.recordedAt ?? row.recorded_at ?? "",
});

export async function fetchPriceHistory(assetId: string, days = 14): Promise<PriceHistoryPoint[]> {
  const res = await fetch(`${API_BASE}/price-history?assetId=${encodeURIComponent(assetId)}&days=${days}`);
  if (!res.ok) throw new Error("Falha ao carregar histórico de preço");
  const data = await res.json();
  return data.map(normalizePoint);
}
