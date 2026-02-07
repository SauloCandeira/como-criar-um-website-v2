const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface MyBotMapDTO {
  id: string;
  name: string;
  positionX: number;
  positionY: number;
  icon: string;
  visualMeta?: any;
}

export interface MyBotEcosystemBotDTO {
  botId: string;
  userId: string;
  name: string;
  imageUrl: string;
  rarity: string;
  level: number;
  originMapId: string;
  currentMapId: string;
  originPosX: number;
  originPosY: number;
  currentPosX: number;
  currentPosY: number;
}

export interface MyBotMovementDTO {
  id: string;
  botId: string;
  userId: string;
  fromMapId?: string | null;
  toMapId: string;
  reason: string;
  battleId?: string | null;
  createdAt?: string;
}

export interface MyBotEcosystemResponse {
  maps: MyBotMapDTO[];
  bots: MyBotEcosystemBotDTO[];
  movements: MyBotMovementDTO[];
  counts?: {
    userCards?: number;
    profiles?: number;
    mybots?: number;
  };
}

const buildError = async (res: Response, fallback: string) => {
  const details = await res.text().catch(() => "");
  const suffix = details ? `: ${details}` : "";
  return new Error(`${fallback} (status ${res.status})${suffix}`);
};

const normalizeMap = (row: any): MyBotMapDTO => ({
  id: row.id,
  name: row.name ?? row.id,
  positionX: Number(row.position_x ?? row.positionX ?? 0),
  positionY: Number(row.position_y ?? row.positionY ?? 0),
  icon: row.icon ?? "",
  visualMeta: row.visual_meta ?? row.visualMeta ?? {},
});

const normalizeBot = (row: any): MyBotEcosystemBotDTO => ({
  botId: row.card_id ?? row.botId ?? "",
  userId: row.user_id ?? row.userId ?? "",
  name: row.name ?? "",
  imageUrl: row.image_url ?? row.imageUrl ?? "",
  rarity: row.rarity ?? "",
  level: Number(row.level ?? 1),
  originMapId: row.origin_map_id ?? row.originMapId ?? "",
  currentMapId: row.current_map_id ?? row.currentMapId ?? "",
  originPosX: Number(row.origin_pos_x ?? row.originPosX ?? 50),
  originPosY: Number(row.origin_pos_y ?? row.originPosY ?? 50),
  currentPosX: Number(row.current_pos_x ?? row.currentPosX ?? 50),
  currentPosY: Number(row.current_pos_y ?? row.currentPosY ?? 50),
});

const normalizeMovement = (row: any): MyBotMovementDTO => ({
  id: row.id,
  botId: row.bot_id ?? row.botId ?? "",
  userId: row.user_id ?? row.userId ?? "",
  fromMapId: row.from_map_id ?? row.fromMapId ?? null,
  toMapId: row.to_map_id ?? row.toMapId ?? "",
  reason: row.reason ?? "",
  battleId: row.battle_id ?? row.battleId ?? null,
  createdAt: row.created_at ?? row.createdAt,
});

export async function fetchAdminMyBotEcosystem(
  adminId: string,
  limit = 800,
  movementLimit = 200
): Promise<MyBotEcosystemResponse> {
  const params = new URLSearchParams();
  params.append("adminId", adminId);
  params.append("limit", String(limit));
  params.append("movementLimit", String(movementLimit));
  const res = await fetch(`${API_BASE}/admin/mybot/ecosystem?${params.toString()}`);
  if (!res.ok) throw await buildError(res, "Falha ao carregar ecossistema MyBot");
  const data = await res.json();
  return {
    maps: Array.isArray(data?.maps) ? data.maps.map(normalizeMap) : [],
    bots: Array.isArray(data?.bots) ? data.bots.map(normalizeBot) : [],
    movements: Array.isArray(data?.movements) ? data.movements.map(normalizeMovement) : [],
    counts: data?.counts,
  };
}
