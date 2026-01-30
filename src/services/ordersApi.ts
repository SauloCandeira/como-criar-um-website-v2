const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface OrderDTO {
  id: string;
  userId: string;
  orderType: string;
  price: number;
  quantity: number;
  status: string;
  assetName?: string;
  ticker?: string;
  createdAt?: string;
}

const normalizeOrder = (order: any): OrderDTO => ({
  id: order.id,
  userId: order.userId ?? order.user_id ?? "",
  orderType: order.orderType ?? order.order_type ?? "buy",
  price: Number(order.price ?? 0),
  quantity: Number(order.quantity ?? 0),
  status: order.status ?? "open",
  assetName: order.assetName ?? order.asset_name ?? "",
  ticker: order.ticker ?? "",
  createdAt: order.createdAt ?? order.created_at ?? "",
});

export async function fetchOrders(): Promise<OrderDTO[]> {
  const res = await fetch(`${API_BASE}/orders`);
  if (!res.ok) throw new Error("Falha ao carregar ordens");
  const data = await res.json();
  return data.map(normalizeOrder);
}

export async function createOrder(payload: {
  userId: string;
  assetId: string;
  orderType: 'buy' | 'sell';
  price?: number;
  quantity: number;
}) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Falha ao criar ordem");
  }
  const data = await res.json();
  return normalizeOrder(data);
}
