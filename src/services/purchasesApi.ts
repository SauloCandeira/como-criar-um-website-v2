const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface PurchaseDTO {
  id: string;
  userId: string;
  productId: string;
  projectId?: string;
  projectName?: string;
  baseProjectId?: string;
  baseProjectName?: string;
  price: number;
  purchaseType?: string;
  redeemed?: boolean;
  status: string;
  createdAt: string;
  productName?: string;
  productDescription?: string;
  salePrice?: string;
  purchasePrice?: string;
}

const normalizePurchase = (purchase: any): PurchaseDTO => ({
  id: purchase.id,
  userId: purchase.userId ?? purchase.user_id ?? "",
  productId: purchase.productId ?? purchase.product_id ?? "",
  projectId: purchase.projectId ?? purchase.project_id ?? "",
  projectName: purchase.projectName ?? purchase.project_name ?? "",
  baseProjectId: purchase.baseProjectId ?? purchase.base_project_id ?? "",
  baseProjectName: purchase.baseProjectName ?? purchase.base_project_name ?? "",
  price: Number(purchase.price ?? 0),
  purchaseType: purchase.purchaseType ?? purchase.purchase_type ?? "paid",
  redeemed: Boolean(purchase.redeemed),
  status: purchase.status ?? "completed",
  createdAt: purchase.createdAt ?? purchase.created_at ?? "",
  productName: purchase.productName ?? purchase.product_name ?? "",
  productDescription: purchase.productDescription ?? purchase.product_description ?? "",
  salePrice: purchase.salePrice ?? purchase.sale_price ?? "",
  purchasePrice: purchase.purchasePrice ?? purchase.purchase_price ?? "",
});

export async function fetchPurchases(userId?: string, purchaseType?: "paid" | "free"): Promise<PurchaseDTO[]> {
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (purchaseType) params.set("purchaseType", purchaseType);
  const query = params.toString();
  const res = await fetch(`${API_BASE}/purchases${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error("Falha ao carregar compras");
  const data = await res.json();
  return data.map(normalizePurchase);
}

export async function createPurchase(payload: { userId: string; productId: string }) {
  const res = await fetch(`${API_BASE}/purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Falha ao registrar compra");
  }
  const data = await res.json();
  return data;
}

export async function redeemFreeProduct(payload: { productId: string; userId: string }) {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(payload.productId)}/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: payload.userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.details || "Falha ao resgatar produto gratuito");
  }
  return res.json();
}

export async function redeemPurchase(payload: { purchaseId: string; userId: string }) {
  const res = await fetch(`${API_BASE}/purchases/${encodeURIComponent(payload.purchaseId)}/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: payload.userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Falha ao resgatar projeto");
  }
  return res.json();
}
