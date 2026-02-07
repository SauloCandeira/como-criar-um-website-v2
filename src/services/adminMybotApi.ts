const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface AdminMyBotBattleDTO {
  id: string;
  userIdA: string;
  userIdB: string;
  cardIdA: string;
  cardIdB: string;
  betAmount: number;
  battleType: string;
  gasPct: number;
  mapName: string;
  mapWeights: any;
  modifiers: any;
  seed: string;
  powerA: number;
  powerB: number;
  randomFactorA: number;
  randomFactorB: number;
  powerFinalA: number;
  powerFinalB: number;
  xpA: number;
  xpB: number;
  winnerUserId: string;
  payoutAmount: number;
  gasAmount: number;
  reason: string;
  createdAt?: string;
}

const buildError = async (res: Response, fallback: string) => {
  const details = await res.text().catch(() => "");
  const suffix = details ? `: ${details}` : "";
  return new Error(`${fallback} (status ${res.status})${suffix}`);
};

const normalizeBattle = (row: any): AdminMyBotBattleDTO => ({
  id: row.id,
  userIdA: row.user_id_a ?? row.userIdA,
  userIdB: row.user_id_b ?? row.userIdB,
  cardIdA: row.card_id_a ?? row.cardIdA,
  cardIdB: row.card_id_b ?? row.cardIdB,
  betAmount: Number(row.bet_amount ?? row.betAmount ?? 0),
  battleType: row.battle_type ?? row.battleType ?? "",
  gasPct: Number(row.gas_pct ?? row.gasPct ?? 0),
  mapName: row.map_name ?? row.mapName ?? "",
  mapWeights: row.map_weights ?? row.mapWeights ?? {},
  modifiers: row.modifiers ?? [],
  seed: row.seed ?? "",
  powerA: Number(row.power_a ?? row.powerA ?? 0),
  powerB: Number(row.power_b ?? row.powerB ?? 0),
  randomFactorA: Number(row.random_factor_a ?? row.randomFactorA ?? 1),
  randomFactorB: Number(row.random_factor_b ?? row.randomFactorB ?? 1),
  powerFinalA: Number(row.power_final_a ?? row.powerFinalA ?? 0),
  powerFinalB: Number(row.power_final_b ?? row.powerFinalB ?? 0),
  xpA: Number(row.xp_a ?? row.xpA ?? 0),
  xpB: Number(row.xp_b ?? row.xpB ?? 0),
  winnerUserId: row.winner_user_id ?? row.winnerUserId ?? "",
  payoutAmount: Number(row.payout_amount ?? row.payoutAmount ?? 0),
  gasAmount: Number(row.gas_amount ?? row.gasAmount ?? 0),
  reason: row.reason ?? "",
  createdAt: row.created_at ?? row.createdAt,
});

export async function fetchAdminMyBotBattles(adminId: string, limit = 100): Promise<AdminMyBotBattleDTO[]> {
  const params = new URLSearchParams();
  params.append("adminId", adminId);
  params.append("limit", String(limit));
  const res = await fetch(`${API_BASE}/admin/mybot/battles?${params.toString()}`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar batalhas do MyBot");
  const data = await res.json();
  return (data ?? []).map(normalizeBattle);
}
