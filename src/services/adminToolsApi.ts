const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const buildError = async (res: Response, fallback: string) => {
  const details = await res.text().catch(() => "");
  const suffix = details ? `: ${details}` : "";
  return new Error(`${fallback} (status ${res.status})${suffix}`);
};

async function postAdminAction(path: string, adminId: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw await buildError(res, "Falha ao executar ação admin");
  return res.json();
}

export async function resetAllPurchases(adminId: string) {
  return postAdminAction("/admin-tools/reset-purchases", adminId);
}

export async function resetPaidSales(adminId: string) {
  return postAdminAction("/admin-tools/reset-sales", adminId);
}

export async function resetFreeRedeems(adminId: string) {
  return postAdminAction("/admin-tools/reset-redeems", adminId);
}

export async function resetClonedProjects(adminId: string) {
  return postAdminAction("/admin-tools/reset-cloned-projects", adminId);
}

export async function resetFull(adminId: string) {
  return postAdminAction("/admin-tools/reset-full", adminId);
}

export async function resetIaTasks(adminId: string) {
  return postAdminAction("/admin-tools/reset-ia-tasks", adminId);
}

export async function migrateIaTasks(adminId: string) {
  return postAdminAction("/admin-tools/migrate-ia-tasks", adminId);
}
