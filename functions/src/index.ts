import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

const DEPLOY_VERSION = "2026-01-28-4";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

let pool: Pool | null = null;
let connector: Connector | null = null;

async function ensureCostsBillingCycleColumn(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query("ALTER TABLE costs ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'");
}

async function ensureProductsColumns(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price TEXT DEFAULT ''");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price TEXT DEFAULT ''");
}

async function ensureProjectsColumns(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS sale_price TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_cost TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0");
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
        "SELECT id, name, price, description, show_on_home, purchase_price, sale_price FROM products ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        const retry = await client.query(
          "SELECT id, name, price, description, show_on_home, purchase_price, sale_price FROM products ORDER BY created_at DESC"
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
    res.status(500).json({ message: "Erro ao listar produtos." });
  }
});

app.post("/products", async (req, res) => {
  const { name, price, description, showOnHome, purchasePrice, salePrice } = req.body ?? {};
  if (!name || !price) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const finalSalePrice = salePrice ?? price;
    try {
      const result = await client.query(
        "INSERT INTO products (name, price, description, show_on_home, purchase_price, sale_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, price, description, show_on_home, purchase_price, sale_price",
        [name, finalSalePrice, description ?? "", !!showOnHome, purchasePrice ?? "", finalSalePrice]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        const retry = await client.query(
          "INSERT INTO products (name, price, description, show_on_home, purchase_price, sale_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, price, description, show_on_home, purchase_price, sale_price",
          [name, finalSalePrice, description ?? "", !!showOnHome, purchasePrice ?? "", finalSalePrice]
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
  const { name, price, description, showOnHome, purchasePrice, salePrice } = req.body ?? {};
  if (!name || !price) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const finalSalePrice = salePrice ?? price;
    try {
      const result = await client.query(
        "UPDATE products SET name = $1, price = $2, description = $3, show_on_home = $4, purchase_price = $5, sale_price = $6 WHERE id = $7 RETURNING id, name, price, description, show_on_home, purchase_price, sale_price",
        [name, finalSalePrice, description ?? "", !!showOnHome, purchasePrice ?? "", finalSalePrice, id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        const retry = await client.query(
          "UPDATE products SET name = $1, price = $2, description = $3, show_on_home = $4, purchase_price = $5, sale_price = $6 WHERE id = $7 RETURNING id, name, price, description, show_on_home, purchase_price, sale_price",
          [name, finalSalePrice, description ?? "", !!showOnHome, purchasePrice ?? "", finalSalePrice, id]
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

app.get("/projects", async (_req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public FROM projects ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const retry = await client.query(
          "SELECT id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public FROM projects ORDER BY created_at DESC"
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

app.post("/projects", async (req, res) => {
  const { name, description, projectType, salePrice, productionCost, purchaseCount, repository, domain, hosting, status, paid, isPublic } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public",
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
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const retry = await client.query(
          "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public",
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
    res.status(500).json({ message: "Erro ao criar projeto." });
  }
});

app.put("/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, projectType, salePrice, productionCost, purchaseCount, repository, domain, hosting, status, paid, isPublic } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "UPDATE projects SET name = $1, description = $2, project_type = $3, sale_price = $4, production_cost = $5, purchase_count = $6, repository = $7, domain = $8, hosting = $9, status = $10, paid = $11, is_public = $12 WHERE id = $13 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public",
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
          id,
        ]
      );
      res.json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const retry = await client.query(
          "UPDATE projects SET name = $1, description = $2, project_type = $3, sale_price = $4, production_cost = $5, purchase_count = $6, repository = $7, domain = $8, hosting = $9, status = $10, paid = $11, is_public = $12 WHERE id = $13 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public",
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
            id,
          ]
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
    res.status(500).json({ message: "Erro ao editar projeto." });
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

export const api = onRequest(app);
