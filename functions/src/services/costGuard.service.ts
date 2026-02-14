
import { Pool } from 'pg';
import { defineString, defineSecret } from 'firebase-functions/params';

const DATABASE_URL = defineString('DATABASE_URL', { default: '' });
const INSTANCE_CONNECTION_NAME = defineString('INSTANCE_CONNECTION_NAME', { default: '' });
const DB_USER = defineString('DB_USER', { default: '' });
const DB_PASS = defineSecret('DB_PASS');
const DB_NAME = defineString('DB_NAME', { default: '' });
const MAX_DAILY_COST_USD_PARAM = defineString('MAX_DAILY_COST_USD', { default: '1.0' });

function getMaxDailyCost() {
  // Runtime-safe param access
  const val = MAX_DAILY_COST_USD_PARAM.value();
  return val ? parseFloat(val) : 1.0;
}

export class BudgetExceededError extends Error {
  public costToday: number;
  public maxBudget: number;
  constructor(costToday: number, maxBudget: number) {
    super('Daily AI budget exceeded');
    this.costToday = costToday;
    this.maxBudget = maxBudget;
    this.name = 'BudgetExceededError';
  }
}


let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    // All param.value() calls are inside this function (runtime-safe)
    pool = new Pool({
      user: DB_USER.value() || undefined,
      password: DB_PASS.value() || undefined,
      database: DB_NAME.value() || undefined,
      host: undefined, // Use DATABASE_URL or connector if needed
      port: undefined, // Use DATABASE_URL or connector if needed
      max: 1,
      connectionString: DATABASE_URL.value() || undefined,
    });
  }
  return pool;
}

export async function enforceDailyBudgetOrThrow(): Promise<void> {
  let client: any;
  const MAX_DAILY_COST_USD = getMaxDailyCost();
  try {
    client = await getPool().connect();
    const q = `SELECT SUM(cost_usd) AS total FROM llm_telemetry WHERE DATE(timestamp) = CURRENT_DATE`;
    const { rows } = await client.query(q);
    const total = parseFloat(rows[0].total || 0);
    if (isNaN(total)) throw new Error('telemetry_query_failed');
    if (total >= MAX_DAILY_COST_USD) {
      throw new BudgetExceededError(total, MAX_DAILY_COST_USD);
    }
  } catch (e) {
    // Fail-safe: block all LLM calls on telemetry failure
    throw new BudgetExceededError(0, MAX_DAILY_COST_USD);
  } finally {
    if (client && typeof client.release === 'function') client.release();
  }
}
