const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface ProductDTO {
  id: string;
  name: string;
  price: string;
  description: string;
}

export async function fetchProducts(): Promise<ProductDTO[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("Falha ao carregar produtos");
  return res.json();
}

export async function createProduct(payload: Omit<ProductDTO, "id">) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar produto");
  return res.json();
}

export async function updateProduct(id: string, payload: Omit<ProductDTO, "id">) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao editar produto");
  return res.json();
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Falha ao excluir produto");
}
