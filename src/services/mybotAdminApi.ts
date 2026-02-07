const API_BASE = import.meta.env.VITE_API_BASE || "/api";


export interface MyBotAdminDTO {
  userId: string;
  myalienUserId: string;
  stage: string;
  stageReason: string;
  name?: string;
  ownerName?: string;
  forSale?: boolean;
  imageUrl?: string;
  attributes?: Record<string, number>;
  rarity?: string;
  marketValue?: number;
  createdAt: string;
  updatedAt: string;
}

const normalizeMyBotAdmin = (row: any): MyBotAdminDTO => ({
  userId: row.user_id ?? row.userId,
  myalienUserId: row.myalien_user_id ?? row.myalienUserId ?? "",
  stage: row.stage ?? "assistant",
  stageReason: row.stage_reason ?? row.stageReason ?? "",
  name: row.name ?? row.bot_name ?? undefined,
  ownerName: row.owner_name ?? row.ownerName ?? undefined,
  forSale: row.for_sale ?? row.forSale ?? undefined,
  imageUrl: row.image_url ?? row.imageUrl ?? undefined,
  attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes,
  rarity: row.rarity ?? undefined,
  marketValue: row.market_value ?? row.marketValue ?? undefined,
  createdAt: row.created_at ?? row.createdAt,
  updatedAt: row.updated_at ?? row.updatedAt,
});

export async function fetchAllMyBots(): Promise<MyBotAdminDTO[]> {
  const res = await fetch(`${API_BASE}/mybots`);
  if (!res.ok) throw new Error("Falha ao carregar MyBots");
  const data = await res.json();
  return data.map(normalizeMyBotAdmin);
}
