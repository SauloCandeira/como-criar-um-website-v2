const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface ProductDTO {
  id: string;
  name: string;
  price: string;
  description: string;
  productType?: string;
  baseProjectId?: string;
  templateId?: string;
  showOnHome?: boolean;
  showOnMarketplace?: boolean;
  purchasePrice?: string;
  salePrice?: string;
  finalPrice?: number;
  autoCouponCode?: string | null;
  autoCouponDiscount?: number;
}

const normalizeProduct = (product: any): ProductDTO => ({
  ...product,
  productType: product.productType ?? product.product_type ?? "digital",
  baseProjectId: product.baseProjectId ?? product.base_project_id ?? "",
  templateId: product.templateId ?? product.template_id ?? "",
  showOnHome: product.showOnHome ?? product.show_on_home ?? false,
  showOnMarketplace: product.showOnMarketplace ?? product.show_on_marketplace ?? false,
  purchasePrice: product.purchasePrice ?? product.purchase_price ?? "",
  salePrice: product.salePrice ?? product.sale_price ?? product.price ?? "",
  finalPrice: typeof product.finalPrice === "number" ? product.finalPrice : product.final_price,
  autoCouponCode: product.autoCouponCode ?? product.auto_coupon_code ?? null,
  autoCouponDiscount:
    typeof product.autoCouponDiscount === "number"
      ? product.autoCouponDiscount
      : Number(product.auto_coupon_discount ?? 0),
});

export async function fetchProducts(): Promise<ProductDTO[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("Falha ao carregar produtos");
  const data = await res.json();
  return data.map(normalizeProduct);
}

export async function createProduct(payload: Omit<ProductDTO, "id">) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar produto");
  return normalizeProduct(await res.json());
}

export async function updateProduct(id: string, payload: Omit<ProductDTO, "id">) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao editar produto");
  return normalizeProduct(await res.json());
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Falha ao excluir produto");
}
