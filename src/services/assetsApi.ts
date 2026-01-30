const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface AssetDTO {
  id: string;
  name: string;
  assetClass: string;
  ticker?: string;
  riskLevel?: string;
  currentPrice?: number;
  totalSupply?: number;
  availableSupply?: number;
  isPrimary?: boolean;
  currency?: string;
}

const normalizeAsset = (asset: any): AssetDTO => ({
  id: asset.id,
  name: asset.name,
  assetClass: asset.assetClass ?? asset.asset_class ?? "",
  ticker: asset.ticker ?? "",
  riskLevel: asset.riskLevel ?? asset.risk_level ?? "Médio",
  currentPrice: Number(asset.currentPrice ?? asset.current_price ?? 0),
  totalSupply: Number(asset.totalSupply ?? asset.total_supply ?? 0),
  availableSupply: Number(asset.availableSupply ?? asset.available_supply ?? 0),
  isPrimary: asset.isPrimary ?? asset.is_primary ?? false,
  currency: asset.currency ?? "BRL",
});

export async function fetchAssets(): Promise<AssetDTO[]> {
  const res = await fetch(`${API_BASE}/assets`);
  if (!res.ok) throw new Error("Falha ao carregar ativos");
  const data = await res.json();
  return data.map(normalizeAsset);
}
