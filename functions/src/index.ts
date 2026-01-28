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
    const result = await client.query("SELECT id, name, price, description FROM products ORDER BY created_at DESC");
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar produtos." });
  }
});

app.post("/products", async (req, res) => {
  const { name, price, description } = req.body ?? {};
  if (!name || !price) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "INSERT INTO products (name, price, description) VALUES ($1, $2, $3) RETURNING id, name, price, description",
      [name, price, description ?? ""]
    );
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar produto." });
  }
});

app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, description } = req.body ?? {};
  if (!name || !price) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "UPDATE products SET name = $1, price = $2, description = $3 WHERE id = $4 RETURNING id, name, price, description",
      [name, price, description ?? "", id]
    );
    client.release();
    res.json(result.rows[0]);
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
    const result = await client.query(
      "SELECT id, name, description, repository, domain, hosting, status, paid, is_public FROM projects ORDER BY created_at DESC"
    );
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar projetos." });
  }
});

app.post("/projects", async (req, res) => {
  const { name, description, repository, domain, hosting, status, paid, isPublic } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "INSERT INTO projects (name, description, repository, domain, hosting, status, paid, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, description, repository, domain, hosting, status, paid, is_public",
      [
        name,
        description ?? "",
        repository ?? "",
        domain ?? "",
        hosting ?? "",
        status ?? "Ativo",
        !!paid,
        isPublic === undefined ? true : !!isPublic,
      ]
    );
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar projeto." });
  }
});

app.put("/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, repository, domain, hosting, status, paid, isPublic } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const result = await client.query(
      "UPDATE projects SET name = $1, description = $2, repository = $3, domain = $4, hosting = $5, status = $6, paid = $7, is_public = $8 WHERE id = $9 RETURNING id, name, description, repository, domain, hosting, status, paid, is_public",
      [
        name,
        description ?? "",
        repository ?? "",
        domain ?? "",
        hosting ?? "",
        status ?? "Ativo",
        !!paid,
        isPublic === undefined ? true : !!isPublic,
        id,
      ]
    );
    client.release();
    res.json(result.rows[0]);
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

export const api = onRequest(app);
