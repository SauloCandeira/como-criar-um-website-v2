import fs from "fs";
import path from "path";
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

const targetDir = path.join(__dirname, "..", "ai-prompts-local");

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

const run = async () => {
  const url = `${API_BASE}/ia/prompts/export?adminId=${encodeURIComponent(ADMIN_ID)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  zip.extractAllTo(targetDir, true);
  console.log(`Prompts downloaded to ${targetDir}`);
};

run().catch((error) => {
  console.error("IA pull failed:", error);
  process.exit(1);
});
