const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface PurchaseDTO {
  id: string;
  userId: string;
  productId: string;
  price: number;
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
  price: Number(purchase.price ?? 0),
  status: purchase.status ?? "completed",
  createdAt: purchase.createdAt ?? purchase.created_at ?? "",
  productName: purchase.productName ?? purchase.product_name ?? "",
  productDescription: purchase.productDescription ?? purchase.product_description ?? "",
  salePrice: purchase.salePrice ?? purchase.sale_price ?? "",
  purchasePrice: purchase.purchasePrice ?? purchase.purchase_price ?? "",
});

export async function fetchPurchases(userId?: string): Promise<PurchaseDTO[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`${API_BASE}/purchases${query}`);
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
