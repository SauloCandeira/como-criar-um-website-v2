const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface CardAttributes {
  strength: number;
  speed: number;
  intelligence: number;
  endurance: number;
}

export interface CardDTO {
  id: string;
  userId: string;
  seed: number;
  hashSeed?: string;
  name: string;
  species: string;
  className: string;
  rarity: "comum" | "raro" | "epico" | "lendario";
  attributes: CardAttributes;
  visualMeta?: {
    palette?: { primary: string; secondary: string; accent: string };
    pattern?: number;
    eyes?: number;
    horns?: number;
    glow?: boolean;
  };
  marketValue?: number;
  imageUrl?: string;
  level: number;
  xp: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GamificationDTO {
  userId: string;
  plan: "free" | "pro" | "enterprise";
  usageScore: number;
  xp: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InternalAccountDTO {
  userId: string;
  balance: number;
  updatedAt?: string;
}

export interface CardListingDTO {
  id: string;
  cardId: string;
  sellerUserId: string;
  price: number;
  status: string;
  createdAt?: string;
  imageUrl?: string;
  name?: string;
  species?: string;
  className?: string;
  rarity?: string;
  attributes?: CardAttributes;
  level?: number;
  xp?: number;
}

const normalizeCard = (card: any): CardDTO => ({
  id: card.id,
  userId: card.userId ?? card.user_id ?? "",
  seed: Number(card.seed ?? 0),
  hashSeed: card.hashSeed ?? card.hash_seed ?? "",
  name: card.name ?? "",
  species: card.species ?? "",
  className: card.className ?? card.class ?? "",
  rarity: card.rarity ?? "comum",
  attributes: card.attributes ?? { strength: 0, speed: 0, intelligence: 0, endurance: 0 },
  visualMeta: card.visualMeta ?? card.visual_meta ?? undefined,
  marketValue: Number(card.marketValue ?? card.market_value ?? 0),
  imageUrl: card.imageUrl ?? card.image_url ?? "",
  level: Number(card.level ?? 1),
  xp: Number(card.xp ?? 0),
  createdAt: card.createdAt ?? card.created_at ?? "",
  updatedAt: card.updatedAt ?? card.updated_at ?? "",
});

const normalizeGamification = (row: any): GamificationDTO => ({
  userId: row.userId ?? row.user_id ?? "",
  plan: row.plan ?? "free",
  usageScore: Number(row.usageScore ?? row.usage_score ?? 0),
  xp: Number(row.xp ?? 0),
  createdAt: row.createdAt ?? row.created_at ?? "",
  updatedAt: row.updatedAt ?? row.updated_at ?? "",
});

const normalizeAccount = (row: any): InternalAccountDTO => ({
  userId: row.userId ?? row.user_id ?? "",
  balance: Number(row.balance ?? 0),
  updatedAt: row.updatedAt ?? row.updated_at ?? "",
});

const normalizeListing = (row: any): CardListingDTO => ({
  id: row.id,
  cardId: row.cardId ?? row.card_id ?? "",
  sellerUserId: row.sellerUserId ?? row.seller_user_id ?? "",
  price: Number(row.price ?? 0),
  status: row.status ?? "active",
  createdAt: row.createdAt ?? row.created_at ?? "",
  imageUrl: row.imageUrl ?? row.image_url ?? "",
  name: row.name ?? "",
  species: row.species ?? "",
  className: row.className ?? row.class ?? "",
  rarity: row.rarity ?? "comum",
  attributes: row.attributes ?? undefined,
  level: row.level ? Number(row.level) : undefined,
  xp: row.xp ? Number(row.xp) : undefined,
});

export async function fetchUserCard(userId: string): Promise<CardDTO> {
  const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Falha ao carregar carta");
  }
  return normalizeCard(await res.json());
}

export async function createUserCard(userId: string, cpf: string): Promise<CardDTO> {
  const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Falha ao criar carta");
  }
  return normalizeCard(await res.json());
}

export async function addCardXp(userId: string, amount: number): Promise<CardDTO> {
  const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(userId)}/xp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Falha ao adicionar XP");
  return normalizeCard(await res.json());
}

export async function upsertGamification(payload: { userId: string; plan?: GamificationDTO["plan"]; usageScore?: number; }): Promise<GamificationDTO> {
  const res = await fetch(`${API_BASE}/gamification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao salvar gamificação");
  return normalizeGamification(await res.json());
}

export async function fetchInternalAccount(userId: string): Promise<InternalAccountDTO> {
  const res = await fetch(`${API_BASE}/internal-accounts?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Falha ao carregar saldo interno");
  return normalizeAccount(await res.json());
}

export async function creditInternalAccount(payload: { userId: string; amount: number; reason?: string }): Promise<InternalAccountDTO> {
  const res = await fetch(`${API_BASE}/internal-accounts/credit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao creditar saldo interno");
  return normalizeAccount(await res.json());
}

export async function fetchCardListings(status: string = "active"): Promise<CardListingDTO[]> {
  const res = await fetch(`${API_BASE}/card-listings?status=${encodeURIComponent(status)}`);
  if (!res.ok) throw new Error("Falha ao carregar marketplace");
  const data = await res.json();
  return data.map(normalizeListing);
}

export async function createCardListing(payload: { userId: string; cardId: string; price: number }): Promise<CardListingDTO> {
  const res = await fetch(`${API_BASE}/card-listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar anúncio");
  return normalizeListing(await res.json());
}

export async function buyCardListing(listingId: string, buyerId: string) {
  const res = await fetch(`${API_BASE}/card-listings/${listingId}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyerId }),
  });
  if (!res.ok) throw new Error("Falha ao comprar carta");
  return res.json();
}
