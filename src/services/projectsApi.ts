const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  repository: string;
  domain: string;
  hosting: string;
  status: string;
  paid: boolean;
  isPublic: boolean;
}

const normalizeProject = (project: any): ProjectDTO => ({
  ...project,
  isPublic: project.isPublic ?? project.is_public ?? true,
});

export async function fetchProjects(): Promise<ProjectDTO[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error("Falha ao carregar projetos");
  const data = await res.json();
  return data.map(normalizeProject);
}

export async function createProject(payload: Omit<ProjectDTO, "id">) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar projeto");
  const data = await res.json();
  return normalizeProject(data);
}

export async function updateProject(id: string, payload: Omit<ProjectDTO, "id">) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
