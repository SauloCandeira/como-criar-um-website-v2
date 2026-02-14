import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { calculateCostUsd } from "../config/llmPricing";
import { defineString, defineSecret } from "firebase-functions/params";

const DATABASE_URL = defineString("DATABASE_URL", { default: "" });
const INSTANCE_CONNECTION_NAME = defineString("INSTANCE_CONNECTION_NAME", { default: "" });
const DB_USER = defineString("DB_USER", { default: "" });
const DB_PASS = defineSecret("DB_PASS");
const DB_NAME = defineString("DB_NAME", { default: "" });

export type TelemetrySource = "admin" | "api" | "internal";

export type LlmTelemetryInput = {
  userId?: string | null;
  agent?: string | null;
  model: string;
  provider: string;
  endpoint: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
  status: string;
  source?: TelemetrySource;
  latencyMs?: number | null;
  client?: { query: (sql: string, params?: any[]) => Promise<any> };
};

let telemetryPool: Pool | null = null;
let telemetryConnector: Connector | null = null;

async function buildTelemetryPool() {
  if (telemetryPool) return telemetryPool;

  const instanceConnectionName = INSTANCE_CONNECTION_NAME.value();
  const dbUser = DB_USER.value();
  const dbPass = DB_PASS.value();
  const dbName = DB_NAME.value();
  if (!instanceConnectionName || !dbUser || !dbPass || !dbName) {
    return null;
  }

  telemetryConnector = telemetryConnector || new Connector();
  const clientOpts = await telemetryConnector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC
  });
  telemetryPool = new Pool({
    ...clientOpts,
    user: dbUser,
    password: dbPass,
    database: dbName
  });
  return telemetryPool;
}

export async function ensureLlmTelemetryTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS llm_telemetry (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT, agent TEXT, model TEXT NOT NULL, provider TEXT NOT NULL, endpoint TEXT NOT NULL, prompt_tokens INT NOT NULL DEFAULT 0, completion_tokens INT NOT NULL DEFAULT 0, total_tokens INT NOT NULL DEFAULT 0, cost_usd NUMERIC(14,6) NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'ok', source TEXT NOT NULL DEFAULT 'api', latency_ms INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("CREATE INDEX IF NOT EXISTS llm_telemetry_created_at_idx ON llm_telemetry (created_at)");
  await client.query("CREATE INDEX IF NOT EXISTS llm_telemetry_model_idx ON llm_telemetry (model)");
  await client.query("CREATE INDEX IF NOT EXISTS llm_telemetry_agent_idx ON llm_telemetry (agent)");
}

export async function recordLlmTelemetry(input: LlmTelemetryInput) {
  try {
    const costUsd = input.costUsd ?? calculateCostUsd({
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens
    });

    const targetClient = input.client ?? null;
    const pool = targetClient ? null : await buildTelemetryPool();
    const client = targetClient ?? (pool ? await pool.connect() : null);
    if (!client) return;

    try {
      await ensureLlmTelemetryTable(client);
      await client.query(
        "INSERT INTO llm_telemetry (user_id, agent, model, provider, endpoint, prompt_tokens, completion_tokens, total_tokens, cost_usd, status, source, latency_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
        [
          input.userId ?? null,
          input.agent ?? null,
          input.model,
          input.provider,
          input.endpoint,
          input.promptTokens ?? 0,
          input.completionTokens ?? 0,
          input.totalTokens ?? 0,
          costUsd,
          input.status,
          input.source ?? "api",
          input.latencyMs ?? 0
        ]
      );
    } finally {
      if (!targetClient && client && (client as any).release) {
        (client as any).release();
      }
    }
  } catch (error) {
    return;
  }
}

export async function getDailyUsage(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureLlmTelemetryTable(client);
  const result = await client.query(
    "SELECT COALESCE(SUM(cost_usd), 0)::numeric AS total_cost, COALESCE(SUM(total_tokens), 0)::int AS total_tokens FROM llm_telemetry WHERE created_at >= date_trunc('day', NOW())"
  );
  return {
    total_cost_today: Number(result.rows[0]?.total_cost ?? 0),
    tokens_today: Number(result.rows[0]?.total_tokens ?? 0)
  };
}

export async function getMonthlyCost(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureLlmTelemetryTable(client);
  const result = await client.query(
    "SELECT COALESCE(SUM(cost_usd), 0)::numeric AS total_cost FROM llm_telemetry WHERE created_at >= date_trunc('month', NOW())"
  );
  return {
    total_cost_month: Number(result.rows[0]?.total_cost ?? 0)
  };
}

export async function getTelemetryBreakdown(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureLlmTelemetryTable(client);
  const byModel = await client.query(
    "SELECT model, COALESCE(SUM(total_tokens), 0)::int AS tokens, COALESCE(SUM(cost_usd), 0)::numeric AS cost FROM llm_telemetry WHERE created_at >= date_trunc('day', NOW()) GROUP BY model"
  );
  const byAgent = await client.query(
    "SELECT agent, COALESCE(SUM(total_tokens), 0)::int AS tokens, COALESCE(SUM(cost_usd), 0)::numeric AS cost FROM llm_telemetry WHERE created_at >= date_trunc('day', NOW()) GROUP BY agent"
  );
  const recent = await client.query(
    "SELECT id, user_id, agent, model, provider, endpoint, total_tokens, cost_usd, status, source, created_at FROM llm_telemetry ORDER BY created_at DESC LIMIT 20"
  );

  return {
    usage_by_model: byModel.rows,
    usage_by_agent: byAgent.rows,
    recent_operations: recent.rows
  };
}

export async function getLlmTelemetrySummary(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  const daily = await getDailyUsage(client);
  const monthly = await getMonthlyCost(client);
  const breakdown = await getTelemetryBreakdown(client);
  return {
    ...daily,
    ...monthly,
    ...breakdown
  };
}
