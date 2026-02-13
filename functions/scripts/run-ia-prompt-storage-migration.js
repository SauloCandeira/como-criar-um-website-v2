const fs = require("fs");
const path = require("path");
const { Connector, IpAddressTypes } = require("@google-cloud/cloud-sql-connector");
const { Pool } = require("pg");

function loadEnv(filePath) {
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
}

loadEnv(path.join(__dirname, "..", ".env"));
loadEnv(path.join(__dirname, "..", "..", ".env"));

async function run() {
  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS;
  const dbName = process.env.DB_NAME;

  if (!instanceConnectionName || !dbUser || !dbPass || !dbName) {
    throw new Error("Missing Cloud SQL env vars (INSTANCE_CONNECTION_NAME, DB_USER, DB_PASS, DB_NAME).");
  }

  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "prisma",
    "migrations",
    "20260212_ia_prompt_cloud_storage",
    "migration.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
  });

  const pool = new Pool({
    ...clientOpts,
    user: dbUser,
    password: dbPass,
    database: dbName,
  });

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("IA prompt storage migration applied successfully.");
  } finally {
    client.release();
    await pool.end();
    await connector.close();
  }
}

run().catch((error) => {
  console.error("IA prompt storage migration failed:", error);
  process.exit(1);
});
