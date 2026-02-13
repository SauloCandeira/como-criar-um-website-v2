const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execSync } = require("node:child_process");

const SONAR_TOKEN = process.env.SONARCLOUD_TOKEN || "";
const SONAR_PROJECT = process.env.SONARCLOUD_PROJECT_KEY || "";
const SONAR_ORG = process.env.SONARCLOUD_ORG || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || "main";

const RESTRICTED_PATHS = [
  "prisma/schema.prisma",
  "firebase.json",
  "storage.rules",
  "firestore.rules",
  "functions/src/index.ts",
  "src/lib/init-firebase.tsx",
  "src/lib/init-firebase.ts",
  "db/migrations",
  "functions/src/migrations",
  "secrets/",
];

const log = (msg) => process.stdout.write(`${msg}\n`);

const sonarAuthHeader = (token) => {
  const encoded = Buffer.from(`${token}:`).toString("base64");
  return `Basic ${encoded}`;
};

const isRestrictedPath = (filePath) => RESTRICTED_PATHS.some((entry) => filePath.includes(entry));

const fetchJson = async (url, headers) => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
};

const fetchSonarIssues = async () => {
  if (!SONAR_TOKEN || !SONAR_PROJECT) {
    return [];
  }
  const url = new URL("https://sonarcloud.io/api/issues/search");
  url.searchParams.set("componentKeys", SONAR_PROJECT);
  url.searchParams.set("severities", "MAJOR,CRITICAL");
  url.searchParams.set("types", "BUG,VULNERABILITY");
  url.searchParams.set("ps", "20");
  if (SONAR_ORG) url.searchParams.set("organization", SONAR_ORG);
  const json = await fetchJson(url.toString(), { Authorization: sonarAuthHeader(SONAR_TOKEN) });
  return json.issues || [];
};

const extractIssuePath = (component) => {
  if (!component) return null;
  const parts = component.split(":");
  if (parts.length < 2) return null;
  return parts.slice(1).join(":");
};

const generatePatch = async (issue, filePath, content) => {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ausente");
  const body = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Você é um assistente de correção mínima. Retorne somente um patch unified diff. Não refatore, não altere contratos, não adicione dependências.",
      },
      {
        role: "user",
        content: `Issue: ${issue.key}\n${issue.message}\nArquivo: ${filePath}\nConteúdo:\n${content}`,
      },
    ],
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Falha ao gerar patch");
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || "";
};

const applyPatch = (patch) => {
  const tmpFile = path.join(os.tmpdir(), `hktech-ai-${Date.now()}.patch`);
  fs.writeFileSync(tmpFile, patch);
  execSync(`git apply --whitespace=nowarn "${tmpFile}"`, { stdio: "inherit" });
  fs.unlinkSync(tmpFile);
};

const run = async () => {
  const currentBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
  if (currentBranch.startsWith("autofix/")) {
    log("Já em branch autofix. Abortando.");
    return;
  }

  const issues = await fetchSonarIssues();
  if (issues.length === 0) {
    log("Nenhuma issue encontrada.");
    return;
  }

  const branchName = `autofix/${new Date().toISOString().replace(/[:.]/g, "-")}`;
  execSync(`git checkout -b ${branchName}`, { stdio: "inherit" });

  for (const issue of issues) {
    const filePath = extractIssuePath(issue.component);
    if (!filePath || isRestrictedPath(filePath)) {
      log(`Bloqueado: ${filePath || "(sem path)"}`);
      continue;
    }
    if (!fs.existsSync(filePath)) {
      log(`Arquivo não encontrado: ${filePath}`);
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    const patch = await generatePatch(issue, filePath, content);
    if (!patch) continue;
    if (RESTRICTED_PATHS.some((entry) => patch.includes(entry))) {
      log(`Patch bloqueado por path restrito: ${filePath}`);
      continue;
    }
    applyPatch(patch);
  }

  const status = execSync("git status --porcelain").toString().trim();
  if (!status) {
    log("Sem alterações aplicáveis.");
    return;
  }

  execSync("npm run build", { stdio: "inherit" });
  execSync("npm run test --if-present", { stdio: "inherit" });

  execSync("git add -A", { stdio: "inherit" });
  execSync("git commit -m \"chore: hktech autofix\"", { stdio: "inherit" });

  if (GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY;
    execSync(`git push https://x-access-token:${GITHUB_TOKEN}@github.com/${repo}.git ${branchName}`, { stdio: "inherit" });

    const prBody = {
      title: `HKTECH Autofix ${new Date().toISOString()}`,
      head: branchName,
      base: BASE_BRANCH,
      body: "Autofix gerado automaticamente pelo HKTECH IA.",
    };
    await fetch(`https://api.github.com/repos/${repo}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "hktech-ai",
      },
      body: JSON.stringify(prBody),
    });
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
