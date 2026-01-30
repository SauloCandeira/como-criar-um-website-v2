const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface FundDTO {
  id: string;
  name: string;
  description?: string;
  managementFee?: number;
  nav?: number;
}

export interface FundHoldingDTO {
  id: string;
  weight: number;
  assetId: string;
  name: string;
  assetClass: string;
  ticker?: string;
  currentPrice?: number;
  currency?: string;
}

const normalizeFund = (fund: any): FundDTO => ({
  id: fund.id,
  name: fund.name,
  description: fund.description ?? "",
  managementFee: Number(fund.managementFee ?? fund.management_fee ?? 0),
  nav: Number(fund.nav ?? 0),
});

const normalizeHolding = (row: any): FundHoldingDTO => ({
  id: row.id,
  weight: Number(row.weight ?? 0),
  assetId: row.assetId ?? row.asset_id ?? "",
  name: row.name,
  assetClass: row.assetClass ?? row.asset_class ?? "",
  ticker: row.ticker ?? "",
  currentPrice: Number(row.currentPrice ?? row.current_price ?? 0),
  currency: row.currency ?? "BRL",
});

export async function fetchFunds(): Promise<FundDTO[]> {
  const res = await fetch(`${API_BASE}/funds`);
  if (!res.ok) throw new Error("Falha ao carregar fundos");
  const data = await res.json();
  return data.map(normalizeFund);
}

export async function fetchFundHoldings(fundId: string): Promise<FundHoldingDTO[]> {
  const res = await fetch(`${API_BASE}/funds/${fundId}/holdings`);
  if (!res.ok) throw new Error("Falha ao carregar composição do fundo");
  const data = await res.json();
  return data.map(normalizeHolding);
}
