const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface WalletDTO {
  id: string;
  userId: string;
  cashBalance: number;
  currency?: string;
  cpf?: string;
}

export interface WalletPositionDTO {
  id: string;
  quantity: number;
  avgPrice: number;
  assetId: string;
  name: string;
  assetClass: string;
  ticker?: string;
  currentPrice?: number;
  currency?: string;
}

const normalizeWallet = (wallet: any): WalletDTO => ({
  id: wallet.id,
  userId: wallet.userId ?? wallet.user_id ?? "",
  cashBalance: Number(wallet.cashBalance ?? wallet.cash_balance ?? 0),
  currency: wallet.currency ?? "BRL",
  cpf: wallet.cpf ?? "",
});

const normalizePosition = (row: any): WalletPositionDTO => ({
  id: row.id,
  quantity: Number(row.quantity ?? 0),
  avgPrice: Number(row.avgPrice ?? row.avg_price ?? 0),
  assetId: row.assetId ?? row.asset_id ?? "",
  name: row.name,
  assetClass: row.assetClass ?? row.asset_class ?? "",
  ticker: row.ticker ?? "",
  currentPrice: Number(row.currentPrice ?? row.current_price ?? 0),
  currency: row.currency ?? "BRL",
});

export async function fetchWallet(userId = "default"): Promise<WalletDTO> {
  const res = await fetch(`${API_BASE}/wallets?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Falha ao carregar carteira");
  const data = await res.json();
  return normalizeWallet(data);
}

export async function fetchWalletPositions(walletId: string): Promise<WalletPositionDTO[]> {
  const res = await fetch(`${API_BASE}/wallets/${walletId}/positions`);
  if (!res.ok) throw new Error("Falha ao carregar posições");
  const data = await res.json();
  return data.map(normalizePosition);
}
