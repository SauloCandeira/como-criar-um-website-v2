const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
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

const safeName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "orchestrator";

async function run() {
  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS;
  const dbName = process.env.DB_NAME;
  if (!instanceConnectionName || !dbUser || !dbPass || !dbName) {
    throw new Error("Missing Cloud SQL env vars.");
  }

  let projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || "";
  if (!projectId) {
    const rcPath = path.join(__dirname, "..", "..", ".firebaserc");
    if (fs.existsSync(rcPath)) {
      try {
        const rc = JSON.parse(fs.readFileSync(rcPath, "utf8"));
        projectId = rc?.projects?.default || "";
      } catch (error) {
        console.error("Falha ao ler .firebaserc:", error);
      }
    }
  }
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : undefined);
  admin.initializeApp(bucketName ? { storageBucket: bucketName } : undefined);
  const bucket = bucketName ? admin.storage().bucket(bucketName) : admin.storage().bucket();

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
    const hasColumn = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'ia_orchestrators' AND column_name = 'supreme_prompt'"
    );
    if (!hasColumn.rows[0]) {
      console.log("Column supreme_prompt not found. Nothing to migrate.");
      return;
    }

    const rows = await client.query(
      "SELECT id, name, version, supreme_prompt, storage_url FROM ia_orchestrators WHERE COALESCE(storage_url, '') = ''"
    );

    for (const row of rows.rows) {
      const content = String(row.supreme_prompt || "").trim();
      if (!content) {
        console.log(`Skip ${row.id} (empty prompt).`);
        continue;
      }
      const storagePath = `ia/orchestrators/${safeName(row.name)}.v${row.version || 1}.md`;
      await bucket.file(storagePath).save(content, { contentType: "text/markdown" });
      const storageUrl = `gs://${bucket.name}/${storagePath}`;
      await client.query("UPDATE ia_orchestrators SET storage_url = $1 WHERE id = $2", [storageUrl, row.id]);
      console.log(`Migrated orchestrator ${row.name} -> ${storageUrl}`);
    }
  } finally {
    client.release();
    await pool.end();
    await connector.close();
  }
}

run().catch((error) => {
  console.error("Orchestrator storage migration failed:", error);
  process.exit(1);
});
