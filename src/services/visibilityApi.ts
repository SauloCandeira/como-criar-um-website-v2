const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type ProductType = "digital" | "fisico" | "servico" | "assinatura" | "projeto";

export interface MenuVisibilityResponse {
  userId: string;
  purchasedProducts: Array<{ id: string; type: ProductType }>;
  hasDigitalAccess: boolean;
  menus: {
    projects: boolean;
    marketplace: boolean;
    cart: boolean;
    purchases: boolean;
    redeems: boolean;
    mybot: boolean;
    dao: boolean;
  };
}

export async function fetchMenuVisibility(userId: string): Promise<MenuVisibilityResponse> {
  const res = await fetch(`${API_BASE}/menu-visibility?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Falha ao carregar visibilidade de menus");
  }
  return res.json();
}
