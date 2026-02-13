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
  version?: number;
  templateId?: string;
  templateVersion?: number;
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
  version: Number.isFinite(Number(project.version)) ? Number(project.version) : 1,
  templateId: project.templateId ?? project.template_id ?? '',
  templateVersion: Number.isFinite(Number(project.templateVersion ?? project.template_version))
    ? Number(project.templateVersion ?? project.template_version)
    : undefined,
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

export interface ProjectFileDTO {
  id: string;
  projectId: string;
  fileName: string;
  fileType: string;
  content: string;
  storagePath?: string;
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
      templateId: payload.templateId,
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

export async function cloneTemplate(templateId: string, userId: string) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/clone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Falha ao clonar template");
  const data = await res.json();
  return normalizeProject(data);
}

const normalizeProjectFile = (file: any): ProjectFileDTO => ({
  id: file.id,
  projectId: file.projectId ?? file.project_id ?? "",
  fileName: file.fileName ?? file.file_name ?? "",
  fileType: file.fileType ?? file.file_type ?? "html",
  content: file.content ?? "",
  storagePath: file.storagePath ?? file.storage_path ?? "",
  createdAt: file.createdAt ?? file.created_at ?? "",
  updatedAt: file.updatedAt ?? file.updated_at ?? "",
});

export async function fetchProjectFiles(projectId: string, userId: string): Promise<ProjectFileDTO[]> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Falha ao carregar arquivos do projeto");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeProjectFile) : [];
}

export async function createProjectFile(projectId: string, payload: { userId: string; fileName: string; fileType: string; content: string }) {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar arquivo do projeto");
  const data = await res.json();
  return normalizeProjectFile(data);
}

export async function updateProjectFile(projectId: string, fileId: string, payload: { userId: string; fileName: string; fileType: string; content: string }) {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao atualizar arquivo do projeto");
  const data = await res.json();
  return normalizeProjectFile(data);
}

export async function deleteProjectFile(projectId: string, fileId: string, userId: string) {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Falha ao excluir arquivo do projeto");
}
