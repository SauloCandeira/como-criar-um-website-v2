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

const CATEGORY_RULES = [
  { match: "orchestrator", category: "orchestrator" },
  { match: "context", category: "system" },
  { match: "architecture", category: "architecture" },
  { match: "security", category: "security" },
  { match: "workflow", category: "workflow" },
  { match: "bootstrap", category: "bootstrap" },
  { match: "mybot", category: "mybot" },
];

const inferCategory = (filename) => {
  const lower = filename.toLowerCase();
  const rule = CATEGORY_RULES.find((entry) => lower.includes(entry.match));
  return rule?.category ?? "governance";
};

const toTitle = (filename) => {
  const base = filename.replace(/\.md$/i, "");
  return base
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const scanPrompts = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanPrompts(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
};

async function embedText(content) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return null;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: content }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const embedding = json?.data?.[0]?.embedding;
  return Array.isArray(embedding) ? embedding : null;
}

const toVectorLiteral = (embedding) => `[${embedding.join(",")}]`;

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

  const promptsDir = path.join(__dirname, "..", "..", "src", "prompts");
  if (!fs.existsSync(promptsDir)) {
    console.log("Prompts folder not found. Nothing to ingest.");
    return;
  }
  const files = scanPrompts(promptsDir);

  const client = await pool.connect();
  try {
    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const content = fs.readFileSync(filePath, "utf8");
      const category = inferCategory(fileName);
      const title = toTitle(fileName);

      const existing = await client.query(
        "SELECT id, version, storage_url FROM ia_prompts WHERE file_name = $1 LIMIT 1",
        [fileName]
      );

      let promptId = existing.rows[0]?.id;
      const currentVersion = existing.rows[0]?.version ? Number(existing.rows[0].version) : 1;
      const storagePath = `ia/prompts/${category}/${fileName}`;

      if (existing.rows[0]?.storage_url) {
        console.log(`Skip ${fileName} (já existe).`);
        continue;
      }

      await bucket.file(storagePath).save(content, { contentType: "text/markdown" });
      const storageUrl = `gs://${bucket.name}/${storagePath}`;
      const versionedPath = `ia/prompts/${category}/${fileName.replace(/\.md$/i, "")}.v${currentVersion}.md`;
      await bucket.file(versionedPath).save(content, { contentType: "text/markdown" });
      const versionedUrl = `gs://${bucket.name}/${versionedPath}`;

      if (!promptId) {
        const insert = await client.query(
          "INSERT INTO ia_prompts (title, file_name, category, description, storage_url, is_active, version, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW()) RETURNING id",
          [title, fileName, category, "", storageUrl, currentVersion]
        );
        promptId = insert.rows[0]?.id;
      } else {
        await client.query(
          "UPDATE ia_prompts SET title = $1, category = $2, storage_url = $3, version = $4, updated_at = NOW() WHERE id = $5",
          [title, category, storageUrl, currentVersion, promptId]
        );
      }

      const versionExists = await client.query(
        "SELECT 1 FROM ia_prompt_versions WHERE prompt_id = $1 AND version = $2 LIMIT 1",
        [promptId, currentVersion]
      );
      if (!versionExists.rows[0]) {
        await client.query(
          "INSERT INTO ia_prompt_versions (prompt_id, version, storage_url, created_at) VALUES ($1, $2, $3, NOW())",
          [promptId, currentVersion, versionedUrl]
        );
      }

      const embedding = await embedText(content);
      if (embedding) {
        await client.query(
          "INSERT INTO ia_memory (prompt_id, content, embedding, context_type, created_at) VALUES ($1, $2, $3::vector, $4, NOW())",
          [promptId, content, toVectorLiteral(embedding), "prompt"]
        );
      }

      console.log(`Ingested ${fileName} -> v${currentVersion}`);
    }
  } finally {
    client.release();
    await pool.end();
    await connector.close();
  }
}

run().catch((error) => {
  console.error("Prompt ingestion failed:", error);
  process.exit(1);
});
