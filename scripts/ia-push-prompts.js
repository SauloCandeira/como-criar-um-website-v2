import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadEnv = (filePath) => {
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
};

loadEnv(path.join(__dirname, "..", ".env"));

const API_BASE = process.env.IA_API_BASE || process.env.VITE_API_BASE || "";
const ADMIN_ID = process.env.IA_ADMIN_ID || process.env.ADMIN_ID || "";

if (!API_BASE || !ADMIN_ID) {
  console.error("Missing IA_API_BASE or IA_ADMIN_ID in .env");
  process.exit(1);
}

const localDir = path.join(__dirname, "..", "ai-prompts-local");
if (!fs.existsSync(localDir)) {
  console.error("Local prompts folder not found: ai-prompts-local");
  process.exit(1);
}

const hashFile = (filePath) => {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
};

const collectFiles = (dir) => {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
};

const run = async () => {
  const files = collectFiles(localDir);
  if (files.length === 0) {
    console.log("No prompt files to push.");
    return;
  }

  const zip = new AdmZip();
  for (const file of files) {
    const rel = path.relative(localDir, file).replace(/\\/g, "/");
    zip.addFile(rel, fs.readFileSync(file));
  }

  const buffer = zip.toBuffer();
  const form = new FormData();
  form.append("adminId", ADMIN_ID);
  form.append("zip", new Blob([buffer]), "prompts.zip");

  const res = await fetch(`${API_BASE}/ia/prompts/import`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Import failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  console.log("Import summary:", json);
};

run().catch((error) => {
  console.error("IA push failed:", error);
  process.exit(1);
});
