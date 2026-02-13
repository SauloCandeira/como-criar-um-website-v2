const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

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

const prisma = new PrismaClient();

async function run() {
  const targetName = "Holding Kapital Technology";
  const project = await prisma.projects.findFirst({
    where: { name: targetName },
  });

  if (!project) {
    throw new Error(`Projeto não encontrado: ${targetName}`);
  }

  const nextVersion = Number(project.version ?? 1) || 1;

  const template = await prisma.templates.upsert({
    where: { id: project.id },
    create: {
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      version: nextVersion,
      is_active: true,
    },
    update: {
      name: project.name,
      description: project.description ?? "",
      version: nextVersion,
      is_active: true,
    },
  });

  const updated = await prisma.projects.update({
    where: { id: project.id },
    data: {
      is_template: true,
      template_id: project.id,
      template_version: Number(template.version ?? nextVersion) || nextVersion,
      base_project_id: null,
      created_from_purchase: false,
      updated_at: new Date(),
    },
  });

  console.log("Atualizado como template:", {
    id: updated.id,
    name: updated.name,
    is_template: updated.is_template,
    template_id: updated.template_id,
    template_version: updated.template_version,
  });
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
