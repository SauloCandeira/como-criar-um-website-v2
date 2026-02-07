const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type MyBotStage = "assistant" | "copilot" | "representative";

export interface MyBotDTO {
  userId: string;
  myalienUserId: string;
  stage: MyBotStage;
  stageReason: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MyBotStatsDTO {
  userId: string;
  contentAccessedCount: number;
  projectsPurchasedCount: number;
  projectsCreatedCount: number;
  coursesStartedCount: number;
  coursesCompletedCount: number;
  marketplaceInteractionsCount: number;
  toolUsageCount: number;
  feedbackScore: number;
  lastEventAt?: string;
}

export interface MyBotEventDTO {
  id: string;
  eventType: string;
  source: string;
  payload: any;
  reversible: boolean;
  occurredAt?: string;
  createdAt?: string;
  revertedAt?: string;
  correlationId?: string;
  version?: number;
}

export interface MyBotMemoryDTO {
  id: string;
  userId: string;
  layer: "short" | "mid" | "long";
  memoryKey: string;
  value: any;
  version: number;
  isActive: boolean;
  lastEventId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MyBotSummaryDTO {
  bot: MyBotDTO;
  stats: MyBotStatsDTO;
  memorySummary: Array<{ layer: string; count: number }>;
  recentEvents: MyBotEventDTO[];
}

export interface MyBotBattleDTO {
  id: string;
  userIdA: string;
  userIdB: string;
  betAmount: number;
  battleType: string;
  gasPct: number;
  mapName: string;
  powerFinalA: number;
  powerFinalB: number;
  winnerUserId: string;
  payoutAmount: number;
  createdAt?: string;
}

export interface MyBotBattleQueueDTO {
  id: string;
  betAmount: number;
  level: number;
  rarity: string;
  status: string;
  createdAt?: string;
}

const buildError = async (res: Response, fallback: string) => {
  const details = await res.text().catch(() => "");
  const suffix = details ? `: ${details}` : "";
  return new Error(`${fallback} (status ${res.status})${suffix}`);
};

const normalizeMyBot = (row: any): MyBotDTO => ({
  userId: row.user_id ?? row.userId,
  myalienUserId: row.myalien_user_id ?? row.myalienUserId ?? "",
  stage: row.stage ?? "assistant",
  stageReason: row.stage_reason ?? row.stageReason ?? "",
  createdAt: row.created_at ?? row.createdAt,
  updatedAt: row.updated_at ?? row.updatedAt,
});

const normalizeStats = (row: any): MyBotStatsDTO => ({
  userId: row.user_id ?? row.userId,
  contentAccessedCount: Number(row.content_accessed_count ?? row.contentAccessedCount ?? 0),
  projectsPurchasedCount: Number(row.projects_purchased_count ?? row.projectsPurchasedCount ?? 0),
  projectsCreatedCount: Number(row.projects_created_count ?? row.projectsCreatedCount ?? 0),
  coursesStartedCount: Number(row.courses_started_count ?? row.coursesStartedCount ?? 0),
  coursesCompletedCount: Number(row.courses_completed_count ?? row.coursesCompletedCount ?? 0),
  marketplaceInteractionsCount: Number(row.marketplace_interactions_count ?? row.marketplaceInteractionsCount ?? 0),
  toolUsageCount: Number(row.tool_usage_count ?? row.toolUsageCount ?? 0),
  feedbackScore: Number(row.feedback_score ?? row.feedbackScore ?? 0),
  lastEventAt: row.last_event_at ?? row.lastEventAt,
});

const normalizeEvent = (row: any): MyBotEventDTO => ({
  id: row.id,
  eventType: row.event_type ?? row.eventType,
  source: row.source ?? "",
  payload: row.payload ?? {},
  reversible: Boolean(row.reversible),
  occurredAt: row.occurred_at ?? row.occurredAt,
  createdAt: row.created_at ?? row.createdAt,
  revertedAt: row.reverted_at ?? row.revertedAt,
  correlationId: row.correlation_id ?? row.correlationId,
  version: row.version,
});

const normalizeMemory = (row: any): MyBotMemoryDTO => ({
  id: row.id,
  userId: row.user_id ?? row.userId,
  layer: row.layer,
  memoryKey: row.memory_key ?? row.memoryKey,
  value: row.value ?? {},
  version: Number(row.version ?? 1),
  isActive: Boolean(row.is_active ?? row.isActive),
  lastEventId: row.last_event_id ?? row.lastEventId,
  createdAt: row.created_at ?? row.createdAt,
  updatedAt: row.updated_at ?? row.updatedAt,
});

const normalizeBattle = (row: any): MyBotBattleDTO => ({
  id: row.id,
  userIdA: row.user_id_a ?? row.userIdA,
  userIdB: row.user_id_b ?? row.userIdB,
  betAmount: Number(row.bet_amount ?? row.betAmount ?? 0),
  battleType: row.battle_type ?? row.battleType ?? "",
  gasPct: Number(row.gas_pct ?? row.gasPct ?? 0),
  mapName: row.map_name ?? row.mapName ?? "",
  powerFinalA: Number(row.power_final_a ?? row.powerFinalA ?? 0),
  powerFinalB: Number(row.power_final_b ?? row.powerFinalB ?? 0),
  winnerUserId: row.winner_user_id ?? row.winnerUserId ?? "",
  payoutAmount: Number(row.payout_amount ?? row.payoutAmount ?? 0),
  createdAt: row.created_at ?? row.createdAt,
});

const normalizeBattleQueue = (row: any): MyBotBattleQueueDTO => ({
  id: row.id,
  betAmount: Number(row.bet_amount ?? row.betAmount ?? 0),
  level: Number(row.level ?? 1),
  rarity: row.rarity ?? "comum",
  status: row.status ?? "waiting",
  createdAt: row.created_at ?? row.createdAt,
});

export async function fetchMyBotSummary(userId: string): Promise<MyBotSummaryDTO> {
  const res = await fetch(`${API_BASE}/mybot/${userId}`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar My Bot");
  const data = await res.json();
  return {
    bot: normalizeMyBot(data.bot ?? {}),
    stats: normalizeStats(data.stats ?? {}),
    memorySummary: (data.memorySummary ?? []).map((item: any) => ({
      layer: item.layer,
      count: Number(item.count ?? 0),
    })),
    recentEvents: (data.recentEvents ?? []).map(normalizeEvent),
  };
}

export async function fetchMyBotEvents(userId: string, limit = 50): Promise<MyBotEventDTO[]> {
  const res = await fetch(`${API_BASE}/mybot/${userId}/events?limit=${limit}`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar eventos do My Bot");
  const data = await res.json();
  return data.map(normalizeEvent);
}

export async function createMyBotEvent(userId: string, payload: {
  type: string;
  source?: string;
  payload?: any;
  reversible?: boolean;
  occurredAt?: string;
  correlationId?: string;
  memoryUpdates?: Array<{ layer: "short" | "mid" | "long"; key: string; value: any }>;
}) {
  const res = await fetch(`${API_BASE}/mybot/${userId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await buildError(res, "Falha ao registrar evento do My Bot");
  const data = await res.json();
  return {
    event: normalizeEvent(data.event ?? {}),
    stats: normalizeStats(data.stats ?? {}),
    memory: (data.memory ?? []).map(normalizeMemory),
    stage: data.stage as MyBotStage,
    stageReason: data.stageReason ?? "",
  };
}

export async function revertMyBotEvent(userId: string, eventId: string) {
  const res = await fetch(`${API_BASE}/mybot/${userId}/events/${eventId}/revert`, {
    method: "POST",
  });
  if (!res.ok) throw await buildError(res, "Falha ao reverter evento do My Bot");
  return res.json();
}

export async function fetchMyBotMemory(userId: string, layer?: "short" | "mid" | "long", limit = 200) {
  const params = new URLSearchParams();
  if (layer) params.append("layer", layer);
  params.append("limit", String(limit));
  const res = await fetch(`${API_BASE}/mybot/${userId}/memory?${params.toString()}`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar memória do My Bot");
  const data = await res.json();
  return data.map(normalizeMemory) as MyBotMemoryDTO[];
}

export async function upsertMyBotMemory(userId: string, payload: {
  layer: "short" | "mid" | "long";
  key: string;
  value: any;
}) {
  const res = await fetch(`${API_BASE}/mybot/${userId}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await buildError(res, "Falha ao atualizar memória do My Bot");
  const data = await res.json();
  return normalizeMemory(data);
}

export async function resetMyBotMemory(userId: string, layer: "short" | "mid" | "long" | "all" = "all") {
  const res = await fetch(`${API_BASE}/mybot/${userId}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ layer }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao resetar memória do My Bot");
  return res.json();
}

export async function sendMyBotMessage(userId: string, payload: {
  message: string;
  context?: any;
}) {
  const res = await fetch(`${API_BASE}/mybot/${userId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await buildError(res, "Falha ao conversar com o My Bot");
  const data = await res.json();
  return {
    response: data.response as string,
    stage: data.stage as MyBotStage,
    stats: normalizeStats(data.stats ?? {}),
  };
}

export async function fetchMyBotBattles(userId: string, limit = 20): Promise<MyBotBattleDTO[]> {
  const params = new URLSearchParams();
  params.append("userId", userId);
  params.append("limit", String(limit));
  const res = await fetch(`${API_BASE}/mybot/battles?${params.toString()}`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar batalhas do My Bot");
  const data = await res.json();
  return (data ?? []).map(normalizeBattle);
}

export async function fetchMyBotBattleQueue(userId: string): Promise<MyBotBattleQueueDTO | null> {
  const params = new URLSearchParams();
  params.append("userId", userId);
  const res = await fetch(`${API_BASE}/mybot/battles/queue?${params.toString()}`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar fila de batalha");
  const data = await res.json();
  return data ? normalizeBattleQueue(data) : null;
}

export async function queueMyBotBattle(userId: string, betAmount: number) {
  const res = await fetch(`${API_BASE}/mybot/battles/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, betAmount }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao enfileirar batalha");
  const data = await res.json();
  return {
    status: data.status as string,
    battle: data.battle ? normalizeBattle(data.battle) : null,
    queue: data.queue ? normalizeBattleQueue(data.queue) : null,
  };
}

export async function evolveMyBot(userId: string, attribute: "forca" | "velocidade" | "inteligencia") {
  const res = await fetch(`${API_BASE}/mybot/${userId}/evolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attribute }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao evoluir My Bot");
  return res.json();
}
