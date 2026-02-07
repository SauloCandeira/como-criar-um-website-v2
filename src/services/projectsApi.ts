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
  productId?: string;
  baseProjectId?: string;
  createdFromPurchase?: boolean;
  isTemplate?: boolean;
  purchaseId?: string;
  htmlContent?: string;
  cssContent?: string;
  createdAt?: string;
  updatedAt?: string;
}

const normalizeProject = (project: any): ProjectDTO => ({
  ...project,
  isPublic: project.isPublic ?? project.is_public ?? true,
  projectType: project.projectType ?? project.project_type ?? '',
  salePrice: project.salePrice ?? project.sale_price ?? '',
  productionCost: project.productionCost ?? project.production_cost ?? '',
  ownerUserId: project.ownerUserId ?? project.owner_user_id ?? '',
  productId: project.productId ?? project.product_id ?? '',
  baseProjectId: project.baseProjectId ?? project.base_project_id ?? '',
  createdFromPurchase: project.createdFromPurchase ?? project.created_from_purchase ?? false,
  isTemplate: project.isTemplate ?? project.is_template ?? false,
  purchaseId: project.purchaseId ?? project.purchase_id ?? '',
  htmlContent: project.htmlContent ?? project.html_content ?? '',
  cssContent: project.cssContent ?? project.css_content ?? '',
  createdAt: project.createdAt ?? project.created_at ?? '',
  updatedAt: project.updatedAt ?? project.updated_at ?? '',
  purchaseCount: Number.isFinite(Number(project.purchaseCount ?? project.purchase_count))
    ? Number(project.purchaseCount ?? project.purchase_count)
    : 0,
});

export interface ProjectContentDTO {
  projectId: string;
  htmlContent: string;
  cssContent: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchProjects(userId?: string, scope: "visible" | "all" = "visible"): Promise<ProjectDTO[]> {
  const query = new URLSearchParams();
  if (userId) query.set("userId", userId);
  if (scope) query.set("scope", scope);
  const qs = query.toString();
  const res = await fetch(`${API_BASE}/projects${qs ? `?${qs}` : ''}`);
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
      productId: payload.productId,
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
      productId: payload.productId,
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

export async function fetchProjectContent(projectId: string, userId: string): Promise<ProjectContentDTO> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/content?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Falha ao carregar conteúdo do projeto");
  return res.json();
}

export async function updateProjectContent(projectId: string, payload: { userId: string; htmlContent: string; cssContent: string }) {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao salvar conteúdo do projeto");
  return res.json();
}
