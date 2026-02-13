import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
const archiver = require("archiver");
const AdmZip = require("adm-zip");
const Busboy = require("busboy");
import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import crypto from "crypto";
import swaggerUi from "swagger-ui-express";
import logger from "./lib/logger";
import {
  fetchSonarIssues,
  fetchSonarSummary,
  runAutonomousFix,
  type SonarConfig,
  classifyRisk,
} from "./services/hktechAI.service";
import { applyCoupon, calculateOrderTotal } from "./services/commerce";
import { cloneTemplate as cloneTemplateService } from "./services/templateCloner";
import { swaggerSpec } from "./docs/openapi";

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

const formatConsoleArgs = (args: unknown[]) =>
  args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch (error) {
        return String(arg);
      }
    })
    .join(" ");

const bootstrapLogger = () => {
  const original = console;
  (globalThis as any).console = {
    ...original,
    log: (...args: unknown[]) => logger.info({ msg: formatConsoleArgs(args) }),
    info: (...args: unknown[]) => logger.info({ msg: formatConsoleArgs(args) }),
    warn: (...args: unknown[]) => logger.warn({ msg: formatConsoleArgs(args) }),
    error: (...args: unknown[]) => {
      const err = args.find((arg) => arg instanceof Error) as Error | undefined;
      logger.error({ err, msg: formatConsoleArgs(args) });
    },
  };
};

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
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
};

const validateEnv = () => {
  if (process.env.NODE_ENV === "test") return;
  const missing: string[] = [];
  const isCi = Boolean(process.env.CI);

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasCloudSql = Boolean(
    process.env.INSTANCE_CONNECTION_NAME &&
      process.env.DB_USER &&
      process.env.DB_PASS &&
      process.env.DB_NAME
  );

  if (!hasDatabaseUrl && !hasCloudSql) {
    if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
    if (!process.env.INSTANCE_CONNECTION_NAME) missing.push("INSTANCE_CONNECTION_NAME");
    if (!process.env.DB_USER) missing.push("DB_USER");
    if (!process.env.DB_PASS) missing.push("DB_PASS");
    if (!process.env.DB_NAME) missing.push("DB_NAME");
  }

  if (isCi && !process.env.SONARCLOUD_TOKEN) {
    missing.push("SONARCLOUD_TOKEN");
  }

  const requireOpenAi = process.env.HKTECH_AI_ENABLED !== "false";
  if (requireOpenAi && !process.env.OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY");
  }

  if (missing.length) {
    logger.fatal(
      {
        missing,
        hint: "Set required variables in runtime/CI environment. OPENAI_API_KEY can be skipped only when HKTECH_AI_ENABLED=false.",
      },
      "Missing required environment variables"
    );
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

bootstrapLogger();
loadEnvFile(path.join(__dirname, "..", ".env"));
loadEnvFile(path.join(__dirname, "..", "..", ".env"));
validateEnv();

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
});

const DEPLOY_VERSION = "2026-01-28-4";

const LANDINGPAGE_TEMPLATE_NAME = "Landingpage Profissional";
const LANDINGPAGE_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Página Institucional</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; }
    header { padding: 24px; background-color: #0f3c62; color: #fff; text-align: center; }
    header p { font-size: 1.2em; }
    section { padding: 20px; margin: 10px; }
    section h2 { color: #1e8bff; }
    ul { list-style-type: none; padding: 0; }
    ul li { background-color: #1e8bff; margin: 10px 0; padding: 10px; border-radius: 5px; color: #fff; }
    footer { background-color: #0f3c62; padding: 10px; text-align: center; color: #fff; }
    footer p { margin: 0; }
  </style>
</head>
<body>
  <header>
    <h1>Bem-vindo à Nossa Empresa</h1>
    <p>Somos líderes no mercado de soluções inovadoras.</p>
  </header>
  <section>
    <h2>Quem Somos</h2>
    <p>Somos uma empresa focada em oferecer soluções tecnológicas para o mercado global.</p>
  </section>
  <section>
    <h2>Nossos Serviços</h2>
    <ul>
      <li>Consultoria em Tecnologia</li>
      <li>Desenvolvimento de Software</li>
      <li>Treinamentos e Suporte</li>
    </ul>
  </section>
  <footer>
    <p>© 2026 Holding Kapital Technology</p>
  </footer>
</body>
</html>`;

const LANDINGPAGE_TEMPLATE_CSS = `body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; }
header { padding: 24px; background-color: #0f3c62; color: #fff; text-align: center; }
header p { font-size: 1.2em; }
section { padding: 20px; margin: 10px; }
section h2 { color: #1e8bff; }
ul { list-style-type: none; padding: 0; }
ul li { background-color: #1e8bff; margin: 10px 0; padding: 10px; border-radius: 5px; color: #fff; }
footer { background-color: #0f3c62; padding: 10px; text-align: center; color: #fff; }
footer p { margin: 0; }`;

const DEFAULT_TEMPLATE_FILES = [
  {
    fileName: "index.html",
    fileType: "html",
    content: "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>Novo Template</title>\n</head>\n<body>\n  <main>\n    <h1>Novo Template</h1>\n    <p>Edite o HTML, CSS e JS para personalizar este projeto.</p>\n  </main>\n</body>\n</html>",
  },
  { fileName: "style.css", fileType: "css", content: "body { font-family: Arial, sans-serif; }" },
  { fileName: "script.js", fileType: "js", content: "// Template pronto" },
];

const normalizeStorageUserId = (value: string) => String(value || "").trim().toLowerCase();

const sanitizeFileName = (value: string) => {
  const cleaned = String(value || "")
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim();
  const segments = cleaned.split("/").filter((segment) => segment && segment !== "." && segment !== "..");
  return segments.join("/");
};

const parseStorageUrl = (storageUrl: string) => {
  const trimmed = String(storageUrl || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("gs://")) {
    const withoutScheme = trimmed.replace("gs://", "");
    const [bucket, ...rest] = withoutScheme.split("/");
    return bucket ? { bucket, path: rest.join("/") } : null;
  }
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("firebasestorage.googleapis.com")) {
      const match = url.pathname.match(/\/b\/([^/]+)\/o\/(.+)$/);
      if (!match) return null;
      const bucket = match[1];
      const objectPath = decodeURIComponent(match[2]);
      return { bucket, path: objectPath };
    }
    if (url.hostname === "storage.googleapis.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const bucket = parts.shift();
      if (!bucket) return null;
      return { bucket, path: parts.join("/") };
    }
  } catch (error) {
    return null;
  }
  return null;
};

const readStorageText = async (storageUrl: string) => {
  const parsed = parseStorageUrl(storageUrl);
  if (parsed) {
    const bucket = admin.storage().bucket(parsed.bucket);
    const [buffer] = await bucket.file(parsed.path).download();
    return buffer.toString("utf8");
  }
  const res = await fetch(storageUrl);
  if (!res.ok) {
    throw httpError(502, "Falha ao ler arquivo no Storage.");
  }
  return res.text();
};

const saveStorageText = async (storagePath: string, content: string) => {
  const bucket = admin.storage().bucket();
  await bucket.file(storagePath).save(content, { contentType: "text/markdown" });
  return `gs://${bucket.name}/${storagePath}`;
};

const resolveContentType = (fileName: string, fileType?: string) => {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  const type = (fileType || ext).toLowerCase();
  switch (type) {
    case "html":
      return "text/html; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "js":

    case "javascript":
      return "application/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "svg":
      return "image/svg+xml";
    default:
      return "text/plain; charset=utf-8";
  }
};

const promptCategoryRules = [
  { match: "orchestrator", category: "orchestrator" },
  { match: "context", category: "system" },
  { match: "architecture", category: "architecture" },
  { match: "security", category: "security" },
  { match: "workflow", category: "workflow" },
  { match: "bootstrap", category: "bootstrap" },
  { match: "mybot", category: "mybot" },
];

const inferPromptCategory = (value: string, fallback = "governance") => {
  const lower = String(value || "").toLowerCase();
  const rule = promptCategoryRules.find((entry) => lower.includes(entry.match));
  return rule?.category ?? fallback;
};

const toPromptTitle = (filename: string) => {
  const base = String(filename || "").replace(/\.md$/i, "");
  return base
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const hashContent = (content: string) => {
  return crypto.createHash("sha256").update(content).digest("hex");
};

const ensureUserStorageRoot = async (userId: string) => {
  const normalizedUserId = normalizeStorageUserId(userId);
  if (!normalizedUserId) return;
  const bucket = admin.storage().bucket();
  await bucket.file(`users/${normalizedUserId}/mybot/.keep`).save("", { contentType: "text/plain" });
};

const ensureProjectStorageFolders = async (userId: string, projectId: string) => {
  const normalizedUserId = normalizeStorageUserId(userId);
  if (!normalizedUserId || !projectId) return;
  const bucket = admin.storage().bucket();
  await Promise.all([
    bucket.file(`users/${normalizedUserId}/projects/${projectId}/.keep`).save("", { contentType: "text/plain" }),
    bucket.file(`users/${normalizedUserId}/projects/${projectId}/assets/.keep`).save("", { contentType: "text/plain" }),
  ]);
};

const saveProjectFileToStorage = async (params: {
  userId: string;
  projectId: string;
  fileName: string;
  fileType?: string;
  content: string;
}) => {
  const normalizedUserId = normalizeStorageUserId(params.userId);
  if (!normalizedUserId) throw httpError(400, "userId inválido para storage.");
  const safeName = sanitizeFileName(params.fileName);
  if (!safeName) throw httpError(400, "fileName inválido.");
  const storagePath = `users/${normalizedUserId}/projects/${params.projectId}/${safeName}`;
  const bucket = admin.storage().bucket();
  await bucket.file(storagePath).save(String(params.content ?? ""), {
    contentType: resolveContentType(safeName, params.fileType),
    resumable: false,
    metadata: {
      cacheControl: "no-store",
    },
  });
  return storagePath;
};

const deleteProjectFileFromStorage = async (storagePath?: string | null) => {
  if (!storagePath) return;
  const bucket = admin.storage().bucket();
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
};

const buildPreviewHtml = (files: Array<{ file_name?: string; file_type?: string; content?: string }>) => {
  const normalized = files.map((file) => ({
    name: String(file.file_name || ""),
    type: String(file.file_type || ""),
    content: String(file.content || ""),
  }));
  const htmlFile = normalized.find((file) => file.name.toLowerCase() === "index.html")
    ?? normalized.find((file) => file.type.toLowerCase() === "html")
    ?? null;
  const cssContent = normalized
    .filter((file) => file.type.toLowerCase() === "css" || file.name.toLowerCase().endsWith(".css"))
    .map((file) => file.content)
    .join("\n\n");
  const jsContent = normalized
    .filter((file) => file.type.toLowerCase() === "js" || file.type.toLowerCase() === "javascript" || file.name.toLowerCase().endsWith(".js"))
    .map((file) => file.content)
    .join("\n\n");

  let html = htmlFile?.content || "";
  if (!html.trim()) {
    html = "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" /><title>Preview</title></head><body><div id=\"app\">Preview do projeto</div></body></html>";
  }

  if (cssContent) {
    if (html.includes("</head>")) {
      html = html.replace("</head>", `<style>${cssContent}</style></head>`);
    } else {
      html = `<style>${cssContent}</style>${html}`;
    }
  }

  if (jsContent) {
    if (html.includes("</body>")) {
      html = html.replace("</body>", `<script>${jsContent}</script></body>`);
    } else {
      html = `${html}<script>${jsContent}</script>`;
    }
  }

  return html;
};

export const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    }, "http_request");
  });
  next();
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", async (_req, res) => {
  let dbConnected = false;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      dbConnected = true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ err: error }, "Health check database connection failed");
  }

  res.json({
    status: "ok",
    database: dbConnected ? "connected" : "disconnected",
    version: process.env.APP_VERSION,
  });
});

let pool: Pool | null = null;
let connector: Connector | null = null;

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getSonarConfig(): SonarConfig {
  const token = process.env.SONARCLOUD_TOKEN || "";
  const projectKey = process.env.SONARCLOUD_PROJECT_KEY || "";
  const organization = process.env.SONARCLOUD_ORG || "";
  if (!token || !projectKey) {
    throw httpError(500, "Configuração do SonarCloud ausente.");
  }
  return { token, projectKey, organization };
}

function getGithubRepo() {
  const repoEnv = process.env.GITHUB_REPOSITORY || "";
  if (repoEnv.includes("/")) {
    const [owner, repo] = repoEnv.split("/");
    return { owner, repo };
  }
  const owner = process.env.GITHUB_OWNER || "";
  const repo = process.env.GITHUB_REPO || "";
  if (!owner || !repo) {
    throw httpError(500, "Configuração do GitHub ausente.");
  }
  return { owner, repo };
}

async function logHKTechAiReport(payload: {
  issueKeys: string[];
  filesModified: string[];
  risk: string;
  prLink?: string;
  qualityGate?: string;
  buildResult?: string;
  testResult?: string;
  durationMs?: number;
  confidenceScore?: number;
  status: string;
  reason?: string;
  createTask?: boolean;
}) {
  const reportSummary = payload.reason ? `Autofix ${payload.status}: ${payload.reason}` : `Autofix ${payload.status}`;
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureAiReportsTable(client);
    await ensureProjectTasksTable(client);

    const reportInsert = await client.query(
      "INSERT INTO ai_reports (domain, status, summary, decisions, risks, next_actions, issue_keys, files_modified, risk_classification, pr_link, quality_gate, build_result, test_result, execution_duration_ms, confidence_score) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, $15) RETURNING id",
      [
        "IA",
        payload.status,
        reportSummary,
        JSON.stringify([
          `Issues: ${payload.issueKeys.join(", ") || "—"}`,
          `Arquivos: ${payload.filesModified.join(", ") || "—"}`,
        ]),
        JSON.stringify([payload.risk || "indefinido"]),
        JSON.stringify(payload.prLink ? [`PR: ${payload.prLink}`] : []),
        JSON.stringify(payload.issueKeys || []),
        JSON.stringify(payload.filesModified || []),
        payload.risk || "",
        payload.prLink ?? "",
        payload.qualityGate ?? "",
        payload.buildResult ?? "not_run",
        payload.testResult ?? "not_run",
        payload.durationMs ?? null,
        payload.confidenceScore ?? null,
      ]
    );

    if (payload.createTask !== false) {
      const taskInsert = await client.query(
        "INSERT INTO project_tasks (project_id, title, description, status, position, generated_by_ai, domain, risk_level, pr_link, confidence_score, execution_result, origin, report_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id",
        [
          null,
          reportSummary,
          "",
          payload.status,
          0,
          true,
          "IA",
          payload.risk ?? "",
          payload.prLink ?? "",
          payload.confidenceScore ?? null,
          payload.reason ?? payload.status,
          payload.issueKeys?.length ? "Sonar" : "Automation",
          reportInsert.rows[0]?.id ?? null,
        ]
      );
      await tryStoreIaMemory(client, {
        content: reportSummary,
        contextType: "ai_report",
        relatedTaskId: taskInsert.rows[0]?.id ?? null,
      });
    }
  } finally {
    client.release();
  }
}

app.get("/ci/status", async (_req, res) => {
  try {
    const token = process.env.GITHUB_API_TOKEN || process.env.GITHUB_TOKEN || "";
    if (!token) {
      throw httpError(500, "Token GitHub ausente.");
    }
    const { owner, repo } = getGithubRepo();
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw httpError(502, text || "Falha ao consultar GitHub Actions.");
    }
    const data = await response.json();
    const runs = (data.workflow_runs ?? []).map((run: any) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      htmlUrl: run.html_url,
      updatedAt: run.updated_at,
      runNumber: run.run_number,
      headBranch: run.head_branch,
    }));
    res.json({ repository: `${owner}/${repo}`, runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar status CI.";
    res.status(500).json({ message });
  }
});

async function ensureCostsBillingCycleColumn(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query("ALTER TABLE costs ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'");
}

async function ensureProductsColumns(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureProductTypesTable(client);
  await ensureProductTypeConstraint(client);
  await ensureProjectsTable(client);
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS show_on_marketplace BOOLEAN DEFAULT false");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'digital'");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS base_project_id UUID");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS template_id UUID");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price TEXT DEFAULT ''");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price TEXT DEFAULT ''");
  await client.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_base_project_id_fkey') THEN ALTER TABLE products ADD CONSTRAINT products_base_project_id_fkey FOREIGN KEY (base_project_id) REFERENCES projects(id) ON DELETE SET NULL; END IF; END $$;"
  );
  await client.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_template_id_fkey') THEN ALTER TABLE products ADD CONSTRAINT products_template_id_fkey FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL; END IF; END $$;"
  );
  await client.query("CREATE INDEX IF NOT EXISTS products_template_id_idx ON products (template_id)");
}

async function ensureProductTypesTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS product_types (id TEXT PRIMARY KEY, label TEXT NOT NULL)"
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["digital", "Produto digital"]
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["fisico", "Produto físico"]
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["servico", "Serviço"]
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["assinatura", "Assinatura"]
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["projeto", "Projeto"]
  );
}

async function ensureProductTypeConstraint(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_fkey') THEN ALTER TABLE products ADD CONSTRAINT products_product_type_fkey FOREIGN KEY (product_type) REFERENCES product_types(id); END IF; END $$;"
  );
}


async function ensureProjectsTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS projects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT DEFAULT '', project_type TEXT DEFAULT '', sale_price TEXT DEFAULT '', production_cost TEXT DEFAULT '', purchase_count INTEGER DEFAULT 0, repository TEXT DEFAULT '', domain TEXT DEFAULT '', hosting TEXT DEFAULT '', status TEXT DEFAULT 'Ativo', paid BOOLEAN DEFAULT false, is_public BOOLEAN DEFAULT true, owner_user_id TEXT DEFAULT '', product_id UUID, base_project_id UUID, purchase_id UUID, created_from_purchase BOOLEAN DEFAULT false, is_template BOOLEAN DEFAULT false, html_content TEXT DEFAULT '', css_content TEXT DEFAULT '', version INTEGER DEFAULT 1, template_id UUID, template_version INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensureTemplatesTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT DEFAULT '', blog_content TEXT DEFAULT '', level VARCHAR(50) DEFAULT '', category VARCHAR(100) DEFAULT '', version INTEGER DEFAULT 1, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE templates ADD COLUMN IF NOT EXISTS blog_content TEXT DEFAULT ''");
  await client.query("ALTER TABLE templates ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT ''");
  await client.query("ALTER TABLE templates ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT ''");
  await client.query("CREATE INDEX IF NOT EXISTS templates_is_active_idx ON templates (is_active)");
}

async function ensureTemplateTasksTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS template_tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT DEFAULT '', status TEXT DEFAULT 'TODO', position INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS title TEXT");
  await client.query("ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''");
  await client.query("ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'TODO'");
  await client.query("ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0");
  await client.query("CREATE INDEX IF NOT EXISTS template_tasks_template_id_idx ON template_tasks (template_id)");
  await client.query(
    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='template_tasks' AND column_name='text') THEN UPDATE template_tasks SET title = COALESCE(title, text) WHERE title IS NULL; END IF; END $$;"
  );
  await client.query(
    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='template_tasks' AND column_name='task_order') THEN UPDATE template_tasks SET position = COALESCE(position, task_order) WHERE position IS NULL; END IF; END $$;"
  );
}

async function ensureTemplateResourcesTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS template_resources (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE, title VARCHAR(150) NOT NULL, type VARCHAR(50) DEFAULT 'link', content TEXT DEFAULT '', position INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE template_resources ADD COLUMN IF NOT EXISTS title VARCHAR(150)");
  await client.query("ALTER TABLE template_resources ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'link'");
  await client.query("ALTER TABLE template_resources ADD COLUMN IF NOT EXISTS content TEXT DEFAULT ''");
  await client.query("ALTER TABLE template_resources ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0");
  await client.query("CREATE INDEX IF NOT EXISTS template_resources_template_id_idx ON template_resources (template_id)");
}

async function ensureTemplateFilesTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS template_files (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE, file_name VARCHAR(150) NOT NULL, file_type VARCHAR(20) DEFAULT 'html', content TEXT DEFAULT '', position INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE template_files ADD COLUMN IF NOT EXISTS file_name VARCHAR(150)");
  await client.query("ALTER TABLE template_files ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'html'");
  await client.query("ALTER TABLE template_files ADD COLUMN IF NOT EXISTS content TEXT DEFAULT ''");
  await client.query("ALTER TABLE template_files ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0");
  await client.query("CREATE INDEX IF NOT EXISTS template_files_template_id_idx ON template_files (template_id)");
}

async function ensureProjectFilesTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS project_files (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE, file_name VARCHAR(150) NOT NULL, file_type VARCHAR(20) DEFAULT 'html', content TEXT DEFAULT '', storage_path TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE project_files ADD COLUMN IF NOT EXISTS file_name VARCHAR(150)");
  await client.query("ALTER TABLE project_files ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'html'");
  await client.query("ALTER TABLE project_files ADD COLUMN IF NOT EXISTS content TEXT DEFAULT ''");
  await client.query("ALTER TABLE project_files ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT ''");
  await client.query("ALTER TABLE project_files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await client.query("CREATE INDEX IF NOT EXISTS project_files_project_id_idx ON project_files (project_id)");
}

async function ensureProjectTasksTable(_client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  return;
}

async function ensureAiReportsTable(_client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  return;
}

async function ensureSystemConfigTable(_client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  return;
}

async function ensureIaConfig(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  const result = await client.query("SELECT value FROM system_config WHERE key = 'IA_CONFIG' LIMIT 1");
  if (result.rows[0]?.value) {
    return result.rows[0].value;
  }
  return {
    managedByAI: true,
    taskCreationPolicy: "AI_ALLOWED",
    allowAutoBacklogIfEmpty: true,
    maxTasksPerRun: 5,
    maxExecutionsPerHour: 2,
  };
}

async function ensureDefaultTemplate(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureTemplatesTable(client);
  const existing = await client.query(
    "SELECT id, version FROM templates WHERE lower(name) = lower($1) LIMIT 1",
    ["Default"]
  );
  if (existing.rows[0]) {
    return { id: existing.rows[0].id, version: Number(existing.rows[0].version ?? 1) };
  }
  const created = await client.query(
    "INSERT INTO templates (name, description, version, is_active) VALUES ($1, $2, 1, true) RETURNING id, version",
    ["Default", "Template padrão do sistema"]
  );
  return { id: created.rows[0].id, version: Number(created.rows[0].version ?? 1) };
}

async function cloneTemplateForPurchase(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  templateId: string,
  userId: string,
  productId: string,
  purchaseId: string
) {
  const cloned = await cloneTemplate(client, templateId, userId);
  if (cloned?.id) {
    await client.query(
      "UPDATE projects SET product_id = $1, purchase_id = $2, created_from_purchase = true, paid = true, updated_at = NOW() WHERE id = $3",
      [productId, purchaseId, cloned.id]
    );
  }
  return cloned;
}

async function bumpTemplateVersion(client: { query: (sql: string, params?: any[]) => Promise<any> }, templateId: string) {
  await client.query(
    "UPDATE templates SET version = COALESCE(version, 1) + 1, updated_at = NOW() WHERE id = $1",
    [templateId]
  );
}

async function ensureProjectsColumns(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureProjectsTable(client);
  const defaultTemplate = await ensureDefaultTemplate(client);
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS sale_price TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_cost TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_user_id TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS product_id UUID");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS base_project_id UUID");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS purchase_id UUID");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_from_purchase BOOLEAN DEFAULT false");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS html_content TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS css_content TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id UUID");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_version INTEGER");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
  await client.query("UPDATE projects SET template_id = COALESCE(template_id, $1), template_version = COALESCE(template_version, $2) WHERE template_id IS NULL OR template_version IS NULL", [defaultTemplate.id, defaultTemplate.version]);
  await client.query(
    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='template_id') THEN ALTER TABLE projects ALTER COLUMN template_id SET NOT NULL; END IF; END $$;"
  );
  await client.query(
    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='template_version') THEN ALTER TABLE projects ALTER COLUMN template_version SET NOT NULL; END IF; END $$;"
  );
  await client.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_product_id_fkey') THEN ALTER TABLE projects ADD CONSTRAINT projects_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL; END IF; END $$;"
  );
  await client.query("CREATE INDEX IF NOT EXISTS projects_product_id_idx ON projects (product_id)");
  await client.query("CREATE INDEX IF NOT EXISTS projects_owner_user_id_idx ON projects (owner_user_id)");
  await client.query("CREATE INDEX IF NOT EXISTS projects_base_project_id_idx ON projects (base_project_id)");
  await client.query("CREATE INDEX IF NOT EXISTS projects_is_template_idx ON projects (is_template)");
  await client.query("CREATE INDEX IF NOT EXISTS projects_purchase_id_idx ON projects (purchase_id)");
  await client.query("CREATE INDEX IF NOT EXISTS projects_template_id_idx ON projects (template_id)");
}

async function cloneTemplate(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  templateId: string,
  userId: string
) {
  return cloneTemplateService(client, templateId, userId, {
    ensureProjectsColumns,
    ensureTemplateTasksTable,
    ensureProjectTasksTable,
    ensureTemplateFilesTable,
    ensureProjectFilesTable,
    ensureUserStorageRoot,
    ensureProjectStorageFolders,
    saveProjectFileToStorage,
    httpError,
  });
}

async function ensurePurchasesTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS purchases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, product_id UUID REFERENCES products(id) ON DELETE CASCADE, project_id UUID REFERENCES projects(id) ON DELETE SET NULL, price NUMERIC(12,2) DEFAULT 0, purchase_type TEXT DEFAULT 'paid', status TEXT DEFAULT 'completed', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS project_id UUID");
  await client.query("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'paid'");
  await client.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_project_id_fkey') THEN ALTER TABLE purchases ADD CONSTRAINT purchases_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL; END IF; END $$;"
  );
  await client.query("CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases (user_id)");
  await client.query("CREATE INDEX IF NOT EXISTS purchases_product_id_idx ON purchases (product_id)");
  await client.query("CREATE INDEX IF NOT EXISTS purchases_project_id_idx ON purchases (project_id)");
}

async function cleanupInvalidUserPurchases(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  const invalid = await client.query(
    "SELECT pu.id FROM purchases pu LEFT JOIN projects p ON p.id = pu.project_id AND p.created_from_purchase = true AND p.is_template = false AND p.owner_user_id = pu.user_id AND p.product_id = pu.product_id AND p.purchase_id = pu.id WHERE pu.user_id = $1 AND pu.status = 'completed' AND p.id IS NULL",
    [userId]
  );
  if (invalid.rows.length === 0) return;
  await client.query("DELETE FROM purchases WHERE user_id = $1", [userId]);
  await client.query(
    "DELETE FROM projects WHERE owner_user_id = $1 AND created_from_purchase = true AND is_template = false",
    [userId]
  );
}

async function ensureCardMarketplaceTables(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS card_listings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), card_id UUID REFERENCES user_cards(id) ON DELETE CASCADE, seller_user_id TEXT NOT NULL, price NUMERIC(12,2) NOT NULL, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS card_transactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), card_id UUID REFERENCES user_cards(id) ON DELETE SET NULL, seller_user_id TEXT NOT NULL, buyer_user_id TEXT NOT NULL, price NUMERIC(12,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensureCommerceOrdersTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS commerce_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, item_type TEXT NOT NULL, item_id TEXT NOT NULL, amount NUMERIC(12,2) DEFAULT 0, currency TEXT DEFAULT 'BRL', status TEXT DEFAULT 'completed', payment_method TEXT DEFAULT 'pix', payment_reference TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

type AutoCoupon = { code: string; discount: number; productId?: string | null };

async function fetchAutoCouponsByProduct(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  productIds: string[]
) {
  const map = new Map<string, AutoCoupon>();
  if (productIds.length === 0) return map;
  try {
    const columnsResult = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'coupons'"
    );
    const columns = new Set<string>(columnsResult.rows.map((row: { column_name: string }) => row.column_name));
    if (columns.size === 0) return map;

    const hasProductId = columns.has("product_id");
    const query = hasProductId
      ? "SELECT code, discount_value, product_id FROM coupons WHERE active = true AND auto_apply = true AND (product_id = ANY($1) OR product_id IS NULL)"
      : "SELECT code, discount_value FROM coupons WHERE active = true AND auto_apply = true";
    const result = await client.query(query, hasProductId ? [productIds] : []);
    for (const row of result.rows) {
      const discount = Number(row.discount_value ?? 0);
      const couponProductId = row.product_id ?? null;
      if (hasProductId && couponProductId) {
        const current = map.get(couponProductId);
        if (!current || discount > current.discount) {
          map.set(couponProductId, { code: row.code, discount, productId: couponProductId });
        }
        continue;
      }
      for (const productId of productIds) {
        const current = map.get(productId);
        if (!current || (!current.productId && discount > current.discount)) {
          map.set(productId, { code: row.code, discount, productId: couponProductId });
        }
      }
    }
  } catch (error) {
    const typed = error as { code?: string };
    if (typed.code === "42P01") {
      return map;
    }
    throw error;
  }
  return map;
}

async function ensureMyBotTables(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybots (user_id TEXT PRIMARY KEY, myalien_user_id TEXT DEFAULT '', stage TEXT DEFAULT 'assistant', stage_reason TEXT DEFAULT '', image_url TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  // Garante que a coluna image_url exista mesmo em bancos já criados
  await client.query("ALTER TABLE mybots ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';");
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_stats (user_id TEXT PRIMARY KEY, content_accessed_count INTEGER DEFAULT 0, projects_purchased_count INTEGER DEFAULT 0, projects_created_count INTEGER DEFAULT 0, courses_started_count INTEGER DEFAULT 0, courses_completed_count INTEGER DEFAULT 0, marketplace_interactions_count INTEGER DEFAULT 0, tool_usage_count INTEGER DEFAULT 0, feedback_score INTEGER DEFAULT 0, last_event_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, event_type TEXT NOT NULL, source TEXT DEFAULT '', payload JSONB NOT NULL DEFAULT '{}'::jsonb, reversible BOOLEAN DEFAULT true, occurred_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(), reverted_at TIMESTAMPTZ, correlation_id TEXT DEFAULT '', version INTEGER DEFAULT 1)"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_memory (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, layer TEXT NOT NULL, memory_key TEXT NOT NULL, value JSONB NOT NULL, version INTEGER DEFAULT 1, is_active BOOLEAN DEFAULT true, last_event_id UUID, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE INDEX IF NOT EXISTS mybot_memory_user_layer_idx ON mybot_memory (user_id, layer)"
  );
  await client.query(
    "CREATE INDEX IF NOT EXISTS mybot_events_user_idx ON mybot_events (user_id, occurred_at DESC)"
  );

  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_profiles (user_id TEXT PRIMARY KEY, card_id UUID, available_points INTEGER DEFAULT 0, loss_streak INTEGER DEFAULT 0, high_bet_streak INTEGER DEFAULT 0, last_high_bet_at TIMESTAMPTZ, last_battle_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE mybot_profiles ADD COLUMN IF NOT EXISTS origin_map_id TEXT");
  await client.query("ALTER TABLE mybot_profiles ADD COLUMN IF NOT EXISTS current_map_id TEXT");
  await client.query("ALTER TABLE mybot_profiles ADD COLUMN IF NOT EXISTS origin_pos_x NUMERIC(5,2)");
  await client.query("ALTER TABLE mybot_profiles ADD COLUMN IF NOT EXISTS origin_pos_y NUMERIC(5,2)");
  await client.query("ALTER TABLE mybot_profiles ADD COLUMN IF NOT EXISTS current_pos_x NUMERIC(5,2)");
  await client.query("ALTER TABLE mybot_profiles ADD COLUMN IF NOT EXISTS current_pos_y NUMERIC(5,2)");
  await client.query("ALTER TABLE mybot_profiles ADD COLUMN IF NOT EXISTS last_movement_at TIMESTAMPTZ");
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_cpf_registry (cpf_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_activations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, cpf_hash TEXT NOT NULL, deposit_tx_id UUID, credits_granted NUMERIC(12,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_battle_queue (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, card_id UUID NOT NULL, bet_amount NUMERIC(12,2) NOT NULL, level INTEGER DEFAULT 1, rarity TEXT DEFAULT 'comum', rarity_rank INTEGER DEFAULT 0, status TEXT DEFAULT 'waiting', matched_battle_id UUID, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_bets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, card_id UUID NOT NULL, battle_id UUID, bet_amount NUMERIC(12,2) NOT NULL, possible_return NUMERIC(12,2) NOT NULL DEFAULT 0, gas_amount NUMERIC(12,2) NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'PENDENTE', created_at TIMESTAMPTZ DEFAULT NOW(), finalized_at TIMESTAMPTZ, redeemed_at TIMESTAMPTZ)"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_maps (id TEXT PRIMARY KEY, name TEXT NOT NULL, position_x NUMERIC(5,2) NOT NULL, position_y NUMERIC(5,2) NOT NULL, icon TEXT DEFAULT '', visual_meta JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_movements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bot_id UUID NOT NULL, user_id TEXT NOT NULL, from_map_id TEXT, to_map_id TEXT NOT NULL, reason TEXT NOT NULL, battle_id UUID, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_battles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id_a TEXT NOT NULL, user_id_b TEXT NOT NULL, card_id_a UUID NOT NULL, card_id_b UUID NOT NULL, bet_amount NUMERIC(12,2) NOT NULL, battle_type TEXT NOT NULL, gas_pct NUMERIC(5,4) NOT NULL, map_name TEXT NOT NULL, map_weights JSONB NOT NULL, modifiers JSONB NOT NULL DEFAULT '[]'::jsonb, seed TEXT NOT NULL, power_a NUMERIC(12,4) NOT NULL, power_b NUMERIC(12,4) NOT NULL, random_factor_a NUMERIC(6,4) NOT NULL DEFAULT 1, random_factor_b NUMERIC(6,4) NOT NULL DEFAULT 1, power_final_a NUMERIC(12,4) NOT NULL, power_final_b NUMERIC(12,4) NOT NULL, xp_a INTEGER NOT NULL DEFAULT 0, xp_b INTEGER NOT NULL DEFAULT 0, winner_user_id TEXT NOT NULL, payout_amount NUMERIC(12,2) NOT NULL, gas_amount NUMERIC(12,2) NOT NULL, reason TEXT DEFAULT '', status TEXT DEFAULT 'resolved', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("CREATE INDEX IF NOT EXISTS mybot_bets_user_idx ON mybot_bets (user_id, created_at DESC)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_bets_battle_idx ON mybot_bets (battle_id)");
  await client.query("ALTER TABLE mybot_battles ADD COLUMN IF NOT EXISTS modifiers JSONB NOT NULL DEFAULT '[]'::jsonb");
  await client.query("ALTER TABLE mybot_battles ADD COLUMN IF NOT EXISTS random_factor_a NUMERIC(6,4) NOT NULL DEFAULT 1");
  await client.query("ALTER TABLE mybot_battles ADD COLUMN IF NOT EXISTS random_factor_b NUMERIC(6,4) NOT NULL DEFAULT 1");
  await client.query("ALTER TABLE mybot_battles ADD COLUMN IF NOT EXISTS xp_a INTEGER NOT NULL DEFAULT 0");
  await client.query("ALTER TABLE mybot_battles ADD COLUMN IF NOT EXISTS xp_b INTEGER NOT NULL DEFAULT 0");
  await client.query("ALTER TABLE mybot_battles ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT ''");
  await client.query(
    "CREATE TABLE IF NOT EXISTS mybot_evolutions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, card_id UUID NOT NULL, attribute TEXT NOT NULL, before_value INTEGER NOT NULL, after_value INTEGER NOT NULL, cost NUMERIC(12,2) NOT NULL, points_spent INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("CREATE INDEX IF NOT EXISTS mybot_profiles_card_idx ON mybot_profiles (card_id)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_profiles_origin_idx ON mybot_profiles (origin_map_id)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_profiles_current_idx ON mybot_profiles (current_map_id)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_battle_queue_status_idx ON mybot_battle_queue (status, bet_amount, level, rarity_rank)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_battles_user_a_idx ON mybot_battles (user_id_a, created_at DESC)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_battles_user_b_idx ON mybot_battles (user_id_b, created_at DESC)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_activations_user_idx ON mybot_activations (user_id)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_activations_cpf_idx ON mybot_activations (cpf_hash)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_movements_bot_idx ON mybot_movements (bot_id, created_at DESC)");
  await client.query("CREATE INDEX IF NOT EXISTS mybot_movements_created_idx ON mybot_movements (created_at DESC)");
}

async function ensureDaoTables(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await client.query(
    "CREATE TABLE IF NOT EXISTS dao_proposals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT NOT NULL, created_by_user_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', created_at TIMESTAMPTZ DEFAULT NOW(), approved_by_admin_id TEXT, voting_start TIMESTAMPTZ, voting_end TIMESTAMPTZ)"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS dao_votes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id UUID REFERENCES dao_proposals(id) ON DELETE CASCADE, user_id TEXT NOT NULL, mybot_id TEXT NOT NULL, vote TEXT NOT NULL, amount_bet NUMERIC(12,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS dao_mybot_balances (mybot_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, balance NUMERIC(14,2) DEFAULT 1000, updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE dao_proposals ADD COLUMN IF NOT EXISTS approved_by_admin_id TEXT");
  await client.query("ALTER TABLE dao_proposals ADD COLUMN IF NOT EXISTS voting_start TIMESTAMPTZ");
  await client.query("ALTER TABLE dao_proposals ADD COLUMN IF NOT EXISTS voting_end TIMESTAMPTZ");
  await client.query("ALTER TABLE dao_proposals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING_REVIEW'");
  await client.query("ALTER TABLE dao_votes ADD COLUMN IF NOT EXISTS amount_bet NUMERIC(12,2) NOT NULL DEFAULT 0");
  await client.query("CREATE INDEX IF NOT EXISTS dao_proposals_status_idx ON dao_proposals (status)");
  await client.query("CREATE INDEX IF NOT EXISTS dao_proposals_created_at_idx ON dao_proposals (created_at DESC)");
  await client.query("CREATE INDEX IF NOT EXISTS dao_votes_proposal_idx ON dao_votes (proposal_id)");
  await client.query("CREATE INDEX IF NOT EXISTS dao_votes_user_idx ON dao_votes (user_id)");
  await client.query("CREATE INDEX IF NOT EXISTS dao_mybot_balances_user_idx ON dao_mybot_balances (user_id)");
}

function inferProjectType(name: string) {
  const label = name.toLowerCase();
  if (label.includes("landing")) return "Landingpage";
  if (label.includes("e-commerce") || label.includes("ecommerce")) return "E-commerce";
  return "Marketplace";
}

const CARD_SPECIES = ["Zyphor", "Orionid", "Nebulon", "Vortexian", "Aetheri", "Krylon", "Lunari"];
const CARD_CLASSES = ["Explorador", "Guardião", "Tecnomante", "Cronista", "Batedor", "Alquimista"];
const NAME_PREFIX = ["Xen", "Kael", "Zor", "Lum", "Ar", "Nyx", "Vex", "Sol"];
const NAME_SUFFIX = ["ar", "ion", "yx", "a", "os", "en", "is", "or"];

const VISUAL_PALETTES = [
  { primary: "#38bdf8", secondary: "#0f172a", accent: "#22d3ee" },
  { primary: "#22c55e", secondary: "#052e16", accent: "#86efac" },
  { primary: "#f97316", secondary: "#1f2937", accent: "#fdba74" },
  { primary: "#a855f7", secondary: "#1e1b4b", accent: "#c4b5fd" },
  { primary: "#14b8a6", secondary: "#0f172a", accent: "#5eead4" },
];

const RARITY_MULTIPLIER: Record<string, number> = {
  comum: 1.0,
  raro: 1.4,
  epico: 1.9,
  lendario: 2.6,
};

const MYBOT_EVENT_TYPES = new Set([
  "content_accessed",
  "project_purchased",
  "project_created",
  "course_started",
  "course_completed",
  "marketplace_interaction",
  "tool_usage",
  "feedback_submitted",
  "user_message",
  "mybot_response",
  "memory_reset",
  "memory_updated",
]);

const MYBOT_MEMORY_LAYERS = new Set(["short", "mid", "long"]);

type MyBotStage = "assistant" | "copilot" | "representative";

const MYBOT_STAGE_RULES = {
  assistantToCopilot: {
    minCoursesCompleted: 2,
    minProjectsCreated: 1,
    minToolUsage: 10,
  },
  copilotToRepresentative: {
    minProjectsCreated: 3,
    minMarketplaceInteractions: 5,
    minFeedbackScore: 5,
  },
};

const MYBOT_BATTLE_TYPES = [
  { id: "casual", chance: 0.5, gasPct: 0.05 },
  { id: "ranqueada", chance: 0.35, gasPct: 0.1 },
  { id: "especial", chance: 0.15, gasPct: 0.15 },
] as const;

const MYBOT_MAPS = [
  {
    id: "Arena Classica",
    weights: { strength: 1.0, speed: 1.0, intelligence: 1.0 },
    baseWeight: 0.4,
  },
  {
    id: "Deserto",
    weights: { strength: 1.3, speed: 0.9, intelligence: 1.0 },
    baseWeight: 0.2,
  },
  {
    id: "Floresta",
    weights: { strength: 0.9, speed: 1.3, intelligence: 1.1 },
    baseWeight: 0.2,
  },
  {
    id: "Cidade em Ruinas",
    weights: { strength: 1.0, speed: 1.1, intelligence: 1.3 },
    baseWeight: 0.12,
  },
  {
    id: "Arena Tecnologica",
    weights: { strength: 0.9, speed: 1.0, intelligence: 1.4 },
    baseWeight: 0.08,
  },
] as const;

const MYBOT_MAP_LAYOUTS = [
  { id: "Arena Classica", label: "Arena Clássica", x: 50, y: 10, icon: "⚔️" },
  { id: "Floresta", label: "Floresta", x: 20, y: 38, icon: "🌲" },
  { id: "Deserto", label: "Deserto", x: 80, y: 38, icon: "🏜️" },
  { id: "Cidade em Ruinas", label: "Cidade em Ruínas", x: 80, y: 74, icon: "🏚️" },
  { id: "Arena Tecnologica", label: "Arena Tecnológica", x: 20, y: 74, icon: "🛰️" },
];

const MYBOT_RARITY_ORDER = ["comum", "raro", "epico", "lendario"] as const;

const MYBOT_RARITY_CAPS: Record<string, number> = {
  comum: 85,
  raro: 95,
  epico: 105,
  lendario: 115,
};

const MYBOT_RARITY_EVOLUTION_MULTIPLIER: Record<string, number> = {
  comum: 1.0,
  raro: 1.4,
  epico: 1.9,
  lendario: 2.6,
};

const MYBOT_XP_PER_LEVEL = 100;
const MYBOT_POINTS_PER_LEVEL = 3;
const MYBOT_HIGH_BET_THRESHOLD = 50;
const MYBOT_HIGH_BET_MAX_STREAK = 3;
const MYBOT_HIGH_BET_WINDOW_MINUTES = 15;

const HK_MASTER_USER_ID = "hktech_master";
const HK_MASTER_INITIAL_SUPPLY = 40000000;

async function getOrCreateMyBot(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureMyBotTables(client);
  const existing = await client.query("SELECT * FROM mybots WHERE user_id = $1", [userId]);
  if (existing.rows[0]) return existing.rows[0];
  const created = await client.query(
    "INSERT INTO mybots (user_id, myalien_user_id) VALUES ($1, $1) RETURNING *",
    [userId]
  );
  return created.rows[0];
}

async function getOrCreateMyBotStats(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureMyBotTables(client);
  const existing = await client.query("SELECT * FROM mybot_stats WHERE user_id = $1", [userId]);
  if (existing.rows[0]) return existing.rows[0];
  const created = await client.query(
    "INSERT INTO mybot_stats (user_id) VALUES ($1) RETURNING *",
    [userId]
  );
  return created.rows[0];
}

async function getOrCreateMyBotProfile(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  userId: string,
  cardId?: string
) {
  await ensureMyBotTables(client);
  const existing = await client.query("SELECT * FROM mybot_profiles WHERE user_id = $1", [userId]);
  if (existing.rows[0]) return existing.rows[0];
  const originMapId = cardId ? pickOriginMapId(userId, cardId) : "Arena Classica";
  const originPos = cardId
    ? computeDeterministicPosition(`${cardId}|origin|${originMapId}`)
    : { x: 50, y: 50 };
  const created = await client.query(
    "INSERT INTO mybot_profiles (user_id, card_id, origin_map_id, current_map_id, origin_pos_x, origin_pos_y, current_pos_x, current_pos_y) VALUES ($1, $2, $3, $3, $4, $5, $4, $5) RETURNING *",
    [userId, cardId || null, originMapId, originPos.x, originPos.y]
  );
  return created.rows[0];
}

function getMyBotMapLayout(mapId: string) {
  return MYBOT_MAP_LAYOUTS.find((map) => map.id === mapId) ?? {
    id: mapId,
    label: mapId,
    x: 50,
    y: 50,
    icon: "🤖",
  };
}

function computeDeterministicPosition(seed: string) {
  const hash = hashString(seed);
  const bytes = hash.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [0, 0];
  const x = 10 + (bytes[0] / 255) * 80;
  const y = 10 + (bytes[1] / 255) * 80;
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
}

function pickOriginMapId(userId: string, cardId: string) {
  const hash = hashString(`${userId}|${cardId}|origin`);
  const bytes = hash.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [0];
  const index = bytes[0] % MYBOT_MAPS.length;
  return MYBOT_MAPS[index].id;
}

async function seedMyBotMaps(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  for (const map of MYBOT_MAP_LAYOUTS) {
    const layout = getMyBotMapLayout(map.id);
    await client.query(
      "INSERT INTO mybot_maps (id, name, position_x, position_y, icon, visual_meta) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, position_x = EXCLUDED.position_x, position_y = EXCLUDED.position_y, icon = EXCLUDED.icon, visual_meta = EXCLUDED.visual_meta, updated_at = NOW()",
      [layout.id, layout.label, layout.x, layout.y, layout.icon, {}]
    );
  }
}

async function recordMyBotMovement(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  payload: {
    botId: string;
    userId: string;
    fromMapId: string | null;
    toMapId: string;
    reason: string;
    battleId?: string | null;
  }
) {
  await client.query(
    "INSERT INTO mybot_movements (bot_id, user_id, from_map_id, to_map_id, reason, battle_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [payload.botId, payload.userId, payload.fromMapId, payload.toMapId, payload.reason, payload.battleId || null]
  );
}

async function ensureMyBotMapState(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  userId: string,
  cardId: string
) {
  await ensureMyBotTables(client);
  await seedMyBotMaps(client);
  const profile = await getOrCreateMyBotProfile(client, userId, cardId);
  if (!profile.origin_map_id) {
    const originMapId = pickOriginMapId(userId, cardId);
    const originPos = computeDeterministicPosition(`${cardId}|origin|${originMapId}`);
    await client.query(
      "UPDATE mybot_profiles SET origin_map_id = $2, current_map_id = COALESCE(current_map_id, $2), origin_pos_x = $3, origin_pos_y = $4, current_pos_x = COALESCE(current_pos_x, $3), current_pos_y = COALESCE(current_pos_y, $4), updated_at = NOW() WHERE user_id = $1",
      [userId, originMapId, originPos.x, originPos.y]
    );
    await recordMyBotMovement(client, {
      botId: cardId,
      userId,
      fromMapId: null,
      toMapId: originMapId,
      reason: "origin_assigned",
      battleId: null,
    });
  } else if (!profile.current_map_id) {
    const originPos = {
      x: Number(profile.origin_pos_x || 50),
      y: Number(profile.origin_pos_y || 50),
    };
    await client.query(
      "UPDATE mybot_profiles SET current_map_id = $2, current_pos_x = $3, current_pos_y = $4, updated_at = NOW() WHERE user_id = $1",
      [userId, profile.origin_map_id, originPos.x, originPos.y]
    );
  }

  if (profile.origin_map_id && (profile.origin_pos_x == null || profile.origin_pos_y == null)) {
    const originPos = computeDeterministicPosition(`${cardId}|origin|${profile.origin_map_id}`);
    await client.query(
      "UPDATE mybot_profiles SET origin_pos_x = $2, origin_pos_y = $3, updated_at = NOW() WHERE user_id = $1",
      [userId, originPos.x, originPos.y]
    );
  }

  if (profile.current_map_id && (profile.current_pos_x == null || profile.current_pos_y == null)) {
    const isOrigin = profile.current_map_id === profile.origin_map_id;
    const currentPos = isOrigin
      ? computeDeterministicPosition(`${cardId}|origin|${profile.origin_map_id}`)
      : computeDeterministicPosition(`${cardId}|move|${profile.current_map_id}`);
    await client.query(
      "UPDATE mybot_profiles SET current_pos_x = $2, current_pos_y = $3, updated_at = NOW() WHERE user_id = $1",
      [userId, currentPos.x, currentPos.y]
    );
  }
}

async function moveMyBotToMap(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  payload: {
    botId: string;
    userId: string;
    toMapId: string;
    reason: string;
    battleId?: string | null;
  }
) {
  const state = await client.query(
    "SELECT origin_map_id, current_map_id, origin_pos_x, origin_pos_y FROM mybot_profiles WHERE user_id = $1",
    [payload.userId]
  );
  const current = state.rows[0];
  const fromMapId = current?.current_map_id ?? null;
  const isOrigin = payload.toMapId === current?.origin_map_id;
  const targetPos = isOrigin
    ? { x: Number(current?.origin_pos_x || 50), y: Number(current?.origin_pos_y || 50) }
    : computeDeterministicPosition(`${payload.botId}|move|${payload.toMapId}`);

  await client.query(
    "UPDATE mybot_profiles SET current_map_id = $2, current_pos_x = $3, current_pos_y = $4, last_movement_at = NOW(), updated_at = NOW() WHERE user_id = $1",
    [payload.userId, payload.toMapId, targetPos.x, targetPos.y]
  );

  await recordMyBotMovement(client, {
    botId: payload.botId,
    userId: payload.userId,
    fromMapId,
    toMapId: payload.toMapId,
    reason: payload.reason,
    battleId: payload.battleId || null,
  });
}

async function returnMyBotToOrigin(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  payload: { botId: string; userId: string; reason: string; battleId?: string | null }
) {
  const state = await client.query(
    "SELECT origin_map_id, current_map_id, origin_pos_x, origin_pos_y FROM mybot_profiles WHERE user_id = $1",
    [payload.userId]
  );
  const originMapId = state.rows[0]?.origin_map_id;
  if (!originMapId) return;
  await moveMyBotToMap(client, {
    botId: payload.botId,
    userId: payload.userId,
    toMapId: originMapId,
    reason: payload.reason,
    battleId: payload.battleId || null,
  });
}

function normalizeMyBotEventType(eventType: string) {
  if (MYBOT_EVENT_TYPES.has(eventType)) return eventType;
  if (eventType.startsWith("custom:")) return eventType;
  return "custom:unknown";
}

function getMyBotEventDelta(eventType: string, payload: any) {
  const score = Number(payload?.score ?? 1);
  switch (eventType) {
    case "content_accessed":
      return { content_accessed_count: 1 };
    case "project_purchased":
      return { projects_purchased_count: 1 };
    case "project_created":
      return { projects_created_count: 1 };
    case "course_started":
      return { courses_started_count: 1 };
    case "course_completed":
      return { courses_completed_count: 1 };
    case "marketplace_interaction":
      return { marketplace_interactions_count: 1 };
    case "tool_usage":
      return { tool_usage_count: 1 };
    case "feedback_submitted":
      return { feedback_score: Number.isFinite(score) ? score : 1 };
    default:
      return {};
  }
}

function evaluateMyBotStage(stats: any, currentStage: MyBotStage) {
  const targetStage = deriveMyBotStageFromStats(stats);
  const stageOrder: Record<MyBotStage, number> = {
    assistant: 0,
    copilot: 1,
    representative: 2,
  };
  if (stageOrder[targetStage] > stageOrder[currentStage]) {
    const reason =
      targetStage === "copilot"
        ? "Evoluiu por completar cursos e criar projetos com uso consistente de ferramentas."
        : "Evoluiu por maturidade técnica e interações consistentes no marketplace.";
    return { stage: targetStage, reason };
  }
  return { stage: currentStage, reason: "" };
}

function deriveMyBotStageFromStats(stats: any): MyBotStage {
  const assistantRule = MYBOT_STAGE_RULES.assistantToCopilot;
  const copilotRule = MYBOT_STAGE_RULES.copilotToRepresentative;
  const qualifiesCopilot =
    Number(stats.courses_completed_count || 0) >= assistantRule.minCoursesCompleted &&
    Number(stats.projects_created_count || 0) >= assistantRule.minProjectsCreated &&
    Number(stats.tool_usage_count || 0) >= assistantRule.minToolUsage;
  const qualifiesRepresentative =
    Number(stats.projects_created_count || 0) >= copilotRule.minProjectsCreated &&
    Number(stats.marketplace_interactions_count || 0) >= copilotRule.minMarketplaceInteractions &&
    Number(stats.feedback_score || 0) >= copilotRule.minFeedbackScore;

  if (qualifiesRepresentative) return "representative";
  if (qualifiesCopilot) return "copilot";
  return "assistant";
}

async function upsertMyBotMemory(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  params: { userId: string; layer: string; key: string; value: any; lastEventId?: string }
) {
  const layer = params.layer;
  if (!MYBOT_MEMORY_LAYERS.has(layer)) {
    throw new Error("Camada de memória inválida.");
  }
  const result = await client.query(
    "SELECT COALESCE(MAX(version), 0) AS max_version FROM mybot_memory WHERE user_id = $1 AND layer = $2 AND memory_key = $3",
    [params.userId, layer, params.key]
  );
  const nextVersion = Number(result.rows[0]?.max_version || 0) + 1;
  await client.query(
    "UPDATE mybot_memory SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND layer = $2 AND memory_key = $3 AND is_active = true",
    [params.userId, layer, params.key]
  );
  const inserted = await client.query(
    "INSERT INTO mybot_memory (user_id, layer, memory_key, value, version, is_active, last_event_id) VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *",
    [params.userId, layer, params.key, params.value, nextVersion, params.lastEventId || null]
  );
  return inserted.rows[0];
}

function buildMyBotResponse(params: {
  message: string;
  stage: MyBotStage;
  stats: any;
  memory: Array<{ layer: string; memory_key: string; value: any }>;
}) {
  const stageLabel: Record<MyBotStage, string> = {
    assistant: "Assistente",
    copilot: "Copiloto técnico",
    representative: "Representante técnico",
  };

  const statsParts: string[] = [];
  if (Number(params.stats?.courses_completed_count || 0) > 0) {
    statsParts.push(`cursos concluídos: ${params.stats.courses_completed_count}`);
  }
  if (Number(params.stats?.projects_created_count || 0) > 0) {
    statsParts.push(`projetos criados: ${params.stats.projects_created_count}`);
  }
  if (Number(params.stats?.tool_usage_count || 0) > 0) {
    statsParts.push(`uso de ferramentas: ${params.stats.tool_usage_count}`);
  }

  const memoryHints: string[] = [];
  for (const item of params.memory) {
    const key = String(item.memory_key || "").toLowerCase();
    if (key.includes("learning") || key.includes("aprend")) {
      memoryHints.push("preferência de aprendizagem registrada");
    }
    if (key.includes("stack") || key.includes("tecnologia") || key.includes("domain") || key.includes("dominio")) {
      memoryHints.push("área técnica registrada");
    }
  }

  const lines: string[] = [];
  lines.push(`Meu papel agora: ${stageLabel[params.stage]}.`);
  if (statsParts.length) {
    lines.push(`Resumo rápido do seu progresso: ${statsParts.join(", ")}.`);
  }
  if (memoryHints.length) {
    lines.push(`Vou considerar ${[...new Set(memoryHints)].join(" e ")}.`);
  }
  lines.push("Posso explicar o passo a passo e sugerir próximos movimentos dentro da plataforma.");
  lines.push("Quer que eu organize um plano curto ou uma explicação detalhada?");

  return lines.join(" ");
}

function normalizeCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
}

function hashString(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hashCpf(cpf: string) {
  const normalized = normalizeCpf(cpf);
  if (normalized.length !== 11) {
    throw new Error("CPF inválido.");
  }
  return hashString(normalized);
}

function hashCpfUser(cpf: string, userId: string) {
  return hashCpf(cpf);
}

function seedFromHash(hash: string) {
  const slice = hash.slice(0, 16);
  return Number(BigInt(`0x${slice}`) % BigInt(2 ** 31 - 1));
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function planMultiplier(plan: string) {
  if (plan === "enterprise") return 1.2;
  if (plan === "pro") return 1.1;
  return 1.0;
}

function calculateRarity(score: number, rng: () => number) {
  const jitter = rng() * 6;
  const finalScore = score + jitter;
  if (finalScore >= 130) return "lendario";
  if (finalScore >= 115) return "epico";
  if (finalScore >= 95) return "raro";
  return "comum";
}

function hslToHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateVisualMetaFromHash(hash: string) {
  const bytes = hash.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [];
  const hue = (bytes[0] ?? 120) % 360;
  const accentHue = (hue + (bytes[1] ?? 90)) % 360;
  const palette = {
    primary: hslToHex(hue, 0.75, 0.6),
    secondary: hslToHex((hue + 200) % 360, 0.45, 0.18),
    accent: hslToHex(accentHue, 0.8, 0.55),
  };
  return {
    palette,
    pattern: (bytes[2] ?? 0) % 6,
    eyes: (bytes[3] ?? 0) % 4 + 1,
    horns: (bytes[4] ?? 0) % 5,
    glow: (bytes[5] ?? 0) % 2 === 1,
    aura: (bytes[6] ?? 0) % 3,
  };
}

function computeMarketValue(attributes: { strength: number; speed: number; intelligence: number; endurance: number }, rarity: string) {
  const base = 10;
  const avg = (attributes.strength + attributes.speed + attributes.intelligence + attributes.endurance) / 4;
  const rarityBoost = RARITY_MULTIPLIER[rarity] ?? 1.0;
  const attributeBoost = 0.8 + Math.min(0.6, avg / 150);
  return Number((base * rarityBoost * attributeBoost).toFixed(2));
}

function getRarityRank(rarity: string) {
  const idx = MYBOT_RARITY_ORDER.indexOf((rarity || "").toLowerCase() as (typeof MYBOT_RARITY_ORDER)[number]);
  return idx === -1 ? 0 : idx;
}

function getRarityCap(rarity: string) {
  return MYBOT_RARITY_CAPS[(rarity || "").toLowerCase()] ?? MYBOT_RARITY_CAPS.comum;
}

function getRarityEvolutionMultiplier(rarity: string) {
  return MYBOT_RARITY_EVOLUTION_MULTIPLIER[(rarity || "").toLowerCase()] ?? 1.0;
}

function computeEvolutionCost(params: { level: number; rarity: string; currentValue: number }) {
  const base = 2;
  const levelFactor = Math.pow(1.08, Math.max(0, params.level - 1));
  const rarityFactor = getRarityEvolutionMultiplier(params.rarity);
  const attrFactor = Math.pow(1.03, Math.max(0, params.currentValue - 30));
  return Number((base * levelFactor * rarityFactor * attrFactor).toFixed(2));
}

function pickWeighted<T>(rng: () => number, items: Array<{ weight: number; value: T }>): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return items[0].value;
  const roll = rng() * total;
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (roll <= acc) return item.value;
  }
  return items[items.length - 1].value;
}

function secureRandomFloat(min = 0, max = 1) {
  const bytes = crypto.randomBytes(6);
  const value = bytes.readUIntBE(0, 6);
  const normalized = value / 0xffffffffffff;
  return min + normalized * (max - min);
}

function pickWeightedSecure<T>(items: Array<{ weight: number; value: T }>): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return items[0].value;
  const roll = secureRandomFloat(0, total);
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (roll <= acc) return item.value;
  }
  return items[items.length - 1].value;
}

function computeBattleType() {
  return pickWeightedSecure(MYBOT_BATTLE_TYPES.map((type) => ({ weight: type.chance, value: type })));
}

function computeMapWeightsByBet(betAmount: number) {
  const betNormalized = clamp(betAmount / 100, 0, 1);
  const rareBoost = betNormalized * 0.18;
  const adjusted = MYBOT_MAPS.map((map) => {
    let weight: number = map.baseWeight;
    if (map.id === "Arena Classica") weight = Math.max(0.05, map.baseWeight - rareBoost);
    if (map.id === "Cidade em Ruinas") weight = map.baseWeight + rareBoost * 0.6;
    if (map.id === "Arena Tecnologica") weight = map.baseWeight + rareBoost * 0.4;
    return { map, weight };
  });
  return adjusted;
}

function computeBotPower(attributes: { strength: number; speed: number; intelligence: number }, mapWeights: { strength: number; speed: number; intelligence: number }, randomFactor: number) {
  const raw = attributes.strength * mapWeights.strength + attributes.speed * mapWeights.speed + attributes.intelligence * mapWeights.intelligence;
  return { raw, final: Number((raw * randomFactor).toFixed(4)) };
}

function computeBattleXp(betAmount: number, isWinner: boolean, lossStreak: number) {
  const baseWin = Math.max(1, Math.round(betAmount * 2));
  const baseLose = Math.max(1, Math.round(betAmount * 0.5));
  if (isWinner) return baseWin;
  const reduction = Math.min(0.5, Math.max(0, lossStreak) * 0.1);
  return Math.max(1, Math.round(baseLose * (1 - reduction)));
}

function buildBattleExplanation(params: {
  mapName: string;
  mapWeights: { strength: number; speed: number; intelligence: number };
  userAttrs: { strength: number; speed: number; intelligence: number };
  opponentAttrs: { strength: number; speed: number; intelligence: number };
  userRandom: number;
  opponentRandom: number;
  userFinal: number;
  opponentFinal: number;
}) {
  const mapEffects: string[] = [];
  if (params.mapWeights.strength !== 1) {
    mapEffects.push(`força ${(params.mapWeights.strength > 1 ? "+" : "-")}${Math.round((Math.abs(params.mapWeights.strength - 1) * 100))}%`);
  }
  if (params.mapWeights.speed !== 1) {
    mapEffects.push(`velocidade ${(params.mapWeights.speed > 1 ? "+" : "-")}${Math.round((Math.abs(params.mapWeights.speed - 1) * 100))}%`);
  }
  if (params.mapWeights.intelligence !== 1) {
    mapEffects.push(`inteligência ${(params.mapWeights.intelligence > 1 ? "+" : "-")}${Math.round((Math.abs(params.mapWeights.intelligence - 1) * 100))}%`);
  }

  const attributeAdvantage: string[] = [];
  if (params.opponentAttrs.strength > params.userAttrs.strength) attributeAdvantage.push("força");
  if (params.opponentAttrs.speed > params.userAttrs.speed) attributeAdvantage.push("velocidade");
  if (params.opponentAttrs.intelligence > params.userAttrs.intelligence) attributeAdvantage.push("inteligência");

  const diff = Number((params.userFinal - params.opponentFinal).toFixed(2));
  const diffText = diff >= 0 ? `+${diff}` : `${diff}`;
  const randomEffect = Math.round((params.userRandom - 1) * 100);

  return `Seu bot ${diff >= 0 ? "venceu" : "perdeu"} porque: ` +
    `o mapa ${params.mapName}${mapEffects.length ? " favoreceu " + mapEffects.join(", ") : " não alterou atributos"}, ` +
    `${attributeAdvantage.length ? "o oponente tinha vantagem em " + attributeAdvantage.join(", ") : "os atributos estavam equilibrados"}, ` +
    `o fator imprevisível ajustou seu poder em ${randomEffect >= 0 ? "+" : ""}${randomEffect}%, ` +
    `diferença final: ${diffText} pontos.`;
}

function getBattleAttributes(attributes: any) {
  return {
    strength: Number(attributes?.strength ?? 0),
    speed: Number(attributes?.speed ?? 0),
    intelligence: Number(attributes?.intelligence ?? 0),
  };
}

function generateAlienSvg(name: string, rarity: string, visualMeta: any) {
  const palette = visualMeta?.palette ?? VISUAL_PALETTES[0];
  const glow = visualMeta?.glow ? `filter="url(#glow)"` : "";
  const patternId = `pattern-${visualMeta?.pattern ?? 0}`;
  const eyes = Math.max(1, Number(visualMeta?.eyes ?? 2));
  const horns = Math.max(0, Number(visualMeta?.horns ?? 0));
  const aura = Number(visualMeta?.aura ?? 0);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%\" stop-color=\"${palette.secondary}\" />
      <stop offset="100%\" stop-color=\"#020617\" />
    </linearGradient>
    <radialGradient id="core" cx="50%\" cy="35%\" r="60%">
      <stop offset="0%\" stop-color=\"${palette.primary}\" stop-opacity="0.95\" />
      <stop offset="100%\" stop-color=\"${palette.secondary}\" stop-opacity="0.9\" />
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%\" stop-color="rgba(255,255,255,0.16)\" />
      <stop offset="100%\" stop-color="rgba(255,255,255,0.02)\" />
    </linearGradient>
    <filter id="glow" x="-50%\" y="-50%\" width="200%\" height="200%">
      <feGaussianBlur stdDeviation="14\" result="coloredBlur\" />
      <feMerge>
        <feMergeNode in="coloredBlur\" />
        <feMergeNode in="SourceGraphic\" />
      </feMerge>
    </filter>
    <pattern id="stars" width="80" height="80" patternUnits="userSpaceOnUse\">
      <circle cx="10\" cy="12\" r="2\" fill=\"#e2e8f0\" opacity="0.3\" />
      <circle cx="60\" cy="20\" r="1.5\" fill=\"#f8fafc\" opacity="0.4\" />
      <circle cx="40\" cy="60\" r="1.2\" fill=\"#cbd5f5\" opacity="0.35\" />
    </pattern>
    <pattern id="pattern-0\" width="40\" height="40\" patternUnits="userSpaceOnUse\">
      <circle cx="8\" cy="8\" r="3\" fill=\"${palette.accent}\" fill-opacity="0.35\" />
    </pattern>
    <pattern id="pattern-1\" width="48\" height="48\" patternUnits="userSpaceOnUse\">
      <rect x="0\" y="0\" width="48\" height="48\" fill=\"${palette.secondary}\" />
      <path d="M0 0 L48 48 M48 0 L0 48\" stroke=\"${palette.accent}\" stroke-opacity="0.25\" />
    </pattern>
    <pattern id="pattern-2\" width="36\" height="36\" patternUnits="userSpaceOnUse\">
      <circle cx="18\" cy="18\" r="9\" fill=\"${palette.accent}\" fill-opacity="0.25\" />
    </pattern>
    <pattern id="pattern-3\" width="60\" height="60\" patternUnits="userSpaceOnUse\">
      <rect x="0\" y="0\" width="60\" height="60\" fill=\"${palette.secondary}\" />
      <circle cx="30\" cy="30\" r="12\" fill=\"${palette.accent}\" fill-opacity="0.3\" />
    </pattern>
    <pattern id="pattern-4\" width="50\" height="50\" patternUnits="userSpaceOnUse\">
      <path d="M0 25 L50 25\" stroke=\"${palette.accent}\" stroke-opacity="0.2\" />
      <path d="M25 0 L25 50\" stroke=\"${palette.accent}\" stroke-opacity="0.2\" />
    </pattern>
    <pattern id="pattern-5\" width="42\" height="42\" patternUnits="userSpaceOnUse\">
      <circle cx="10\" cy="32\" r="4\" fill=\"${palette.accent}\" fill-opacity="0.3\" />
      <circle cx="32\" cy="10\" r="4\" fill=\"${palette.accent}\" fill-opacity="0.3\" />
    </pattern>
  </defs>
  <rect width="480" height="640" rx="32" fill="url(#bg)\" />
  <rect width="480" height="640" fill="url(#stars)\" opacity="0.3\" />
  <rect x="36" y="54" width="408" height="512" rx="28" fill="url(#glass)\" stroke="rgba(148,163,184,0.2)\" />
  <rect x="50" y="70" width="380" height="460" rx="24" fill="url(#${patternId})\" opacity="0.25\" />
  ${aura === 1 ? `<circle cx="240" cy="260" r="200" fill="${palette.accent}" opacity="0.08" />` : ""}
  ${aura === 2 ? `<circle cx="240" cy="260" r="210" fill="${palette.primary}" opacity="0.08" />` : ""}
  <g ${glow}>
    <circle cx="240" cy="250" r="125" fill="${palette.primary}" />
    <ellipse cx="240" cy="360" rx="120" ry="100" fill="${palette.secondary}" opacity="0.2" />
    ${Array.from({ length: horns }).map((_, idx) => {
      const offset = horns === 1 ? 0 : (idx - (horns - 1) / 2) * 48;
      return `
    <path d="M${240 + offset - 18} 120 Q${240 + offset} 70 ${240 + offset + 18} 120\" stroke="${palette.accent}" stroke-width="10" fill="none" />`;
    }).join("")}
    ${Array.from({ length: eyes }).map((_, idx) => {
      const offset = eyes === 1 ? 0 : (idx - (eyes - 1) / 2) * 58;
      return `
    <circle cx="${240 + offset}\" cy="235\" r="26\" fill=\"#f8fafc\" />
    <circle cx="${240 + offset}\" cy="235\" r="12\" fill=\"#0f172a\" />
    <circle cx="${240 + offset + 6}\" cy="230\" r="4\" fill=\"#ffffff\" opacity="0.8\" />`;
    }).join("")}
    <path d="M210 300 Q240 330 270 300\" stroke="${palette.accent}" stroke-width="10" fill="none" stroke-linecap="round" />
    <circle cx="190" cy="290" r="8" fill="${palette.accent}" opacity="0.6" />
    <circle cx="290" cy="290" r="8" fill="${palette.accent}" opacity="0.6" />
    <ellipse cx="180" cy="360" rx="55" ry="35" fill="${palette.primary}" opacity="0.8" />
    <ellipse cx="300" cy="360" rx="55" ry="35" fill="${palette.primary}" opacity="0.8" />
  </g>
  <text x="50%\" y="565\" text-anchor="middle\" fill=\"#e2e8f0\" font-size="24\" font-family=\"'Segoe UI', sans-serif\">${name}</text>
  <text x="50%\" y="595\" text-anchor="middle\" fill=\"#94a3b8\" font-size="13\" font-family=\"'Segoe UI', sans-serif\">${rarity.toUpperCase()}</text>
</svg>`;
}

async function ensureAlienImage(userId: string, name: string, rarity: string, visualMeta: any, hashSeed: string) {
  const projectId = admin.app().options.projectId as string | undefined;
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    (admin.app().options.storageBucket as string | undefined) ||
    (projectId ? `${projectId}.appspot.com` : undefined);
  if (!bucketName) {
    throw new Error("Bucket de storage não configurado.");
  }
  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(`aliens/${userId}-${hashSeed.slice(0, 12)}.svg`);
  const svg = generateAlienSvg(name, rarity, visualMeta);
  await file.save(svg, { contentType: "image/svg+xml", resumable: false, public: true });
  const withVersion = (url: string) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${Date.now()}`;
  };
  try {
    await file.makePublic();
    return withVersion(file.publicUrl());
  } catch (error) {
    console.warn("Falha ao tornar imagem pública", error);
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: "01-01-2036",
    });
    return withVersion(signedUrl);
  }
}

function generateCardProfile(seed: number, context: { accountAgeDays: number; usageScore: number; plan: string; level: number }) {
  const rng = mulberry32(seed);
  const species = CARD_SPECIES[Math.floor(rng() * CARD_SPECIES.length)];
  const className = CARD_CLASSES[Math.floor(rng() * CARD_CLASSES.length)];
  const name = `${NAME_PREFIX[Math.floor(rng() * NAME_PREFIX.length)]}${NAME_SUFFIX[Math.floor(rng() * NAME_SUFFIX.length)]}`;

  const ageBonus = clamp(Math.floor(context.accountAgeDays / 30) * 2, 0, 20);
  const usageBonus = clamp(Math.floor(context.usageScore / 10), 0, 25);
  const multiplier = planMultiplier(context.plan);
  const levelBonus = clamp(Math.floor(context.level / 5), 0, 10);

  const base = () => 40 + Math.floor(rng() * 40);
  const strength = clamp(Math.round((base() + ageBonus + usageBonus + levelBonus) * multiplier), 1, 99);
  const speed = clamp(Math.round((base() + ageBonus + usageBonus + levelBonus) * multiplier), 1, 99);
  const intelligence = clamp(Math.round((base() + ageBonus + usageBonus + levelBonus) * multiplier), 1, 99);
  const endurance = clamp(Math.round((base() + ageBonus + usageBonus + levelBonus) * multiplier), 1, 99);

  const avgScore = (strength + speed + intelligence + endurance) / 4 + usageBonus + ageBonus + levelBonus;
  const rarity = calculateRarity(avgScore, rng);

  return {
    name,
    species,
    className,
    rarity,
    attributes: { strength, speed, intelligence, endurance },
  };
}

async function getOrCreateGamification(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureUserGamificationTable(client);
  const existing = await client.query(
    "SELECT user_id, plan, usage_score, xp, created_at, updated_at FROM user_gamification WHERE user_id = $1",
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];
  const created = await client.query(
    "INSERT INTO user_gamification (user_id, plan, usage_score, xp) VALUES ($1, $2, $3, $4) RETURNING user_id, plan, usage_score, xp, created_at, updated_at",
    [userId, "free", 0, 0]
  );
  return created.rows[0];
}

async function getUserCreatedAt(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureUsersTable(client);
  const result = await client.query("SELECT created_at FROM users WHERE email = $1 OR id::text = $1 LIMIT 1", [userId]);
  return result.rows[0]?.created_at ? new Date(result.rows[0].created_at) : null;
}

async function getOrCreateInternalAccount(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureInternalAccountsTable(client);
  const existing = await client.query(
    "SELECT user_id, balance, updated_at FROM internal_accounts WHERE user_id = $1",
    [userId]
  );
  if (existing.rows[0]) {
    const balance = Number(existing.rows[0].balance || 0);
    if (balance <= 0) {
      const tx = await client.query(
        "SELECT id FROM internal_transactions WHERE to_user_id = $1 OR from_user_id = $1 LIMIT 1",
        [userId]
      );
      if (!tx.rows[0]) {
        await ensureHouseAccount(client);
        const updated = await client.query(
          "UPDATE internal_accounts SET balance = $2, updated_at = NOW() WHERE user_id = $1 RETURNING user_id, balance, updated_at",
          [userId, 20]
        );
        await client.query(
          "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
          [HK_MASTER_USER_ID, 20]
        );
        await client.query(
          "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
          [HK_MASTER_USER_ID, userId, 20, "hkcoin_bootstrap"]
        );
        return updated.rows[0];
      }
    }
    return existing.rows[0];
  }
  await ensureHouseAccount(client);
  const created = await client.query(
    "INSERT INTO internal_accounts (user_id, balance) VALUES ($1, $2) RETURNING user_id, balance, updated_at",
    [userId, 20]
  );
  await client.query(
    "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
    [HK_MASTER_USER_ID, 20]
  );
  await client.query(
    "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
    [HK_MASTER_USER_ID, userId, 20, "hkcoin_bootstrap"]
  );
  return created.rows[0];
}

async function ensureHouseAccount(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureInternalAccountsTable(client);
  const existing = await client.query(
    "SELECT user_id FROM internal_accounts WHERE user_id = $1",
    [HK_MASTER_USER_ID]
  );
  if (existing.rows[0]) return;
  await client.query(
    "INSERT INTO internal_accounts (user_id, balance) VALUES ($1, $2)",
    [HK_MASTER_USER_ID, HK_MASTER_INITIAL_SUPPLY]
  );
}

async function ensureAssetsColumns(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS total_supply NUMERIC(18,2) DEFAULT 0");
  await client.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS available_supply NUMERIC(18,2) DEFAULT 0");
  await client.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false");
}

async function ensurePriceHistoryTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS price_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), asset_id UUID REFERENCES assets(id) ON DELETE CASCADE, price NUMERIC(12,2) NOT NULL, recorded_at DATE DEFAULT CURRENT_DATE)"
  );
}

async function ensureSettingsTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
}

async function ensureUsersTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), auth_uid TEXT DEFAULT '', name TEXT DEFAULT '', email TEXT NOT NULL UNIQUE, photo_url TEXT DEFAULT '', auth_provider TEXT DEFAULT '', permission_level TEXT DEFAULT 'A', status TEXT DEFAULT 'Ativo', created_at TIMESTAMPTZ DEFAULT NOW(), last_login_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensureAdminActionsTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS admin_actions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), admin_id TEXT NOT NULL, action TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("CREATE INDEX IF NOT EXISTS admin_actions_admin_id_idx ON admin_actions (admin_id)");
}

async function assertAdmin(client: { query: (sql: string, params?: any[]) => Promise<any> }, adminId: string) {
  await ensureUsersTable(client);
  const result = await client.query(
    "SELECT permission_level FROM users WHERE lower(email) = lower($1) OR id::text = $1 LIMIT 1",
    [adminId]
  );
  const level = result.rows[0]?.permission_level ?? 'A';
  if (level !== 'B') {
    const error = new Error('Acesso negado: admin obrigatório.');
    (error as { status?: number }).status = 403;
    throw error;
  }
}

async function logAdminAction(client: { query: (sql: string, params?: any[]) => Promise<any> }, adminId: string, action: string) {
  await ensureAdminActionsTable(client);
  await client.query("INSERT INTO admin_actions (admin_id, action) VALUES ($1, $2)", [adminId, action]);
}

async function loadProjectContentForUser(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  projectId: string,
  userId: string
) {
  await ensureProjectsColumns(client);
  const result = await client.query(
    "SELECT id, owner_user_id, is_template, html_content, css_content, created_at, updated_at FROM projects WHERE id = $1",
    [projectId]
  );
  const project = result.rows[0];
  if (!project) throw httpError(404, "Projeto não encontrado.");

  if (project.is_template) {
    await assertAdmin(client, userId);
  } else if (String(project.owner_user_id || "").toLowerCase() !== String(userId || "").toLowerCase()) {
    throw httpError(403, "Acesso negado ao conteúdo do projeto.");
  }

  return project;
}

async function ensureUserGamificationTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS user_gamification (user_id TEXT PRIMARY KEY, plan TEXT DEFAULT 'free', usage_score INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensureUserCardsTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS user_cards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL UNIQUE, seed BIGINT NOT NULL, hash_seed TEXT NOT NULL, name TEXT NOT NULL, species TEXT NOT NULL, class TEXT NOT NULL, rarity TEXT NOT NULL, attributes JSONB NOT NULL, visual_meta JSONB NOT NULL DEFAULT '{}'::jsonb, market_value NUMERIC(12,2) DEFAULT 10, image_url TEXT DEFAULT '', level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS hash_seed TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS visual_meta JSONB NOT NULL DEFAULT '{}'::jsonb");
  await client.query("ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS market_value NUMERIC(12,2) DEFAULT 10");
  await client.query("ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''");
}

async function ensureInternalAccountsTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS internal_accounts (user_id TEXT PRIMARY KEY, balance NUMERIC(14,2) DEFAULT 20, updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS internal_transactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), from_user_id TEXT, to_user_id TEXT, amount NUMERIC(14,2) NOT NULL, reason TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE internal_accounts ALTER COLUMN balance SET DEFAULT 20");
}

async function ensureDepositTables(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS deposit_accounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, cpf TEXT DEFAULT '', balance NUMERIC(14,2) DEFAULT 0, currency TEXT DEFAULT 'BRL', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS deposit_transactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID REFERENCES deposit_accounts(id) ON DELETE CASCADE, method TEXT DEFAULT 'pix', amount NUMERIC(14,2) NOT NULL, status TEXT DEFAULT 'confirmed', reference TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function getOrCreateDepositAccount(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string, cpf?: string) {
  await ensureDepositTables(client);
  const existing = await client.query(
    "SELECT id, user_id, cpf, balance, currency, created_at, updated_at FROM deposit_accounts WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (existing.rows[0]) {
    if (cpf && !existing.rows[0].cpf) {
      const updated = await client.query(
        "UPDATE deposit_accounts SET cpf = $1, updated_at = NOW() WHERE id = $2 RETURNING id, user_id, cpf, balance, currency, created_at, updated_at",
        [cpf, existing.rows[0].id]
      );
      return updated.rows[0];
    }
    return existing.rows[0];
  }
  const created = await client.query(
    "INSERT INTO deposit_accounts (user_id, cpf, balance, currency) VALUES ($1, $2, $3, $4) RETURNING id, user_id, cpf, balance, currency, created_at, updated_at",
    [userId, cpf ?? "", 0, "BRL"]
  );
  return created.rows[0];
}

async function hasPixConfirmation(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureDepositTables(client);
  const result = await client.query(
    "SELECT dt.id FROM deposit_transactions dt JOIN deposit_accounts da ON da.id = dt.account_id WHERE da.user_id = $1 AND dt.status = 'confirmed' AND dt.method = 'pix' AND dt.amount >= 1 ORDER BY dt.created_at DESC LIMIT 1",
    [userId]
  );
  return !!result.rows[0];
}

async function getMasterEmail(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureSettingsTable(client);
  const result = await client.query("SELECT value FROM settings WHERE key = 'master_email' LIMIT 1");
  return (result.rows[0]?.value as string | undefined) || "master@hktech.com.br";
}

async function getPool() {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    pool = new Pool({ connectionString: databaseUrl });
    return pool;
  }

  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS;
  const dbName = process.env.DB_NAME;

  if (!instanceConnectionName || !dbUser || !dbPass || !dbName) {
    throw new Error("Missing Cloud SQL env vars.");
  }

  if (!connector) {
    connector = new Connector();
  }

  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
  });

  pool = new Pool({
    ...clientOpts,
    user: dbUser,
    password: dbPass,
    database: dbName,
  });

  return pool;
}

app.get("/products", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name, price, description, product_type, base_project_id, template_id, show_on_home, show_on_marketplace, purchase_price, sale_price FROM products ORDER BY created_at DESC"
      );
      const productIds = result.rows.map((row: { id: string }) => row.id);
      const couponsMap = await fetchAutoCouponsByProduct(client, productIds);
      const enriched = result.rows.map((row: any) => {
        const priceValue = Number(String(row.sale_price ?? row.price ?? "0").replace(",", ".")) || 0;
        const coupon = couponsMap.get(row.id);
        const discount = coupon?.discount ?? 0;
          const final = calculateOrderTotal(priceValue, discount);
        return {
          ...row,
          auto_coupon_code: coupon?.code ?? null,
          auto_coupon_discount: discount,
          final_price: final,
        };
      });
      res.json(enriched);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        const retry = await client.query(
          "SELECT id, name, price, description, product_type, base_project_id, template_id, show_on_home, show_on_marketplace, purchase_price, sale_price FROM products ORDER BY created_at DESC"
        );
        const productIds = retry.rows.map((row: { id: string }) => row.id);
        const couponsMap = await fetchAutoCouponsByProduct(client, productIds);
        const enriched = retry.rows.map((row: any) => {
          const priceValue = Number(String(row.sale_price ?? row.price ?? "0").replace(",", ".")) || 0;
          const coupon = couponsMap.get(row.id);
          const discount = coupon?.discount ?? 0;
          const final = calculateOrderTotal(priceValue, discount);
          return {
            ...row,
            auto_coupon_code: coupon?.code ?? null,
            auto_coupon_discount: discount,
            final_price: final,
          };
        });
        res.json(enriched);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar produtos." });
  }
});

app.post("/products", async (req, res) => {
  const { name, price, description, showOnHome, showOnMarketplace, purchasePrice, salePrice, productType, baseProjectId, templateId } = req.body ?? {};
  if (!name || !price) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const finalSalePrice = salePrice ?? price;
    try {
      const result = await client.query(
        "INSERT INTO products (name, price, description, product_type, base_project_id, template_id, show_on_home, show_on_marketplace, purchase_price, sale_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, price, description, product_type, base_project_id, template_id, show_on_home, show_on_marketplace, purchase_price, sale_price",
        [name, finalSalePrice, description ?? "", productType ?? "digital", baseProjectId ?? null, templateId ?? null, !!showOnHome, !!showOnMarketplace, purchasePrice ?? "", finalSalePrice]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        const retry = await client.query(
          "INSERT INTO products (name, price, description, product_type, base_project_id, template_id, show_on_home, show_on_marketplace, purchase_price, sale_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, price, description, product_type, base_project_id, template_id, show_on_home, show_on_marketplace, purchase_price, sale_price",
          [name, finalSalePrice, description ?? "", productType ?? "digital", baseProjectId ?? null, templateId ?? null, !!showOnHome, !!showOnMarketplace, purchasePrice ?? "", finalSalePrice]
        );
        res.status(201).json(retry.rows[0]);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar produto." });
  }
});

app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, description, showOnHome, showOnMarketplace, purchasePrice, salePrice, productType, baseProjectId, templateId } = req.body ?? {};
  if (!name || !price) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const finalSalePrice = salePrice ?? price;
    try {
      const result = await client.query(
        "UPDATE products SET name = $1, price = $2, description = $3, product_type = $4, base_project_id = $5, template_id = $6, show_on_home = $7, show_on_marketplace = $8, purchase_price = $9, sale_price = $10 WHERE id = $11 RETURNING id, name, price, description, product_type, base_project_id, template_id, show_on_home, show_on_marketplace, purchase_price, sale_price",
        [name, finalSalePrice, description ?? "", productType ?? "digital", baseProjectId ?? null, templateId ?? null, !!showOnHome, !!showOnMarketplace, purchasePrice ?? "", finalSalePrice, id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        const retry = await client.query(
          "UPDATE products SET name = $1, price = $2, description = $3, product_type = $4, base_project_id = $5, template_id = $6, show_on_home = $7, show_on_marketplace = $8, purchase_price = $9, sale_price = $10 WHERE id = $11 RETURNING id, name, price, description, product_type, base_project_id, template_id, show_on_home, show_on_marketplace, purchase_price, sale_price",
          [name, finalSalePrice, description ?? "", productType ?? "digital", baseProjectId ?? null, templateId ?? null, !!showOnHome, !!showOnMarketplace, purchasePrice ?? "", finalSalePrice, id]
        );
        res.json(retry.rows[0]);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao editar produto." });
  }
});

app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await client.query("DELETE FROM products WHERE id = $1", [id]);
    client.release();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir produto." });
  }
});

app.get("/purchases", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : null;
    const purchaseType = typeof req.query.purchaseType === "string" ? req.query.purchaseType : null;
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensurePurchasesTable(client);
      const filters: string[] = [];
      const params: Array<string> = [];
      if (userId) {
        params.push(userId);
        filters.push(`pu.user_id = $${params.length}`);
      }
      if (purchaseType) {
        params.push(purchaseType);
        filters.push(`pu.purchase_type = $${params.length}`);
      }
      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const result = await client.query(
        `SELECT pu.id, pu.user_id, pu.product_id, pu.project_id, pu.price, pu.purchase_type, pu.status, pu.created_at, pr.name as product_name, pr.description as product_description, pr.sale_price, pr.purchase_price, COALESCE(bp.id, pr.base_project_id) as base_project_id, bp.name as base_project_name, cp.name as project_name, (pu.project_id IS NOT NULL AND cp.id IS NOT NULL AND cp.created_from_purchase = true AND cp.is_template = false) as redeemed FROM purchases pu JOIN products pr ON pr.id = pu.product_id LEFT JOIN projects cp ON cp.id = pu.project_id LEFT JOIN projects bp ON bp.id = COALESCE(cp.base_project_id, pr.base_project_id) ${whereClause} ORDER BY pu.created_at DESC`,
        params
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar compras." });
  }
});

app.get("/commerce-orders", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : null;
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureCommerceOrdersTable(client);
      const result = await client.query(
        userId
          ? "SELECT id, user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference, created_at FROM commerce_orders WHERE user_id = $1 ORDER BY created_at DESC"
          : "SELECT id, user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference, created_at FROM commerce_orders ORDER BY created_at DESC",
        userId ? [userId] : []
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar compras gerais." });
  }
});

app.post("/commerce-orders", async (req, res) => {
  const { userId, itemType, itemId, amount, currency, status, paymentMethod, paymentReference } = req.body ?? {};
  if (!userId || !itemType || !itemId) {
    return res.status(400).json({ message: "userId, itemType e itemId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureCommerceOrdersTable(client);
      const result = await client.query(
        "INSERT INTO commerce_orders (user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference, created_at",
        [
          userId,
          itemType,
          itemId,
          Number(amount) || 0,
          currency ?? "BRL",
          status ?? "completed",
          paymentMethod ?? "pix",
          paymentReference ?? "",
        ]
      );
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao registrar compra geral." });
  }
});

const handleCheckoutProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body ?? {};
  if (!id || !userId) {
    return res.status(400).json({ message: "productId e userId são obrigatórios." });
  }
  if (!isUuid(id)) {
    return res.status(400).json({ message: "productId inválido." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureCommerceOrdersTable(client);
      await ensureProductsColumns(client);
      await ensurePurchasesTable(client);
      await ensureProjectsColumns(client);
      await ensureTemplatesTable(client);
      await ensureTemplateTasksTable(client);
      await ensureProjectTasksTable(client);
      await ensureTemplateFilesTable(client);
      await ensureProjectFilesTable(client);

      await client.query("BEGIN");

      const productResult = await client.query(
        "SELECT id, name, price, sale_price, description, product_type, template_id FROM products WHERE id = $1",
        [id]
      );

      const product = productResult.rows[0];
      if (!product) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Produto não encontrado." });
      }

      const templateId = product.template_id as string | null;
      if (!templateId) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Produto sem template vinculado." });
      }

      const isDigitalProject = product.product_type === "digital" || product.product_type === "projeto";
      if (!isDigitalProject) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Produto não exige resgate de projeto." });
      }

      const templateResult = await client.query(
        "SELECT id, version, is_active FROM templates WHERE id = $1",
        [templateId]
      );
      if (!templateResult.rows[0] || !templateResult.rows[0].is_active) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Template vinculado inválido ou inativo." });
      }

      const originalAmount = Number(String(product.sale_price ?? product.price ?? "0").replace(",", ".")) || 0;
      const couponMap = await fetchAutoCouponsByProduct(client, [product.id]);
      const coupon = couponMap.get(product.id);
      const couponResult = applyCoupon(originalAmount, { code: coupon?.code ?? null, discount: coupon?.discount ?? 0 });
      const { discount, finalAmount, couponApplied } = couponResult;

      const order = await client.query(
        "INSERT INTO commerce_orders (user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference, created_at",
        [
          userId,
          "product",
          product.id,
          finalAmount,
          "BRL",
          "completed",
          couponApplied ? "coupon" : "pix",
          couponApplied ? couponResult.code ?? "" : "",
        ]
      );

      const existingPurchase = await client.query(
        "SELECT id, project_id FROM purchases WHERE user_id = $1 AND product_id = $2 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
        [userId, product.id]
      );

      let purchaseId = existingPurchase.rows[0]?.id as string | undefined;
      let projectId = existingPurchase.rows[0]?.project_id as string | undefined;

      const purchaseType = finalAmount === 0 && couponApplied ? "paid" : finalAmount === 0 ? "free" : "paid";
      if (!purchaseId) {
        const createdPurchase = await client.query(
          "INSERT INTO purchases (user_id, product_id, price, purchase_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [userId, product.id, originalAmount, purchaseType, "completed"]
        );
        purchaseId = createdPurchase.rows[0]?.id as string | undefined;
      } else {
        await client.query(
          "UPDATE purchases SET purchase_type = $1 WHERE id = $2",
          [purchaseType, purchaseId]
        );
      }

      if (projectId) {
        const existingProject = await client.query(
          "SELECT id FROM projects WHERE id = $1 AND created_from_purchase = true AND is_template = false AND owner_user_id = $2",
          [projectId, userId]
        );
        if (!existingProject.rows[0]) {
          projectId = undefined;
        }
      }

      if (!projectId && purchaseId) {
        const existingClone = await client.query(
          "SELECT id FROM projects WHERE purchase_id = $1 AND created_from_purchase = true AND is_template = false",
          [purchaseId]
        );
        if (existingClone.rows[0]) {
          projectId = existingClone.rows[0].id;
        }
      }

      if (!projectId && purchaseId) {
        const ownerProductClone = await client.query(
          "SELECT id FROM projects WHERE owner_user_id = $1 AND product_id = $2 AND created_from_purchase = true AND is_template = false LIMIT 1",
          [userId, product.id]
        );
        if (ownerProductClone.rows[0]) {
          projectId = ownerProductClone.rows[0].id;
        }
      }

      if (!projectId && purchaseId) {
        const cloned = await cloneTemplateForPurchase(client, templateId, String(userId), product.id, purchaseId);
        projectId = cloned?.id as string | undefined;
      }

      if (purchaseId && projectId) {
        await client.query("UPDATE purchases SET project_id = $1 WHERE id = $2", [projectId, purchaseId]);
      }

      await client.query("COMMIT");

      res.status(201).json({
        order: order.rows[0],
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
        },
        coupon: couponApplied
          ? {
              code: couponResult.code ?? "",
              discount,
              autoApply: true,
            }
          : null,
        amounts: {
          original: originalAmount,
          discount,
          final: finalAmount,
        },
        projectId,
        purchaseId,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao concluir checkout.";
    console.error(error);
    res.status(500).json({ message });
  }
};

app.post("/checkout/products/:id", handleCheckoutProduct);
app.post("/checkout", async (req, res) => {
  req.params = { ...(req.params || {}), id: String(req.body?.productId || "") } as any;
  return handleCheckoutProduct(req, res);
});

app.post("/purchases", async (req, res) => {
  const { userId, productId } = req.body ?? {};
  if (!userId || !productId) {
    return res.status(400).json({ message: "userId e productId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureProductsColumns(client);
      await ensurePurchasesTable(client);
      await ensureProjectsColumns(client);

      await client.query("BEGIN");

      await cleanupInvalidUserPurchases(client, userId);

      const productResult = await client.query(
        "SELECT id, name, description, price, purchase_price, sale_price, product_type, base_project_id FROM products WHERE id = $1",
        [productId]
      );

      if (!productResult.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Produto não encontrado." });
      }

      const product = productResult.rows[0];
      const saleValue = Number(String(product.sale_price ?? product.price ?? "0").replace(",", ".")) || 0;
      const purchaseType = saleValue <= 0 ? "free" : "paid";

      if (purchaseType === "free") {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Produto gratuito: use o resgate no marketplace." });
      }
      const existingPurchases = await client.query(
        "SELECT id, purchase_type, created_at FROM purchases WHERE user_id = $1 AND product_id = $2 AND status = 'completed' ORDER BY created_at DESC",
        [userId, product.id]
      );

      if (existingPurchases.rows.length > 1) {
        const olderIds = existingPurchases.rows.slice(1).map((row: { id: string }) => row.id);
        await client.query("UPDATE purchases SET status = 'canceled' WHERE id = ANY($1)", [olderIds]);
      }

      let purchaseId: string | null = existingPurchases.rows[0]?.id ?? null;

      if (purchaseId) {
        await client.query(
          "UPDATE purchases SET purchase_type = $1 WHERE id = $2 AND (purchase_type IS NULL OR purchase_type = '')",
          [purchaseType, purchaseId]
        );
      }

      if (!purchaseId) {
        const createdPurchase = await client.query(
          "INSERT INTO purchases (user_id, product_id, price, purchase_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, product_id, project_id, price, purchase_type, status, created_at",
          [userId, product.id, saleValue, purchaseType, "completed"]
        );
        purchaseId = createdPurchase.rows[0]?.id ?? null;
      }

      const isDigitalProject = product.product_type === "digital" || product.product_type === "projeto";
      let projectId: string | null = null;

      if (purchaseId && isDigitalProject) {
        let baseProjectId: string | null = product.base_project_id ?? null;
        if (!baseProjectId) {
          const fallbackBase = await client.query(
            "SELECT id FROM projects WHERE is_template = true AND lower(name) = lower($1) LIMIT 1",
            [product.name]
          );
          baseProjectId = fallbackBase.rows[0]?.id ?? null;
        }

        if (!baseProjectId) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "Projeto base não configurado para este produto." });
        }

        const existingClone = await client.query(
          "SELECT id FROM projects WHERE purchase_id = $1 AND created_from_purchase = true AND is_template = false",
          [purchaseId]
        );

        if (existingClone.rows[0]) {
          projectId = existingClone.rows[0].id;
        } else {
          const baseProject = await client.query(
            "SELECT name, description, project_type, sale_price, production_cost, repository, domain, hosting, status, html_content, css_content FROM projects WHERE id = $1",
            [baseProjectId]
          );

          if (!baseProject.rows[0]) {
            await client.query("ROLLBACK");
            return res.status(409).json({ message: "Projeto base não encontrado." });
          }

          const base = baseProject.rows[0];
          const createdClone = await client.query(
            "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, purchase_id, created_from_purchase, is_template, html_content, css_content, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()) RETURNING id",
            [
              base.name,
              base.description ?? "",
              base.project_type ?? inferProjectType(base.name),
              base.sale_price ?? product.sale_price ?? product.price ?? "",
              base.production_cost ?? product.purchase_price ?? "",
              1,
              base.repository ?? "",
              base.domain ?? "",
              base.hosting ?? "Vercel",
              base.status ?? "Ativo",
              true,
              false,
              userId,
              product.id,
              baseProjectId,
              purchaseId,
              true,
              false,
              base.html_content ?? "",
              base.css_content ?? "",
            ]
          );
          projectId = createdClone.rows[0]?.id ?? null;
        }

        if (projectId) {
          await client.query("UPDATE purchases SET project_id = $1 WHERE id = $2", [projectId, purchaseId]);
        }
      }

      const purchase = await client.query(
        "SELECT id, user_id, product_id, project_id, price, purchase_type, status, created_at FROM purchases WHERE id = $1",
        [purchaseId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        purchase: purchase.rows[0],
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          salePrice: product.sale_price,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      const typed = error as { status?: number; message?: string };
      if (typed.status) {
        return res.status(typed.status).json({ message: typed.message || "Erro ao registrar compra." });
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao registrar compra." });
  }
});

app.post("/purchases/:id/redeem", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body ?? {};
  if (!id || !userId) {
    return res.status(400).json({ message: "purchase id e userId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureProductsColumns(client);
      await ensurePurchasesTable(client);
      await ensureProjectsColumns(client);

      await client.query("BEGIN");

      const purchaseResult = await client.query(
        "SELECT id, user_id, product_id, project_id, status FROM purchases WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      const purchase = purchaseResult.rows[0];
      if (!purchase) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Compra não encontrada." });
      }
      if (purchase.status !== "completed") {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Compra não está concluída." });
      }

      if (purchase.project_id) {
        const existingProject = await client.query(
          "SELECT id FROM projects WHERE id = $1 AND created_from_purchase = true AND is_template = false AND owner_user_id = $2",
          [purchase.project_id, userId]
        );
        if (existingProject.rows[0]) {
          await client.query("COMMIT");
          return res.json({ projectId: purchase.project_id, redeemed: true });
        }
      }

      const productResult = await client.query(
        "SELECT id, name, price, purchase_price, sale_price, product_type, base_project_id FROM products WHERE id = $1",
        [purchase.product_id]
      );

      const product = productResult.rows[0];
      if (!product) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Produto não encontrado para a compra." });
      }

      const isDigitalProject = product.product_type === "digital" || product.product_type === "projeto";
      if (!isDigitalProject) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Produto não exige resgate de projeto." });
      }

      let baseProjectId: string | null = product.base_project_id ?? null;
      if (!baseProjectId) {
        const fallbackBase = await client.query(
          "SELECT id FROM projects WHERE is_template = true AND lower(name) = lower($1) LIMIT 1",
          [product.name]
        );
        baseProjectId = fallbackBase.rows[0]?.id ?? null;
      }

      if (!baseProjectId) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Projeto base não configurado para este produto." });
      }

      const existingClone = await client.query(
        "SELECT id FROM projects WHERE purchase_id = $1 AND created_from_purchase = true AND is_template = false",
        [purchase.id]
      );

      if (existingClone.rows[0]) {
        await client.query("UPDATE purchases SET project_id = $1 WHERE id = $2", [existingClone.rows[0].id, purchase.id]);
        await client.query("COMMIT");
        return res.json({ projectId: existingClone.rows[0].id, redeemed: true });
      }

      const ownerProductClone = await client.query(
        "SELECT id FROM projects WHERE owner_user_id = $1 AND product_id = $2 AND created_from_purchase = true AND is_template = false LIMIT 1",
        [userId, product.id]
      );

      if (ownerProductClone.rows[0]) {
        await client.query("UPDATE purchases SET project_id = $1 WHERE id = $2", [ownerProductClone.rows[0].id, purchase.id]);
        await client.query("COMMIT");
        return res.json({ projectId: ownerProductClone.rows[0].id, redeemed: true });
      }

      const baseProject = await client.query(
        "SELECT name, description, project_type, sale_price, production_cost, repository, domain, hosting, status, html_content, css_content FROM projects WHERE id = $1",
        [baseProjectId]
      );

      if (!baseProject.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Projeto base não encontrado." });
      }

      const base = baseProject.rows[0];
      const createdClone = await client.query(
        "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, purchase_id, created_from_purchase, is_template, html_content, css_content, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()) RETURNING id",
        [
          base.name,
          base.description ?? "",
          base.project_type ?? inferProjectType(base.name),
          base.sale_price ?? product.sale_price ?? product.price ?? "",
          base.production_cost ?? product.purchase_price ?? "",
          1,
          base.repository ?? "",
          base.domain ?? "",
          base.hosting ?? "Vercel",
          base.status ?? "Ativo",
          true,
          false,
          userId,
          product.id,
          baseProjectId,
          purchase.id,
          true,
          false,
          base.html_content ?? "",
          base.css_content ?? "",
        ]
      );

      const projectId = createdClone.rows[0]?.id ?? null;
      await client.query("UPDATE purchases SET project_id = $1 WHERE id = $2", [projectId, purchase.id]);

      await client.query("COMMIT");

      res.json({ projectId, redeemed: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao resgatar projeto." });
  }
});

app.post("/products/:id/redeem", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body ?? {};
  if (!id || !userId) {
    return res.status(400).json({ message: "product id e userId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureProductsColumns(client);
      await ensurePurchasesTable(client);
      await ensureProjectsColumns(client);

      await client.query("BEGIN");

      const productResult = await client.query(
        "SELECT id, name, price, purchase_price, sale_price, product_type, base_project_id FROM products WHERE id = $1",
        [id]
      );

      const product = productResult.rows[0];
      if (!product) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Produto não encontrado." });
      }

      const saleValue = Number(String(product.sale_price ?? product.price ?? "0").replace(",", ".")) || 0;
      if (saleValue > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Produto não é gratuito." });
      }

      const isDigitalProject = product.product_type === "digital" || product.product_type === "projeto";
      if (!isDigitalProject) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Produto não exige resgate de projeto." });
      }

      let baseProjectId: string | null = product.base_project_id ?? null;
      if (!baseProjectId) {
        const fallbackBase = await client.query(
          "SELECT id FROM projects WHERE is_template = true AND lower(name) = lower($1) LIMIT 1",
          [product.name]
        );
        baseProjectId = fallbackBase.rows[0]?.id ?? null;
      }

      if (!baseProjectId) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Projeto base não configurado para este produto." });
      }

      const existingPurchaseResult = await client.query(
        "SELECT id, project_id FROM purchases WHERE user_id = $1 AND product_id = $2 AND status = 'completed' ORDER BY created_at DESC",
        [userId, product.id]
      );

      let purchaseId: string | null = existingPurchaseResult.rows[0]?.id ?? null;
      let projectId: string | null = existingPurchaseResult.rows[0]?.project_id ?? null;

      if (!purchaseId) {
        const createdPurchase = await client.query(
          "INSERT INTO purchases (user_id, product_id, price, purchase_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [userId, product.id, 0, "free", "completed"]
        );
        purchaseId = createdPurchase.rows[0]?.id ?? null;
      }

      if (projectId) {
        const existingProject = await client.query(
          "SELECT id FROM projects WHERE id = $1 AND created_from_purchase = true AND is_template = false AND owner_user_id = $2",
          [projectId, userId]
        );
        if (existingProject.rows[0]) {
          await client.query("COMMIT");
          return res.json({ projectId, redeemed: true });
        }
      }

      const existingClone = await client.query(
        "SELECT id FROM projects WHERE purchase_id = $1 AND created_from_purchase = true AND is_template = false",
        [purchaseId]
      );

      if (existingClone.rows[0]) {
        projectId = existingClone.rows[0].id;
      } else {
        const ownerProductClone = await client.query(
          "SELECT id FROM projects WHERE owner_user_id = $1 AND product_id = $2 AND created_from_purchase = true AND is_template = false LIMIT 1",
          [userId, product.id]
        );
        if (ownerProductClone.rows[0]) {
          projectId = ownerProductClone.rows[0].id;
        }
      }

      if (!projectId) {
        const baseProject = await client.query(
          "SELECT name, description, project_type, sale_price, production_cost, repository, domain, hosting, status, html_content, css_content FROM projects WHERE id = $1",
          [baseProjectId]
        );

        if (!baseProject.rows[0]) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "Projeto base não encontrado." });
        }

        const base = baseProject.rows[0];
        const createdClone = await client.query(
          "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, purchase_id, created_from_purchase, is_template, html_content, css_content, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()) RETURNING id",
          [
            base.name,
            base.description ?? "",
            base.project_type ?? inferProjectType(base.name),
            base.sale_price ?? product.sale_price ?? product.price ?? "",
            base.production_cost ?? product.purchase_price ?? "",
            1,
            base.repository ?? "",
            base.domain ?? "",
            base.hosting ?? "Vercel",
            base.status ?? "Ativo",
            true,
            false,
            userId,
            product.id,
            baseProjectId,
            purchaseId,
            true,
            false,
            base.html_content ?? "",
            base.css_content ?? "",
          ]
        );
        projectId = createdClone.rows[0]?.id ?? null;
      }

      await client.query("UPDATE purchases SET project_id = $1 WHERE id = $2", [projectId, purchaseId]);

      await client.query("COMMIT");
      res.json({ projectId, redeemed: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error(error);
    res.status(500).json({ message: "Erro ao resgatar projeto gratuito.", details });
  }
});

app.get("/cards/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureMyBotTables(client);
      await getOrCreateMyBot(client, userId);
      const existing = await client.query(
        "SELECT id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, level, xp, created_at, updated_at FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (!existing.rows[0]) {
        return res.status(404).json({ message: "Carta não encontrada." });
      }
      const row = existing.rows[0];
      const visualMetaEmpty = !row.visual_meta || Object.keys(row.visual_meta || {}).length === 0;
      if (row.hash_seed && (visualMetaEmpty || !row.image_url)) {
        const visualMeta = generateVisualMetaFromHash(String(row.hash_seed));
        const imageUrl = await ensureAlienImage(row.user_id, row.name, row.rarity, visualMeta, String(row.hash_seed));
        const updated = await client.query(
          "UPDATE user_cards SET visual_meta = $2, image_url = $3, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp, created_at, updated_at",
          [row.user_id, visualMeta, imageUrl]
        );
        return res.json(updated.rows[0]);
      }
      res.json(row);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar carta." });
  }
});

app.post("/cards/:userId", async (req, res) => {
  const { userId } = req.params;
  const { cpf } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureUserCardsTable(client);
      await ensureMyBotTables(client);
      await ensureDepositTables(client);
      await ensureInternalAccountsTable(client);
      await getOrCreateMyBot(client, userId);
      const existing = await client.query(
        "SELECT id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, level, xp, created_at, updated_at FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (existing.rows[0] && existing.rows[0].hash_seed) {
        await client.query("COMMIT");
        return res.json(existing.rows[0]);
      }

      if (!cpf) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "CPF é obrigatório para criar o MyBot." });
      }

      const botsCount = await client.query("SELECT COUNT(*)::int AS total FROM mybot_cpf_registry");
      if (Number(botsCount.rows[0]?.total || 0) >= 2000000) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "Limite máximo de MyBots atingido." });
      }

      const cpfHash = hashCpf(String(cpf));
      const cpfOwner = await client.query("SELECT user_id FROM mybot_cpf_registry WHERE cpf_hash = $1", [cpfHash]);
      if (cpfOwner.rows[0] && String(cpfOwner.rows[0].user_id) !== String(userId)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Este CPF já possui um MyBot ativo." });
      }

      const activation = await client.query(
        "SELECT id, credits_granted FROM mybot_activations WHERE user_id = $1 OR cpf_hash = $2 LIMIT 1",
        [userId, cpfHash]
      );

      if (!activation.rows[0]) {
        await client.query(
          "INSERT INTO mybot_activations (user_id, cpf_hash, deposit_tx_id, credits_granted) VALUES ($1, $2, $3, $4)",
          [userId, cpfHash, null, 0]
        );
      }

      await client.query(
        "INSERT INTO mybot_cpf_registry (cpf_hash, user_id) VALUES ($1, $2) ON CONFLICT (cpf_hash) DO NOTHING",
        [cpfHash, userId]
      );

      const hashSeed = hashCpfUser(String(cpf || ""), userId);
      const seed = seedFromHash(hashSeed);
      const gamification = await getOrCreateGamification(client, userId);
      const createdAt = await getUserCreatedAt(client, userId);
      const accountAgeDays = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000)) : 0;
      const level = Math.floor(Number(gamification.xp || 0) / 100) + 1;
      const profile = generateCardProfile(seed, {
        accountAgeDays,
        usageScore: Number(gamification.usage_score || 0),
        plan: gamification.plan || "free",
        level,
      });
      const visualMeta = generateVisualMetaFromHash(hashSeed);
      const marketValue = computeMarketValue(profile.attributes, profile.rarity);
      const imageUrl = await ensureAlienImage(userId, profile.name, profile.rarity, visualMeta, hashSeed);
      if (existing.rows[0]) {
        const updated = await client.query(
          "UPDATE user_cards SET seed = $2, hash_seed = $3, name = $4, species = $5, class = $6, rarity = $7, attributes = $8, visual_meta = $9, market_value = $10, image_url = $11, level = $12, xp = $13, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp, created_at, updated_at",
          [
            userId,
            seed,
            hashSeed,
            profile.name,
            profile.species,
            profile.className,
            profile.rarity,
            profile.attributes,
            visualMeta,
            marketValue,
            imageUrl,
            level,
            Number(gamification.xp || 0),
          ]
        );
        await client.query("COMMIT");
        return res.json(updated.rows[0]);
      }

      const created = await client.query(
        "INSERT INTO user_cards (user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp, created_at, updated_at",
        [
          userId,
          seed,
          hashSeed,
          profile.name,
          profile.species,
          profile.className,
          profile.rarity,
          profile.attributes,
          visualMeta,
          marketValue,
          imageUrl,
          level,
          Number(gamification.xp || 0),
        ]
      );
      await client.query("COMMIT");
      return res.status(201).json(created.rows[0]);
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erro ao criar carta.";
    if (message.toLowerCase().includes("cpf")) {
      return res.status(400).json({ message });
    }
    res.status(500).json({ message });
  }
});

app.post("/cards/:userId/refresh", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureMyBotTables(client);
      await getOrCreateMyBot(client, userId);
      const existing = await client.query(
        "SELECT id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, level, xp FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (!existing.rows[0]) {
        return res.status(404).json({ message: "My Bot não encontrado." });
      }
      const hashSeedValue = String(existing.rows[0].hash_seed || "");
      if (!hashSeedValue) {
        return res.status(400).json({ message: "Informe o CPF para ativar seu My Bot." });
      }
      const visualMeta = generateVisualMetaFromHash(hashSeedValue);
      const imageUrl = await ensureAlienImage(userId, existing.rows[0].name, existing.rows[0].rarity, visualMeta, hashSeedValue);
      const updated = await client.query(
        "UPDATE user_cards SET visual_meta = $2, image_url = $3, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp, created_at, updated_at",
        [userId, visualMeta, imageUrl]
      );
      res.json(updated.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar visual do My Bot." });
  }
});

app.post("/cards/:userId/xp", async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body ?? {};
  const increment = Number(amount);
  if (!userId || !Number.isFinite(increment)) {
    return res.status(400).json({ message: "userId e amount são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureMyBotTables(client);
      await getOrCreateMyBot(client, userId);
      const gamification = await getOrCreateGamification(client, userId);
      const newXp = Math.max(0, Number(gamification.xp || 0) + increment);
      const level = Math.floor(newXp / 100) + 1;
      await client.query(
        "UPDATE user_gamification SET xp = $2, updated_at = NOW() WHERE user_id = $1",
        [userId, newXp]
      );
      const existingCard = await client.query(
        "SELECT hash_seed FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (!existingCard.rows[0]) {
        return res.status(404).json({ message: "Carta não encontrada." });
      }
      const createdAt = await getUserCreatedAt(client, userId);
      const accountAgeDays = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000)) : 0;
      const seed = seedFromHash(String(existingCard.rows[0].hash_seed || ""));
      const profile = generateCardProfile(seed, {
        accountAgeDays,
        usageScore: Number(gamification.usage_score || 0),
        plan: gamification.plan || "free",
        level,
      });
      const hashSeedValue = String(existingCard.rows[0].hash_seed || "");
      const visualMeta = generateVisualMetaFromHash(hashSeedValue);
      const marketValue = computeMarketValue(profile.attributes, profile.rarity);
      const imageUrl = await ensureAlienImage(userId, profile.name, profile.rarity, visualMeta, hashSeedValue);
      const updated = await client.query(
        "UPDATE user_cards SET name = $3, species = $4, class = $5, rarity = $6, attributes = $7, visual_meta = $8, market_value = $9, image_url = $10, level = $11, xp = $12, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp, created_at, updated_at",
        [userId, seed, profile.name, profile.species, profile.className, profile.rarity, profile.attributes, visualMeta, marketValue, imageUrl, level, newXp]
      );
      res.json(updated.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao adicionar XP." });
  }
});

app.post("/gamification", async (req, res) => {
  const { userId, plan, usageScore } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserGamificationTable(client);
      const existing = await client.query("SELECT user_id FROM user_gamification WHERE user_id = $1", [userId]);
      if (existing.rows[0]) {
        const updated = await client.query(
          "UPDATE user_gamification SET plan = $2, usage_score = $3, updated_at = NOW() WHERE user_id = $1 RETURNING user_id, plan, usage_score, xp, created_at, updated_at",
          [userId, plan ?? "free", Number(usageScore) || 0]
        );
        return res.json(updated.rows[0]);
      }
      const created = await client.query(
        "INSERT INTO user_gamification (user_id, plan, usage_score, xp) VALUES ($1, $2, $3, $4) RETURNING user_id, plan, usage_score, xp, created_at, updated_at",
        [userId, plan ?? "free", Number(usageScore) || 0, 0]
      );
      res.status(201).json(created.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao salvar gamificação." });
  }
});

app.get("/mybot/battles", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  const limit = Math.min(50, Number(req.query.limit ?? 20) || 20);
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureMyBotTables(client);
      const result = await client.query(
        "SELECT * FROM mybot_battles WHERE user_id_a = $1 OR user_id_b = $1 ORDER BY created_at DESC LIMIT $2",
        [userId, limit]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar batalhas." });
  }
});

app.get("/mybot/bets", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  const limit = Math.min(100, Number(req.query.limit ?? 50) || 50);
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureMyBotTables(client);
      const result = await client.query(
        `SELECT b.id, b.user_id, b.card_id, b.battle_id, b.bet_amount, b.possible_return, b.gas_amount, b.status,
                b.created_at, b.finalized_at, b.redeemed_at,
                bt.map_name, bt.battle_type, bt.winner_user_id
         FROM mybot_bets b
         LEFT JOIN mybot_battles bt ON bt.id = b.battle_id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar apostas." });
  }
});

app.post("/mybot/bets/:betId/redeem", async (req, res) => {
  const { betId } = req.params;
  const { userId } = req.body ?? {};
  if (!betId || !userId) {
    return res.status(400).json({ message: "betId e userId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMyBotTables(client);
      await ensureInternalAccountsTable(client);
      await ensureHouseAccount(client);

      const bet = await client.query(
        "SELECT id, user_id, status, possible_return FROM mybot_bets WHERE id = $1 FOR UPDATE",
        [betId]
      );
      const row = bet.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Aposta não encontrada." });
      }
      if (String(row.user_id) !== String(userId)) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "Aposta não pertence ao usuário." });
      }
      if (row.status !== "VITORIA") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Aposta não está disponível para resgate." });
      }
      const payout = Number(row.possible_return || 0);
      if (payout <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Valor de resgate inválido." });
      }

      const master = await client.query(
        "SELECT balance FROM internal_accounts WHERE user_id = $1",
        [HK_MASTER_USER_ID]
      );
      if (Number(master.rows[0]?.balance || 0) < payout) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Saldo insuficiente no HK Master." });
      }

      await client.query(
        "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1",
        [userId, payout]
      );
      await client.query(
        "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
        [HK_MASTER_USER_ID, payout]
      );
      await client.query(
        "UPDATE mybot_bets SET status = 'RESGATADA', redeemed_at = NOW() WHERE id = $1",
        [betId]
      );
      await client.query(
        "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
        [HK_MASTER_USER_ID, userId, payout, "mybot_bet_redeem"]
      );

      await client.query("COMMIT");
      res.json({ betId, status: "RESGATADA", payout });
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao resgatar aposta." });
  }
});

app.get("/mybot/battles/queue", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureMyBotTables(client);
      const queued = await client.query(
        "SELECT id, bet_amount, level, rarity, status, created_at FROM mybot_battle_queue WHERE user_id = $1 AND status = 'waiting' ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      res.json(queued.rows[0] || null);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao consultar fila de batalha." });
  }
});

app.post("/mybot/battles/queue", async (req, res) => {
  const { userId, betAmount } = req.body ?? {};
  const bet = Number(betAmount);
  if (!userId || !Number.isFinite(bet) || bet <= 0) {
    return res.status(400).json({ message: "userId e betAmount são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMyBotTables(client);
      await ensureUserCardsTable(client);
      await ensureInternalAccountsTable(client);

      const cardResult = await client.query(
        "SELECT id, rarity, level, xp, attributes FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (!cardResult.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "MyBot não encontrado." });
      }
      const card = cardResult.rows[0];

      const account = await getOrCreateInternalAccount(client, userId);
      if (Number(account.balance) < bet) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Saldo insuficiente para apostar." });
      }

      const existingBet = await client.query(
        "SELECT id FROM mybot_bets WHERE user_id = $1 AND status IN ('PENDENTE','EM_BATALHA') ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if (existingBet.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Você já possui uma aposta ativa." });
      }

      const profile = await getOrCreateMyBotProfile(client, userId, card.id);
      const now = new Date();
      if (bet >= MYBOT_HIGH_BET_THRESHOLD) {
        const lastHigh = profile.last_high_bet_at ? new Date(profile.last_high_bet_at) : null;
        const withinWindow = lastHigh ? (now.getTime() - lastHigh.getTime()) <= MYBOT_HIGH_BET_WINDOW_MINUTES * 60000 : false;
        if (withinWindow && Number(profile.high_bet_streak || 0) >= MYBOT_HIGH_BET_MAX_STREAK) {
          await client.query("ROLLBACK");
          return res.status(429).json({ message: "Limite de apostas altas consecutivas atingido." });
        }
      }

      const existingQueue = await client.query(
        "SELECT id, bet_amount, level, rarity, status, created_at FROM mybot_battle_queue WHERE user_id = $1 AND status = 'waiting' LIMIT 1",
        [userId]
      );
      if (existingQueue.rows[0]) {
        await client.query("COMMIT");
        return res.json({ status: "queued", queue: existingQueue.rows[0] });
      }

      const rarityRank = getRarityRank(String(card.rarity));
      const level = Number(card.level || 1);

      let opponentRow: any = null;
      const levelRanges = [2, 4, 6, 8];
      const rarityRanges = [0, 1, 2];
      for (const levelRange of levelRanges) {
        for (const rarityRange of rarityRanges) {
          const candidate = await client.query(
            "SELECT * FROM mybot_battle_queue WHERE status = 'waiting' AND user_id <> $1 AND bet_amount = $2 AND ABS(level - $3) <= $4 AND ABS(rarity_rank - $5) <= $6 ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED",
            [userId, bet, level, levelRange, rarityRank, rarityRange]
          );
          if (candidate.rows[0]) {
            opponentRow = candidate.rows[0];
            break;
          }
        }
        if (opponentRow) break;
      }

      if (!opponentRow) {
        await ensureHouseAccount(client);
        await client.query(
          "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
          [userId, bet]
        );
        await client.query(
          "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1",
          [HK_MASTER_USER_ID, bet]
        );
        await client.query(
          "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
          [userId, HK_MASTER_USER_ID, bet, "mybot_bet_lock"]
        );
        const betRow = await client.query(
          "INSERT INTO mybot_bets (user_id, card_id, bet_amount, status) VALUES ($1, $2, $3, $4) RETURNING id",
          [userId, card.id, bet, "PENDENTE"]
        );
        const queued = await client.query(
          "INSERT INTO mybot_battle_queue (user_id, card_id, bet_amount, level, rarity, rarity_rank, status) VALUES ($1, $2, $3, $4, $5, $6, 'waiting') RETURNING id, bet_amount, level, rarity, status, created_at",
          [userId, card.id, bet, level, String(card.rarity || "comum"), rarityRank]
        );
        await client.query("COMMIT");
        return res.status(201).json({ status: "queued", queue: queued.rows[0], betId: betRow.rows[0].id });
      }

      const opponentAccount = await getOrCreateInternalAccount(client, opponentRow.user_id);
      if (Number(opponentAccount.balance) < bet) {
        await client.query(
          "UPDATE mybot_battle_queue SET status = 'canceled' WHERE id = $1",
          [opponentRow.id]
        );
        await ensureHouseAccount(client);
        await client.query(
          "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
          [userId, bet]
        );
        await client.query(
          "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1",
          [HK_MASTER_USER_ID, bet]
        );
        await client.query(
          "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
          [userId, HK_MASTER_USER_ID, bet, "mybot_bet_lock"]
        );
        const betRow = await client.query(
          "INSERT INTO mybot_bets (user_id, card_id, bet_amount, status) VALUES ($1, $2, $3, $4) RETURNING id",
          [userId, card.id, bet, "PENDENTE"]
        );
        const queued = await client.query(
          "INSERT INTO mybot_battle_queue (user_id, card_id, bet_amount, level, rarity, rarity_rank, status) VALUES ($1, $2, $3, $4, $5, $6, 'waiting') RETURNING id, bet_amount, level, rarity, status, created_at",
          [userId, card.id, bet, level, String(card.rarity || "comum"), rarityRank]
        );
        await client.query("COMMIT");
        return res.status(201).json({ status: "queued", queue: queued.rows[0], betId: betRow.rows[0].id });
      }

      const opponentCardResult = await client.query(
        "SELECT id, rarity, level, xp, attributes FROM user_cards WHERE user_id = $1",
        [opponentRow.user_id]
      );
      if (!opponentCardResult.rows[0]) {
        await client.query(
          "UPDATE mybot_battle_queue SET status = 'canceled' WHERE id = $1",
          [opponentRow.id]
        );
        const queued = await client.query(
          "INSERT INTO mybot_battle_queue (user_id, card_id, bet_amount, level, rarity, rarity_rank, status) VALUES ($1, $2, $3, $4, $5, $6, 'waiting') RETURNING id, bet_amount, level, rarity, status, created_at",
          [userId, card.id, bet, level, String(card.rarity || "comum"), rarityRank]
        );
        await client.query("COMMIT");
        return res.status(201).json({ status: "queued", queue: queued.rows[0] });
      }
      const opponentCard = opponentCardResult.rows[0];

      const battleId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const seed = hashString(`${battleId}|${userId}|${opponentRow.user_id}|${bet}|${createdAt}|${crypto.randomBytes(8).toString("hex")}`);

      const battleType = computeBattleType();
      const mapCandidates = computeMapWeightsByBet(bet);
      const selectedMap = pickWeightedSecure(
        mapCandidates.map((item) => ({ weight: item.weight, value: item.map }))
      );

      await ensureMyBotMapState(client, userId, card.id);
      await ensureMyBotMapState(client, opponentRow.user_id, opponentCard.id);

      await moveMyBotToMap(client, {
        botId: card.id,
        userId,
        toMapId: selectedMap.id,
        reason: "battle_start",
        battleId,
      });
      await moveMyBotToMap(client, {
        botId: opponentCard.id,
        userId: opponentRow.user_id,
        toMapId: selectedMap.id,
        reason: "battle_start",
        battleId,
      });

      const userAttrs = getBattleAttributes(card.attributes);
      const opponentAttrs = getBattleAttributes(opponentCard.attributes);
      const userRandom = Number(secureRandomFloat(0.9, 1.1).toFixed(4));
      const opponentRandom = Number(secureRandomFloat(0.9, 1.1).toFixed(4));
      const powerUser = computeBotPower(userAttrs, selectedMap.weights, userRandom);
      const powerOpponent = computeBotPower(opponentAttrs, selectedMap.weights, opponentRandom);

      let winnerUserId = powerUser.final >= powerOpponent.final ? userId : opponentRow.user_id;
      if (powerUser.final === powerOpponent.final) {
        winnerUserId = secureRandomFloat(0, 1) >= 0.5 ? userId : opponentRow.user_id;
      }

      const poolAmount = bet * 2;
      const gasAmount = Number((poolAmount * battleType.gasPct).toFixed(2));
      const payoutAmount = Number((poolAmount - gasAmount).toFixed(2));

      await ensureHouseAccount(client);
      await client.query(
        "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
        [userId, bet]
      );
      await client.query(
        "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
        [opponentRow.user_id, bet]
      );
      await client.query(
        "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1",
        [HK_MASTER_USER_ID, poolAmount]
      );
      await client.query(
        "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
        [userId, HK_MASTER_USER_ID, bet, "mybot_battle_pool"]
      );
      await client.query(
        "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
        [opponentRow.user_id, HK_MASTER_USER_ID, bet, "mybot_battle_pool"]
      );

      const battleInsert = await client.query(
        "INSERT INTO mybot_battles (id, user_id_a, user_id_b, card_id_a, card_id_b, bet_amount, battle_type, gas_pct, map_name, map_weights, modifiers, seed, power_a, power_b, random_factor_a, random_factor_b, power_final_a, power_final_b, xp_a, xp_b, winner_user_id, payout_amount, gas_amount, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) RETURNING *",
        [
          battleId,
          userId,
          opponentRow.user_id,
          card.id,
          opponentCard.id,
          bet,
          battleType.id,
          battleType.gasPct,
          selectedMap.id,
          selectedMap.weights,
          [],
          seed,
          powerUser.raw,
          powerOpponent.raw,
          userRandom,
          opponentRandom,
          powerUser.final,
          powerOpponent.final,
          0,
          0,
          winnerUserId,
          payoutAmount,
          gasAmount,
          "",
        ]
      );

      await client.query(
        "UPDATE mybot_battle_queue SET status = 'matched', matched_battle_id = $2 WHERE id = $1",
        [opponentRow.id, battleId]
      );

      const userBet = await client.query(
        "INSERT INTO mybot_bets (user_id, card_id, bet_amount, status) VALUES ($1, $2, $3, $4) RETURNING id",
        [userId, card.id, bet, "EM_BATALHA"]
      );
      const opponentBet = await client.query(
        "SELECT id FROM mybot_bets WHERE user_id = $1 AND status = 'PENDENTE' ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
        [opponentRow.user_id]
      );
      if (!opponentBet.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Oponente sem aposta ativa." });
      }
      await client.query(
        "UPDATE mybot_bets SET status = 'EM_BATALHA', battle_id = $2 WHERE id = $1",
        [opponentBet.rows[0].id, battleId]
      );

      const userProfile = await getOrCreateMyBotProfile(client, userId, card.id);
      const opponentProfile = await getOrCreateMyBotProfile(client, opponentRow.user_id, opponentCard.id);

      const userWon = winnerUserId === userId;
      const opponentWon = winnerUserId === opponentRow.user_id;

      const userXpGain = computeBattleXp(bet, userWon, Number(userProfile.loss_streak || 0));
      const opponentXpGain = computeBattleXp(bet, opponentWon, Number(opponentProfile.loss_streak || 0));

      const userXpAfter = Number(card.xp || 0) + userXpGain;
      const opponentXpAfter = Number(opponentCard.xp || 0) + opponentXpGain;
      const userLevelAfter = Math.floor(userXpAfter / MYBOT_XP_PER_LEVEL) + 1;
      const opponentLevelAfter = Math.floor(opponentXpAfter / MYBOT_XP_PER_LEVEL) + 1;
      const userPointsGained = Math.max(0, userLevelAfter - Number(card.level || 1)) * MYBOT_POINTS_PER_LEVEL;
      const opponentPointsGained = Math.max(0, opponentLevelAfter - Number(opponentCard.level || 1)) * MYBOT_POINTS_PER_LEVEL;

      await client.query(
        "UPDATE user_cards SET xp = $2, level = $3, updated_at = NOW() WHERE user_id = $1",
        [userId, userXpAfter, userLevelAfter]
      );
      await client.query(
        "UPDATE user_cards SET xp = $2, level = $3, updated_at = NOW() WHERE user_id = $1",
        [opponentRow.user_id, opponentXpAfter, opponentLevelAfter]
      );

      const reason = buildBattleExplanation({
        mapName: selectedMap.id,
        mapWeights: selectedMap.weights,
        userAttrs,
        opponentAttrs,
        userRandom,
        opponentRandom,
        userFinal: powerUser.final,
        opponentFinal: powerOpponent.final,
      });

      const updatedBattle = await client.query(
        "UPDATE mybot_battles SET xp_a = $2, xp_b = $3, reason = $4 WHERE id = $1 RETURNING *",
        [battleId, userXpGain, opponentXpGain, reason]
      );

      await client.query(
        "UPDATE mybot_bets SET status = $2, possible_return = $3, gas_amount = $4, finalized_at = NOW(), battle_id = $5 WHERE id = $1",
        [
          userBet.rows[0].id,
          userWon ? "VITORIA" : "DERROTA",
          userWon ? payoutAmount : 0,
          gasAmount,
          battleId,
        ]
      );
      await client.query(
        "UPDATE mybot_bets SET status = $2, possible_return = $3, gas_amount = $4, finalized_at = NOW(), battle_id = $5 WHERE id = $1",
        [
          opponentBet.rows[0].id,
          opponentWon ? "VITORIA" : "DERROTA",
          opponentWon ? payoutAmount : 0,
          gasAmount,
          battleId,
        ]
      );

      const nextUserLossStreak = userWon ? 0 : Number(userProfile.loss_streak || 0) + 1;
      const nextOpponentLossStreak = opponentWon ? 0 : Number(opponentProfile.loss_streak || 0) + 1;

      const userHighBetStreak = bet >= MYBOT_HIGH_BET_THRESHOLD
        ? ((userProfile.last_high_bet_at ? ((now.getTime() - new Date(userProfile.last_high_bet_at).getTime()) <= MYBOT_HIGH_BET_WINDOW_MINUTES * 60000) : false)
          ? Number(userProfile.high_bet_streak || 0) + 1
          : 1)
        : 0;
      const opponentHighBetStreak = bet >= MYBOT_HIGH_BET_THRESHOLD
        ? ((opponentProfile.last_high_bet_at ? ((now.getTime() - new Date(opponentProfile.last_high_bet_at).getTime()) <= MYBOT_HIGH_BET_WINDOW_MINUTES * 60000) : false)
          ? Number(opponentProfile.high_bet_streak || 0) + 1
          : 1)
        : 0;

      await client.query(
        "UPDATE mybot_profiles SET available_points = available_points + $2, loss_streak = $3, high_bet_streak = $4, last_high_bet_at = COALESCE($5, last_high_bet_at), last_battle_at = $6, updated_at = NOW(), card_id = $7 WHERE user_id = $1",
        [
          userId,
          userPointsGained,
          nextUserLossStreak,
          userHighBetStreak,
          bet >= MYBOT_HIGH_BET_THRESHOLD ? now : null,
          now,
          card.id,
        ]
      );
      await client.query(
        "UPDATE mybot_profiles SET available_points = available_points + $2, loss_streak = $3, high_bet_streak = $4, last_high_bet_at = COALESCE($5, last_high_bet_at), last_battle_at = $6, updated_at = NOW(), card_id = $7 WHERE user_id = $1",
        [
          opponentRow.user_id,
          opponentPointsGained,
          nextOpponentLossStreak,
          opponentHighBetStreak,
          bet >= MYBOT_HIGH_BET_THRESHOLD ? now : null,
          now,
          opponentCard.id,
        ]
      );

      await returnMyBotToOrigin(client, {
        botId: card.id,
        userId,
        reason: "battle_end",
        battleId,
      });
      await returnMyBotToOrigin(client, {
        botId: opponentCard.id,
        userId: opponentRow.user_id,
        reason: "battle_end",
        battleId,
      });

      await client.query("COMMIT");
      res.status(201).json({
        status: "matched",
        battle: updatedBattle.rows[0],
        betId: userBet.rows[0].id,
        summary: {
          map: selectedMap.id,
          battleType: battleType.id,
          modifiers: [],
          betAmount: bet,
          gasAmount,
          xp: { user: userXpGain, opponent: opponentXpGain },
          basePower: { user: powerUser.raw, opponent: powerOpponent.raw },
          randomFactor: { user: userRandom, opponent: opponentRandom },
          finalPower: { user: powerUser.final, opponent: powerOpponent.final },
          reason,
        },
      });
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao enfileirar batalha." });
  }
});

app.post("/mybot/:userId/evolve", async (req, res) => {
  const { userId } = req.params;
  const { attribute } = req.body ?? {};
  const attributeMap: Record<string, "strength" | "speed" | "intelligence"> = {
    forca: "strength",
    velocidade: "speed",
    inteligencia: "intelligence",
  };
  const key = attributeMap[String(attribute || "").toLowerCase()];
  if (!userId || !key) {
    return res.status(400).json({ message: "userId e attribute são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMyBotTables(client);
      await ensureUserCardsTable(client);
      await ensureInternalAccountsTable(client);

      const cardRes = await client.query(
        "SELECT id, rarity, level, xp, attributes FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (!cardRes.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "MyBot não encontrado." });
      }
      const card = cardRes.rows[0];
      const profile = await getOrCreateMyBotProfile(client, userId, card.id);
      if (Number(profile.available_points || 0) < 1) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Sem pontos de evolução disponíveis." });
      }

      const currentValue = Number(card.attributes?.[key] ?? 0);
      const cap = getRarityCap(String(card.rarity || "comum"));
      if (currentValue >= cap) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Atributo já está no máximo para a raridade." });
      }

      const cost = computeEvolutionCost({ level: Number(card.level || 1), rarity: String(card.rarity || "comum"), currentValue });
      const account = await getOrCreateInternalAccount(client, userId);
      if (Number(account.balance) < cost) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Saldo insuficiente para evoluir." });
      }

      const updatedAttributes = { ...(card.attributes || {}), [key]: currentValue + 1 };
      const marketValue = computeMarketValue(
        {
          strength: Number(updatedAttributes.strength ?? 0),
          speed: Number(updatedAttributes.speed ?? 0),
          intelligence: Number(updatedAttributes.intelligence ?? 0),
          endurance: Number(updatedAttributes.endurance ?? 0),
        },
        String(card.rarity || "comum")
      );

      await client.query(
        "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
        [userId, cost]
      );
      await ensureHouseAccount(client);
      await client.query(
        "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1",
        [HK_MASTER_USER_ID, cost]
      );
      await client.query(
        "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
        [userId, HK_MASTER_USER_ID, cost, "mybot_evolution"]
      );
      const updatedCard = await client.query(
        "UPDATE user_cards SET attributes = $2, market_value = $3, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, attributes, rarity, level, xp, market_value",
        [userId, updatedAttributes, marketValue]
      );
      await client.query(
        "UPDATE mybot_profiles SET available_points = available_points - 1, updated_at = NOW(), card_id = $2 WHERE user_id = $1",
        [userId, card.id]
      );
      await client.query(
        "INSERT INTO mybot_evolutions (user_id, card_id, attribute, before_value, after_value, cost, points_spent) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [userId, card.id, key, currentValue, currentValue + 1, cost, 1]
      );

      await client.query("COMMIT");
      res.status(201).json({ card: updatedCard.rows[0], cost });
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao evoluir MyBot." });
  }
});

app.get("/mybot/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureMyBotTables(client);
      const bot = await getOrCreateMyBot(client, userId);
      const stats = await getOrCreateMyBotStats(client, userId);
      const memorySummary = await client.query(
        "SELECT layer, COUNT(*)::int AS count FROM mybot_memory WHERE user_id = $1 AND is_active = true GROUP BY layer",
        [userId]
      );
      const events = await client.query(
        "SELECT id, event_type, source, payload, reversible, occurred_at, created_at, reverted_at, correlation_id, version FROM mybot_events WHERE user_id = $1 ORDER BY occurred_at DESC LIMIT 20",
        [userId]
      );
      res.json({ bot, stats, memorySummary: memorySummary.rows, recentEvents: events.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar My Bot." });
  }
});

app.get("/mybot/:userId/events", async (req, res) => {
  const { userId } = req.params;
  const limit = Number(req.query.limit ?? 50);
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureMyBotTables(client);
      const events = await client.query(
        "SELECT id, event_type, source, payload, reversible, occurred_at, created_at, reverted_at, correlation_id, version FROM mybot_events WHERE user_id = $1 ORDER BY occurred_at DESC LIMIT $2",
        [userId, Number.isFinite(limit) ? Math.min(200, Math.max(1, limit)) : 50]
      );
      res.json(events.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar eventos do My Bot." });
  }
});

app.post("/mybot/:userId/events", async (req, res) => {
  const { userId } = req.params;
  const { type, source, payload, reversible, occurredAt, correlationId, memoryUpdates } = req.body ?? {};
  if (!userId || !type) {
    return res.status(400).json({ message: "userId e type são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMyBotTables(client);
      const bot = await getOrCreateMyBot(client, userId);
      await getOrCreateMyBotStats(client, userId);

      const eventType = normalizeMyBotEventType(String(type));
      const eventPayload = payload ?? {};
      const insertedEvent = await client.query(
        "INSERT INTO mybot_events (user_id, event_type, source, payload, reversible, occurred_at, correlation_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          userId,
          eventType,
          String(source || ""),
          eventPayload,
          reversible !== undefined ? Boolean(reversible) : true,
          occurredAt ? new Date(occurredAt) : new Date(),
          String(correlationId || ""),
        ]
      );

      const delta = getMyBotEventDelta(eventType, eventPayload);
      const updatedStats = await client.query(
        "UPDATE mybot_stats SET content_accessed_count = GREATEST(0, content_accessed_count + $2), projects_purchased_count = GREATEST(0, projects_purchased_count + $3), projects_created_count = GREATEST(0, projects_created_count + $4), courses_started_count = GREATEST(0, courses_started_count + $5), courses_completed_count = GREATEST(0, courses_completed_count + $6), marketplace_interactions_count = GREATEST(0, marketplace_interactions_count + $7), tool_usage_count = GREATEST(0, tool_usage_count + $8), feedback_score = GREATEST(0, feedback_score + $9), last_event_at = NOW() WHERE user_id = $1 RETURNING *",
        [
          userId,
          Number(delta.content_accessed_count || 0),
          Number(delta.projects_purchased_count || 0),
          Number(delta.projects_created_count || 0),
          Number(delta.courses_started_count || 0),
          Number(delta.courses_completed_count || 0),
          Number(delta.marketplace_interactions_count || 0),
          Number(delta.tool_usage_count || 0),
          Number(delta.feedback_score || 0),
        ]
      );

      const memoryResults: any[] = [];
      const memoryItems = Array.isArray(memoryUpdates) ? memoryUpdates : [];
      for (const item of memoryItems) {
        if (!item?.layer || !item?.key) continue;
        const inserted = await upsertMyBotMemory(client, {
          userId,
          layer: String(item.layer),
          key: String(item.key),
          value: item.value ?? {},
          lastEventId: insertedEvent.rows[0]?.id,
        });
        memoryResults.push(inserted);
      }

      const stageDecision = evaluateMyBotStage(updatedStats.rows[0], bot.stage as MyBotStage);
      if (stageDecision.stage !== bot.stage) {
        await client.query(
          "UPDATE mybots SET stage = $2, stage_reason = $3, updated_at = NOW() WHERE user_id = $1",
          [userId, stageDecision.stage, stageDecision.reason]
        );
      }

      await client.query("COMMIT");
      res.status(201).json({
        event: insertedEvent.rows[0],
        stats: updatedStats.rows[0],
        memory: memoryResults,
        stage: stageDecision.stage,
        stageReason: stageDecision.reason,
      });
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao registrar evento do My Bot." });
  }
});

app.post("/mybot/:userId/events/:eventId/revert", async (req, res) => {
  const { userId, eventId } = req.params;
  if (!userId || !eventId) {
    return res.status(400).json({ message: "userId e eventId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMyBotTables(client);
      const eventResult = await client.query(
        "SELECT * FROM mybot_events WHERE id = $1 AND user_id = $2",
        [eventId, userId]
      );
      const event = eventResult.rows[0];
      if (!event) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Evento não encontrado." });
      }
      if (!event.reversible || event.reverted_at) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Evento não reversível." });
      }

      const delta = getMyBotEventDelta(event.event_type, event.payload || {});
      const updatedStats = await client.query(
        "UPDATE mybot_stats SET content_accessed_count = GREATEST(0, content_accessed_count - $2), projects_purchased_count = GREATEST(0, projects_purchased_count - $3), projects_created_count = GREATEST(0, projects_created_count - $4), courses_started_count = GREATEST(0, courses_started_count - $5), courses_completed_count = GREATEST(0, courses_completed_count - $6), marketplace_interactions_count = GREATEST(0, marketplace_interactions_count - $7), tool_usage_count = GREATEST(0, tool_usage_count - $8), feedback_score = GREATEST(0, feedback_score - $9), last_event_at = NOW() WHERE user_id = $1 RETURNING *",
        [
          userId,
          Number(delta.content_accessed_count || 0),
          Number(delta.projects_purchased_count || 0),
          Number(delta.projects_created_count || 0),
          Number(delta.courses_started_count || 0),
          Number(delta.courses_completed_count || 0),
          Number(delta.marketplace_interactions_count || 0),
          Number(delta.tool_usage_count || 0),
          Number(delta.feedback_score || 0),
        ]
      );

      await client.query("UPDATE mybot_events SET reverted_at = NOW() WHERE id = $1", [eventId]);
      await client.query(
        "UPDATE mybot_memory SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND last_event_id = $2 AND is_active = true",
        [userId, eventId]
      );

      const bot = await getOrCreateMyBot(client, userId);
      const recalculatedStage = deriveMyBotStageFromStats(updatedStats.rows[0]);
      if (recalculatedStage !== bot.stage) {
        await client.query(
          "UPDATE mybots SET stage = $2, stage_reason = $3, updated_at = NOW() WHERE user_id = $1",
          [userId, recalculatedStage, "Recalculado após reversão de evento."]
        );
      }

      await client.query("COMMIT");
      res.json({
        eventId,
        stats: updatedStats.rows[0],
        stage: recalculatedStage,
      });
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao reverter evento do My Bot." });
  }
});

app.get("/mybot/:userId/memory", async (req, res) => {
  const { userId } = req.params;
  const layer = typeof req.query.layer === "string" ? req.query.layer : "";
  const limit = Number(req.query.limit ?? 200);
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureMyBotTables(client);
      if (layer && !MYBOT_MEMORY_LAYERS.has(layer)) {
        return res.status(400).json({ message: "Camada de memória inválida." });
      }
      const params: Array<string | number> = [userId];
      let query =
        "SELECT id, user_id, layer, memory_key, value, version, is_active, last_event_id, created_at, updated_at FROM mybot_memory WHERE user_id = $1 AND is_active = true";
      if (layer) {
        query += " AND layer = $2";
        params.push(layer);
      }
      query += " ORDER BY updated_at DESC LIMIT $" + (params.length + 1);
      params.push(Number.isFinite(limit) ? Math.min(500, Math.max(1, limit)) : 200);
      const memory = await client.query(query, params);
      res.json(memory.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar memória do My Bot." });
  }
});

app.post("/mybot/:userId/memory", async (req, res) => {
  const { userId } = req.params;
  const { layer, key, value } = req.body ?? {};
  if (!userId || !layer || !key) {
    return res.status(400).json({ message: "userId, layer e key são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMyBotTables(client);
      await getOrCreateMyBot(client, userId);
      await getOrCreateMyBotStats(client, userId);

      const memory = await upsertMyBotMemory(client, {
        userId,
        layer: String(layer),
        key: String(key),
        value: value ?? {},
      });

      await client.query(
        "INSERT INTO mybot_events (user_id, event_type, source, payload, reversible) VALUES ($1, $2, $3, $4, $5)",
        [userId, "memory_updated", "system", { layer, key }, false]
      );

      await client.query("COMMIT");
      res.status(201).json(memory);
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erro ao atualizar memória do My Bot.";
    res.status(500).json({ message });
  }
});

app.post("/mybot/:userId/reset", async (req, res) => {
  const { userId } = req.params;
  const { layer } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMyBotTables(client);
      await getOrCreateMyBot(client, userId);
      const layerValue = layer ? String(layer) : "all";
      if (layerValue !== "all" && !MYBOT_MEMORY_LAYERS.has(layerValue)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Camada de memória inválida." });
      }
      if (layerValue === "all") {
        await client.query(
          "UPDATE mybot_memory SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND is_active = true",
          [userId]
        );
      } else {
        await client.query(
          "UPDATE mybot_memory SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND layer = $2 AND is_active = true",
          [userId, layerValue]
        );
      }

      await client.query(
        "INSERT INTO mybot_events (user_id, event_type, source, payload, reversible) VALUES ($1, $2, $3, $4, $5)",
        [userId, "memory_reset", "user", { layer: layerValue }, false]
      );

      await client.query("COMMIT");
      res.json({ userId, layer: layerValue, status: "reset" });
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao resetar memória do My Bot." });
  }
});

app.post("/mybot/:userId/respond", async (req, res) => {
  const { userId } = req.params;
  const { message, context } = req.body ?? {};
  if (!userId || !message) {
    return res.status(400).json({ message: "userId e message são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMyBotTables(client);
      const bot = await getOrCreateMyBot(client, userId);
      const stats = await getOrCreateMyBotStats(client, userId);

      const userEvent = await client.query(
        "INSERT INTO mybot_events (user_id, event_type, source, payload, reversible) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [userId, "user_message", "user", { message, context: context ?? null }, false]
      );

      const memoryRows = await client.query(
        "SELECT layer, memory_key, value FROM mybot_memory WHERE user_id = $1 AND is_active = true AND layer IN ('mid', 'long') ORDER BY updated_at DESC LIMIT 10",
        [userId]
      );

      const responseText = buildMyBotResponse({
        message: String(message),
        stage: bot.stage as MyBotStage,
        stats,
        memory: memoryRows.rows,
      });

      await upsertMyBotMemory(client, {
        userId,
        layer: "short",
        key: "last_user_message",
        value: { message: String(message), receivedAt: new Date().toISOString() },
        lastEventId: userEvent.rows[0]?.id,
      });

      await client.query(
        "INSERT INTO mybot_events (user_id, event_type, source, payload, reversible) VALUES ($1, $2, $3, $4, $5)",
        [userId, "mybot_response", "system", { response: responseText }, false]
      );

      await client.query("COMMIT");
      res.json({
        response: responseText,
        stage: bot.stage,
        stats,
      });
    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao responder com o My Bot." });
  }
});

app.get("/internal-accounts", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const account = await getOrCreateInternalAccount(client, userId);
      res.json(account);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar saldo interno." });
  }
});

app.post("/internal-accounts/credit", async (req, res) => {
  const { userId, amount, reason } = req.body ?? {};
  const value = Number(amount);
  if (!userId || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ message: "userId e amount são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureInternalAccountsTable(client);
      await client.query("BEGIN");
      await ensureHouseAccount(client);
      await getOrCreateInternalAccount(client, userId);
      const master = await client.query(
        "SELECT balance FROM internal_accounts WHERE user_id = $1",
        [HK_MASTER_USER_ID]
      );
      if (Number(master.rows[0]?.balance || 0) < value) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Saldo insuficiente no HK Master." });
      }
      const updated = await client.query(
        "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1 RETURNING user_id, balance, updated_at",
        [userId, value]
      );
      await client.query(
        "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
        [HK_MASTER_USER_ID, value]
      );
      await client.query(
        "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
        [HK_MASTER_USER_ID, userId, value, reason ?? "credit"]
      );
      await client.query("COMMIT");
      res.status(201).json(updated.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao creditar saldo interno." });
  }
});

app.get("/card-listings", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "active";
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureCardMarketplaceTables(client);
      const result = await client.query(
        "SELECT cl.id, cl.card_id, cl.seller_user_id, cl.price, cl.status, cl.created_at, uc.name, uc.species, uc.class, uc.rarity, uc.attributes, uc.level, uc.xp, uc.image_url FROM card_listings cl JOIN user_cards uc ON uc.id = cl.card_id WHERE cl.status = $1 ORDER BY cl.created_at DESC",
        [status]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar marketplace." });
  }
});

app.post("/card-listings", async (req, res) => {
  const { userId, cardId, price } = req.body ?? {};
  const value = Number(price);
  if (!userId || !cardId || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ message: "userId, cardId e price são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureCardMarketplaceTables(client);
      const card = await client.query("SELECT id, user_id FROM user_cards WHERE id = $1", [cardId]);
      if (!card.rows[0] || card.rows[0].user_id !== userId) {
        return res.status(403).json({ message: "Você não pode listar esta carta." });
      }
      const listing = await client.query(
        "INSERT INTO card_listings (card_id, seller_user_id, price, status) VALUES ($1, $2, $3, $4) RETURNING id, card_id, seller_user_id, price, status, created_at",
        [cardId, userId, value, "active"]
      );
      res.status(201).json(listing.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar anúncio." });
  }
});

app.post("/card-listings/:id/buy", async (req, res) => {
  const { id } = req.params;
  const { buyerId } = req.body ?? {};
  if (!buyerId) {
    return res.status(400).json({ message: "buyerId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureCardMarketplaceTables(client);
      await ensureInternalAccountsTable(client);
      await ensureCommerceOrdersTable(client);

      await client.query("BEGIN");
      const listing = await client.query(
        "SELECT id, card_id, seller_user_id, price, status FROM card_listings WHERE id = $1 FOR UPDATE",
        [id]
      );
      const entry = listing.rows[0];
      if (!entry || entry.status !== "active") {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Anúncio não disponível." });
      }
      if (entry.seller_user_id === buyerId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Você não pode comprar sua própria carta." });
      }

      const buyerAccount = await getOrCreateInternalAccount(client, buyerId);
      if (Number(buyerAccount.balance) < Number(entry.price)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Saldo insuficiente." });
      }

      await getOrCreateInternalAccount(client, entry.seller_user_id);
      await client.query(
        "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
        [buyerId, entry.price]
      );
      await client.query(
        "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1",
        [entry.seller_user_id, entry.price]
      );
      await client.query(
        "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
        [buyerId, entry.seller_user_id, entry.price, "card_purchase"]
      );

      await client.query(
        "UPDATE user_cards SET user_id = $2, updated_at = NOW() WHERE id = $1",
        [entry.card_id, buyerId]
      );
      await client.query(
        "UPDATE card_listings SET status = 'sold' WHERE id = $1",
        [id]
      );
      const tx = await client.query(
        "INSERT INTO card_transactions (card_id, seller_user_id, buyer_user_id, price) VALUES ($1, $2, $3, $4) RETURNING id, card_id, seller_user_id, buyer_user_id, price, created_at",
        [entry.card_id, entry.seller_user_id, buyerId, entry.price]
      );
      await client.query(
        "INSERT INTO commerce_orders (user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [buyerId, "card", String(entry.card_id), entry.price, "BRL", "completed", "internal", "card_listing"]
      );
      await client.query("COMMIT");
      res.status(201).json(tx.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao comprar carta." });
  }
});

app.get("/projects", async (req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const userId = typeof req.query.userId === "string" ? req.query.userId : null;
      const scope = typeof req.query.scope === "string" ? req.query.scope : "visible";
      await ensureProjectsColumns(client);
      await ensurePurchasesTable(client);
      const result = await client.query(
        userId && scope !== "all"
          ? "SELECT p.id, p.name, p.description, p.project_type, p.sale_price, p.production_cost, p.purchase_count, p.repository, p.domain, p.hosting, p.status, p.paid, p.is_public, p.owner_user_id, p.product_id, p.base_project_id, p.created_from_purchase, p.is_template, p.purchase_id, p.version, p.template_id, p.template_version FROM projects p JOIN purchases pu ON pu.id = p.purchase_id AND pu.user_id = $1 AND pu.status = 'completed' WHERE p.is_template = false AND p.created_from_purchase = true AND p.owner_user_id = $1 ORDER BY p.created_at DESC"
          : "SELECT id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, purchase_id, version, template_id, template_version FROM projects ORDER BY created_at DESC",
        userId && scope !== "all" ? [userId] : []
      );
      res.json(result.rows);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const userId = typeof req.query.userId === "string" ? req.query.userId : null;
        const scope = typeof req.query.scope === "string" ? req.query.scope : "visible";
        await ensurePurchasesTable(client);
        const retry = await client.query(
          userId && scope !== "all"
            ? "SELECT p.id, p.name, p.description, p.project_type, p.sale_price, p.production_cost, p.purchase_count, p.repository, p.domain, p.hosting, p.status, p.paid, p.is_public, p.owner_user_id, p.product_id, p.base_project_id, p.created_from_purchase, p.is_template, p.purchase_id, p.version, p.template_id, p.template_version FROM projects p JOIN purchases pu ON pu.id = p.purchase_id AND pu.user_id = $1 AND pu.status = 'completed' WHERE p.is_template = false AND p.created_from_purchase = true AND p.owner_user_id = $1 ORDER BY p.created_at DESC"
            : "SELECT id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, purchase_id, version, template_id, template_version FROM projects ORDER BY created_at DESC",
          userId && scope !== "all" ? [userId] : []
        );
        res.json(retry.rows);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar projetos." });
  }
});

app.get("/templates", async (req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureTemplatesTable(client);
      const includeInactive = String(req.query.includeInactive || "") === "true";
      const result = await client.query(
        includeInactive
          ? "SELECT id, name, description, blog_content, level, category, version, is_active, created_at, updated_at FROM templates ORDER BY created_at DESC"
          : "SELECT id, name, description, blog_content, level, category, version, is_active, created_at, updated_at FROM templates WHERE is_active = true ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar templates." });
  }
});

app.get("/templates/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureTemplatesTable(client);
      const result = await client.query(
        "SELECT id, name, description, blog_content, level, category, version, is_active, created_at, updated_at FROM templates WHERE id = $1",
        [id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Template não encontrado." });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar template." });
  }
});

app.post("/templates", async (req, res) => {
  const { name, description, blogContent, level, category, adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplatesTable(client);
      await ensureTemplateFilesTable(client);
      const result = await client.query(
        "INSERT INTO templates (name, description, blog_content, level, category, version, is_active) VALUES ($1, $2, $3, $4, $5, 1, true) RETURNING id, name, description, blog_content, level, category, version, is_active, created_at, updated_at",
        [name, description ?? "", blogContent ?? "", level ?? "", category ?? ""]
      );
      const templateId = result.rows[0]?.id;
      if (templateId) {
        for (const file of DEFAULT_TEMPLATE_FILES) {
          await client.query(
            "INSERT INTO template_files (template_id, file_name, file_type, content, position) VALUES ($1, $2, $3, $4, $5)",
            [templateId, file.fileName, file.fileType, file.content, DEFAULT_TEMPLATE_FILES.indexOf(file)]
          );
        }
      }
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar template." });
  }
});

app.put("/templates/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, blogContent, level, category, adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplatesTable(client);
      const result = await client.query(
        "UPDATE templates SET name = $1, description = $2, blog_content = $3, level = $4, category = $5, version = COALESCE(version, 1) + 1, updated_at = NOW() WHERE id = $6 RETURNING id, name, description, blog_content, level, category, version, is_active, created_at, updated_at",
        [name, description ?? "", blogContent ?? "", level ?? "", category ?? "", id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Template não encontrado." });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao editar template." });
  }
});

app.post("/templates/:id/deactivate", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplatesTable(client);
      const result = await client.query(
        "UPDATE templates SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, name, description, version, is_active, created_at, updated_at",
        [id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Template não encontrado." });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao desativar template." });
  }
});

app.get("/templates/:id/tasks", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureTemplateTasksTable(client);
      const result = await client.query(
        "SELECT id, template_id, title, description, status, position, created_at, updated_at FROM template_tasks WHERE template_id = $1 ORDER BY position ASC, created_at ASC",
        [id]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar tarefas do template." });
  }
});

app.post("/templates/:id/tasks", async (req, res) => {
  const { id } = req.params;
  const { title, description, status, position, adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title) {
    return res.status(400).json({ message: "Título é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateTasksTable(client);
      const result = await client.query(
        "INSERT INTO template_tasks (template_id, title, description, status, position) VALUES ($1, $2, $3, $4, $5) RETURNING id, template_id, title, description, status, position, created_at, updated_at",
        [id, title, description ?? "", status ?? "TODO", Number(position ?? 0)]
      );
      await bumpTemplateVersion(client, id);
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar tarefa do template." });
  }
});

app.put("/templates/:id/tasks/:taskId", async (req, res) => {
  const { id, taskId } = req.params;
  const { title, description, status, position, adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title) {
    return res.status(400).json({ message: "Título é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateTasksTable(client);
      const result = await client.query(
        "UPDATE template_tasks SET title = $1, description = $2, status = $3, position = $4, updated_at = NOW() WHERE id = $5 AND template_id = $6 RETURNING id, template_id, title, description, status, position, created_at, updated_at",
        [title, description ?? "", status ?? "TODO", Number(position ?? 0), taskId, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Tarefa não encontrada." });
      }
      await bumpTemplateVersion(client, id);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar tarefa do template." });
  }
});

app.delete("/templates/:id/tasks/:taskId", async (req, res) => {
  const { id, taskId } = req.params;
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateTasksTable(client);
      const result = await client.query(
        "DELETE FROM template_tasks WHERE id = $1 AND template_id = $2 RETURNING id",
        [taskId, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Tarefa não encontrada." });
      }
      await bumpTemplateVersion(client, id);
      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao remover tarefa do template." });
  }
});

app.get("/templates/:id/resources", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureTemplateResourcesTable(client);
      const result = await client.query(
        "SELECT id, template_id, title, type, content, position, created_at, updated_at FROM template_resources WHERE template_id = $1 ORDER BY position ASC, created_at ASC",
        [id]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar recursos do template." });
  }
});

app.post("/templates/:id/resources", async (req, res) => {
  const { id } = req.params;
  const { title, type, content, position, adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title) {
    return res.status(400).json({ message: "Título é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateResourcesTable(client);
      const result = await client.query(
        "INSERT INTO template_resources (template_id, title, type, content, position) VALUES ($1, $2, $3, $4, $5) RETURNING id, template_id, title, type, content, position, created_at, updated_at",
        [id, title, type ?? "link", content ?? "", Number(position ?? 0)]
      );
      await bumpTemplateVersion(client, id);
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar recurso do template." });
  }
});

app.put("/templates/:id/resources/:resourceId", async (req, res) => {
  const { id, resourceId } = req.params;
  const { title, type, content, position, adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title) {
    return res.status(400).json({ message: "Título é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateResourcesTable(client);
      const result = await client.query(
        "UPDATE template_resources SET title = $1, type = $2, content = $3, position = $4, updated_at = NOW() WHERE id = $5 AND template_id = $6 RETURNING id, template_id, title, type, content, position, created_at, updated_at",
        [title, type ?? "link", content ?? "", Number(position ?? 0), resourceId, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Recurso não encontrado." });
      }
      await bumpTemplateVersion(client, id);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar recurso do template." });
  }
});

app.delete("/templates/:id/resources/:resourceId", async (req, res) => {
  const { id, resourceId } = req.params;
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateResourcesTable(client);
      const result = await client.query(
        "DELETE FROM template_resources WHERE id = $1 AND template_id = $2 RETURNING id",
        [resourceId, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Recurso não encontrado." });
      }
      await bumpTemplateVersion(client, id);
      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao remover recurso do template." });
  }
});

app.get("/templates/:id/files", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureTemplateFilesTable(client);
      const result = await client.query(
        "SELECT id, template_id, file_name, file_type, content, position, created_at, updated_at FROM template_files WHERE template_id = $1 ORDER BY position ASC, created_at ASC",
        [id]
      );
      if (result.rows.length === 0) {
        const seeded: any[] = [];
        for (let index = 0; index < DEFAULT_TEMPLATE_FILES.length; index += 1) {
          const file = DEFAULT_TEMPLATE_FILES[index];
          const inserted = await client.query(
            "INSERT INTO template_files (template_id, file_name, file_type, content, position) VALUES ($1, $2, $3, $4, $5) RETURNING id, template_id, file_name, file_type, content, position, created_at, updated_at",
            [id, file.fileName, file.fileType, file.content, index]
          );
          seeded.push(inserted.rows[0]);
        }
        res.json(seeded);
      } else {
        res.json(result.rows);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar arquivos do template." });
  }
});

app.post("/templates/:id/files", async (req, res) => {
  const { id } = req.params;
  const { fileName, fileType, content, position, adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!fileName) {
    return res.status(400).json({ message: "fileName é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateFilesTable(client);
      const result = await client.query(
        "INSERT INTO template_files (template_id, file_name, file_type, content, position) VALUES ($1, $2, $3, $4, $5) RETURNING id, template_id, file_name, file_type, content, position, created_at, updated_at",
        [id, fileName, fileType ?? "html", content ?? "", Number(position ?? 0)]
      );
      await bumpTemplateVersion(client, id);
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar arquivo do template." });
  }
});

app.put("/templates/:id/files/:fileId", async (req, res) => {
  const { id, fileId } = req.params;
  const { fileName, fileType, content, position, adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!fileName) {
    return res.status(400).json({ message: "fileName é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateFilesTable(client);
      const result = await client.query(
        "UPDATE template_files SET file_name = $1, file_type = $2, content = $3, position = $4, updated_at = NOW() WHERE id = $5 AND template_id = $6 RETURNING id, template_id, file_name, file_type, content, position, created_at, updated_at",
        [fileName, fileType ?? "html", content ?? "", Number(position ?? 0), fileId, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Arquivo não encontrado." });
      }
      await bumpTemplateVersion(client, id);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar arquivo do template." });
  }
});

app.delete("/templates/:id/files/:fileId", async (req, res) => {
  const { id, fileId } = req.params;
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureTemplateFilesTable(client);
      const result = await client.query(
        "DELETE FROM template_files WHERE id = $1 AND template_id = $2 RETURNING id",
        [fileId, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Arquivo não encontrado." });
      }
      await bumpTemplateVersion(client, id);
      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao remover arquivo do template." });
  }
});

app.get("/menu-visibility", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : null;
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureProjectsColumns(client);
      await ensurePurchasesTable(client);
      await ensureProductsColumns(client);

      const purchases = await client.query(
        "SELECT pr.id, pr.product_type FROM purchases pu JOIN products pr ON pr.id = pu.product_id WHERE pu.user_id = $1 AND pu.status = 'completed'",
        [userId]
      );

      const purchasedProducts = purchases.rows.map((row: { id: string; product_type: string }) => ({
        id: row.id,
        type: row.product_type || "digital",
      }));

      const hasDigitalAccess = purchasedProducts.some((product) => product.type === "digital" || product.type === "projeto");
      const hasAnyProjectAccess = hasDigitalAccess;

      res.json({
        userId,
        purchasedProducts,
        hasDigitalAccess,
        menus: {
          projects: hasAnyProjectAccess,
          marketplace: true,
          cart: true,
          purchases: true,
          redeems: true,
          mybot: true,
          dao: true,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao calcular visibilidade de menu." });
  }
});

app.post("/projects", async (req, res) => {
  const { name, description, projectType, salePrice, productionCost, purchaseCount, repository, domain, hosting, status, paid, isPublic, ownerUserId, productId, baseProjectId, createdFromPurchase, isTemplate, htmlContent, cssContent, templateId } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  if (!ownerUserId) {
    return res.status(400).json({ message: "ownerUserId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const confirmed = await hasPixConfirmation(client, ownerUserId);
      if (!confirmed) {
        return res.status(403).json({ message: "Confirme a conta com PIX de R$ 1,00 para criar projetos." });
      }
      await ensureTemplatesTable(client);
      const defaultTemplate = await ensureDefaultTemplate(client);
      let resolvedTemplateId = String(templateId || "").trim();
      if (!resolvedTemplateId) resolvedTemplateId = defaultTemplate.id;
      const templateRow = await client.query(
        "SELECT id, version, is_active FROM templates WHERE id = $1",
        [resolvedTemplateId]
      );
      if (!templateRow.rows[0] || !templateRow.rows[0].is_active) {
        return res.status(400).json({ message: "Template inválido ou inativo." });
      }
      const resolvedTemplateVersion = Number(templateRow.rows[0].version ?? 1);

      const templateHtml = !!isTemplate && String(name).trim().toLowerCase() === LANDINGPAGE_TEMPLATE_NAME.toLowerCase() && !htmlContent
        ? LANDINGPAGE_TEMPLATE_HTML
        : String(htmlContent ?? "");
      const templateCss = !!isTemplate && String(name).trim().toLowerCase() === LANDINGPAGE_TEMPLATE_NAME.toLowerCase() && !cssContent
        ? LANDINGPAGE_TEMPLATE_CSS
        : String(cssContent ?? "");

      const result = await client.query(
        "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, template_id, template_version, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()) RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, template_id, template_version, updated_at",
        [
          name,
          description ?? "",
          projectType ?? "",
          salePrice ?? "",
          productionCost ?? "",
          Number.isFinite(Number(purchaseCount)) ? Number(purchaseCount) : 0,
          repository ?? "",
          domain ?? "",
          hosting ?? "",
          status ?? "Ativo",
          !!paid,
          isPublic === undefined ? true : !!isPublic,
          ownerUserId,
          productId ?? null,
          baseProjectId ?? null,
          !!createdFromPurchase,
          !!isTemplate,
          templateHtml,
          templateCss,
          resolvedTemplateId,
          resolvedTemplateVersion,
        ]
      );
      let created = result.rows[0];
      if (!!isTemplate && created?.id) {
        await ensureTemplatesTable(client);
        const templateUpsert = await client.query(
          "INSERT INTO templates (id, name, description, version, is_active) VALUES ($1, $2, $3, 1, true) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = true, updated_at = NOW() RETURNING id, version",
          [created.id, created.name, created.description ?? ""]
        );
        const templateVersion = Number(templateUpsert.rows[0]?.version ?? 1);
        const projectUpdate = await client.query(
          "UPDATE projects SET template_id = $1, template_version = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, template_id, template_version, updated_at",
          [created.id, templateVersion, created.id]
        );
        created = projectUpdate.rows[0] ?? created;
      }
      res.status(201).json(created);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const confirmed = await hasPixConfirmation(client, ownerUserId);
        if (!confirmed) {
          return res.status(403).json({ message: "Confirme a conta com PIX de R$ 1,00 para criar projetos." });
        }
        await ensureTemplatesTable(client);
        const defaultTemplate = await ensureDefaultTemplate(client);
        let resolvedTemplateId = String(templateId || "").trim();
        if (!resolvedTemplateId) resolvedTemplateId = defaultTemplate.id;
        const templateRow = await client.query(
          "SELECT id, version, is_active FROM templates WHERE id = $1",
          [resolvedTemplateId]
        );
        if (!templateRow.rows[0] || !templateRow.rows[0].is_active) {
          return res.status(400).json({ message: "Template inválido ou inativo." });
        }
        const resolvedTemplateVersion = Number(templateRow.rows[0].version ?? 1);
        const templateHtml = !!isTemplate && String(name).trim().toLowerCase() === LANDINGPAGE_TEMPLATE_NAME.toLowerCase() && !htmlContent
          ? LANDINGPAGE_TEMPLATE_HTML
          : String(htmlContent ?? "");
        const templateCss = !!isTemplate && String(name).trim().toLowerCase() === LANDINGPAGE_TEMPLATE_NAME.toLowerCase() && !cssContent
          ? LANDINGPAGE_TEMPLATE_CSS
          : String(cssContent ?? "");

        const retry = await client.query(
          "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, template_id, template_version, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()) RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, template_id, template_version, updated_at",
          [
            name,
            description ?? "",
            projectType ?? "",
            salePrice ?? "",
            productionCost ?? "",
            Number.isFinite(Number(purchaseCount)) ? Number(purchaseCount) : 0,
            repository ?? "",
            domain ?? "",
            hosting ?? "",
            status ?? "Ativo",
            !!paid,
            isPublic === undefined ? true : !!isPublic,
            ownerUserId,
            productId ?? null,
            baseProjectId ?? null,
            !!createdFromPurchase,
            !!isTemplate,
            templateHtml,
            templateCss,
            resolvedTemplateId,
            resolvedTemplateVersion,
          ]
        );
        let created = retry.rows[0];
        if (!!isTemplate && created?.id) {
          await ensureTemplatesTable(client);
          const templateUpsert = await client.query(
            "INSERT INTO templates (id, name, description, version, is_active) VALUES ($1, $2, $3, 1, true) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = true, updated_at = NOW() RETURNING id, version",
            [created.id, created.name, created.description ?? ""]
          );
          const templateVersion = Number(templateUpsert.rows[0]?.version ?? 1);
          const projectUpdate = await client.query(
            "UPDATE projects SET template_id = $1, template_version = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, template_id, template_version, updated_at",
            [created.id, templateVersion, created.id]
          );
          created = projectUpdate.rows[0] ?? created;
        }
        res.status(201).json(created);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar projeto." });
  }
});

app.post("/projects/clone", async (req, res) => {
  const { templateId, userId } = req.body ?? {};
  if (!templateId || !userId) {
    return res.status(400).json({ message: "templateId e userId são obrigatórios." });
  }
  if (!isUuid(String(templateId))) {
    return res.status(400).json({ message: "templateId inválido." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const cloned = await cloneTemplate(client, String(templateId), String(userId));
      await client.query("COMMIT");
      res.status(201).json(cloned);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao clonar projeto." });
  }
});

app.post("/templates/:id/clone", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body ?? {};
  if (!id) {
    return res.status(400).json({ message: "templateId é obrigatório." });
  }
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, String(userId));
      await client.query("BEGIN");
      const cloned = await cloneTemplate(client, id, String(userId));
      await client.query("COMMIT");
      res.status(201).json(cloned);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao clonar template." });
  }
});

app.post("/templates/:id/clone", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body ?? {};
  if (!id || !userId) {
    return res.status(400).json({ message: "templateId e userId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const clone = await cloneTemplate(client, id, String(userId));
      await client.query("COMMIT");
      res.status(201).json(clone);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao clonar template." });
  }
});

app.get("/admin/mybot/battles", async (req, res) => {
  const adminId = typeof req.query.adminId === "string" ? req.query.adminId : "";
  const limit = Math.min(200, Number(req.query.limit ?? 100) || 100);
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureMyBotTables(client);
      const result = await client.query(
        `SELECT id, user_id_a, user_id_b, card_id_a, card_id_b, bet_amount, battle_type, gas_pct, map_name, map_weights,
                modifiers, seed, power_a, power_b, random_factor_a, random_factor_b, power_final_a, power_final_b, xp_a, xp_b,
                winner_user_id, payout_amount, gas_amount, reason, created_at
         FROM mybot_battles
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      await logAdminAction(client, adminId, `mybot_battles_list:${result.rowCount ?? 0}`);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao listar batalhas do MyBot." });
  }
});

app.get("/admin/mybot/ecosystem", async (req, res) => {
  const adminId = typeof req.query.adminId === "string" ? req.query.adminId : "";
  const limit = Math.min(2000, Number(req.query.limit ?? 800) || 800);
  const movementLimit = Math.min(1000, Number(req.query.movementLimit ?? 200) || 200);
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureMyBotTables(client);
      await ensureUserCardsTable(client);
      await seedMyBotMaps(client);

      const cards = await client.query(
        "SELECT id, user_id, name, image_url, rarity, level FROM user_cards ORDER BY updated_at DESC LIMIT $1",
        [limit]
      );
      for (const row of cards.rows) {
        await ensureMyBotMapState(client, row.user_id, row.id);
      }

      const profiles = await client.query(
        `SELECT mp.user_id, mp.card_id, mp.origin_map_id, mp.current_map_id,
                mp.origin_pos_x, mp.origin_pos_y, mp.current_pos_x, mp.current_pos_y,
                uc.name, uc.image_url, uc.rarity, uc.level
         FROM mybot_profiles mp
         LEFT JOIN user_cards uc ON uc.id = mp.card_id
         WHERE mp.card_id IS NOT NULL
         ORDER BY mp.updated_at DESC
         LIMIT $1`,
        [limit]
      );

      for (const row of profiles.rows) {
        if (!row.origin_map_id || !row.current_map_id) {
          await ensureMyBotMapState(client, row.user_id, row.card_id);
        }
      }

      const bots = await client.query(
        `SELECT mp.user_id, mp.card_id, mp.origin_map_id, mp.current_map_id,
                mp.origin_pos_x, mp.origin_pos_y, mp.current_pos_x, mp.current_pos_y,
                uc.name, uc.image_url, uc.rarity, uc.level
         FROM mybot_profiles mp
         LEFT JOIN user_cards uc ON uc.id = mp.card_id
         WHERE mp.card_id IS NOT NULL
         ORDER BY mp.updated_at DESC
         LIMIT $1`,
        [limit]
      );
      const botIndex = new Map<string, any>();
      for (const row of bots.rows) {
        botIndex.set(String(row.user_id).toLowerCase(), row);
      }
      for (const row of cards.rows) {
        const key = String(row.user_id).toLowerCase();
        if (botIndex.has(key)) continue;
        const originMapId = pickOriginMapId(row.user_id, row.id);
        const originPos = computeDeterministicPosition(`${row.id}|origin|${originMapId}`);
        botIndex.set(key, {
          user_id: row.user_id,
          card_id: row.id,
          origin_map_id: originMapId,
          current_map_id: originMapId,
          origin_pos_x: originPos.x,
          origin_pos_y: originPos.y,
          current_pos_x: originPos.x,
          current_pos_y: originPos.y,
          name: row.name,
          image_url: row.image_url,
          rarity: row.rarity,
          level: row.level,
        });
      }
      let mybotsCount = 0;
      if (botIndex.size === 0) {
        const mybots = await client.query(
          "SELECT user_id, image_url, stage FROM mybots ORDER BY updated_at DESC LIMIT $1",
          [limit]
        );
        mybotsCount = mybots.rowCount ?? 0;
        for (const row of mybots.rows) {
          const key = String(row.user_id).toLowerCase();
          if (botIndex.has(key)) continue;
          const originMapId = pickOriginMapId(row.user_id, row.user_id);
          const originPos = computeDeterministicPosition(`${row.user_id}|origin|${originMapId}`);
          botIndex.set(key, {
            user_id: row.user_id,
            card_id: null,
            origin_map_id: originMapId,
            current_map_id: originMapId,
            origin_pos_x: originPos.x,
            origin_pos_y: originPos.y,
            current_pos_x: originPos.x,
            current_pos_y: originPos.y,
            name: "MyBot",
            image_url: row.image_url || "",
            rarity: row.stage || "",
            level: 1,
          });
        }
      }
      const fallbackBots = Array.from(botIndex.values());

      let maps = await client.query(
        "SELECT id, name, position_x, position_y, icon, visual_meta FROM mybot_maps ORDER BY name ASC"
      );
      if ((maps.rowCount ?? 0) === 0) {
        await seedMyBotMaps(client);
        maps = await client.query(
          "SELECT id, name, position_x, position_y, icon, visual_meta FROM mybot_maps ORDER BY name ASC"
        );
      }
      const fallbackMaps = (maps.rowCount ?? 0) === 0
        ? MYBOT_MAP_LAYOUTS.map((map) => ({
            id: map.id,
            name: map.label,
            position_x: map.x,
            position_y: map.y,
            icon: map.icon,
            visual_meta: {},
          }))
        : maps.rows;

      const movements = await client.query(
        `SELECT id, bot_id, user_id, from_map_id, to_map_id, reason, battle_id, created_at
         FROM mybot_movements
         ORDER BY created_at DESC
         LIMIT $1`,
        [movementLimit]
      );

      await logAdminAction(client, adminId, `mybot_ecosystem:${fallbackBots.length}`);
      res.json({
        maps: fallbackMaps,
        bots: fallbackBots,
        movements: movements.rows,
        counts: {
          userCards: cards.rowCount ?? 0,
          profiles: bots.rowCount ?? 0,
          mybots: mybotsCount,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar ecossistema MyBot." });
  }
});

app.get("/mybot/ecosystem", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  const limit = Math.min(1200, Number(req.query.limit ?? 800) || 800);
  const movementLimit = Math.min(400, Number(req.query.movementLimit ?? 120) || 120);
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureMyBotTables(client);
      await ensureUserCardsTable(client);
      await seedMyBotMaps(client);

      const cards = await client.query(
        "SELECT id, user_id, name, image_url, rarity, level FROM user_cards ORDER BY updated_at DESC LIMIT $1",
        [limit]
      );
      for (const row of cards.rows) {
        await ensureMyBotMapState(client, row.user_id, row.id);
      }

      const profiles = await client.query(
        `SELECT mp.user_id, mp.card_id, mp.origin_map_id, mp.current_map_id,
                mp.origin_pos_x, mp.origin_pos_y, mp.current_pos_x, mp.current_pos_y
         FROM mybot_profiles mp
         WHERE mp.card_id IS NOT NULL
         ORDER BY mp.updated_at DESC
         LIMIT $1`,
        [limit]
      );

      for (const row of profiles.rows) {
        if (!row.origin_map_id || !row.current_map_id) {
          await ensureMyBotMapState(client, row.user_id, row.card_id);
        }
      }

      const bots = await client.query(
        `SELECT mp.user_id, mp.card_id, mp.origin_map_id, mp.current_map_id,
                mp.origin_pos_x, mp.origin_pos_y, mp.current_pos_x, mp.current_pos_y,
                uc.name, uc.image_url, uc.rarity, uc.level
         FROM mybot_profiles mp
         LEFT JOIN user_cards uc ON uc.id = mp.card_id
         WHERE mp.card_id IS NOT NULL
         ORDER BY mp.updated_at DESC
         LIMIT $1`,
        [limit]
      );
      const botIndex = new Map<string, any>();
      for (const row of bots.rows) {
        botIndex.set(String(row.user_id).toLowerCase(), row);
      }
      for (const row of cards.rows) {
        const key = String(row.user_id).toLowerCase();
        if (botIndex.has(key)) continue;
        const originMapId = pickOriginMapId(row.user_id, row.id);
        const originPos = computeDeterministicPosition(`${row.id}|origin|${originMapId}`);
        botIndex.set(key, {
          user_id: row.user_id,
          card_id: row.id,
          origin_map_id: originMapId,
          current_map_id: originMapId,
          origin_pos_x: originPos.x,
          origin_pos_y: originPos.y,
          current_pos_x: originPos.x,
          current_pos_y: originPos.y,
          name: row.name,
          image_url: row.image_url,
          rarity: row.rarity,
          level: row.level,
        });
      }
      if (botIndex.size === 0) {
        const mybots = await client.query(
          "SELECT user_id, image_url, stage FROM mybots ORDER BY updated_at DESC LIMIT $1",
          [limit]
        );
        for (const row of mybots.rows) {
          const key = String(row.user_id).toLowerCase();
          if (botIndex.has(key)) continue;
          const originMapId = pickOriginMapId(row.user_id, row.user_id);
          const originPos = computeDeterministicPosition(`${row.user_id}|origin|${originMapId}`);
          botIndex.set(key, {
            user_id: row.user_id,
            card_id: null,
            origin_map_id: originMapId,
            current_map_id: originMapId,
            origin_pos_x: originPos.x,
            origin_pos_y: originPos.y,
            current_pos_x: originPos.x,
            current_pos_y: originPos.y,
            name: "MyBot",
            image_url: row.image_url || "",
            rarity: row.stage || "",
            level: 1,
          });
        }
      }
      const fallbackBots = Array.from(botIndex.values());

      let maps = await client.query(
        "SELECT id, name, position_x, position_y, icon, visual_meta FROM mybot_maps ORDER BY name ASC"
      );
      if ((maps.rowCount ?? 0) === 0) {
        await seedMyBotMaps(client);
        maps = await client.query(
          "SELECT id, name, position_x, position_y, icon, visual_meta FROM mybot_maps ORDER BY name ASC"
        );
      }
      const fallbackMaps = (maps.rowCount ?? 0) === 0
        ? MYBOT_MAP_LAYOUTS.map((map) => ({
            id: map.id,
            name: map.label,
            position_x: map.x,
            position_y: map.y,
            icon: map.icon,
            visual_meta: {},
          }))
        : maps.rows;

      let movements = { rows: [] as any[] };
      if (userId) {
        movements = await client.query(
          `SELECT id, bot_id, user_id, from_map_id, to_map_id, reason, battle_id, created_at
           FROM mybot_movements
           WHERE user_id = $2
           ORDER BY created_at DESC
           LIMIT $1`,
          [movementLimit, userId]
        );
      }

      res.json({ maps: fallbackMaps, bots: fallbackBots, movements: movements.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar ecossistema MyBot." });
  }
});

app.post("/admin-tools/reset-ia-tasks", async (req, res) => {
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureProjectTasksTable(client);
      await ensureAiReportsTable(client);
      const result = await client.query(
        "DELETE FROM project_tasks WHERE domain = 'IA' AND project_id IS NULL RETURNING id"
      );
      const deleted = result.rowCount ?? 0;
      await logAdminAction(client, adminId, `reset_ia_tasks:${deleted}`);
      await client.query(
        "INSERT INTO ai_reports (domain, status, summary, decisions, risks, next_actions, issue_keys, files_modified) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb)",
        [
          "IA",
          "reset",
          `Reset IA tasks: ${deleted}`,
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
        ]
      );
      res.json({ deleted });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao resetar IA tasks." });
  }
});

app.post("/admin-tools/migrate-ia-tasks", async (req, res) => {
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureProjectTasksTable(client);
      await ensureAiReportsTable(client);
      await ensureProjectsColumns(client);

      await client.query("BEGIN");
      const hktechProjects = await client.query(
        "SELECT id FROM projects WHERE lower(name) = lower('HKTECH') OR lower(name) LIKE 'hktech%'"
      );
      const hktechIds = hktechProjects.rows.map((row: { id: string }) => row.id);

      const migrateResult = await client.query(
        "UPDATE project_tasks SET domain = 'IA', generated_by_ai = true, project_id = NULL WHERE (project_id = ANY($1::uuid[]) OR project_id::text = 'HKTECH' OR domain = 'IA')",
        [hktechIds]
      );
      const migrated = migrateResult.rowCount ?? 0;

      if (hktechIds.length > 0) {
        await client.query(
          "UPDATE projects SET status = 'Inativo', is_public = false, updated_at = NOW() WHERE id = ANY($1::uuid[])",
          [hktechIds]
        );
      }

      await client.query("COMMIT");

      await logAdminAction(client, adminId, `migrate_ia_tasks:${migrated}`);
      res.json({ migrated, reportsMigrated: 0 });
    } finally {
      client.release();
    }
  } catch (error) {
    try {
      const pool = await getPool();
      const client = await pool.connect();
      await client.query("ROLLBACK");
      client.release();
    } catch (rollbackError) {
      console.error("Erro ao rollback migração IA:", rollbackError);
    }
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao migrar IA tasks." });
  }
});

app.get("/ia/config", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const config = await ensureIaConfig(client);
      res.json(config);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar configuração IA." });
  }
});

const DEFAULT_EXEC_LIMITS = {
  maxTokens: 800,
  maxAgentsPerRun: 3,
  maxMemoryTopK: 5,
  maxChatPerHour: 60,
  maxTaskCreatePerHour: 50,
  maxAgentExecutePerHour: 20,
};

const DEFAULT_IA_AUTH_FLAGS = {
  managedByAI: true,
  taskCreationPolicy: "AI_ALLOWED",
  allowAutoBacklogIfEmpty: true,
};

async function getIaExecutionLimits(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureSystemConfigTable(client);
  const result = await client.query("SELECT value FROM system_config WHERE key = 'IA_EXECUTION_LIMITS' LIMIT 1");
  const stored = result.rows[0]?.value ?? {};
  return { ...DEFAULT_EXEC_LIMITS, ...(stored || {}) } as typeof DEFAULT_EXEC_LIMITS;
}

async function getIaAuthorityFlags(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureSystemConfigTable(client);
  const result = await client.query("SELECT value FROM system_config WHERE key = 'IA_AUTHORITY_FLAGS' LIMIT 1");
  const stored = result.rows[0]?.value;
  return {
    flags: { ...DEFAULT_IA_AUTH_FLAGS, ...(stored || {}) },
    isConfigured: Boolean(result.rows[0]),
  };
}

app.get("/ia/execution-limits", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const limits = await getIaExecutionLimits(client);
      res.json(limits);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar limites IA." });
  }
});

app.put("/ia/execution-limits", async (req, res) => {
  const { adminId, maxTokens, maxAgentsPerRun, maxMemoryTopK, maxChatPerHour, maxTaskCreatePerHour, maxAgentExecutePerHour } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureSystemConfigTable(client);
      const updated = {
        ...DEFAULT_EXEC_LIMITS,
        maxTokens: Number(maxTokens ?? DEFAULT_EXEC_LIMITS.maxTokens),
        maxAgentsPerRun: Number(maxAgentsPerRun ?? DEFAULT_EXEC_LIMITS.maxAgentsPerRun),
        maxMemoryTopK: Number(maxMemoryTopK ?? DEFAULT_EXEC_LIMITS.maxMemoryTopK),
        maxChatPerHour: Number(maxChatPerHour ?? DEFAULT_EXEC_LIMITS.maxChatPerHour),
        maxTaskCreatePerHour: Number(maxTaskCreatePerHour ?? DEFAULT_EXEC_LIMITS.maxTaskCreatePerHour),
        maxAgentExecutePerHour: Number(maxAgentExecutePerHour ?? DEFAULT_EXEC_LIMITS.maxAgentExecutePerHour),
      };
      await client.query(
        "INSERT INTO system_config (key, value, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
        ["IA_EXECUTION_LIMITS", JSON.stringify(updated)]
      );
      await logIaReport(client, {
        status: "limits_update",
        summary: "Atualização de limites IA.",
        decisions: [JSON.stringify(updated)],
      });
      res.json(updated);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao salvar limites IA." });
  }
});

app.put("/ia/config", async (req, res) => {
  const { adminId, ...payload } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const current = await ensureIaConfig(client);
      const updated = {
        ...current,
        ...payload,
      };
      await ensureSystemConfigTable(client);
      await client.query(
        "INSERT INTO system_config (key, value, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
        ["IA_CONFIG", JSON.stringify(updated)]
      );
      res.json(updated);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao atualizar configuração IA." });
  }
});

app.get("/ia/tasks", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureProjectTasksTable(client);
      const result = await client.query(
        "SELECT id, title, description, status, position, domain, generated_by_ai, risk_level, pr_link, confidence_score, execution_result, origin, report_id, project_id, created_at, updated_at FROM project_tasks WHERE domain = 'IA' AND project_id IS NULL ORDER BY created_at DESC"
      );
      const tasks = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? "",
        status: row.status ?? "",
        origin: row.origin ?? "Automation",
        riskLevel: row.risk_level ?? "",
        prLink: row.pr_link ?? "",
        confidenceScore: row.confidence_score ?? null,
        executionResult: row.execution_result ?? "",
        generatedByAI: row.generated_by_ai ?? false,
        domain: row.domain ?? (row.generated_by_ai ? "IA" : null),
        reportId: row.report_id ?? undefined,
        projectId: row.project_id ?? undefined,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      }));
      res.json(tasks);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar tarefas IA." });
  }
});

app.get("/ia/reports", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureAiReportsTable(client);
      const result = await client.query(
        "SELECT id, status, summary, decisions, risks, next_actions, issue_keys, files_modified, risk_classification, pr_link, quality_gate, build_result, test_result, execution_duration_ms, confidence_score, created_at, updated_at FROM ai_reports WHERE domain = 'IA' ORDER BY created_at DESC"
      );
      const reports = result.rows.map((row) => ({
        id: row.id,
        projectId: "IA",
        kanbanItemId: "",
        agent: "HKTECH-IA",
        summary: row.summary ?? "",
        decisions: row.decisions ?? [],
        risks: row.risks ?? [],
        nextActions: row.next_actions ?? [],
        issueKeys: row.issue_keys ?? [],
        filesModified: row.files_modified ?? [],
        riskClassification: row.risk_classification ?? "",
        prLink: row.pr_link ?? "",
        qualityGate: row.quality_gate ?? "",
        status: row.status ?? "",
        buildResult: row.build_result ?? "",
        testResult: row.test_result ?? "",
        executionDurationMs: row.execution_duration_ms ?? null,
        confidenceScore: row.confidence_score ?? null,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      }));
      res.json(reports);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar relatórios IA." });
  }
});

const IA_CHAT_MAX_CONTENT = 8000;
const IA_MEMORY_MAX_CONTENT = 12000;
const IA_MEMORY_MAX_TOPK = 10;
const IA_CHAT_MAX_TOKENS = 800;
const IA_RATE_LIMITS = {
  chatPerHour: 60,
  taskCreatePerHour: 50,
  agentExecutePerHour: 20,
};

const iaRateState = new Map<string, { count: number; resetAt: number }>();

function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = iaRateState.get(key);
  if (!entry || entry.resetAt <= now) {
    iaRateState.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (entry.count >= limit) {
    throw httpError(429, "Rate limit excedido.");
  }
  entry.count += 1;
}

async function assertOpenAiKey() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw httpError(500, "OPENAI_API_KEY ausente.");
  }
  return apiKey;
}

async function logIaReport(client: { query: (sql: string, params?: any[]) => Promise<any> }, payload: { status: string; summary: string; decisions?: string[]; risks?: string[]; nextActions?: string[] }) {
  await ensureAiReportsTable(client);
  await client.query(
    "INSERT INTO ai_reports (domain, status, summary, decisions, risks, next_actions, issue_keys, files_modified) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb)",
    [
      "IA",
      payload.status,
      payload.summary,
      JSON.stringify(payload.decisions ?? []),
      JSON.stringify(payload.risks ?? []),
      JSON.stringify(payload.nextActions ?? []),
      JSON.stringify([]),
      JSON.stringify([]),
    ]
  );
}

async function tryEmbedText(content: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return null;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: content,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const embedding = json?.data?.[0]?.embedding;
  return Array.isArray(embedding) ? (embedding as number[]) : null;
}

async function tryStoreIaMemory(client: { query: (sql: string, params?: any[]) => Promise<any> }, payload: { content: string; contextType: string; relatedTaskId?: string | null }) {
  try {
    const embedding = await tryEmbedText(payload.content);
    if (!embedding) return;
    await client.query(
      "INSERT INTO ia_memory (content, embedding, context_type, related_task_id, created_at) VALUES ($1, $2::vector, $3, $4, NOW())",
      [payload.content, toVectorLiteral(embedding), payload.contextType, payload.relatedTaskId ?? null]
    );
  } catch (error) {
    console.error("Falha ao registrar memória IA:", error);
  }
}

async function embedText(content: string): Promise<number[]> {
  const apiKey = await assertOpenAiKey();
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: content,
    }),
  });
  if (!res.ok) {
    throw httpError(502, "Falha ao gerar embedding.");
  }
  const json = await res.json();
  const embedding = json?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw httpError(502, "Embedding inválido.");
  }
  return embedding as number[];
}

function toVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

app.get("/ia/conversations", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, title, created_at, updated_at FROM ia_conversations ORDER BY updated_at DESC"
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar conversas IA." });
  }
});

app.post("/ia/conversations", async (req, res) => {
  const { adminId, title } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "INSERT INTO ia_conversations (title, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id, title, created_at, updated_at",
        [String(title ?? "")]
      );
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao criar conversa IA." });
  }
});

app.get("/ia/conversations/:id/messages", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  const { id } = req.params;
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, conversation_id, role, content, created_at FROM ia_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
        [id]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar mensagens IA." });
  }
});

app.post("/ia/conversations/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { adminId, role, content } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!role || !content) {
    return res.status(400).json({ message: "role e content são obrigatórios." });
  }
  const trimmed = String(content).trim();
  if (!trimmed || trimmed.length > IA_CHAT_MAX_CONTENT) {
    return res.status(400).json({ message: "content inválido ou muito longo." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "INSERT INTO ia_messages (conversation_id, role, content, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, conversation_id, role, content, created_at",
        [id, String(role), trimmed]
      );
      await client.query("UPDATE ia_conversations SET updated_at = NOW() WHERE id = $1", [id]);
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao registrar mensagem IA." });
  }
});

app.get("/ia/agents", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, name, description, specialty, system_prompt, autonomy_level, is_active, created_at FROM ia_agents ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar agentes IA." });
  }
});

app.post("/ia/agents", async (req, res) => {
  const { adminId, name, description, specialty, system_prompt, autonomy_level, is_active } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!name) {
    return res.status(400).json({ message: "name é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "INSERT INTO ia_agents (name, description, specialty, system_prompt, autonomy_level, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, name, description, specialty, system_prompt, autonomy_level, is_active, created_at",
        [
          String(name),
          String(description ?? ""),
          String(specialty ?? ""),
          String(system_prompt ?? ""),
          String(autonomy_level ?? ""),
          typeof is_active === "boolean" ? is_active : true,
        ]
      );
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao criar agente IA." });
  }
});

app.put("/ia/agents/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId, name, description, specialty, system_prompt, autonomy_level, is_active } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!name) {
    return res.status(400).json({ message: "name é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "UPDATE ia_agents SET name = $1, description = $2, specialty = $3, system_prompt = $4, autonomy_level = $5, is_active = $6 WHERE id = $7 RETURNING id, name, description, specialty, system_prompt, autonomy_level, is_active, created_at",
        [
          String(name),
          String(description ?? ""),
          String(specialty ?? ""),
          String(system_prompt ?? ""),
          String(autonomy_level ?? ""),
          typeof is_active === "boolean" ? is_active : true,
          id,
        ]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Agente não encontrado." });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao atualizar agente IA." });
  }
});

app.get("/ia/contexts", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, title, content, context_type, related_agent_id, created_at FROM ia_contexts ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar contextos IA." });
  }
});

app.post("/ia/contexts", async (req, res) => {
  const { adminId, title, content, context_type, related_agent_id } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title || !content) {
    return res.status(400).json({ message: "title e content são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "INSERT INTO ia_contexts (title, content, context_type, related_agent_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, title, content, context_type, related_agent_id, created_at",
        [String(title), String(content), String(context_type ?? ""), related_agent_id ?? null]
      );
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao criar contexto IA." });
  }
});

app.put("/ia/contexts/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId, title, content, context_type, related_agent_id } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title || !content) {
    return res.status(400).json({ message: "title e content são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "UPDATE ia_contexts SET title = $1, content = $2, context_type = $3, related_agent_id = $4 WHERE id = $5 RETURNING id, title, content, context_type, related_agent_id, created_at",
        [String(title), String(content), String(context_type ?? ""), related_agent_id ?? null, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Contexto não encontrado." });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao atualizar contexto IA." });
  }
});

app.delete("/ia/contexts/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query("DELETE FROM ia_contexts WHERE id = $1 RETURNING id", [id]);
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Contexto não encontrado." });
      }
      res.json({ id });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao remover contexto IA." });
  }
});

app.get("/ia/prompts", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  const category = String(req.query.category || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const params: any[] = [];
      let sql =
        "SELECT p.id, p.title, p.file_name, p.category, p.description, p.storage_url, p.is_active, p.version, p.created_at, p.updated_at, COUNT(m.id)::int AS memory_count FROM ia_prompts p LEFT JOIN ia_memory m ON m.prompt_id = p.id";
      if (category) {
        sql += " WHERE p.category = $1";
        params.push(category);
      }
      sql += " GROUP BY p.id ORDER BY p.updated_at DESC";
      const result = await client.query(sql, params);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar prompts IA." });
  }
});

app.get("/ia/prompts/:id", async (req, res) => {
  const { id } = req.params;
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, title, file_name, category, description, storage_url, is_active, version, created_at, updated_at FROM ia_prompts WHERE id = $1",
        [id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Prompt não encontrado." });
      }
      const prompt = result.rows[0];
      const content = prompt.storage_url ? await readStorageText(prompt.storage_url) : "";
      res.json({ ...prompt, content });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar prompt IA." });
  }
});

app.put("/ia/prompts/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId, title, category, description, content, is_active, reembed } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title || !category || !content) {
    return res.status(400).json({ message: "title, category e content são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const current = await client.query(
        "SELECT id, file_name, version FROM ia_prompts WHERE id = $1",
        [id]
      );
      if (!current.rows[0]) {
        return res.status(404).json({ message: "Prompt não encontrado." });
      }
      const nextVersion = Number(current.rows[0].version ?? 1) + 1;
      const fileName = current.rows[0].file_name as string;
      const storagePath = `ia/prompts/${category}/${fileName}`;
      const storageUrl = await saveStorageText(storagePath, String(content));
      const versionedPath = `ia/prompts/${category}/${fileName.replace(/\.md$/i, "")}.v${nextVersion}.md`;
      const versionedUrl = await saveStorageText(versionedPath, String(content));

      await client.query(
        "UPDATE ia_prompts SET title = $1, category = $2, description = $3, storage_url = $4, is_active = $5, version = $6, updated_at = NOW() WHERE id = $7",
        [String(title), String(category), String(description ?? ""), storageUrl, is_active !== false, nextVersion, id]
      );

      await client.query(
        "INSERT INTO ia_prompt_versions (prompt_id, version, storage_url, created_at) VALUES ($1, $2, $3, NOW())",
        [id, nextVersion, versionedUrl]
      );

      if (reembed) {
        const embedding = await embedText(String(content));
        await client.query(
          "INSERT INTO ia_memory (prompt_id, content, embedding, context_type, created_at) VALUES ($1, $2, $3::vector, $4, NOW())",
          [id, String(content), toVectorLiteral(embedding), "prompt"]
        );
      }

      res.json({ id, version: nextVersion, storage_url: storageUrl });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao atualizar prompt IA." });
  }
});

app.post("/ia/prompts/:id/re-embed", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const current = await client.query(
        "SELECT id, storage_url FROM ia_prompts WHERE id = $1",
        [id]
      );
      if (!current.rows[0]) {
        return res.status(404).json({ message: "Prompt não encontrado." });
      }
      const storageUrl = String(current.rows[0].storage_url ?? "");
      const content = storageUrl ? await readStorageText(storageUrl) : "";
      if (!content.trim()) {
        return res.status(400).json({ message: "Prompt sem conteúdo." });
      }
      const embedding = await embedText(content);
      await client.query(
        "INSERT INTO ia_memory (prompt_id, content, embedding, context_type, created_at) VALUES ($1, $2, $3::vector, $4, NOW())",
        [id, content, toVectorLiteral(embedding), "prompt"]
      );
      res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao re-embutir prompt IA." });
  }
});

app.get("/ia/prompts/:id/versions", async (req, res) => {
  const { id } = req.params;
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, prompt_id, version, storage_url, created_at FROM ia_prompt_versions WHERE prompt_id = $1 ORDER BY version DESC",
        [id]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar versões do prompt IA." });
  }
});

app.post("/ia/prompts/:id/activate-version", async (req, res) => {
  const { id } = req.params;
  const { adminId, version, reembed } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  const targetVersion = Number(version);
  if (!targetVersion || targetVersion < 1) {
    return res.status(400).json({ message: "version inválida." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const current = await client.query("SELECT id, version FROM ia_prompts WHERE id = $1", [id]);
      if (!current.rows[0]) {
        return res.status(404).json({ message: "Prompt não encontrado." });
      }
      const versionRow = await client.query(
        "SELECT storage_url FROM ia_prompt_versions WHERE prompt_id = $1 AND version = $2 LIMIT 1",
        [id, targetVersion]
      );
      if (!versionRow.rows[0]) {
        return res.status(404).json({ message: "Versão não encontrada." });
      }
      const nextVersion = Number(current.rows[0].version ?? 1) + 1;
      const storageUrl = String(versionRow.rows[0].storage_url || "");
      await client.query(
        "UPDATE ia_prompts SET storage_url = $1, version = $2, updated_at = NOW() WHERE id = $3",
        [storageUrl, nextVersion, id]
      );
      await client.query(
        "INSERT INTO ia_prompt_versions (prompt_id, version, storage_url, created_at) VALUES ($1, $2, $3, NOW())",
        [id, nextVersion, storageUrl]
      );
      if (reembed) {
        const content = storageUrl ? await readStorageText(storageUrl) : "";
        if (content.trim()) {
          const embedding = await embedText(content);
          await client.query(
            "INSERT INTO ia_memory (prompt_id, content, embedding, context_type, created_at) VALUES ($1, $2, $3::vector, $4, NOW())",
            [id, content, toVectorLiteral(embedding), "prompt"]
          );
        }
      }
      res.json({ id, version: nextVersion, storage_url: storageUrl });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao ativar versão do prompt IA." });
  }
});

app.get("/ia/prompts/export", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, file_name, category, storage_url, version FROM ia_prompts WHERE is_active = true ORDER BY category, file_name"
      );
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=ia-prompts-backup.zip");

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err: Error) => {
        console.error("Erro ao gerar zip de prompts:", err);
        res.status(500).end();
      });
      archive.pipe(res);

      for (const prompt of result.rows) {
        const filename = prompt.file_name || `prompt-${prompt.id}.md`;
        const category = prompt.category || "uncategorized";
        const storageUrl = String(prompt.storage_url || "");
        if (!storageUrl) continue;
        const parsed = parseStorageUrl(storageUrl);
        if (parsed) {
          const bucket = admin.storage().bucket(parsed.bucket);
          const stream = bucket.file(parsed.path).createReadStream();
          archive.append(stream, { name: `prompts/${category}/${filename}` });
        } else {
          const content = await readStorageText(storageUrl);
          archive.append(content, { name: `prompts/${category}/${filename}` });
        }
      }

      await archive.finalize();
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao exportar prompts IA." });
  }
});

app.post("/ia/prompts/import", async (req, res) => {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return res.status(400).json({ message: "Conteúdo inválido. Use multipart/form-data." });
  }
  const busboy = Busboy({ headers: req.headers });
  let adminId = "";
  const chunks: Buffer[] = [];

  busboy.on("field", (fieldname: string, value: string) => {
    if (fieldname === "adminId") {
      adminId = String(value || "").trim();
    }
  });

  busboy.on("file", (_name: string, file: NodeJS.ReadableStream, info: { filename: string }) => {
    if (!info.filename.toLowerCase().endsWith(".zip")) {
      file.resume();
      return;
    }
    file.on("data", (data: Buffer) => chunks.push(data));
  });

  busboy.on("finish", async () => {
    if (!adminId) {
      return res.status(400).json({ message: "adminId é obrigatório." });
    }
    if (chunks.length === 0) {
      return res.status(400).json({ message: "Arquivo ZIP não encontrado." });
    }
    try {
      const pool = await getPool();
      const client = await pool.connect();
      try {
        await assertAdmin(client, adminId);
        const zipBuffer = Buffer.concat(chunks);
        const zip = new AdmZip(zipBuffer);
        const entries = zip.getEntries();
        const summary: { inserted: number; updated: number; skipped: number } = { inserted: 0, updated: 0, skipped: 0 };

        for (const entry of entries) {
          if (entry.isDirectory) continue;
          const name = entry.entryName.replace(/\\/g, "/");
          if (!name.toLowerCase().endsWith(".md")) continue;
          const parts = name.split("/").filter(Boolean);
          const filename = parts[parts.length - 1];
          const category = parts.length >= 2 ? parts[parts.length - 2] : inferPromptCategory(filename);
          const content = entry.getData().toString("utf8");
          if (!content.trim()) {
            summary.skipped += 1;
            continue;
          }

          const existing = await client.query(
            "SELECT id, version, storage_url FROM ia_prompts WHERE file_name = $1 LIMIT 1",
            [filename]
          );

          let promptId = existing.rows[0]?.id;
          const currentVersion = existing.rows[0]?.version ? Number(existing.rows[0].version) : 0;
          const existingUrl = String(existing.rows[0]?.storage_url || "");
          let isDifferent = true;

          if (existingUrl) {
            const existingContent = await readStorageText(existingUrl);
            isDifferent = hashContent(existingContent) !== hashContent(content);
          }

          if (!promptId) {
            const storagePath = `ia/prompts/${category}/${filename}`;
            const storageUrl = await saveStorageText(storagePath, content);
            const versionedPath = `ia/prompts/${category}/${filename.replace(/\.md$/i, "")}.v1.md`;
            const versionedUrl = await saveStorageText(versionedPath, content);
            const title = toPromptTitle(filename);
            const insert = await client.query(
              "INSERT INTO ia_prompts (title, file_name, category, description, storage_url, is_active, version, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW()) RETURNING id",
              [title, filename, category, "", storageUrl, 1]
            );
            promptId = insert.rows[0]?.id;
            await client.query(
              "INSERT INTO ia_prompt_versions (prompt_id, version, storage_url, created_at) VALUES ($1, $2, $3, NOW())",
              [promptId, 1, versionedUrl]
            );
            const embedding = await embedText(content);
            await client.query(
              "INSERT INTO ia_memory (prompt_id, content, embedding, context_type, created_at) VALUES ($1, $2, $3::vector, $4, NOW())",
              [promptId, content, toVectorLiteral(embedding), "prompt"]
            );
            summary.inserted += 1;
            continue;
          }

          if (!isDifferent) {
            summary.skipped += 1;
            continue;
          }

          const nextVersion = currentVersion + 1;
          const storagePath = `ia/prompts/${category}/${filename}`;
          const storageUrl = await saveStorageText(storagePath, content);
          const versionedPath = `ia/prompts/${category}/${filename.replace(/\.md$/i, "")}.v${nextVersion}.md`;
          const versionedUrl = await saveStorageText(versionedPath, content);
          await client.query(
            "UPDATE ia_prompts SET title = $1, category = $2, storage_url = $3, version = $4, updated_at = NOW() WHERE id = $5",
            [toPromptTitle(filename), category, storageUrl, nextVersion, promptId]
          );
          await client.query(
            "INSERT INTO ia_prompt_versions (prompt_id, version, storage_url, created_at) VALUES ($1, $2, $3, NOW())",
            [promptId, nextVersion, versionedUrl]
          );
          const embedding = await embedText(content);
          await client.query(
            "INSERT INTO ia_memory (prompt_id, content, embedding, context_type, created_at) VALUES ($1, $2, $3::vector, $4, NOW())",
            [promptId, content, toVectorLiteral(embedding), "prompt"]
          );
          summary.updated += 1;
        }

        res.json({ ok: true, ...summary });
      } finally {
        client.release();
      }
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      console.error(error);
      res.status(status).json({ message: "Erro ao importar prompts IA." });
    }
  });

  req.pipe(busboy);
});

app.get("/ia/orchestrators", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, name, storage_url, execution_flow, is_active, version, created_at, updated_at FROM ia_orchestrators ORDER BY updated_at DESC"
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar orquestradores IA." });
  }
});

app.get("/ia/orchestrators/active", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, name, storage_url, execution_flow, is_active, version, created_at, updated_at FROM ia_orchestrators WHERE is_active = true ORDER BY updated_at DESC LIMIT 1"
      );
      res.json(result.rows[0] ?? null);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar orquestrador ativo." });
  }
});

app.post("/ia/orchestrators", async (req, res) => {
  const { adminId, name, supremePrompt, executionFlow, isActive } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!name || !supremePrompt) {
    return res.status(400).json({ message: "name e supremePrompt são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const versionResult = await client.query(
        "SELECT COALESCE(MAX(version), 0) AS version FROM ia_orchestrators WHERE name = $1",
        [String(name)]
      );
      const nextVersion = Number(versionResult.rows[0]?.version ?? 0) + 1;
      const active = isActive !== false;
      if (active) {
        await client.query("UPDATE ia_orchestrators SET is_active = false WHERE is_active = true");
      }
      const safeName = String(name).toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
      const storagePath = `ia/orchestrators/${safeName || "orchestrator"}.v${nextVersion}.md`;
      const storageUrl = await saveStorageText(storagePath, String(supremePrompt));
      const result = await client.query(
        "INSERT INTO ia_orchestrators (name, storage_url, execution_flow, is_active, version, created_at, updated_at) VALUES ($1, $2, $3::jsonb, $4, $5, NOW(), NOW()) RETURNING id, name, storage_url, execution_flow, is_active, version, created_at, updated_at",
        [String(name), storageUrl, JSON.stringify(executionFlow ?? []), active, nextVersion]
      );
      await logIaReport(client, {
        status: "orchestrator_create",
        summary: `Novo orquestrador IA criado: ${name} (v${nextVersion}).`,
      });
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao criar orquestrador IA." });
  }
});

app.put("/ia/orchestrators/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId, name, supremePrompt, executionFlow, isActive } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!name || !supremePrompt) {
    return res.status(400).json({ message: "name e supremePrompt são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const current = await client.query(
        "SELECT id, name, version FROM ia_orchestrators WHERE id = $1",
        [id]
      );
      if (!current.rows[0]) {
        return res.status(404).json({ message: "Orquestrador não encontrado." });
      }
      const versionResult = await client.query(
        "SELECT COALESCE(MAX(version), 0) AS version FROM ia_orchestrators WHERE name = $1",
        [String(name)]
      );
      const nextVersion = Number(versionResult.rows[0]?.version ?? 0) + 1;
      const active = isActive !== false;
      if (active) {
        await client.query("UPDATE ia_orchestrators SET is_active = false WHERE is_active = true");
      }
      const safeName = String(name).toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
      const storagePath = `ia/orchestrators/${safeName || "orchestrator"}.v${nextVersion}.md`;
      const storageUrl = await saveStorageText(storagePath, String(supremePrompt));
      const result = await client.query(
        "INSERT INTO ia_orchestrators (name, storage_url, execution_flow, is_active, version, created_at, updated_at) VALUES ($1, $2, $3::jsonb, $4, $5, NOW(), NOW()) RETURNING id, name, storage_url, execution_flow, is_active, version, created_at, updated_at",
        [String(name), storageUrl, JSON.stringify(executionFlow ?? []), active, nextVersion]
      );
      await logIaReport(client, {
        status: "orchestrator_update",
        summary: `Orquestrador IA atualizado: ${name} (v${nextVersion}).`,
      });
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao atualizar orquestrador IA." });
  }
});

app.post("/ia/orchestrators/:id/activate", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const current = await client.query(
        "SELECT id, name, version FROM ia_orchestrators WHERE id = $1",
        [id]
      );
      if (!current.rows[0]) {
        return res.status(404).json({ message: "Orquestrador não encontrado." });
      }
      await client.query("UPDATE ia_orchestrators SET is_active = false WHERE is_active = true");
      await client.query("UPDATE ia_orchestrators SET is_active = true, updated_at = NOW() WHERE id = $1", [id]);
      await logIaReport(client, {
        status: "orchestrator_activate",
        summary: `Orquestrador IA ativado: ${current.rows[0].name} (v${current.rows[0].version}).`,
      });
      res.json({ id, is_active: true });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao ativar orquestrador IA." });
  }
});

app.get("/ia/orchestrators/summary", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const active = await client.query(
        "SELECT id, name, storage_url, execution_flow, is_active, version, created_at, updated_at FROM ia_orchestrators WHERE is_active = true ORDER BY updated_at DESC LIMIT 1"
      );
      const contexts = await client.query("SELECT COUNT(*)::int AS count FROM ia_contexts");
      const agentsCount = await client.query("SELECT COUNT(*)::int AS count FROM ia_agents WHERE is_active = true");
      const agentsList = await client.query("SELECT id, name, specialty FROM ia_agents WHERE is_active = true ORDER BY name ASC");
      const { flags } = await getIaAuthorityFlags(client);
      const lastExecution = await client.query(
        "SELECT id, orchestrator_id, version, steps_executed, agents_used, memory_retrieved_count, token_usage, execution_time, status, created_at FROM ia_orchestrator_executions ORDER BY created_at DESC LIMIT 1"
      );
      res.json({
        activeOrchestrator: active.rows[0] ?? null,
        activeContextsCount: contexts.rows[0]?.count ?? 0,
        activeAgentsCount: agentsCount.rows[0]?.count ?? 0,
        activeAgents: agentsList.rows,
        systemFlags: flags,
        lastExecution: lastExecution.rows[0] ?? null,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar resumo do orquestrador IA." });
  }
});

app.get("/ia/orchestrators/executions", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  const orchestratorId = String(req.query.orchestratorId || "").trim();
  const limit = Math.max(1, Math.min(Number(req.query.limit ?? 20), 100));
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const params: any[] = [];
      let sql =
        "SELECT id, orchestrator_id, version, steps_executed, agents_used, memory_retrieved_count, token_usage, execution_time, status, created_at FROM ia_orchestrator_executions";
      if (orchestratorId) {
        params.push(orchestratorId);
        sql += ` WHERE orchestrator_id = $${params.length}`;
      }
      params.push(limit);
      sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      const result = await client.query(sql, params);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar execuções do orquestrador IA." });
  }
});

app.get("/ia/orchestrators/:id/content", async (req, res) => {
  const { id } = req.params;
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "SELECT id, name, storage_url, version, is_active FROM ia_orchestrators WHERE id = $1",
        [id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Orquestrador não encontrado." });
      }
      const orchestrator = result.rows[0];
      const content = orchestrator.storage_url ? await readStorageText(orchestrator.storage_url) : "";
      res.json({ ...orchestrator, content });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar conteúdo do orquestrador IA." });
  }
});

const IA_TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"] as const;
const normalizeIaTaskStatus = (status: string) => {
  const upper = String(status || "").trim().toUpperCase();
  return IA_TASK_STATUSES.includes(upper as typeof IA_TASK_STATUSES[number]) ? upper : "TODO";
};

app.post("/ia/tasks", async (req, res) => {
  const { adminId, title, description, status, origin, linked_agent_id, context_reference, execution_logs, specialist_type } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title) {
    return res.status(400).json({ message: "title é obrigatório." });
  }
  try {
    assertRateLimit(`ia:tasks:${adminId}`, IA_RATE_LIMITS.taskCreatePerHour, 60 * 60 * 1000);
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureProjectTasksTable(client);
      const result = await client.query(
        "INSERT INTO project_tasks (project_id, title, description, status, position, generated_by_ai, domain, origin, linked_agent_id, context_reference, execution_logs, specialist_type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, NOW(), NOW()) RETURNING id, title, description, status, position, domain, generated_by_ai, origin, linked_agent_id, context_reference, execution_logs, specialist_type, created_at, updated_at",
        [
          null,
          String(title),
          String(description ?? ""),
          normalizeIaTaskStatus(status ?? "TODO"),
          0,
          false,
          "IA",
          String(origin ?? "Manual"),
          linked_agent_id ?? null,
          String(context_reference ?? ""),
          JSON.stringify(Array.isArray(execution_logs) ? execution_logs : []),
          String(specialist_type ?? ""),
        ]
      );
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao criar task IA." });
  }
});

app.put("/ia/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId, title, description, status, origin, linked_agent_id, context_reference, execution_logs, specialist_type } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  if (!title) {
    return res.status(400).json({ message: "title é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureProjectTasksTable(client);
      const result = await client.query(
        "UPDATE project_tasks SET title = $1, description = $2, status = $3, origin = $4, linked_agent_id = $5, context_reference = $6, execution_logs = $7::jsonb, specialist_type = $8, updated_at = NOW() WHERE id = $9 AND domain = 'IA' AND project_id IS NULL RETURNING id, title, description, status, origin, linked_agent_id, context_reference, execution_logs, specialist_type, updated_at",
        [
          String(title),
          String(description ?? ""),
          normalizeIaTaskStatus(status ?? "TODO"),
          String(origin ?? "Manual"),
          linked_agent_id ?? null,
          String(context_reference ?? ""),
          JSON.stringify(Array.isArray(execution_logs) ? execution_logs : []),
          String(specialist_type ?? ""),
          id,
        ]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Task IA não encontrada." });
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao atualizar task IA." });
  }
});

app.post("/ia/agents/:id/execute", async (req, res) => {
  const { id } = req.params;
  const { adminId, context_reference } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    assertRateLimit(`ia:agents:${adminId}`, IA_RATE_LIMITS.agentExecutePerHour, 60 * 60 * 1000);
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const agent = await client.query(
        "SELECT id, name, specialty, system_prompt FROM ia_agents WHERE id = $1",
        [id]
      );
      if (!agent.rows[0]) {
        return res.status(404).json({ message: "Agente não encontrado." });
      }
      await ensureAiReportsTable(client);
      await ensureProjectTasksTable(client);
      const reportSummary = `Agent execution requested: ${agent.rows[0].name}`;
      const report = await client.query(
        "INSERT INTO ai_reports (domain, status, summary, decisions, risks, next_actions, issue_keys, files_modified) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb) RETURNING id",
        ["IA", "requested", reportSummary, JSON.stringify([]), JSON.stringify([]), JSON.stringify([]), JSON.stringify([]), JSON.stringify([])]
      );
      const task = await client.query(
        "INSERT INTO project_tasks (project_id, title, description, status, position, generated_by_ai, domain, origin, linked_agent_id, context_reference, execution_logs, specialist_type, report_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, NOW(), NOW()) RETURNING id, title, status, linked_agent_id, specialist_type, created_at",
        [
          null,
          reportSummary,
          agent.rows[0].system_prompt ?? "",
          "TODO",
          0,
          true,
          "IA",
          "Agent",
          agent.rows[0].id,
          String(context_reference ?? ""),
          JSON.stringify([{ event: "requested", at: new Date().toISOString() }]),
          agent.rows[0].specialty ?? "",
          report.rows[0]?.id ?? null,
        ]
      );
      await tryStoreIaMemory(client, {
        content: reportSummary,
        contextType: "agent_execution",
        relatedTaskId: task.rows[0]?.id ?? null,
      });
      res.status(201).json({ task: task.rows[0], reportId: report.rows[0]?.id });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao acionar agente IA." });
  }
});

app.post("/ia/chat", async (req, res) => {
  const { adminId, conversationId, message } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  const trimmed = String(message ?? "").trim();
  if (!trimmed || trimmed.length > IA_CHAT_MAX_CONTENT) {
    return res.status(400).json({ message: "message inválida ou muito longa." });
  }
  try {
    assertRateLimit(`ia:chat:${adminId}`, IA_RATE_LIMITS.chatPerHour, 60 * 60 * 1000);
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const executionStartedAt = Date.now();
      const defaultFlow = [
        "load_orchestrator",
        "validate_system_config",
        "load_contexts",
        "retrieve_vector_memory",
        "validate_authority_flags",
        "create_or_update_ia_task",
        "execute_agent",
        "generate_ai_report",
        "store_memory",
      ];
      const stepState = new Map<string, { step: string; status: string; execution_time_ms: number; token_usage: number }>();
      const initStep = (name: string) => {
        if (!stepState.has(name)) {
          stepState.set(name, { step: name, status: "pending", execution_time_ms: 0, token_usage: 0 });
        }
      };
      const markStep = (name: string, status: string, execution_time_ms: number, token_usage = 0) => {
        initStep(name);
        const entry = stepState.get(name)!;
        entry.status = status;
        entry.execution_time_ms = execution_time_ms;
        entry.token_usage = token_usage;
      };
      let convoId = conversationId as string | undefined;
      if (!convoId) {
        const created = await client.query(
          "INSERT INTO ia_conversations (title, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id",
          [trimmed.slice(0, 120)]
        );
        convoId = created.rows[0]?.id;
      }
      await client.query(
        "INSERT INTO ia_messages (conversation_id, role, content, created_at) VALUES ($1, $2, $3, NOW())",
        [convoId, "user", trimmed]
      );

      const orchestratorStartedAt = Date.now();
      const orchestratorResult = await client.query(
        "SELECT id, name, storage_url, execution_flow, version FROM ia_orchestrators WHERE is_active = true ORDER BY updated_at DESC LIMIT 1"
      );
      const orchestrator = orchestratorResult.rows[0] as {
        id?: string;
        name?: string;
        storage_url?: string;
        execution_flow?: unknown;
        version?: number;
      } | undefined;
      markStep("load_orchestrator", "ok", Date.now() - orchestratorStartedAt);

      const { flags, isConfigured } = await getIaAuthorityFlags(client);
      markStep("validate_system_config", "ok", 0);
      const authorityOk =
        isConfigured &&
        flags.managedByAI === true &&
        flags.taskCreationPolicy === "AI_ALLOWED" &&
        flags.allowAutoBacklogIfEmpty === true;
      markStep("validate_authority_flags", authorityOk ? "ok" : "blocked", 0);
      const flowList = Array.isArray(orchestrator?.execution_flow) ? (orchestrator?.execution_flow as string[]) : defaultFlow;
      flowList.forEach((step) => initStep(step));
      if (!authorityOk) {
        const steps = flowList.map((step) => stepState.get(step)!).map((entry) => {
          if (entry.status === "pending") entry.status = "skipped";
          return entry;
        });
        const executionTime = Date.now() - executionStartedAt;
        await client.query(
          "INSERT INTO ia_orchestrator_executions (orchestrator_id, version, steps_executed, agents_used, memory_retrieved_count, token_usage, execution_time, status, created_at) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, NOW())",
          [
            orchestrator?.id ?? null,
            orchestrator?.version ?? 1,
            JSON.stringify(steps),
            JSON.stringify([]),
            0,
            0,
            executionTime,
            "blocked",
          ]
        );
        return res.status(423).json({ message: "Orquestrador bloqueado por flags do sistema." });
      }

      const contextsStartedAt = Date.now();
      const contextRows = await client.query(
        "SELECT title, content, context_type FROM ia_contexts ORDER BY created_at DESC LIMIT 5"
      );
      markStep("load_contexts", "ok", Date.now() - contextsStartedAt);
      const memoryStartedAt = Date.now();
      const memoryEmbedding = await embedText(trimmed);
      const memoryRows = await client.query(
        "SELECT content, context_type FROM ia_memory ORDER BY embedding <=> $1::vector ASC LIMIT 3",
        [toVectorLiteral(memoryEmbedding)]
      );
      markStep("retrieve_vector_memory", "ok", Date.now() - memoryStartedAt, Math.round(trimmed.length / 4));

      const systemParts: string[] = [];
      if (orchestrator?.storage_url) {
        const supremePrompt = await readStorageText(orchestrator.storage_url);
        if (supremePrompt) {
          systemParts.push(`SUPREME PROMPT:\n${supremePrompt}`);
        }
      }
      if (orchestrator?.execution_flow) {
        const flowText = JSON.stringify(orchestrator.execution_flow, null, 2);
        systemParts.push(`EXECUTION FLOW (JSON):\n${flowText}`);
      }
      const contextText = contextRows.rows
        .map((row) => `(${row.context_type || "context"}) ${row.title}: ${row.content}`)
        .filter(Boolean)
        .join("\n\n");
      if (contextText) systemParts.push(`CONTEXTOS:\n${contextText}`);
      const memoryText = memoryRows.rows
        .map((row) => `(${row.context_type || "memory"}) ${row.content}`)
        .filter(Boolean)
        .join("\n\n");
      if (memoryText) systemParts.push(`MEMÓRIA SEMÂNTICA:\n${memoryText}`);
      const systemContext = systemParts.join("\n\n");

      const apiKey = await assertOpenAiKey();
      const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemContext || "Você é o HK IA da plataforma HKTECH." },
            { role: "user", content: trimmed },
          ],
          temperature: 0.2,
          max_tokens: IA_CHAT_MAX_TOKENS,
        }),
      });
      if (!chatRes.ok) {
        throw httpError(502, "Falha ao consultar OpenAI.");
      }
      const chatJson = await chatRes.json();
      const assistantMessage = chatJson?.choices?.[0]?.message?.content ?? "";
      const estimatedTokens = Math.round((systemContext.length + trimmed.length + assistantMessage.length) / 4);
      markStep("execute_agent", "ok", 0, estimatedTokens);
      await client.query(
        "INSERT INTO ia_messages (conversation_id, role, content, created_at) VALUES ($1, $2, $3, NOW())",
        [convoId, "assistant", assistantMessage]
      );
      await logIaReport(client, {
        status: "chat_orchestrated",
        summary: `HK IA respondeu com orquestrador ${orchestrator?.name || "default"}.`,
      });
      markStep("generate_ai_report", "ok", 0);
      await tryStoreIaMemory(client, {
        content: trimmed,
        contextType: "chat_user",
      });
      if (assistantMessage) {
        await tryStoreIaMemory(client, {
          content: assistantMessage,
          contextType: "chat_assistant",
        });
      }
      markStep("store_memory", "ok", 0);
      markStep("create_or_update_ia_task", "skipped", 0);
      const flowOrdered = flowList.map((step) => {
        const entry = stepState.get(step) ?? { step, status: "skipped", execution_time_ms: 0, token_usage: 0 };
        if (entry.status === "pending") entry.status = "skipped";
        return entry;
      });
      const executionTime = Date.now() - executionStartedAt;
      await client.query(
        "INSERT INTO ia_orchestrator_executions (orchestrator_id, version, steps_executed, agents_used, memory_retrieved_count, token_usage, execution_time, status, created_at) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, NOW())",
        [
          orchestrator?.id ?? null,
          orchestrator?.version ?? 1,
          JSON.stringify(flowOrdered),
          JSON.stringify([]),
          memoryRows.rows.length,
          estimatedTokens,
          executionTime,
          "success",
        ]
      );
      await client.query("UPDATE ia_conversations SET updated_at = NOW() WHERE id = $1", [convoId]);
      res.json({ conversationId: convoId, assistantMessage });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao conversar com HK IA." });
  }
});

app.get("/ia/memory/stats", async (req, res) => {
  const adminId = String(req.query.adminId || "").trim();
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const total = await client.query("SELECT COUNT(*)::int AS count FROM ia_memory");
      const chars = await client.query("SELECT COALESCE(SUM(LENGTH(content)), 0)::int AS chars FROM ia_memory");
      const byType = await client.query(
        "SELECT context_type, COUNT(*)::int AS count FROM ia_memory GROUP BY context_type ORDER BY count DESC"
      );
      const totalChars = chars.rows[0]?.chars ?? 0;
      const tokenEstimate = Math.round(totalChars / 4);
      res.json({ total: total.rows[0]?.count ?? 0, byType: byType.rows, tokenEstimate });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar memória IA." });
  }
});

app.post("/ia/memory", async (req, res) => {
  const { adminId, content, context_type, related_task_id } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  const trimmed = String(content ?? "").trim();
  if (!trimmed || trimmed.length > IA_MEMORY_MAX_CONTENT) {
    return res.status(400).json({ message: "content inválido ou muito longo." });
  }
  try {
    const embedding = await embedText(trimmed);
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const result = await client.query(
        "INSERT INTO ia_memory (content, embedding, context_type, related_task_id, created_at) VALUES ($1, $2::vector, $3, $4, NOW()) RETURNING id, content, context_type, related_task_id, created_at",
        [trimmed, toVectorLiteral(embedding), String(context_type ?? ""), related_task_id ?? null]
      );
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao salvar memória IA." });
  }
});

app.post("/ia/memory/search", async (req, res) => {
  const { adminId, query, topK, context_type } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  const trimmed = String(query ?? "").trim();
  if (!trimmed || trimmed.length > IA_MEMORY_MAX_CONTENT) {
    return res.status(400).json({ message: "query inválida ou muito longa." });
  }
  const limit = Math.max(1, Math.min(Number(topK ?? 5), IA_MEMORY_MAX_TOPK));
  try {
    const embedding = await embedText(trimmed);
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      const params: any[] = [toVectorLiteral(embedding), limit];
      let sql =
        "SELECT id, content, context_type, related_task_id, created_at, (embedding <=> $1::vector) AS distance FROM ia_memory";
      if (context_type) {
        sql += " WHERE context_type = $3";
        params.push(String(context_type));
      }
      sql += " ORDER BY embedding <=> $1::vector ASC LIMIT $2";
      const result = await client.query(sql, params);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao buscar memória IA." });
  }
});

app.post("/admin-tools/reset-purchases", async (req, res) => {
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensurePurchasesTable(client);
      const result = await client.query("DELETE FROM purchases RETURNING id");
      await logAdminAction(client, adminId, `reset_purchases_all:${result.rowCount ?? 0}`);
      res.json({ deleted: result.rowCount ?? 0 });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao resetar compras." });
  }
});

app.post("/admin-tools/reset-sales", async (req, res) => {
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensurePurchasesTable(client);
      const result = await client.query("DELETE FROM purchases WHERE purchase_type = 'paid' RETURNING id");
      await logAdminAction(client, adminId, `reset_sales_paid:${result.rowCount ?? 0}`);
      res.json({ deleted: result.rowCount ?? 0 });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao resetar vendas pagas." });
  }
});

app.post("/admin-tools/reset-redeems", async (req, res) => {
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensurePurchasesTable(client);
      const result = await client.query("DELETE FROM purchases WHERE purchase_type = 'free' RETURNING id");
      await logAdminAction(client, adminId, `reset_redeems_free:${result.rowCount ?? 0}`);
      res.json({ deleted: result.rowCount ?? 0 });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao resetar resgates." });
  }
});

app.post("/admin-tools/reset-cloned-projects", async (req, res) => {
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensureProjectsColumns(client);
      const result = await client.query(
        "DELETE FROM projects WHERE created_from_purchase = true AND is_template = false RETURNING id"
      );
      await logAdminAction(client, adminId, `reset_cloned_projects:${result.rowCount ?? 0}`);
      res.json({ deleted: result.rowCount ?? 0 });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao resetar projetos clonados." });
  }
});

app.post("/admin-tools/reset-full", async (req, res) => {
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await assertAdmin(client, adminId);
      await ensurePurchasesTable(client);
      await ensureProjectsColumns(client);
      await client.query("BEGIN");
      const purchasesResult = await client.query("DELETE FROM purchases RETURNING id");
      const projectsResult = await client.query(
        "DELETE FROM projects WHERE created_from_purchase = true AND is_template = false RETURNING id"
      );
      await client.query("COMMIT");
      await logAdminAction(
        client,
        adminId,
        `reset_full:purchases=${purchasesResult.rowCount ?? 0};projects=${projectsResult.rowCount ?? 0}`
      );
      res.json({ purchasesDeleted: purchasesResult.rowCount ?? 0, projectsDeleted: projectsResult.rowCount ?? 0 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao executar reset completo." });
  }
});

app.put("/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, projectType, salePrice, productionCost, purchaseCount, repository, domain, hosting, status, paid, isPublic, ownerUserId, productId, baseProjectId, createdFromPurchase, isTemplate, htmlContent, cssContent } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "UPDATE projects SET name = $1, description = $2, project_type = $3, sale_price = $4, production_cost = $5, purchase_count = $6, repository = $7, domain = $8, hosting = $9, status = $10, paid = $11, is_public = $12, owner_user_id = $13, product_id = $14, base_project_id = $15, created_from_purchase = $16, is_template = $17, html_content = $18, css_content = $19, version = CASE WHEN $17 THEN COALESCE(version, 1) + 1 ELSE version END, updated_at = NOW() WHERE id = $20 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, version, template_id, template_version, updated_at",
        [
          name,
          description ?? "",
          projectType ?? "",
          salePrice ?? "",
          productionCost ?? "",
          Number.isFinite(Number(purchaseCount)) ? Number(purchaseCount) : 0,
          repository ?? "",
          domain ?? "",
          hosting ?? "",
          status ?? "Ativo",
          !!paid,
          isPublic === undefined ? true : !!isPublic,
          ownerUserId ?? "",
          productId ?? null,
          baseProjectId ?? null,
          !!createdFromPurchase,
          !!isTemplate,
          String(htmlContent ?? ""),
          String(cssContent ?? ""),
          id,
        ]
      );
      let updated = result.rows[0];
      if (!!isTemplate && updated?.id) {
        await ensureTemplatesTable(client);
        const templateUpsert = await client.query(
          "INSERT INTO templates (id, name, description, version, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, version = EXCLUDED.version, is_active = true, updated_at = NOW() RETURNING id, version",
          [updated.id, updated.name, updated.description ?? "", Number(updated.version ?? 1)]
        );
        const templateVersion = Number(templateUpsert.rows[0]?.version ?? updated.version ?? 1);
        const projectUpdate = await client.query(
          "UPDATE projects SET template_id = $1, template_version = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, version, template_id, template_version, updated_at",
          [updated.id, templateVersion, updated.id]
        );
        updated = projectUpdate.rows[0] ?? updated;
      }
      res.json(updated);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const retry = await client.query(
          "UPDATE projects SET name = $1, description = $2, project_type = $3, sale_price = $4, production_cost = $5, purchase_count = $6, repository = $7, domain = $8, hosting = $9, status = $10, paid = $11, is_public = $12, owner_user_id = $13, product_id = $14, base_project_id = $15, created_from_purchase = $16, is_template = $17, html_content = $18, css_content = $19, version = CASE WHEN $17 THEN COALESCE(version, 1) + 1 ELSE version END, updated_at = NOW() WHERE id = $20 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, version, template_id, template_version, updated_at",
          [
            name,
            description ?? "",
            projectType ?? "",
            salePrice ?? "",
            productionCost ?? "",
            Number.isFinite(Number(purchaseCount)) ? Number(purchaseCount) : 0,
            repository ?? "",
            domain ?? "",
            hosting ?? "",
            status ?? "Ativo",
            !!paid,
            isPublic === undefined ? true : !!isPublic,
            ownerUserId ?? "",
            productId ?? null,
            baseProjectId ?? null,
            !!createdFromPurchase,
            !!isTemplate,
            String(htmlContent ?? ""),
            String(cssContent ?? ""),
            id,
          ]
        );
        let updated = retry.rows[0];
        if (!!isTemplate && updated?.id) {
          await ensureTemplatesTable(client);
          const templateUpsert = await client.query(
            "INSERT INTO templates (id, name, description, version, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, version = EXCLUDED.version, is_active = true, updated_at = NOW() RETURNING id, version",
            [updated.id, updated.name, updated.description ?? "", Number(updated.version ?? 1)]
          );
          const templateVersion = Number(templateUpsert.rows[0]?.version ?? updated.version ?? 1);
          const projectUpdate = await client.query(
            "UPDATE projects SET template_id = $1, template_version = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template, html_content, css_content, version, template_id, template_version, updated_at",
            [updated.id, templateVersion, updated.id]
          );
          updated = projectUpdate.rows[0] ?? updated;
        }
        res.json(updated);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao editar projeto." });
  }
});

app.get("/projects/:id/content", async (req, res) => {
  const { id } = req.params;
  const userId = typeof req.query.userId === "string" ? req.query.userId : null;
  if (!id || !userId) {
    return res.status(400).json({ message: "project id e userId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const project = await loadProjectContentForUser(client, id, userId);
      res.json({
        projectId: project.id,
        htmlContent: project.html_content ?? "",
        cssContent: project.css_content ?? "",
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao carregar conteúdo do projeto." });
  }
});

app.put("/projects/:id/content", async (req, res) => {
  const { id } = req.params;
  const { userId, htmlContent, cssContent } = req.body ?? {};
  if (!id || !userId) {
    return res.status(400).json({ message: "project id e userId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await loadProjectContentForUser(client, id, userId);
      const result = await client.query(
        "UPDATE projects SET html_content = $1, css_content = $2, version = CASE WHEN is_template THEN COALESCE(version, 1) + 1 ELSE version END, updated_at = NOW() WHERE id = $3 RETURNING id, updated_at, version",
        [String(htmlContent ?? ""), String(cssContent ?? ""), id]
      );
      await client.query(
        "UPDATE templates SET version = $1, updated_at = NOW() WHERE id = $2",
        [Number(result.rows[0]?.version ?? 1), id]
      );
      res.json({ projectId: result.rows[0]?.id ?? id, updatedAt: result.rows[0]?.updated_at ?? new Date().toISOString(), version: result.rows[0]?.version ?? 1 });
    } finally {
      client.release();
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    console.error(error);
    res.status(status).json({ message: "Erro ao salvar conteúdo do projeto." });
  }
});

app.get("/projects/:id/files", async (req, res) => {
  const { id } = req.params;
  const userId = typeof req.query.userId === "string" ? req.query.userId : null;
  if (!id || !userId) {
    return res.status(400).json({ message: "project id e userId são obrigatórios." });
  }
  if (!isUuid(id)) {
    return res.status(400).json({ message: "projectId inválido." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await loadProjectContentForUser(client, id, userId);
      await ensureProjectFilesTable(client);
      const result = await client.query(
        "SELECT id, project_id, file_name, file_type, content, storage_path, created_at, updated_at FROM project_files WHERE project_id = $1 ORDER BY created_at ASC",
        [id]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erro ao listar arquivos do projeto.";
    res.status(500).json({ message });
  }
});

app.post("/projects/:id/files", async (req, res) => {
  const { id } = req.params;
  const { userId, fileName, fileType, content } = req.body ?? {};
  if (!id || !userId) {
    return res.status(400).json({ message: "project id e userId são obrigatórios." });
  }
  if (!fileName) {
    return res.status(400).json({ message: "fileName é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await loadProjectContentForUser(client, id, userId);
      await ensureProjectFilesTable(client);
      await ensureUserStorageRoot(userId);
      await ensureProjectStorageFolders(userId, id);
      const storagePath = await saveProjectFileToStorage({
        userId,
        projectId: id,
        fileName,
        fileType,
        content: String(content ?? ""),
      });
      const result = await client.query(
        "INSERT INTO project_files (project_id, file_name, file_type, content, storage_path, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, project_id, file_name, file_type, content, storage_path, created_at, updated_at",
        [id, fileName, fileType ?? "html", content ?? "", storagePath]
      );
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erro ao criar arquivo do projeto.";
    res.status(500).json({ message });
  }
});

app.put("/projects/:id/files/:fileId", async (req, res) => {
  const { id, fileId } = req.params;
  const { userId, fileName, fileType, content } = req.body ?? {};
  if (!id || !userId) {
    return res.status(400).json({ message: "project id e userId são obrigatórios." });
  }
  if (!fileName) {
    return res.status(400).json({ message: "fileName é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await loadProjectContentForUser(client, id, userId);
      await ensureProjectFilesTable(client);
      const current = await client.query(
        "SELECT storage_path FROM project_files WHERE id = $1 AND project_id = $2",
        [fileId, id]
      );
      if (!current.rows[0]) {
        return res.status(404).json({ message: "Arquivo não encontrado." });
      }
      const storagePath = await saveProjectFileToStorage({
        userId,
        projectId: id,
        fileName,
        fileType,
        content: String(content ?? ""),
      });
      const result = await client.query(
        "UPDATE project_files SET file_name = $1, file_type = $2, content = $3, storage_path = $4, updated_at = NOW() WHERE id = $5 AND project_id = $6 RETURNING id, project_id, file_name, file_type, content, storage_path, created_at, updated_at",
        [fileName, fileType ?? "html", content ?? "", storagePath, fileId, id]
      );
      const previousPath = current.rows[0]?.storage_path;
      if (previousPath && previousPath !== storagePath) {
        await deleteProjectFileFromStorage(previousPath);
      }
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erro ao atualizar arquivo do projeto.";
    res.status(500).json({ message });
  }
});

app.delete("/projects/:id/files/:fileId", async (req, res) => {
  const { id, fileId } = req.params;
  const { userId } = req.body ?? {};
  if (!id || !userId) {
    return res.status(400).json({ message: "project id e userId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await loadProjectContentForUser(client, id, userId);
      await ensureProjectFilesTable(client);
      const current = await client.query(
        "SELECT storage_path FROM project_files WHERE id = $1 AND project_id = $2",
        [fileId, id]
      );
      const result = await client.query(
        "DELETE FROM project_files WHERE id = $1 AND project_id = $2 RETURNING id",
        [fileId, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ message: "Arquivo não encontrado." });
      }
      await deleteProjectFileFromStorage(current.rows[0]?.storage_path);
      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erro ao remover arquivo do projeto.";
    res.status(500).json({ message });
  }
});

app.get("/sonarcloud/summary", async (_req, res) => {
  try {
    const config = getSonarConfig();
    const summary = await fetchSonarSummary(config);
    res.json(summary);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    res.status(status).json({ message: "Erro ao buscar resumo do SonarCloud." });
  }
});

app.get("/sonarcloud/issues", async (_req, res) => {
  try {
    const config = getSonarConfig();
    const issues = await fetchSonarIssues(config);
    const withRisk = issues.map((issue) => {
      const risk = classifyRisk(issue);
      return { ...issue, riskLevel: risk.level, riskReason: risk.reason };
    });
    res.json(withRisk);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    res.status(status).json({ message: "Erro ao buscar issues do SonarCloud." });
  }
});


app.post("/hktech-ai/run", async (req, res) => {
  const { adminId } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const startTime = Date.now();
    const pool = await getPool();
    const client = await pool.connect();
    let iaConfig: any = null;
    try {
      await assertAdmin(client, adminId);
      iaConfig = await ensureIaConfig(client);
    } finally {
      client.release();
    }
    const maxTasksPerRun = Number(iaConfig?.maxTasksPerRun ?? 5) || 5;

    const sonarConfig = getSonarConfig();
    const result = await runAutonomousFix({
      sonar: sonarConfig,
      openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
      maxIssues: maxTasksPerRun,
    });
    const summary = await fetchSonarSummary(sonarConfig);
    await logHKTechAiReport({
      issueKeys: result.plan?.issueKeys ?? result.issues.map((issue) => issue.key),
      filesModified: [],
      risk: result.plan?.risk ?? "indefinido",
      prLink: result.prLink,
      qualityGate: summary.qualityGateStatus,
      buildResult: "not_run",
      testResult: "not_run",
      durationMs: Date.now() - startTime,
      confidenceScore: result.confidenceScore,
      status: result.status,
      reason: result.reason,
    });
    res.json({
      ...result,
      qualityGate: summary.qualityGateStatus,
    });
  } catch (error) {
    console.error(error);
    const status = (error as { status?: number }).status ?? 500;
    res.status(status).json({ message: "Erro ao executar HKTECH IA." });
  }
});

app.post("/hktech-ai/simulate", async (req, res) => {
  const { adminId, issueKey } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const startTime = Date.now();
    const pool = await getPool();
    const client = await pool.connect();
    let iaConfig: any = null;
    try {
      await assertAdmin(client, adminId);
      iaConfig = await ensureIaConfig(client);
    } finally {
      client.release();
    }
    const maxTasksPerRun = Number(iaConfig?.maxTasksPerRun ?? 5) || 5;

    const sonarConfig = getSonarConfig();
    const issues = await fetchSonarIssues(sonarConfig);
    const targetIssues = issueKey ? issues.filter((issue) => issue.key === issueKey) : issues;
    const result = await runAutonomousFix({
      sonar: sonarConfig,
      openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
      issues: targetIssues,
      mode: "simulate",
      maxIssues: maxTasksPerRun,
    });
    const summary = await fetchSonarSummary(sonarConfig);
    await logHKTechAiReport({
      issueKeys: result.plan?.issueKeys ?? result.issues.map((issue) => issue.key),
      filesModified: [],
      risk: result.plan?.risk ?? "indefinido",
      qualityGate: summary.qualityGateStatus,
      buildResult: "not_run",
      testResult: "not_run",
      durationMs: Date.now() - startTime,
      confidenceScore: result.confidenceScore,
      status: "simulated",
      reason: result.reason,
    });
    res.json({
      ...result,
      qualityGate: summary.qualityGateStatus,
    });
  } catch (error) {
    console.error(error);
    const status = (error as { status?: number }).status ?? 500;
    res.status(status).json({ message: "Erro ao simular HKTECH IA." });
  }
});

app.post("/hktech-ai/resolve", async (req, res) => {
  const { adminId, issueKeys, maxIssues } = req.body ?? {};
  if (!adminId) {
    return res.status(400).json({ message: "adminId é obrigatório." });
  }
  try {
    const startTime = Date.now();
    const pool = await getPool();
    const client = await pool.connect();
    let iaConfig: any = null;
    try {
      await assertAdmin(client, adminId);
      iaConfig = await ensureIaConfig(client);
    } finally {
      client.release();
    }
    const maxTasksPerRun = Number(iaConfig?.maxTasksPerRun ?? 5) || 5;

    const sonarConfig = getSonarConfig();
    const issues = await fetchSonarIssues(sonarConfig);
    const filtered = Array.isArray(issueKeys) && issueKeys.length > 0
      ? issues.filter((issue) => issueKeys.includes(issue.key))
      : issues;
    const requestedMax = typeof maxIssues === "number" ? maxIssues : maxTasksPerRun;
    const cappedMax = Math.min(requestedMax, maxTasksPerRun);
    const result = await runAutonomousFix({
      sonar: sonarConfig,
      openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
      issues: filtered,
      mode: "resolve",
      maxIssues: cappedMax,
    });
    const summary = await fetchSonarSummary(sonarConfig);
    await logHKTechAiReport({
      issueKeys: result.plan?.issueKeys ?? result.issues.map((issue) => issue.key),
      filesModified: [],
      risk: result.plan?.risk ?? "indefinido",
      qualityGate: summary.qualityGateStatus,
      buildResult: "not_run",
      testResult: "not_run",
      durationMs: Date.now() - startTime,
      confidenceScore: result.confidenceScore,
      status: result.status,
      reason: result.reason,
    });
    res.json({
      ...result,
      qualityGate: summary.qualityGateStatus,
    });
  } catch (error) {
    console.error(error);
    const status = (error as { status?: number }).status ?? 500;
    res.status(status).json({ message: "Erro ao executar resolução HKTECH IA." });
  }
});

app.get("/preview/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const userId = typeof req.query.userId === "string" ? req.query.userId : null;
  if (!projectId || !userId) {
    return res.status(400).json({ message: "projectId e userId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await loadProjectContentForUser(client, projectId, userId);
      await ensureProjectFilesTable(client);
      const result = await client.query(
        "SELECT file_name, file_type, content FROM project_files WHERE project_id = $1 ORDER BY created_at ASC",
        [projectId]
      );
      const html = buildPreviewHtml(result.rows);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const status = (error as { status?: number }).status ?? 500;
    res.status(status).json({ message: "Erro ao gerar preview do projeto." });
  }
});

app.delete("/projects/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await client.query("DELETE FROM projects WHERE id = $1", [id]);
    client.release();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir projeto." });
  }
});

app.get("/costs", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name, cost_value, billing_cycle FROM costs ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureCostsBillingCycleColumn(client);
        const retry = await client.query(
          "SELECT id, name, cost_value, billing_cycle FROM costs ORDER BY created_at DESC"
        );
        res.json(retry.rows);
      } else if (pgError.code === "42P01") {
        res.json([]);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const pgError = error as { code?: string; message?: string };
    res.status(500).json({ message: "Erro ao listar custos.", details: pgError.message });
  }
});

app.post("/costs", async (req, res) => {
  const { name, costValue, billingCycle } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "INSERT INTO costs (name, cost_value, billing_cycle) VALUES ($1, $2, $3) RETURNING id, name, cost_value, billing_cycle",
        [name, costValue ?? "", billingCycle ?? "monthly"]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureCostsBillingCycleColumn(client);
        const retry = await client.query(
          "INSERT INTO costs (name, cost_value, billing_cycle) VALUES ($1, $2, $3) RETURNING id, name, cost_value, billing_cycle",
          [name, costValue ?? "", billingCycle ?? "monthly"]
        );
        res.status(201).json(retry.rows[0]);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar custo." });
  }
});

app.put("/costs/:id", async (req, res) => {
  const { id } = req.params;
  const { name, costValue, billingCycle } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "UPDATE costs SET name = $1, cost_value = $2, billing_cycle = $3 WHERE id = $4 RETURNING id, name, cost_value, billing_cycle",
        [name, costValue ?? "", billingCycle ?? "monthly", id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureCostsBillingCycleColumn(client);
        const retry = await client.query(
          "UPDATE costs SET name = $1, cost_value = $2, billing_cycle = $3 WHERE id = $4 RETURNING id, name, cost_value, billing_cycle",
          [name, costValue ?? "", billingCycle ?? "monthly", id]
        );
        res.json(retry.rows[0]);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const pgError = error as { message?: string };
    res.status(500).json({ message: "Erro ao editar custo.", details: pgError.message });
  }
});

app.delete("/costs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await client.query("DELETE FROM costs WHERE id = $1", [id]);
    client.release();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir custo." });
  }
});

app.get("/sales", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "SELECT id, customer_name, amount, currency, created_at FROM sales ORDER BY created_at DESC"
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar vendas." });
  }
});

app.post("/sales", async (req, res) => {
  const { customerName, amount, currency } = req.body ?? {};
  if (!customerName || amount === undefined || amount === null) {
    return res.status(400).json({ message: "Cliente e valor são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "INSERT INTO sales (customer_name, amount, currency) VALUES ($1, $2, $3) RETURNING id, customer_name, amount, currency, created_at",
      [customerName, amount, currency ?? "BRL"]
    );
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar venda." });
  }
});

app.put("/sales/:id", async (req, res) => {
  const { id } = req.params;
  const { customerName, amount, currency } = req.body ?? {};
  if (!customerName || amount === undefined || amount === null) {
    return res.status(400).json({ message: "Cliente e valor são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "UPDATE sales SET customer_name = $1, amount = $2, currency = $3 WHERE id = $4 RETURNING id, customer_name, amount, currency, created_at",
      [customerName, amount, currency ?? "BRL", id]
    );
    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao editar venda." });
  }
});

app.delete("/sales/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await client.query("DELETE FROM sales WHERE id = $1", [id]);
    client.release();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir venda." });
  }
});

app.get("/accesses", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "SELECT id, source, created_at FROM accesses ORDER BY created_at DESC"
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === "42P01") {
      res.json([]);
      return;
    }
    res.status(500).json({ message: "Erro ao listar acessos.", details: pgError.message });
  }
});

app.post("/accesses", async (req, res) => {
  const { source } = req.body ?? {};
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "INSERT INTO accesses (source) VALUES ($1) RETURNING id, source, created_at",
      [source ?? "web"]
    );
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar acesso." });
  }
});

app.delete("/accesses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await client.query("DELETE FROM accesses WHERE id = $1", [id]);
    client.release();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir acesso." });
  }
});

app.get("/assets", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name, asset_class, ticker, risk_level, current_price, total_supply, available_supply, is_primary, currency, created_at FROM assets ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureAssetsColumns(client);
        const retry = await client.query(
          "SELECT id, name, asset_class, ticker, risk_level, current_price, total_supply, available_supply, is_primary, currency, created_at FROM assets ORDER BY created_at DESC"
        );
        res.json(retry.rows);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar ativos." });
  }
});

app.post("/assets", async (req, res) => {
  const { name, assetClass, ticker, riskLevel, currentPrice, totalSupply, availableSupply, isPrimary, currency } = req.body ?? {};
  if (!name || !assetClass) {
    return res.status(400).json({ message: "Nome e classe do ativo são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "INSERT INTO assets (name, asset_class, ticker, risk_level, current_price, total_supply, available_supply, is_primary, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, asset_class, ticker, risk_level, current_price, total_supply, available_supply, is_primary, currency, created_at",
        [
          name,
          assetClass,
          ticker ?? "",
          riskLevel ?? "Médio",
          currentPrice ?? 0,
          totalSupply ?? 0,
          availableSupply ?? totalSupply ?? 0,
          !!isPrimary,
          currency ?? "BRL",
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureAssetsColumns(client);
        const retry = await client.query(
          "INSERT INTO assets (name, asset_class, ticker, risk_level, current_price, total_supply, available_supply, is_primary, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, asset_class, ticker, risk_level, current_price, total_supply, available_supply, is_primary, currency, created_at",
          [
            name,
            assetClass,
            ticker ?? "",
            riskLevel ?? "Médio",
            currentPrice ?? 0,
            totalSupply ?? 0,
            availableSupply ?? totalSupply ?? 0,
            !!isPrimary,
            currency ?? "BRL",
          ]
        );
        res.status(201).json(retry.rows[0]);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar ativo." });
  }
});

app.get("/funds", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "SELECT id, name, description, management_fee, nav, created_at FROM funds ORDER BY created_at DESC"
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar fundos." });
  }
});

app.post("/funds", async (req, res) => {
  const { name, description, managementFee, nav } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome do fundo é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "INSERT INTO funds (name, description, management_fee, nav) VALUES ($1, $2, $3, $4) RETURNING id, name, description, management_fee, nav, created_at",
      [name, description ?? "", managementFee ?? 0, nav ?? 0]
    );
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar fundo." });
  }
});

app.get("/funds/:id/holdings", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "SELECT fh.id, fh.weight, a.id as asset_id, a.name, a.asset_class, a.ticker, a.current_price, a.currency FROM fund_holdings fh JOIN assets a ON a.id = fh.asset_id WHERE fh.fund_id = $1",
      [id]
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar composição do fundo." });
  }
});

app.get("/wallets", async (req, res) => {
  const userId = (req.query.userId as string) || "default";
  const cpf = (req.query.cpf as string) || "";
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const depositAccount = await getOrCreateDepositAccount(client, userId, cpf);
    const existing = await client.query(
      "SELECT id, user_id, cash_balance, currency, created_at FROM wallets WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    if (existing.rows.length > 0) {
      const wallet = existing.rows[0];
      if (Number(wallet.cash_balance) !== Number(depositAccount.balance)) {
        await client.query("UPDATE wallets SET cash_balance = $1 WHERE id = $2", [depositAccount.balance, wallet.id]);
        wallet.cash_balance = depositAccount.balance;
      }
      client.release();
      return res.json({ ...wallet, cpf: depositAccount.cpf });
    }
    const initialBalance = Number(depositAccount.balance ?? 0);
    const created = await client.query(
      "INSERT INTO wallets (user_id, cash_balance, currency) VALUES ($1, $2, $3) RETURNING id, user_id, cash_balance, currency, created_at",
      [userId, initialBalance, "BRL"]
    );
    client.release();
    res.json({ ...created.rows[0], cpf: depositAccount.cpf });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar carteira." });
  }
});

app.get("/deposit-accounts", async (req, res) => {
  const userId = (req.query.userId as string) || "";
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const account = await getOrCreateDepositAccount(client, userId);
    client.release();
    res.json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar conta depósito." });
  }
});

app.post("/deposit-accounts", async (req, res) => {
  const { userId, cpf } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const account = await getOrCreateDepositAccount(client, userId, cpf);
    client.release();
    res.json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao salvar conta depósito." });
  }
});

app.post("/deposits", async (req, res) => {
  const { userId, amount, method, reference, cpf } = req.body ?? {};
  const value = Number(amount);
  if (!userId || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ message: "userId e amount são obrigatórios." });
  }
  const normalizedMethod = String(method || "pix").toLowerCase();
  const allowedMethods = new Set(["pix", "cartao", "credito", "credit", "card", "crypto", "criptomoeda"]);
  const finalMethod = allowedMethods.has(normalizedMethod) ? normalizedMethod : "pix";
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await client.query("BEGIN");
    const account = await getOrCreateDepositAccount(client, userId, cpf);
    const tx = await client.query(
      "INSERT INTO deposit_transactions (account_id, method, amount, status, reference) VALUES ($1, $2, $3, $4, $5) RETURNING id, account_id, method, amount, status, reference, created_at",
      [account.id, finalMethod, value, "confirmed", reference || ""]
    );
    const updated = await client.query(
      "UPDATE deposit_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING id, user_id, cpf, balance, currency, created_at, updated_at",
      [value, account.id]
    );
    await client.query("COMMIT");
    client.release();
    res.status(201).json({ account: updated.rows[0], transaction: tx.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao registrar depósito." });
  }
});

app.get("/wallets/:walletId/positions", async (req, res) => {
  const { walletId } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "SELECT wp.id, wp.quantity, wp.avg_price, a.id as asset_id, a.name, a.asset_class, a.ticker, a.current_price, a.currency FROM wallet_positions wp JOIN assets a ON a.id = wp.asset_id WHERE wp.wallet_id = $1",
      [walletId]
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar posições." });
  }
});

app.get("/orders", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "SELECT o.id, o.user_id, o.order_type, o.price, o.quantity, o.status, o.created_at, a.name as asset_name, a.ticker FROM orders o JOIN assets a ON a.id = o.asset_id ORDER BY o.created_at DESC"
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar ordens." });
  }
});

app.post("/orders", async (req, res) => {
  const { userId, assetId, orderType, price, quantity } = req.body ?? {};
  if (!userId || !assetId || !orderType) {
    return res.status(400).json({ message: "Usuário, ativo e tipo são obrigatórios." });
  }
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ message: "Quantidade inválida." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureAssetsColumns(client);
      await ensurePriceHistoryTable(client);
      const masterEmail = await getMasterEmail(client);
      if (orderType === "sell" && userId !== masterEmail) {
        return res.status(403).json({ message: "Apenas o detentor pode vender cotas." });
      }
      await client.query("BEGIN");
      const assetRes = await client.query(
        "SELECT id, current_price, available_supply FROM assets WHERE id = $1",
        [assetId]
      );
      if (assetRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Ativo não encontrado." });
      }
      const asset = assetRes.rows[0];
      const execPrice = Number(price ?? asset.current_price ?? 0);
      const cost = execPrice * qty;

      const depositAccount = await getOrCreateDepositAccount(client, userId);
      const walletRes = await client.query(
        "SELECT id, cash_balance FROM wallets WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      let walletId = walletRes.rows[0]?.id as string | undefined;
      let cashBalance = Number(depositAccount.balance ?? 0);
      if (!walletId) {
        const created = await client.query(
          "INSERT INTO wallets (user_id, cash_balance, currency) VALUES ($1, $2, $3) RETURNING id, cash_balance",
          [userId, cashBalance, "BRL"]
        );
        walletId = created.rows[0].id;
      } else if (Number(walletRes.rows[0]?.cash_balance ?? 0) !== cashBalance) {
        await client.query("UPDATE wallets SET cash_balance = $1 WHERE id = $2", [cashBalance, walletId]);
      }

      if (orderType === "buy") {
        if (Number(asset.available_supply ?? 0) < qty) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Oferta insuficiente." });
        }
        if (cashBalance < cost) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Saldo insuficiente." });
        }
        await client.query(
          "UPDATE deposit_accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
          [cost, depositAccount.id]
        );
        await client.query(
          "UPDATE wallets SET cash_balance = cash_balance - $1 WHERE id = $2",
          [cost, walletId]
        );
        await client.query(
          "UPDATE assets SET available_supply = available_supply - $1 WHERE id = $2",
          [qty, assetId]
        );
        const position = await client.query(
          "SELECT id, quantity, avg_price FROM wallet_positions WHERE wallet_id = $1 AND asset_id = $2 LIMIT 1",
          [walletId, assetId]
        );
        if (position.rows.length === 0) {
          await client.query(
            "INSERT INTO wallet_positions (wallet_id, asset_id, quantity, avg_price) VALUES ($1, $2, $3, $4)",
            [walletId, assetId, qty, execPrice]
          );
        } else {
          const prevQty = Number(position.rows[0].quantity ?? 0);
          const prevAvg = Number(position.rows[0].avg_price ?? 0);
          const newQty = prevQty + qty;
          const newAvg = newQty > 0 ? (prevQty * prevAvg + qty * execPrice) / newQty : execPrice;
          await client.query(
            "UPDATE wallet_positions SET quantity = $1, avg_price = $2 WHERE id = $3",
            [newQty, newAvg, position.rows[0].id]
          );
        }
      } else if (orderType === "sell") {
        const position = await client.query(
          "SELECT id, quantity, avg_price FROM wallet_positions WHERE wallet_id = $1 AND asset_id = $2 LIMIT 1",
          [walletId, assetId]
        );
        const prevQty = Number(position.rows[0]?.quantity ?? 0);
        if (prevQty < qty) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Quantidade insuficiente." });
        }
        const newQty = prevQty - qty;
        if (newQty === 0) {
          await client.query("DELETE FROM wallet_positions WHERE id = $1", [position.rows[0].id]);
        } else {
          await client.query(
            "UPDATE wallet_positions SET quantity = $1 WHERE id = $2",
            [newQty, position.rows[0].id]
          );
        }
        await client.query(
          "UPDATE assets SET available_supply = available_supply + $1 WHERE id = $2",
          [qty, assetId]
        );
        await client.query(
          "UPDATE deposit_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
          [cost, depositAccount.id]
        );
        await client.query(
          "UPDATE wallets SET cash_balance = cash_balance + $1 WHERE id = $2",
          [cost, walletId]
        );
      } else {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Tipo de ordem inválido." });
      }

      const result = await client.query(
        "INSERT INTO orders (user_id, asset_id, order_type, price, quantity, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, asset_id, order_type, price, quantity, status, created_at",
        [userId, assetId, orderType, execPrice, qty, "filled"]
      );
      await client.query(
        "INSERT INTO price_history (asset_id, price, recorded_at) VALUES ($1, $2, CURRENT_DATE) ON CONFLICT DO NOTHING",
        [assetId, execPrice]
      );
      await client.query("COMMIT");
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar ordem." });
  }
});

app.get("/price-history", async (req, res) => {
  const assetId = req.query.assetId as string | undefined;
  const days = Number(req.query.days ?? 14);
  if (!assetId) {
    return res.status(400).json({ message: "assetId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await ensurePriceHistoryTable(client);
    const result = await client.query(
      "SELECT price, recorded_at FROM price_history WHERE asset_id = $1 ORDER BY recorded_at DESC LIMIT $2",
      [assetId, Number.isFinite(days) ? days : 14]
    );
    client.release();
    res.json(result.rows.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar histórico de preço." });
  }
});

app.get("/settings/master", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const masterEmail = await getMasterEmail(client);
    client.release();
    res.json({ value: masterEmail });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar master_email." });
  }
});

app.get("/users", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await ensureUsersTable(client);
    const result = await client.query(
      "SELECT id, auth_uid, name, email, photo_url, auth_provider, permission_level, status, created_at, last_login_at FROM users ORDER BY created_at DESC"
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar usuários." });
  }
});

app.get("/users/lookup", async (req, res) => {
  const email = String(req.query.email || "").toLowerCase();
  if (!email) {
    return res.status(400).json({ message: "Email é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await ensureUsersTable(client);
    const result = await client.query(
      "SELECT id, auth_uid, name, email, photo_url, auth_provider, permission_level, status, created_at, last_login_at FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [email]
    );
    client.release();
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar usuário." });
  }
});

app.post("/users", async (req, res) => {
  const { authUid, name, email, photoUrl, authProvider, permissionLevel, status } = req.body ?? {};
  const normalizedEmail = String(email || "").toLowerCase();
  if (!normalizedEmail) {
    return res.status(400).json({ message: "Email é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await ensureUsersTable(client);
    const masterEmail = await getMasterEmail(client);
    const effectivePermission = normalizedEmail === masterEmail.toLowerCase()
      ? "B"
      : (permissionLevel || undefined);

    const result = await client.query(
      `INSERT INTO users (auth_uid, name, email, photo_url, auth_provider, permission_level, status, last_login_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'A'), COALESCE($7, 'Ativo'), NOW())
       ON CONFLICT (email) DO UPDATE SET
         auth_uid = COALESCE(EXCLUDED.auth_uid, users.auth_uid),
         name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
         photo_url = COALESCE(NULLIF(EXCLUDED.photo_url, ''), users.photo_url),
         auth_provider = COALESCE(NULLIF(EXCLUDED.auth_provider, ''), users.auth_provider),
         permission_level = COALESCE($6, users.permission_level),
         status = COALESCE($7, users.status),
         last_login_at = NOW()
       RETURNING id, auth_uid, name, email, photo_url, auth_provider, permission_level, status, created_at, last_login_at`,
      [authUid || "", name || "", normalizedEmail, photoUrl || "", authProvider || "", effectivePermission || null, status || null]
    );
    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao salvar usuário." });
  }
});

app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, photoUrl, authProvider, permissionLevel, status } = req.body ?? {};
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await ensureUsersTable(client);
    const masterEmail = await getMasterEmail(client);
    const normalizedEmail = email ? String(email).toLowerCase() : undefined;
    const effectivePermission = normalizedEmail && normalizedEmail === masterEmail.toLowerCase()
      ? "B"
      : permissionLevel;
    const result = await client.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        photo_url = COALESCE($3, photo_url),
        auth_provider = COALESCE($4, auth_provider),
        permission_level = COALESCE($5, permission_level),
        status = COALESCE($6, status)
       WHERE id = $7
       RETURNING id, auth_uid, name, email, photo_url, auth_provider, permission_level, status, created_at, last_login_at`,
      [name || null, normalizedEmail || null, photoUrl || null, authProvider || null, effectivePermission || null, status || null, id]
    );
    client.release();
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar usuário." });
  }
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const client = await pool.connect();
    await ensureUsersTable(client);
    const result = await client.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    client.release();
    if (!result.rows[0]) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir usuário." });
  }
});

app.get("/dao/proposals", async (_req, res) => {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureDaoTables(client);
    const result = await client.query(
      "SELECT id, title, description, created_by_user_id, status, created_at, approved_by_admin_id, voting_start, voting_end FROM dao_proposals WHERE status IN ('APPROVED','VOTING','CLOSED') ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao buscar propostas DAO", details: errorMsg });
  } finally {
    client.release();
  }
});

app.post("/dao/proposals", async (req, res) => {
  const { title, description, createdByUserId } = req.body || {};
  if (!title || !description || !createdByUserId) {
    return res.status(400).json({ error: "Dados inválidos para criar proposta." });
  }
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureDaoTables(client);
    const result = await client.query(
      "INSERT INTO dao_proposals (title, description, created_by_user_id, status) VALUES ($1, $2, $3, 'PENDING_REVIEW') RETURNING id, title, description, created_by_user_id, status, created_at, approved_by_admin_id, voting_start, voting_end",
      [title, description, createdByUserId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao criar proposta DAO", details: errorMsg });
  } finally {
    client.release();
  }
});

app.post("/dao/vote", async (req, res) => {
  const { proposalId, userId, myBotId, vote, amountBet } = req.body || {};
  if (!proposalId || !userId || !myBotId || !vote || !amountBet || Number(amountBet) <= 0) {
    return res.status(400).json({ error: "Dados inválidos para votar." });
  }
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureDaoTables(client);
    await client.query("BEGIN");
    const proposal = await client.query("SELECT status FROM dao_proposals WHERE id = $1", [proposalId]);
    if (!proposal.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Proposta não encontrada." });
    }
    if (proposal.rows[0].status !== 'VOTING') {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Proposta não está em votação." });
    }

    let balanceRow = await client.query("SELECT balance FROM dao_mybot_balances WHERE mybot_id = $1", [myBotId]);
    if (!balanceRow.rows[0]) {
      await client.query(
        "INSERT INTO dao_mybot_balances (mybot_id, user_id, balance) VALUES ($1, $2, $3)",
        [myBotId, userId, 1000]
      );
      balanceRow = await client.query("SELECT balance FROM dao_mybot_balances WHERE mybot_id = $1", [myBotId]);
    }
    const balance = Number(balanceRow.rows[0].balance);
    if (balance < Number(amountBet)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Saldo insuficiente no MyBot." });
    }

    await client.query(
      "UPDATE dao_mybot_balances SET balance = balance - $1, updated_at = NOW() WHERE mybot_id = $2",
      [amountBet, myBotId]
    );

    const voteResult = await client.query(
      "INSERT INTO dao_votes (proposal_id, user_id, mybot_id, vote, amount_bet) VALUES ($1, $2, $3, $4, $5) RETURNING id, proposal_id, user_id, mybot_id, vote, amount_bet, created_at",
      [proposalId, userId, myBotId, vote, amountBet]
    );

    await client.query("COMMIT");
    res.json(voteResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao registrar voto DAO", details: errorMsg });
  } finally {
    client.release();
  }
});

app.get("/dao/mybot", async (req, res) => {
  const userId = String(req.query.userId || '').toLowerCase();
  if (!userId) return res.status(400).json({ error: "userId inválido." });
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureMyBotTables(client);
    await ensureDaoTables(client);
    const card = await client.query(
      "SELECT id FROM user_cards WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    if (!card.rows[0]) return res.status(404).json({ error: "MyBot não encontrado." });
    const myBotId = card.rows[0].id as string;
    let balanceRow = await client.query("SELECT balance FROM dao_mybot_balances WHERE mybot_id = $1", [myBotId]);
    if (!balanceRow.rows[0]) {
      await client.query(
        "INSERT INTO dao_mybot_balances (mybot_id, user_id, balance) VALUES ($1, $2, $3)",
        [myBotId, userId, 1000]
      );
      balanceRow = await client.query("SELECT balance FROM dao_mybot_balances WHERE mybot_id = $1", [myBotId]);
    }
    res.json({ myBotId, balance: Number(balanceRow.rows[0].balance) });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao buscar MyBot DAO", details: errorMsg });
  } finally {
    client.release();
  }
});

app.get("/dao/admin/proposals", async (_req, res) => {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureDaoTables(client);
    const result = await client.query(
      "SELECT id, title, description, created_by_user_id, status, created_at, approved_by_admin_id, voting_start, voting_end FROM dao_proposals ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao buscar propostas DAO (admin)", details: errorMsg });
  } finally {
    client.release();
  }
});

app.post("/dao/admin/review", async (req, res) => {
  const { id, approved, adminId } = req.body || {};
  if (!id || typeof approved !== 'boolean' || !adminId) {
    return res.status(400).json({ error: "Dados inválidos para revisão." });
  }
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureDaoTables(client);
    const status = approved ? 'APPROVED' : 'REJECTED';
    const result = await client.query(
      "UPDATE dao_proposals SET status = $1, approved_by_admin_id = $2 WHERE id = $3 RETURNING id, title, description, created_by_user_id, status, created_at, approved_by_admin_id, voting_start, voting_end",
      [status, adminId, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json(result.rows[0]);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao revisar proposta DAO", details: errorMsg });
  } finally {
    client.release();
  }
});

app.post("/dao/admin/publish", async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "ID inválido." });
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureDaoTables(client);
    const result = await client.query(
      "UPDATE dao_proposals SET status = 'VOTING', voting_start = NOW() WHERE id = $1 AND status = 'APPROVED' RETURNING id, title, description, created_by_user_id, status, created_at, approved_by_admin_id, voting_start, voting_end",
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Proposta não encontrada ou não aprovada." });
    res.json(result.rows[0]);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao publicar proposta DAO", details: errorMsg });
  } finally {
    client.release();
  }
});

app.post("/dao/admin/close", async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "ID inválido." });
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureDaoTables(client);
    const result = await client.query(
      "UPDATE dao_proposals SET status = 'CLOSED', voting_end = NOW() WHERE id = $1 AND status = 'VOTING' RETURNING id, title, description, created_by_user_id, status, created_at, approved_by_admin_id, voting_start, voting_end",
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Proposta não encontrada ou não está em votação." });
    res.json(result.rows[0]);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao encerrar proposta DAO", details: errorMsg });
  } finally {
    client.release();
  }
});

app.get("/mybots", async (req, res) => {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await ensureMyBotTables(client);
    // Atualiza image_url dos bots existentes se estiver vazia
    await client.query(`
      UPDATE mybots SET image_url = (
        SELECT image_url FROM user_cards WHERE user_cards.user_id = mybots.user_id LIMIT 1
      ) WHERE (image_url IS NULL OR image_url = '')
    `);
        const result = await client.query(
       `SELECT m.user_id, m.myalien_user_id, m.stage, m.stage_reason, m.image_url, m.created_at, m.updated_at,
            c.attributes, c.rarity, c.market_value
          FROM mybots m
          LEFT JOIN user_cards c ON c.user_id = m.user_id
          ORDER BY m.created_at DESC`
        );
    res.json(result.rows);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Erro ao buscar MyBots", details: errorMsg });
  } finally {
    client.release();
  }
});

export const api = onRequest(
  {
    secrets: [
      "SONARCLOUD_TOKEN",
      "SONARCLOUD_PROJECT_KEY",
      "SONARCLOUD_ORG",
      "OPENAI_API_KEY",
      "GITHUB_API_TOKEN",
    ],
  },
  app
);
