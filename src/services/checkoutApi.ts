const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface ProductCheckoutResponse {
  order: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    payment_reference: string;
    created_at: string;
  };
  product: {
    id: string;
    name: string;
    description?: string;
  };
  coupon: {
    code: string;
    discount: number;
    autoApply: boolean;
  } | null;
  amounts: {
    original: number;
    discount: number;
    final: number;
  };
  projectId?: string;
  purchaseId?: string;
}

export async function createProductCheckout(payload: { productId: string; userId: string }) {
  const res = await fetch(`${API_BASE}/checkout/products/${encodeURIComponent(payload.productId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: payload.userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Falha ao concluir checkout");
  }
  return (await res.json()) as ProductCheckoutResponse;
}
