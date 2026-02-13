const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface TemplateDTO {
  id: string;
  name: string;
  description: string;
  blogContent: string;
  level: string;
  category: string;
  version: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateTaskDTO {
  id: string;
  templateId: string;
  title: string;
  description: string;
  status: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateResourceDTO {
  id: string;
  templateId: string;
  title: string;
  type: string;
  content: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateFileDTO {
  id: string;
  templateId: string;
  fileName: string;
  fileType: string;
  content: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

const normalizeTemplate = (template: any): TemplateDTO => ({
  id: template.id,
  name: template.name ?? "",
  description: template.description ?? "",
  blogContent: template.blogContent ?? template.blog_content ?? "",
  level: template.level ?? "",
  category: template.category ?? "",
  version: Number(template.version ?? 1),
  isActive: template.isActive ?? template.is_active ?? true,
  createdAt: template.createdAt ?? template.created_at ?? "",
  updatedAt: template.updatedAt ?? template.updated_at ?? "",
});

const normalizeTemplateTask = (task: any): TemplateTaskDTO => ({
  id: task.id,
  templateId: task.templateId ?? task.template_id ?? "",
  title: task.title ?? "",
  description: task.description ?? "",
  status: task.status ?? "TODO",
  position: Number(task.position ?? 0),
  createdAt: task.createdAt ?? task.created_at ?? "",
  updatedAt: task.updatedAt ?? task.updated_at ?? "",
});

const normalizeTemplateResource = (resource: any): TemplateResourceDTO => ({
  id: resource.id,
  templateId: resource.templateId ?? resource.template_id ?? "",
  title: resource.title ?? "",
  type: resource.type ?? "link",
  content: resource.content ?? "",
  position: Number(resource.position ?? 0),
  createdAt: resource.createdAt ?? resource.created_at ?? "",
  updatedAt: resource.updatedAt ?? resource.updated_at ?? "",
});

const normalizeTemplateFile = (file: any): TemplateFileDTO => ({
  id: file.id,
  templateId: file.templateId ?? file.template_id ?? "",
  fileName: file.fileName ?? file.file_name ?? "",
  fileType: file.fileType ?? file.file_type ?? "html",
  content: file.content ?? "",
  position: Number(file.position ?? 0),
  createdAt: file.createdAt ?? file.created_at ?? "",
  updatedAt: file.updatedAt ?? file.updated_at ?? "",
});

export async function fetchTemplates(includeInactive = false): Promise<TemplateDTO[]> {
  const res = await fetch(`${API_BASE}/templates?includeInactive=${includeInactive ? "true" : "false"}`);
  if (!res.ok) throw new Error("Falha ao carregar templates");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeTemplate) : [];
}

export async function fetchTemplateById(id: string): Promise<TemplateDTO> {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Falha ao carregar template");
  const data = await res.json();
  return normalizeTemplate(data);
}

export async function createTemplate(payload: { name: string; description?: string; blogContent?: string; level?: string; category?: string; adminId: string }) {
  const res = await fetch(`${API_BASE}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar template");
  const data = await res.json();
  return normalizeTemplate(data);
}

export async function updateTemplate(id: string, payload: { name: string; description?: string; blogContent?: string; level?: string; category?: string; adminId: string }) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao atualizar template");
  const data = await res.json();
  return normalizeTemplate(data);
}

export async function deactivateTemplate(id: string, adminId: string) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(id)}/deactivate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Falha ao desativar template");
  const data = await res.json();
  return normalizeTemplate(data);
}

export async function fetchTemplateTasks(templateId: string): Promise<TemplateTaskDTO[]> {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/tasks`);
  if (!res.ok) throw new Error("Falha ao carregar tarefas do template");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeTemplateTask) : [];
}

export async function createTemplateTask(templateId: string, payload: { title: string; description?: string; status?: string; position?: number; adminId: string }) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar tarefa do template");
  const data = await res.json();
  return normalizeTemplateTask(data);
}

export async function updateTemplateTask(templateId: string, taskId: string, payload: { title: string; description?: string; status?: string; position?: number; adminId: string }) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao atualizar tarefa do template");
  const data = await res.json();
  return normalizeTemplateTask(data);
}

export async function deleteTemplateTask(templateId: string, taskId: string, adminId: string) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Falha ao excluir tarefa do template");
}

export async function fetchTemplateResources(templateId: string): Promise<TemplateResourceDTO[]> {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/resources`);
  if (!res.ok) throw new Error("Falha ao carregar recursos do template");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeTemplateResource) : [];
}

export async function createTemplateResource(templateId: string, payload: { title: string; type?: string; content?: string; position?: number; adminId: string }) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar recurso do template");
  const data = await res.json();
  return normalizeTemplateResource(data);
}

export async function updateTemplateResource(templateId: string, resourceId: string, payload: { title: string; type?: string; content?: string; position?: number; adminId: string }) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/resources/${encodeURIComponent(resourceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao atualizar recurso do template");
  const data = await res.json();
  return normalizeTemplateResource(data);
}

export async function deleteTemplateResource(templateId: string, resourceId: string, adminId: string) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/resources/${encodeURIComponent(resourceId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Falha ao excluir recurso do template");
}

export async function fetchTemplateFiles(templateId: string): Promise<TemplateFileDTO[]> {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/files`);
  if (!res.ok) throw new Error("Falha ao carregar arquivos do template");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeTemplateFile) : [];
}

export async function createTemplateFile(templateId: string, payload: { fileName: string; fileType?: string; content?: string; position?: number; adminId: string }) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar arquivo do template");
  const data = await res.json();
  return normalizeTemplateFile(data);
}

export async function updateTemplateFile(templateId: string, fileId: string, payload: { fileName: string; fileType?: string; content?: string; position?: number; adminId: string }) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/files/${encodeURIComponent(fileId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao atualizar arquivo do template");
  const data = await res.json();
  return normalizeTemplateFile(data);
}

export async function deleteTemplateFile(templateId: string, fileId: string, adminId: string) {
  const res = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Falha ao excluir arquivo do template");
}
