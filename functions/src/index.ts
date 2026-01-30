import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import crypto from "crypto";

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
  await ensureProductTypesTable(client);
  await ensureProductTypeConstraint(client);
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'digital'");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price TEXT DEFAULT ''");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price TEXT DEFAULT ''");
}

async function ensureProductTypesTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS product_types (id TEXT PRIMARY KEY, label TEXT NOT NULL)"
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["digital", "Produto digital"]
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["fisico", "Produto físico"]
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["servico", "Serviço"]
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["assinatura", "Assinatura"]
  );
  await client.query(
    "INSERT INTO product_types (id, label) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    ["projeto", "Projeto"]
  );
}

async function ensureProductTypeConstraint(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_fkey') THEN ALTER TABLE products ADD CONSTRAINT products_product_type_fkey FOREIGN KEY (product_type) REFERENCES product_types(id); END IF; END $$;"
  );
}

async function ensureDefaultProduct(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureProductsColumns(client);
  await client.query(
    "INSERT INTO products (name, price, description, show_on_home, purchase_price, sale_price) SELECT $1, $2, $3, $4, $5, $6 WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = $1)",
    [
      "Landing Page Institucional",
      "999,00",
      "Landing page institucional pronta para publicação",
      true,
      "0,00",
      "0,00",
    ]
  );
}

async function ensureProjectsColumns(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await ensureProjectsTable(client);
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS sale_price TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_cost TEXT DEFAULT ''");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0");
  await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_user_id TEXT DEFAULT ''");
}

async function ensureProjectsTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS projects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT DEFAULT '', project_type TEXT DEFAULT '', sale_price TEXT DEFAULT '', production_cost TEXT DEFAULT '', purchase_count INTEGER DEFAULT 0, repository TEXT DEFAULT '', domain TEXT DEFAULT '', hosting TEXT DEFAULT '', status TEXT DEFAULT 'Ativo', paid BOOLEAN DEFAULT false, is_public BOOLEAN DEFAULT true, owner_user_id TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensurePurchasesTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS purchases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, product_id UUID REFERENCES products(id) ON DELETE CASCADE, price NUMERIC(12,2) DEFAULT 0, status TEXT DEFAULT 'completed', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensureUserGamificationTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS user_gamification (user_id TEXT PRIMARY KEY, plan TEXT DEFAULT 'free', usage_score INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensureUserCardsTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS user_cards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL UNIQUE, seed BIGINT NOT NULL, hash_seed TEXT NOT NULL, name TEXT NOT NULL, species TEXT NOT NULL, class TEXT NOT NULL, rarity TEXT NOT NULL, attributes JSONB NOT NULL, visual_meta JSONB NOT NULL DEFAULT '{}'::jsonb, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query("ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS hash_seed TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS visual_meta JSONB NOT NULL DEFAULT '{}'::jsonb");
}

async function ensureInternalAccountsTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS internal_accounts (user_id TEXT PRIMARY KEY, balance NUMERIC(14,2) DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS internal_transactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), from_user_id TEXT, to_user_id TEXT, amount NUMERIC(14,2) NOT NULL, reason TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensureCardMarketplaceTables(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS card_listings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), card_id UUID REFERENCES user_cards(id) ON DELETE CASCADE, seller_user_id TEXT NOT NULL, price NUMERIC(12,2) NOT NULL, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
  await client.query(
    "CREATE TABLE IF NOT EXISTS card_transactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), card_id UUID REFERENCES user_cards(id) ON DELETE SET NULL, seller_user_id TEXT NOT NULL, buyer_user_id TEXT NOT NULL, price NUMERIC(12,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function ensureCommerceOrdersTable(client: { query: (sql: string, params?: any[]) => Promise<any> }) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS commerce_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, item_type TEXT NOT NULL, item_id TEXT NOT NULL, amount NUMERIC(12,2) DEFAULT 0, currency TEXT DEFAULT 'BRL', status TEXT DEFAULT 'completed', payment_method TEXT DEFAULT 'pix', payment_reference TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

function inferProjectType(name: string) {
  const label = name.toLowerCase();
  if (label.includes("landing")) return "Landingpage";
  if (label.includes("e-commerce") || label.includes("ecommerce")) return "E-commerce";
  return "Marketplace";
}

const CARD_SPECIES = ["Zyphor", "Orionid", "Nebulon", "Vortexian", "Aetheri", "Krylon", "Lunari"];
const CARD_CLASSES = ["Explorador", "Guardião", "Tecnomante", "Cronista", "Batedor", "Alquimista"];
const NAME_PREFIX = ["Xen", "Kael", "Zor", "Lum", "Ar", "Nyx", "Vex", "Sol"];
const NAME_SUFFIX = ["ar", "ion", "yx", "a", "os", "en", "is", "or"];

const VISUAL_PALETTES = [
  { primary: "#38bdf8", secondary: "#0f172a", accent: "#22d3ee" },
  { primary: "#22c55e", secondary: "#052e16", accent: "#86efac" },
  { primary: "#f97316", secondary: "#1f2937", accent: "#fdba74" },
  { primary: "#a855f7", secondary: "#1e1b4b", accent: "#c4b5fd" },
  { primary: "#14b8a6", secondary: "#0f172a", accent: "#5eead4" },
];

const RARITY_MULTIPLIER: Record<string, number> = {
  comum: 1.0,
  raro: 1.4,
  epico: 1.9,
  lendario: 2.6,
};

function normalizeCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
}

function hashCpfUser(cpf: string, userId: string) {
  const normalized = normalizeCpf(cpf);
  if (normalized.length !== 11) {
    throw new Error("CPF inválido.");
  }
  const hash = crypto.createHash("sha256").update(`${normalized}|${userId}`).digest("hex");
  return hash;
}

function seedFromHash(hash: string) {
  const slice = hash.slice(0, 16);
  return Number(BigInt(`0x${slice}`) % BigInt(2 ** 31 - 1));
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function planMultiplier(plan: string) {
  if (plan === "enterprise") return 1.2;
  if (plan === "pro") return 1.1;
  return 1.0;
}

function calculateRarity(score: number, rng: () => number) {
  const jitter = rng() * 6;
  const finalScore = score + jitter;
  if (finalScore >= 130) return "lendario";
  if (finalScore >= 115) return "epico";
  if (finalScore >= 95) return "raro";
  return "comum";
}

function generateVisualMeta(seed: number) {
  const rng = mulberry32(seed);
  const palette = VISUAL_PALETTES[Math.floor(rng() * VISUAL_PALETTES.length)];
  return {
    palette,
    pattern: Math.floor(rng() * 6),
    eyes: Math.floor(rng() * 5),
    horns: Math.floor(rng() * 4),
    glow: rng() > 0.65,
  };
}

function computeMarketValue(attributes: { strength: number; speed: number; intelligence: number; endurance: number }, rarity: string) {
  const base = 10;
  const avg = (attributes.strength + attributes.speed + attributes.intelligence + attributes.endurance) / 4;
  const rarityBoost = RARITY_MULTIPLIER[rarity] ?? 1.0;
  const attributeBoost = 0.8 + Math.min(0.6, avg / 150);
  return Number((base * rarityBoost * attributeBoost).toFixed(2));
}

function generateAlienSvg(name: string, rarity: string, visualMeta: any) {
  const palette = visualMeta?.palette ?? VISUAL_PALETTES[0];
  const glow = visualMeta?.glow ? `filter="url(#glow)"` : "";
  const patternId = `pattern-${visualMeta?.pattern ?? 0}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.secondary}" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <radialGradient id="core" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${palette.primary}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${palette.secondary}" stop-opacity="0.9" />
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="12" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <pattern id="pattern-0" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="3" fill="${palette.accent}" fill-opacity="0.35" />
    </pattern>
    <pattern id="pattern-1" width="48" height="48" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="48" height="48" fill="${palette.secondary}" />
      <path d="M0 0 L48 48 M48 0 L0 48" stroke="${palette.accent}" stroke-opacity="0.25" />
    </pattern>
    <pattern id="pattern-2" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="18" r="9" fill="${palette.accent}" fill-opacity="0.25" />
    </pattern>
    <pattern id="pattern-3" width="60" height="60" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="60" height="60" fill="${palette.secondary}" />
      <circle cx="30" cy="30" r="12" fill="${palette.accent}" fill-opacity="0.3" />
    </pattern>
    <pattern id="pattern-4" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M0 25 L50 25" stroke="${palette.accent}" stroke-opacity="0.2" />
      <path d="M25 0 L25 50" stroke="${palette.accent}" stroke-opacity="0.2" />
    </pattern>
    <pattern id="pattern-5" width="42" height="42" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="32" r="4" fill="${palette.accent}" fill-opacity="0.3" />
      <circle cx="32" cy="10" r="4" fill="${palette.accent}" fill-opacity="0.3" />
    </pattern>
  </defs>
  <rect width="480" height="640" rx="32" fill="url(#bg)" />
  <rect x="32" y="48" width="416" height="480" rx="28" fill="url(#${patternId})" opacity="0.5" />
  <g ${glow}>
    <ellipse cx="240" cy="260" rx="120" ry="150" fill="url(#core)" />
    <ellipse cx="200" cy="240" rx="22" ry="30" fill="${palette.accent}" />
    <ellipse cx="280" cy="240" rx="22" ry="30" fill="${palette.accent}" />
    <circle cx="200" cy="245" r="8" fill="#0f172a" />
    <circle cx="280" cy="245" r="8" fill="#0f172a" />
    <path d="M210 300 Q240 320 270 300" stroke="${palette.accent}" stroke-width="8" fill="none" stroke-linecap="round" />
  </g>
  <text x="50%" y="560" text-anchor="middle" fill="#e2e8f0" font-size="24" font-family="'Segoe UI', sans-serif">${name}</text>
  <text x="50%" y="592" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="'Segoe UI', sans-serif">${rarity.toUpperCase()}</text>
</svg>`;
}

async function ensureAlienImage(userId: string, name: string, rarity: string, visualMeta: any) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(`aliens/${userId}.svg`);
  const svg = generateAlienSvg(name, rarity, visualMeta);
  await file.save(svg, { contentType: "image/svg+xml", resumable: false, public: true });
  try {
    await file.makePublic();
    return file.publicUrl();
  } catch (error) {
    console.warn("Falha ao tornar imagem pública", error);
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: "01-01-2036",
    });
    return signedUrl;
  }
}

function generateCardProfile(seed: number, context: { accountAgeDays: number; usageScore: number; plan: string; level: number }) {
  const rng = mulberry32(seed);
  const species = CARD_SPECIES[Math.floor(rng() * CARD_SPECIES.length)];
  const className = CARD_CLASSES[Math.floor(rng() * CARD_CLASSES.length)];
  const name = `${NAME_PREFIX[Math.floor(rng() * NAME_PREFIX.length)]}${NAME_SUFFIX[Math.floor(rng() * NAME_SUFFIX.length)]}`;

  const ageBonus = clamp(Math.floor(context.accountAgeDays / 30) * 2, 0, 20);
  const usageBonus = clamp(Math.floor(context.usageScore / 10), 0, 25);
  const multiplier = planMultiplier(context.plan);
  const levelBonus = clamp(Math.floor(context.level / 5), 0, 10);

  const base = () => 40 + Math.floor(rng() * 40);
  const strength = clamp(Math.round((base() + ageBonus + usageBonus + levelBonus) * multiplier), 1, 99);
  const speed = clamp(Math.round((base() + ageBonus + usageBonus + levelBonus) * multiplier), 1, 99);
  const intelligence = clamp(Math.round((base() + ageBonus + usageBonus + levelBonus) * multiplier), 1, 99);
  const endurance = clamp(Math.round((base() + ageBonus + usageBonus + levelBonus) * multiplier), 1, 99);

  const avgScore = (strength + speed + intelligence + endurance) / 4 + usageBonus + ageBonus + levelBonus;
  const rarity = calculateRarity(avgScore, rng);

  return {
    name,
    species,
    className,
    rarity,
    attributes: { strength, speed, intelligence, endurance },
  };
}

async function getOrCreateGamification(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureUserGamificationTable(client);
  const existing = await client.query(
    "SELECT user_id, plan, usage_score, xp, created_at, updated_at FROM user_gamification WHERE user_id = $1",
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];
  const created = await client.query(
    "INSERT INTO user_gamification (user_id, plan, usage_score, xp) VALUES ($1, $2, $3, $4) RETURNING user_id, plan, usage_score, xp, created_at, updated_at",
    [userId, "free", 0, 0]
  );
  return created.rows[0];
}

async function getUserCreatedAt(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureUsersTable(client);
  const result = await client.query("SELECT created_at FROM users WHERE email = $1 OR id::text = $1 LIMIT 1", [userId]);
  return result.rows[0]?.created_at ? new Date(result.rows[0].created_at) : null;
}

async function getOrCreateInternalAccount(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureInternalAccountsTable(client);
  const existing = await client.query(
    "SELECT user_id, balance, updated_at FROM internal_accounts WHERE user_id = $1",
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];
  const created = await client.query(
    "INSERT INTO internal_accounts (user_id, balance) VALUES ($1, $2) RETURNING user_id, balance, updated_at",
    [userId, 0]
  );
  return created.rows[0];
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

async function hasPixConfirmation(client: { query: (sql: string, params?: any[]) => Promise<any> }, userId: string) {
  await ensureDepositTables(client);
  const result = await client.query(
    "SELECT dt.id FROM deposit_transactions dt JOIN deposit_accounts da ON da.id = dt.account_id WHERE da.user_id = $1 AND dt.status = 'confirmed' AND dt.method = 'pix' AND dt.amount >= 1 ORDER BY dt.created_at DESC LIMIT 1",
    [userId]
  );
  return !!result.rows[0];
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
      await ensureDefaultProduct(client);
      const result = await client.query(
        "SELECT id, name, price, description, product_type, show_on_home, purchase_price, sale_price FROM products ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        await ensureDefaultProduct(client);
        const retry = await client.query(
          "SELECT id, name, price, description, product_type, show_on_home, purchase_price, sale_price FROM products ORDER BY created_at DESC"
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
  const { name, price, description, showOnHome, purchasePrice, salePrice, productType } = req.body ?? {};
  if (!name || !price) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const finalSalePrice = salePrice ?? price;
    try {
      const result = await client.query(
        "INSERT INTO products (name, price, description, product_type, show_on_home, purchase_price, sale_price) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, price, description, product_type, show_on_home, purchase_price, sale_price",
        [name, finalSalePrice, description ?? "", productType ?? "digital", !!showOnHome, purchasePrice ?? "", finalSalePrice]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        const retry = await client.query(
          "INSERT INTO products (name, price, description, product_type, show_on_home, purchase_price, sale_price) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, price, description, product_type, show_on_home, purchase_price, sale_price",
          [name, finalSalePrice, description ?? "", productType ?? "digital", !!showOnHome, purchasePrice ?? "", finalSalePrice]
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
  const { name, price, description, showOnHome, purchasePrice, salePrice, productType } = req.body ?? {};
  if (!name || !price) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    const finalSalePrice = salePrice ?? price;
    try {
      const result = await client.query(
        "UPDATE products SET name = $1, price = $2, description = $3, product_type = $4, show_on_home = $5, purchase_price = $6, sale_price = $7 WHERE id = $8 RETURNING id, name, price, description, product_type, show_on_home, purchase_price, sale_price",
        [name, finalSalePrice, description ?? "", productType ?? "digital", !!showOnHome, purchasePrice ?? "", finalSalePrice, id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProductsColumns(client);
        const retry = await client.query(
          "UPDATE products SET name = $1, price = $2, description = $3, product_type = $4, show_on_home = $5, purchase_price = $6, sale_price = $7 WHERE id = $8 RETURNING id, name, price, description, product_type, show_on_home, purchase_price, sale_price",
          [name, finalSalePrice, description ?? "", productType ?? "digital", !!showOnHome, purchasePrice ?? "", finalSalePrice, id]
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

app.get("/purchases", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : null;
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensurePurchasesTable(client);
      const result = await client.query(
        userId
          ? "SELECT pu.id, pu.user_id, pu.product_id, pu.price, pu.status, pu.created_at, pr.name as product_name, pr.description as product_description, pr.sale_price, pr.purchase_price FROM purchases pu JOIN products pr ON pr.id = pu.product_id WHERE pu.user_id = $1 ORDER BY pu.created_at DESC"
          : "SELECT pu.id, pu.user_id, pu.product_id, pu.price, pu.status, pu.created_at, pr.name as product_name, pr.description as product_description, pr.sale_price, pr.purchase_price FROM purchases pu JOIN products pr ON pr.id = pu.product_id ORDER BY pu.created_at DESC",
        userId ? [userId] : []
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar compras." });
  }
});

app.get("/commerce-orders", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : null;
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureCommerceOrdersTable(client);
      const result = await client.query(
        userId
          ? "SELECT id, user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference, created_at FROM commerce_orders WHERE user_id = $1 ORDER BY created_at DESC"
          : "SELECT id, user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference, created_at FROM commerce_orders ORDER BY created_at DESC",
        userId ? [userId] : []
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar compras gerais." });
  }
});

app.post("/commerce-orders", async (req, res) => {
  const { userId, itemType, itemId, amount, currency, status, paymentMethod, paymentReference } = req.body ?? {};
  if (!userId || !itemType || !itemId) {
    return res.status(400).json({ message: "userId, itemType e itemId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureCommerceOrdersTable(client);
      const result = await client.query(
        "INSERT INTO commerce_orders (user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference, created_at",
        [
          userId,
          itemType,
          itemId,
          Number(amount) || 0,
          currency ?? "BRL",
          status ?? "completed",
          paymentMethod ?? "pix",
          paymentReference ?? "",
        ]
      );
      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao registrar compra geral." });
  }
});

app.post("/purchases", async (req, res) => {
  const { userId, productId } = req.body ?? {};
  if (!userId || !productId) {
    return res.status(400).json({ message: "userId e productId são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureProductsColumns(client);
      await ensurePurchasesTable(client);
      await ensureProjectsColumns(client);

      const productResult = await client.query(
        "SELECT id, name, description, price, purchase_price, sale_price FROM products WHERE id = $1",
        [productId]
      );

      if (!productResult.rows[0]) {
        return res.status(404).json({ message: "Produto não encontrado." });
      }

      const product = productResult.rows[0];
      const saleValue = Number(String(product.sale_price ?? product.price ?? "0").replace(",", ".")) || 0;

      const purchase = await client.query(
        "INSERT INTO purchases (user_id, product_id, price, status) VALUES ($1, $2, $3, $4) RETURNING id, user_id, product_id, price, status, created_at",
        [userId, product.id, saleValue, "completed"]
      );

      const existingProject = await client.query(
        "SELECT id FROM projects WHERE owner_user_id = $1 AND name = $2 LIMIT 1",
        [userId, product.name]
      );

      if (!existingProject.rows[0]) {
        await client.query(
          "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
          [
            product.name,
            product.description ?? "",
            inferProjectType(product.name),
            product.sale_price ?? product.price ?? "",
            product.purchase_price ?? "",
            1,
            "",
            "",
            "Vercel",
            "Ativo",
            true,
            true,
            userId,
          ]
        );
      }

      res.status(201).json({
        purchase: purchase.rows[0],
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          salePrice: product.sale_price,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao registrar compra." });
  }
});

app.get("/cards/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      const existing = await client.query(
        "SELECT id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, level, xp, created_at, updated_at FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (!existing.rows[0]) {
        return res.status(404).json({ message: "Carta não encontrada." });
      }
      res.json(existing.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar carta." });
  }
});

app.post("/cards/:userId", async (req, res) => {
  const { userId } = req.params;
  const { cpf } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      const existing = await client.query(
        "SELECT id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, level, xp, created_at, updated_at FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (existing.rows[0] && existing.rows[0].hash_seed) {
        return res.json(existing.rows[0]);
      }

      const hashSeed = hashCpfUser(String(cpf || ""), userId);
      const seed = seedFromHash(hashSeed);
      const gamification = await getOrCreateGamification(client, userId);
      const createdAt = await getUserCreatedAt(client, userId);
      const accountAgeDays = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000)) : 0;
      const level = Math.floor(Number(gamification.xp || 0) / 100) + 1;
      const profile = generateCardProfile(seed, {
        accountAgeDays,
        usageScore: Number(gamification.usage_score || 0),
        plan: gamification.plan || "free",
        level,
      });
      const visualMeta = generateVisualMeta(seed);
      const marketValue = computeMarketValue(profile.attributes, profile.rarity);
      const imageUrl = await ensureAlienImage(userId, profile.name, profile.rarity, visualMeta);
      if (existing.rows[0]) {
        const updated = await client.query(
          "UPDATE user_cards SET seed = $2, hash_seed = $3, name = $4, species = $5, class = $6, rarity = $7, attributes = $8, visual_meta = $9, market_value = $10, image_url = $11, level = $12, xp = $13, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp, created_at, updated_at",
          [
            userId,
            seed,
            hashSeed,
            profile.name,
            profile.species,
            profile.className,
            profile.rarity,
            profile.attributes,
            visualMeta,
            marketValue,
            imageUrl,
            level,
            Number(gamification.xp || 0),
          ]
        );
        return res.json(updated.rows[0]);
      }

      const created = await client.query(
        "INSERT INTO user_cards (user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp, created_at, updated_at",
        [
          userId,
          seed,
          hashSeed,
          profile.name,
          profile.species,
          profile.className,
          profile.rarity,
          profile.attributes,
          visualMeta,
          marketValue,
          imageUrl,
          level,
          Number(gamification.xp || 0),
        ]
      );
      return res.status(201).json(created.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erro ao criar carta.";
    if (message.toLowerCase().includes("cpf")) {
      return res.status(400).json({ message });
    }
    res.status(500).json({ message });
  }
});

app.post("/cards/:userId/xp", async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body ?? {};
  const increment = Number(amount);
  if (!userId || !Number.isFinite(increment)) {
    return res.status(400).json({ message: "userId e amount são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      const gamification = await getOrCreateGamification(client, userId);
      const newXp = Math.max(0, Number(gamification.xp || 0) + increment);
      const level = Math.floor(newXp / 100) + 1;
      await client.query(
        "UPDATE user_gamification SET xp = $2, updated_at = NOW() WHERE user_id = $1",
        [userId, newXp]
      );
      const existingCard = await client.query(
        "SELECT hash_seed FROM user_cards WHERE user_id = $1",
        [userId]
      );
      if (!existingCard.rows[0]) {
        return res.status(404).json({ message: "Carta não encontrada." });
      }
      const createdAt = await getUserCreatedAt(client, userId);
      const accountAgeDays = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000)) : 0;
      const seed = seedFromHash(String(existingCard.rows[0].hash_seed || ""));
      const profile = generateCardProfile(seed, {
        accountAgeDays,
        usageScore: Number(gamification.usage_score || 0),
        plan: gamification.plan || "free",
        level,
      });
      const visualMeta = generateVisualMeta(seed);
      const marketValue = computeMarketValue(profile.attributes, profile.rarity);
      const imageUrl = await ensureAlienImage(userId, profile.name, profile.rarity, visualMeta);
      const updated = await client.query(
        "UPDATE user_cards SET name = $3, species = $4, class = $5, rarity = $6, attributes = $7, visual_meta = $8, market_value = $9, image_url = $10, level = $11, xp = $12, updated_at = NOW() WHERE user_id = $1 RETURNING id, user_id, seed, hash_seed, name, species, class, rarity, attributes, visual_meta, market_value, image_url, level, xp, created_at, updated_at",
        [userId, seed, profile.name, profile.species, profile.className, profile.rarity, profile.attributes, visualMeta, marketValue, imageUrl, level, newXp]
      );
      res.json(updated.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao adicionar XP." });
  }
});

app.post("/gamification", async (req, res) => {
  const { userId, plan, usageScore } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserGamificationTable(client);
      const existing = await client.query("SELECT user_id FROM user_gamification WHERE user_id = $1", [userId]);
      if (existing.rows[0]) {
        const updated = await client.query(
          "UPDATE user_gamification SET plan = $2, usage_score = $3, updated_at = NOW() WHERE user_id = $1 RETURNING user_id, plan, usage_score, xp, created_at, updated_at",
          [userId, plan ?? "free", Number(usageScore) || 0]
        );
        return res.json(updated.rows[0]);
      }
      const created = await client.query(
        "INSERT INTO user_gamification (user_id, plan, usage_score, xp) VALUES ($1, $2, $3, $4) RETURNING user_id, plan, usage_score, xp, created_at, updated_at",
        [userId, plan ?? "free", Number(usageScore) || 0, 0]
      );
      res.status(201).json(created.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao salvar gamificação." });
  }
});

app.get("/internal-accounts", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  if (!userId) {
    return res.status(400).json({ message: "userId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const account = await getOrCreateInternalAccount(client, userId);
      res.json(account);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao carregar saldo interno." });
  }
});

app.post("/internal-accounts/credit", async (req, res) => {
  const { userId, amount, reason } = req.body ?? {};
  const value = Number(amount);
  if (!userId || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ message: "userId e amount são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureInternalAccountsTable(client);
      await client.query("BEGIN");
      await getOrCreateInternalAccount(client, userId);
      const updated = await client.query(
        "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1 RETURNING user_id, balance, updated_at",
        [userId, value]
      );
      await client.query(
        "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
        [null, userId, value, reason ?? "credit"]
      );
      await client.query("COMMIT");
      res.status(201).json(updated.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao creditar saldo interno." });
  }
});

app.get("/card-listings", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "active";
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureCardMarketplaceTables(client);
      const result = await client.query(
        "SELECT cl.id, cl.card_id, cl.seller_user_id, cl.price, cl.status, cl.created_at, uc.name, uc.species, uc.class, uc.rarity, uc.attributes, uc.level, uc.xp, uc.image_url FROM card_listings cl JOIN user_cards uc ON uc.id = cl.card_id WHERE cl.status = $1 ORDER BY cl.created_at DESC",
        [status]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar marketplace." });
  }
});

app.post("/card-listings", async (req, res) => {
  const { userId, cardId, price } = req.body ?? {};
  const value = Number(price);
  if (!userId || !cardId || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ message: "userId, cardId e price são obrigatórios." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureCardMarketplaceTables(client);
      const card = await client.query("SELECT id, user_id FROM user_cards WHERE id = $1", [cardId]);
      if (!card.rows[0] || card.rows[0].user_id !== userId) {
        return res.status(403).json({ message: "Você não pode listar esta carta." });
      }
      const listing = await client.query(
        "INSERT INTO card_listings (card_id, seller_user_id, price, status) VALUES ($1, $2, $3, $4) RETURNING id, card_id, seller_user_id, price, status, created_at",
        [cardId, userId, value, "active"]
      );
      res.status(201).json(listing.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar anúncio." });
  }
});

app.post("/card-listings/:id/buy", async (req, res) => {
  const { id } = req.params;
  const { buyerId } = req.body ?? {};
  if (!buyerId) {
    return res.status(400).json({ message: "buyerId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await ensureUserCardsTable(client);
      await ensureCardMarketplaceTables(client);
      await ensureInternalAccountsTable(client);
      await ensureCommerceOrdersTable(client);

      await client.query("BEGIN");
      const listing = await client.query(
        "SELECT id, card_id, seller_user_id, price, status FROM card_listings WHERE id = $1 FOR UPDATE",
        [id]
      );
      const entry = listing.rows[0];
      if (!entry || entry.status !== "active") {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Anúncio não disponível." });
      }
      if (entry.seller_user_id === buyerId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Você não pode comprar sua própria carta." });
      }

      const buyerAccount = await getOrCreateInternalAccount(client, buyerId);
      if (Number(buyerAccount.balance) < Number(entry.price)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Saldo insuficiente." });
      }

      await getOrCreateInternalAccount(client, entry.seller_user_id);
      await client.query(
        "UPDATE internal_accounts SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1",
        [buyerId, entry.price]
      );
      await client.query(
        "UPDATE internal_accounts SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1",
        [entry.seller_user_id, entry.price]
      );
      await client.query(
        "INSERT INTO internal_transactions (from_user_id, to_user_id, amount, reason) VALUES ($1, $2, $3, $4)",
        [buyerId, entry.seller_user_id, entry.price, "card_purchase"]
      );

      await client.query(
        "UPDATE user_cards SET user_id = $2, updated_at = NOW() WHERE id = $1",
        [entry.card_id, buyerId]
      );
      await client.query(
        "UPDATE card_listings SET status = 'sold' WHERE id = $1",
        [id]
      );
      const tx = await client.query(
        "INSERT INTO card_transactions (card_id, seller_user_id, buyer_user_id, price) VALUES ($1, $2, $3, $4) RETURNING id, card_id, seller_user_id, buyer_user_id, price, created_at",
        [entry.card_id, entry.seller_user_id, buyerId, entry.price]
      );
      await client.query(
        "INSERT INTO commerce_orders (user_id, item_type, item_id, amount, currency, status, payment_method, payment_reference) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [buyerId, "card", String(entry.card_id), entry.price, "BRL", "completed", "internal", "card_listing"]
      );
      await client.query("COMMIT");
      res.status(201).json(tx.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao comprar carta." });
  }
});

app.get("/projects", async (req, res) => {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const userId = typeof req.query.userId === "string" ? req.query.userId : null;
      const result = await client.query(
        userId
          ? "SELECT id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id FROM projects WHERE owner_user_id = $1 ORDER BY created_at DESC"
          : "SELECT id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id FROM projects ORDER BY created_at DESC",
        userId ? [userId] : []
      );
      res.json(result.rows);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const userId = typeof req.query.userId === "string" ? req.query.userId : null;
        const retry = await client.query(
          userId
            ? "SELECT id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id FROM projects WHERE owner_user_id = $1 ORDER BY created_at DESC"
            : "SELECT id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id FROM projects ORDER BY created_at DESC",
          userId ? [userId] : []
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
  const { name, description, projectType, salePrice, productionCost, purchaseCount, repository, domain, hosting, status, paid, isPublic, ownerUserId } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  if (!ownerUserId) {
    return res.status(400).json({ message: "ownerUserId é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const confirmed = await hasPixConfirmation(client, ownerUserId);
      if (!confirmed) {
        return res.status(403).json({ message: "Confirme a conta com PIX de R$ 1,00 para criar projetos." });
      }
      const result = await client.query(
        "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id",
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
          ownerUserId,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const confirmed = await hasPixConfirmation(client, ownerUserId);
        if (!confirmed) {
          return res.status(403).json({ message: "Confirme a conta com PIX de R$ 1,00 para criar projetos." });
        }
        const retry = await client.query(
          "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id",
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
            ownerUserId,
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
  const { name, description, projectType, salePrice, productionCost, purchaseCount, repository, domain, hosting, status, paid, isPublic, ownerUserId } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Nome é obrigatório." });
  }
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "UPDATE projects SET name = $1, description = $2, project_type = $3, sale_price = $4, production_cost = $5, purchase_count = $6, repository = $7, domain = $8, hosting = $9, status = $10, paid = $11, is_public = $12, owner_user_id = $13 WHERE id = $14 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id",
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
          ownerUserId ?? "",
          id,
        ]
      );
      res.json(result.rows[0]);
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "42703") {
        await ensureProjectsColumns(client);
        const retry = await client.query(
          "UPDATE projects SET name = $1, description = $2, project_type = $3, sale_price = $4, production_cost = $5, purchase_count = $6, repository = $7, domain = $8, hosting = $9, status = $10, paid = $11, is_public = $12, owner_user_id = $13 WHERE id = $14 RETURNING id, name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id",
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
            ownerUserId ?? "",
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
