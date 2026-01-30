export interface InterfaceCardAttributes {
  strength: number;
  speed: number;
  intelligence: number;
  endurance: number;
}

export interface InterfaceCard {
  id: string;
  userId: string;
  seed: number;
  name: string;
  species: string;
  className: string;
  rarity: "comum" | "raro" | "epico" | "lendario";
  attributes: InterfaceCardAttributes;
  level: number;
  xp: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterfaceCardListing {
  id: string;
  cardId: string;
  sellerUserId: string;
  price: number;
  status: string;
  createdAt?: string;
  name?: string;
  species?: string;
  className?: string;
  rarity?: string;
  attributes?: InterfaceCardAttributes;
  level?: number;
  xp?: number;
}

export interface InterfaceGamification {
  userId: string;
  plan: "free" | "pro" | "enterprise";
  usageScore: number;
  xp: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterfaceInternalAccount {
  userId: string;
  balance: number;
  updatedAt?: string;
}
