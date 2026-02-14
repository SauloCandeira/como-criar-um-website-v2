// Cost guard for prompt ingestion script
const { Pool } = require('pg');

const MAX_DAILY_COST_USD = parseFloat(process.env.MAX_DAILY_COST_USD || '1.0');

class BudgetExceededError extends Error {
  constructor(costToday, maxBudget) {
    super('Daily AI budget exceeded');
    this.costToday = costToday;
    this.maxBudget = maxBudget;
    this.name = 'BudgetExceededError';
  }
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 1
});

async function enforceDailyBudgetOrThrow() {
  let client;
  try {
    client = await pool.connect();
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
    if (client) client.release();
  }
}

module.exports = { enforceDailyBudgetOrThrow, BudgetExceededError };
