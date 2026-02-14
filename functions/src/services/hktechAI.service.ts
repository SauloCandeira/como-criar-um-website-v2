import { recordLlmTelemetry } from "./llmTelemetry.service";
import { enforceDailyBudgetOrThrow, BudgetExceededError } from "./costGuard.service";

type FetchLike = (input: string, init?: any) => Promise<any>;

export type SonarIssue = {
  key: string;
  rule: string;
  severity: "MINOR" | "MAJOR" | "CRITICAL" | "BLOCKER";
  type: "BUG" | "VULNERABILITY" | "CODE_SMELL" | string;
  message: string;
  component: string;
  line?: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  riskReason?: string;
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type SonarSummary = {
  projectKey: string;
  qualityGateStatus: string;
  metrics: {
    bugs: number;
    vulnerabilities: number;
    codeSmells: number;
    duplicatedLinesDensity: string;
    coverage: string;
  };
};

export type FixPlan = {
  issueKeys: string[];
  risk: "low" | "medium" | "high";
  steps: string[];
};

export type AutofixResult = {
  status: "blocked" | "planned";
  reason?: string;
  issues: SonarIssue[];
  plan: FixPlan | null;
  branchName?: string;
  prLink?: string;
  confidenceScore?: number;
};

export type SonarConfig = {
  token: string;
  organization?: string;
  projectKey: string;
};

export type OpenAiConfig = {
  apiKey: string;
  model?: string;
};

export const RESTRICTED_PATHS = [
  "prisma/schema.prisma",
  "functions/.env",
  "functions/.env.local",
  "firebase.json",
  "storage.rules",
  "firestore.rules",
  "functions/src/index.ts",
  "functions/src/lib",
  "src/lib/init-firebase.tsx",
  "src/lib/init-firebase.ts",
  "src/lib",
  "src/pages/Login",
  "src/pages/Signup",
  "src/pages/Account",
  "src/services/auth",
  "src/dao",
  "db/migrations",
  "db/",
  "functions/src/migrations",
  "secrets/",
];

export const isRestrictedPath = (path: string) =>
  RESTRICTED_PATHS.some((restricted) => path.includes(restricted));

const HIGH_RISK_KEYWORDS = ["prisma", "auth", "identity", "firebase", "env", "migrations"];
const MEDIUM_RISK_HINTS = ["regex", "regular expression", "conditional", "precedence", "refactor", "restructure"];
const LOW_RISK_HINTS = ["null", "undefined", "await", "unused", "duplicate", "no effect"];

const extractComponentPath = (component: string) => {
  if (!component) return "";
  const parts = component.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : component;
};

export function classifyRisk(issue: SonarIssue): { level: RiskLevel; reason: string } {
  const componentPath = extractComponentPath(issue.component || "").toLowerCase();
  if (HIGH_RISK_KEYWORDS.some((keyword) => componentPath.includes(keyword))) {
    return { level: "HIGH", reason: "Sensitive path" };
  }

  const message = (issue.message || "").toLowerCase();
  if (LOW_RISK_HINTS.some((hint) => message.includes(hint))) {
    return { level: "LOW", reason: "Safe guardrail fix" };
  }
  if (MEDIUM_RISK_HINTS.some((hint) => message.includes(hint))) {
    return { level: "MEDIUM", reason: "Logic adjustment" };
  }
  return { level: "MEDIUM", reason: "Default medium" };
}

export function computeConfidenceScore(params: {
  testsPassed?: boolean;
  buildPassed?: boolean;
  riskLevel?: RiskLevel;
  scopeSize?: number;
  sonarImproved?: boolean;
}) {
  const testsScore = params.testsPassed ? 30 : 0;
  const buildScore = params.buildPassed ? 30 : 0;
  const riskScore = params.riskLevel === "LOW" ? 20 : params.riskLevel === "MEDIUM" ? 10 : 0;
  const scopeScore = params.scopeSize && params.scopeSize <= 5 ? 10 : params.scopeSize && params.scopeSize <= 20 ? 5 : 0;
  const sonarScore = params.sonarImproved ? 10 : 0;
  return testsScore + buildScore + riskScore + scopeScore + sonarScore;
}

export function filterIssuesForAutoResolve(issues: SonarIssue[], maxIssues: number) {
  const eligible = issues.filter((issue) => (issue.riskLevel ?? classifyRisk(issue).level) !== "HIGH");
  return eligible.slice(0, maxIssues);
}

const sonarAuthHeader = (token: string) => {
  const encoded = Buffer.from(`${token}:`).toString("base64");
  return `Basic ${encoded}`;
};

const asNumber = (value: string | undefined) => {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function fetchSonarSummary(config: SonarConfig, fetchImpl: FetchLike = fetch as FetchLike): Promise<SonarSummary> {
  const { token, organization, projectKey } = config;
  if (!token || !projectKey) {
    throw new Error("Configuração SonarCloud inválida.");
  }
  const baseUrl = "https://sonarcloud.io/api";
  const qualityUrl = new URL(`${baseUrl}/qualitygates/project_status`);
  qualityUrl.searchParams.set("projectKey", projectKey);
  if (organization) qualityUrl.searchParams.set("organization", organization);

  const measuresUrl = new URL(`${baseUrl}/measures/component`);
  measuresUrl.searchParams.set("component", projectKey);
  measuresUrl.searchParams.set("metricKeys", "bugs,vulnerabilities,code_smells,duplicated_lines_density,coverage");
  if (organization) measuresUrl.searchParams.set("organization", organization);

  const headers = { Authorization: sonarAuthHeader(token) };
  const [qualityRes, measuresRes] = await Promise.all([
    fetchImpl(qualityUrl.toString(), { headers }),
    fetchImpl(measuresUrl.toString(), { headers }),
  ]);

  if (!qualityRes.ok) throw new Error("Falha ao buscar Quality Gate.");
  if (!measuresRes.ok) throw new Error("Falha ao buscar métricas.");

  const qualityJson = await qualityRes.json();
  const measuresJson = await measuresRes.json();
  const measures = measuresJson?.component?.measures ?? [];
  const metricMap: Record<string, string> = {};
  for (const metric of measures) {
    metricMap[metric.metric] = metric.value;
  }

  return {
    projectKey,
    qualityGateStatus: qualityJson?.projectStatus?.status ?? "UNKNOWN",
    metrics: {
      bugs: asNumber(metricMap.bugs),
      vulnerabilities: asNumber(metricMap.vulnerabilities),
      codeSmells: asNumber(metricMap.code_smells),
      duplicatedLinesDensity: metricMap.duplicated_lines_density ?? "0",
      coverage: metricMap.coverage ?? "0",
    },
  };
}

export async function fetchSonarIssues(config: SonarConfig, fetchImpl: FetchLike = fetch as FetchLike): Promise<SonarIssue[]> {
  const { token, organization, projectKey } = config;
  if (!token || !projectKey) {
    throw new Error("Configuração SonarCloud inválida.");
  }
  const url = new URL("https://sonarcloud.io/api/issues/search");
  url.searchParams.set("componentKeys", projectKey);
  url.searchParams.set("severities", "MAJOR,CRITICAL");
  url.searchParams.set("types", "BUG,VULNERABILITY");
  url.searchParams.set("ps", "100");
  if (organization) url.searchParams.set("organization", organization);

  const res = await fetchImpl(url.toString(), { headers: { Authorization: sonarAuthHeader(token) } });
  if (!res.ok) throw new Error("Falha ao buscar issues no SonarCloud.");
  const json = await res.json();
  return (json?.issues ?? []).map((issue: any) => ({
    key: issue.key,
    rule: issue.rule,
    severity: issue.severity,
    type: issue.type,
    message: issue.message,
    component: issue.component,
    line: issue.line,
  }));
}

export function buildFixPlan(issues: SonarIssue[]): FixPlan {
  const issueKeys = issues.map((issue) => issue.key);
  const risk: FixPlan["risk"] = issues.some((issue) => issue.severity === "CRITICAL") ? "high" : "medium";
  const steps = [
    "Revisar contexto do arquivo afetado.",
    "Aplicar correção mínima e segura.",
    "Validar restrições de paths e contratos.",
  ];
  return { issueKeys, risk, steps };
}

export function validatePatchAgainstRestrictions(patch: string): { ok: boolean; blockedPaths: string[] } {
  const blocked = RESTRICTED_PATHS.filter((path) => patch.includes(path));
  return { ok: blocked.length === 0, blockedPaths: blocked };
}

export async function generatePatch(
  config: OpenAiConfig,
  params: { issue: SonarIssue; filePath: string; fileContent: string },
  fetchImpl: FetchLike = fetch as FetchLike
): Promise<string> {
  try {
    await enforceDailyBudgetOrThrow();
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      // Block LLM call if budget exceeded
      throw Object.assign(new Error("AI daily budget exceeded"), { status: 429 });
    }
    throw err;
  }
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY ausente.");
  }
  const body = {
    model: config.model ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Você é um assistente de correção mínima. Não refatore, não altere contratos, não adicione dependências. Retorne apenas um patch unified diff.",
      },
      {
        role: "user",
        content: `Issue: ${params.issue.key}\n${params.issue.message}\nArquivo: ${params.filePath}\nConteúdo:\n${params.fileContent}`,
      },
    ],
  };

  const startedAt = Date.now();
  const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    // LLM TELEMETRY HOOK POINT
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await recordLlmTelemetry({
      userId: null,
      source: "internal",
      agent: "sonar-autofix",
      model: body.model,
      provider: "openai",
      endpoint: "sonar.generate_patch",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      status: "error",
      latencyMs: Date.now() - startedAt
    });
    throw new Error("Falha ao gerar patch via OpenAI.");
  }
  const json = await res.json();
  const usage = json?.usage;
  const promptTokens = Number(usage?.prompt_tokens ?? 0);
  const completionTokens = Number(usage?.completion_tokens ?? 0);
  const totalTokens = Number(usage?.total_tokens ?? promptTokens + completionTokens);
  await recordLlmTelemetry({
    userId: null,
    source: "internal",
    agent: "sonar-autofix",
    model: body.model,
    provider: "openai",
    endpoint: "sonar.generate_patch",
    promptTokens,
    completionTokens,
    totalTokens,
    status: "ok",
    latencyMs: Date.now() - startedAt
  });
  return json?.choices?.[0]?.message?.content ?? "";
}

export async function runAutonomousFix(params: {
  sonar: SonarConfig;
  openai?: OpenAiConfig;
  fetchImpl?: FetchLike;
  issues?: SonarIssue[];
  mode?: "simulate" | "resolve";
  maxIssues?: number;
}): Promise<AutofixResult> {
  const fetched = params.issues ?? await fetchSonarIssues(params.sonar, params.fetchImpl ?? (fetch as FetchLike));
  const riskTagged = fetched.map((issue) => {
    const risk = classifyRisk(issue);
    return { ...issue, riskLevel: risk.level, riskReason: risk.reason };
  });
  const limited = params.maxIssues ? filterIssuesForAutoResolve(riskTagged, params.maxIssues) : riskTagged;
  const plan = limited.length ? buildFixPlan(limited) : null;
  const confidenceScore = computeConfidenceScore({
    testsPassed: false,
    buildPassed: false,
    riskLevel: limited[0]?.riskLevel ?? "MEDIUM",
    scopeSize: limited.length,
    sonarImproved: false,
  });
  return {
    status: "blocked",
    reason: params.mode === "simulate" ? "SIMULATION_REQUIRES_CI_RUNNER" : "AUTOFIX_REQUIRES_CI_RUNNER",
    issues: limited,
    plan,
    confidenceScore,
  };
}
