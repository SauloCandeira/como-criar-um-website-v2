const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  projectType?: string;
  salePrice?: string;
  productionCost?: string;
  purchaseCount?: number;
  repository: string;
  domain: string;
  hosting: string;
  status: string;
  paid: boolean;
  isPublic: boolean;
  ownerUserId?: string;
}

const normalizeProject = (project: any): ProjectDTO => ({
  ...project,
  isPublic: project.isPublic ?? project.is_public ?? true,
  projectType: project.projectType ?? project.project_type ?? '',
  salePrice: project.salePrice ?? project.sale_price ?? '',
  productionCost: project.productionCost ?? project.production_cost ?? '',
  ownerUserId: project.ownerUserId ?? project.owner_user_id ?? '',
  purchaseCount: Number.isFinite(Number(project.purchaseCount ?? project.purchase_count))
    ? Number(project.purchaseCount ?? project.purchase_count)
    : 0,
});

export async function fetchProjects(userId?: string): Promise<ProjectDTO[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const res = await fetch(`${API_BASE}/projects${query}`);
  if (!res.ok) throw new Error("Falha ao carregar projetos");
  const data = await res.json();
  return data.map(normalizeProject);
}

export async function createProject(payload: Omit<ProjectDTO, "id">) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      projectType: payload.projectType,
      salePrice: payload.salePrice,
      productionCost: payload.productionCost,
      purchaseCount: payload.purchaseCount,
      ownerUserId: payload.ownerUserId,
    }),
  });
  if (!res.ok) throw new Error("Falha ao criar projeto");
  const data = await res.json();
  return normalizeProject(data);
}

export async function updateProject(id: string, payload: Omit<ProjectDTO, "id">) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      projectType: payload.projectType,
      salePrice: payload.salePrice,
      productionCost: payload.productionCost,
      purchaseCount: payload.purchaseCount,
      ownerUserId: payload.ownerUserId,
    }),
  });
  if (!res.ok) throw new Error("Falha ao editar projeto");
  const data = await res.json();
  return normalizeProject(data);
}

export async function deleteProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Falha ao excluir projeto");
}
