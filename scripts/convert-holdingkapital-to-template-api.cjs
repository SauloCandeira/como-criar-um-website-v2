const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

const API_BASE = process.env.VITE_API_BASE || process.env.API_BASE || "";
if (!API_BASE) {
  console.error("API base não definido. Defina VITE_API_BASE no .env.");
  process.exit(1);
}

async function run() {
  const listUrl = `${API_BASE}/projects?scope=all`;
  const res = await fetch(listUrl);
  if (!res.ok) {
    throw new Error(`Falha ao listar projetos: ${res.status}`);
  }
  const projects = await res.json();
  const targetName = "Holding Kapital Technology";
  const project = projects.find((item) => (item.name || "").toLowerCase() === targetName.toLowerCase());
  if (!project) {
    throw new Error(`Projeto não encontrado: ${targetName}`);
  }

  const payload = {
    name: project.name,
    description: project.description ?? "",
    projectType: project.project_type ?? project.projectType ?? "",
    salePrice: project.sale_price ?? project.salePrice ?? "",
    productionCost: project.production_cost ?? project.productionCost ?? "",
    purchaseCount: Number(project.purchase_count ?? project.purchaseCount ?? 0),
    repository: project.repository ?? "",
    domain: project.domain ?? "",
    hosting: project.hosting ?? "",
    status: project.status ?? "Ativo",
    paid: !!(project.paid ?? false),
    isPublic: project.is_public ?? project.isPublic ?? true,
    ownerUserId: project.owner_user_id ?? project.ownerUserId ?? "",
    productId: project.product_id ?? project.productId ?? null,
    baseProjectId: null,
    createdFromPurchase: false,
    isTemplate: true,
    htmlContent: project.html_content ?? project.htmlContent ?? "",
    cssContent: project.css_content ?? project.cssContent ?? "",
  };

  const updateUrl = `${API_BASE}/projects/${encodeURIComponent(project.id)}`;
  const updateRes = await fetch(updateUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Falha ao atualizar projeto: ${updateRes.status} ${errText}`);
  }
  const updated = await updateRes.json();
  console.log("Atualizado como template:", {
    id: updated.id,
    name: updated.name,
    is_template: updated.is_template ?? updated.isTemplate,
    template_id: updated.template_id ?? updated.templateId,
    template_version: updated.template_version ?? updated.templateVersion,
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
