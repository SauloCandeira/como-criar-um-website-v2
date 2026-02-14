CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT DEFAULT '',
  product_type TEXT DEFAULT 'digital',
  base_project_id UUID,
  purchase_price TEXT DEFAULT '',
  sale_price TEXT DEFAULT '',
  show_on_home BOOLEAN DEFAULT false,
  show_on_marketplace BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

INSERT INTO product_types (id, label)
VALUES
  ('digital', 'Produto digital'),
  ('fisico', 'Produto físico'),
  ('servico', 'Serviço'),
  ('assinatura', 'Assinatura'),
  ('projeto', 'Projeto')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_fkey'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_product_type_fkey
      FOREIGN KEY (product_type) REFERENCES product_types(id);
  END IF;
END $$;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_on_marketplace BOOLEAN DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'digital';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS base_project_id UUID;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS purchase_price TEXT DEFAULT '';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_price TEXT DEFAULT '';

UPDATE products
SET sale_price = price
WHERE (sale_price IS NULL OR sale_price = '') AND price IS NOT NULL;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  project_type TEXT DEFAULT '',
  sale_price TEXT DEFAULT '',
  production_cost TEXT DEFAULT '',
  purchase_count INTEGER DEFAULT 0,
  repository TEXT DEFAULT '',
  domain TEXT DEFAULT '',
  hosting TEXT DEFAULT '',
  status TEXT DEFAULT 'Ativo',
  paid BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  owner_user_id TEXT DEFAULT '',
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  base_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  created_from_purchase BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
    html_content TEXT DEFAULT '',
    css_content TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT '';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS sale_price TEXT DEFAULT '';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS production_cost TEXT DEFAULT '';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT DEFAULT '';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS product_id UUID;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS base_project_id UUID;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS purchase_id UUID;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS created_from_purchase BOOLEAN DEFAULT false;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_product_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_base_project_id_fkey'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_base_project_id_fkey
      FOREIGN KEY (base_project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS projects_product_id_idx ON projects (product_id);
CREATE INDEX IF NOT EXISTS projects_owner_user_id_idx ON projects (owner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_base_uidx ON projects (owner_user_id, base_project_id) WHERE created_from_purchase = true;
CREATE INDEX IF NOT EXISTS projects_base_project_id_idx ON projects (base_project_id);
CREATE INDEX IF NOT EXISTS projects_is_template_idx ON projects (is_template);
CREATE INDEX IF NOT EXISTS projects_purchase_id_idx ON projects (purchase_id);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  price NUMERIC(12,2) DEFAULT 0,
  purchase_type TEXT DEFAULT 'paid',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS project_id UUID;

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'paid';

UPDATE purchases
SET purchase_type = 'free'
WHERE (purchase_type IS NULL OR purchase_type = '')
  AND COALESCE(price, 0) = 0;

UPDATE purchases
SET purchase_type = 'paid'
WHERE (purchase_type IS NULL OR purchase_type = '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchases_project_id_fkey'
  ) THEN
    ALTER TABLE purchases
      ADD CONSTRAINT purchases_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases (user_id);
CREATE INDEX IF NOT EXISTS purchases_product_id_idx ON purchases (product_id);
CREATE INDEX IF NOT EXISTS purchases_project_id_idx ON purchases (project_id);

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free',
  usage_score INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  seed BIGINT NOT NULL,
  hash_seed TEXT NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  class TEXT NOT NULL,
  rarity TEXT NOT NULL,
  attributes JSONB NOT NULL,
  visual_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  market_value NUMERIC(12,2) DEFAULT 10,
  image_url TEXT DEFAULT '',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_cards
  ADD COLUMN IF NOT EXISTS hash_seed TEXT NOT NULL DEFAULT '';

ALTER TABLE user_cards
  ADD COLUMN IF NOT EXISTS visual_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_cards
  ADD COLUMN IF NOT EXISTS market_value NUMERIC(12,2) DEFAULT 10;

ALTER TABLE user_cards
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS internal_accounts (
  user_id TEXT PRIMARY KEY,
  balance NUMERIC(14,2) DEFAULT 20,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id TEXT,
  to_user_id TEXT,
  amount NUMERIC(14,2) NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES user_cards(id) ON DELETE CASCADE,
  seller_user_id TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES user_cards(id) ON DELETE SET NULL,
  seller_user_id TEXT NOT NULL,
  buyer_user_id TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'completed',
  payment_method TEXT DEFAULT 'pix',
  payment_reference TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  cost_value TEXT DEFAULT '',
  billing_cycle TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE costs
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  ticker TEXT DEFAULT '',
  risk_level TEXT DEFAULT 'Médio',
  current_price NUMERIC(12,2) DEFAULT 0,
  total_supply NUMERIC(18,2) DEFAULT 0,
  available_supply NUMERIC(18,2) DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS total_supply NUMERIC(18,2) DEFAULT 0;

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS available_supply NUMERIC(18,2) DEFAULT 0;

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  management_fee NUMERIC(6,2) DEFAULT 0,
  nav NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fund_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  cash_balance NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) DEFAULT 0,
  avg_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  order_type TEXT DEFAULT 'buy',
  price NUMERIC(12,2) DEFAULT 0,
  quantity NUMERIC(12,4) DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  recorded_at DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deposit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  cpf TEXT DEFAULT '',
  balance NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deposit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES deposit_accounts(id) ON DELETE CASCADE,
  method TEXT DEFAULT 'pix',
  amount NUMERIC(14,2) NOT NULL,
  status TEXT DEFAULT 'confirmed',
  reference TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid TEXT DEFAULT '',
  name TEXT DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  photo_url TEXT DEFAULT '',
  auth_provider TEXT DEFAULT '',
  permission_level TEXT DEFAULT 'A',
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dao_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by_admin_id TEXT,
  voting_start TIMESTAMPTZ,
  voting_end TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dao_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES dao_proposals(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  mybot_id TEXT NOT NULL,
  vote TEXT NOT NULL,
  amount_bet NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dao_mybot_balances (
  mybot_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  balance NUMERIC(14,2) DEFAULT 1000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mybot_profiles (
  user_id TEXT PRIMARY KEY,
  card_id UUID,
  available_points INTEGER DEFAULT 0,
  loss_streak INTEGER DEFAULT 0,
  high_bet_streak INTEGER DEFAULT 0,
  last_high_bet_at TIMESTAMPTZ,
  last_battle_at TIMESTAMPTZ,
  origin_map_id TEXT,
  current_map_id TEXT,
  origin_pos_x NUMERIC(5,2),
  origin_pos_y NUMERIC(5,2),
  current_pos_x NUMERIC(5,2),
  current_pos_y NUMERIC(5,2),
  last_movement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir origem e posição para todos os bots já existentes
UPDATE mybot_profiles
SET origin_map_id = COALESCE(origin_map_id, 'Arena Classica'),
    current_map_id = COALESCE(current_map_id, COALESCE(origin_map_id, 'Arena Classica')),
    origin_pos_x = COALESCE(origin_pos_x, 50),
    origin_pos_y = COALESCE(origin_pos_y, 50),
    current_pos_x = COALESCE(current_pos_x, COALESCE(origin_pos_x, 50)),
    current_pos_y = COALESCE(current_pos_y, COALESCE(origin_pos_y, 50))
WHERE origin_map_id IS NULL
   OR current_map_id IS NULL
   OR origin_pos_x IS NULL
   OR origin_pos_y IS NULL
   OR current_pos_x IS NULL
   OR current_pos_y IS NULL;

CREATE TABLE IF NOT EXISTS mybot_cpf_registry (
  cpf_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mybot_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  cpf_hash TEXT NOT NULL,
  deposit_tx_id UUID,
  credits_granted NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mybot_battle_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  card_id UUID NOT NULL,
  bet_amount NUMERIC(12,2) NOT NULL,
  level INTEGER DEFAULT 1,
  rarity TEXT DEFAULT 'comum',
  rarity_rank INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting',
  matched_battle_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mybot_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  card_id UUID NOT NULL,
  battle_id UUID,
  bet_amount NUMERIC(12,2) NOT NULL,
  possible_return NUMERIC(12,2) NOT NULL DEFAULT 0,
  gas_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mybot_maps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position_x NUMERIC(5,2) NOT NULL,
  position_y NUMERIC(5,2) NOT NULL,
  icon TEXT DEFAULT '',
  visual_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mybot_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  from_map_id TEXT,
  to_map_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  battle_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mybot_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_a TEXT NOT NULL,
  user_id_b TEXT NOT NULL,
  card_id_a UUID NOT NULL,
  card_id_b UUID NOT NULL,
  bet_amount NUMERIC(12,2) NOT NULL,
  battle_type TEXT NOT NULL,
  gas_pct NUMERIC(5,4) NOT NULL,
  map_name TEXT NOT NULL,
  map_weights JSONB NOT NULL,
  modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  seed TEXT NOT NULL,
  power_a NUMERIC(12,4) NOT NULL,
  power_b NUMERIC(12,4) NOT NULL,
  random_factor_a NUMERIC(6,4) NOT NULL DEFAULT 1,
  random_factor_b NUMERIC(6,4) NOT NULL DEFAULT 1,
  power_final_a NUMERIC(12,4) NOT NULL,
  power_final_b NUMERIC(12,4) NOT NULL,
  xp_a INTEGER NOT NULL DEFAULT 0,
  xp_b INTEGER NOT NULL DEFAULT 0,
  winner_user_id TEXT NOT NULL,
  payout_amount NUMERIC(12,2) NOT NULL,
  gas_amount NUMERIC(12,2) NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'resolved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mybot_evolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  card_id UUID NOT NULL,
  attribute TEXT NOT NULL,
  before_value INTEGER NOT NULL,
  after_value INTEGER NOT NULL,
  cost NUMERIC(12,2) NOT NULL,
  points_spent INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dao_proposals_status_idx ON dao_proposals (status);
CREATE INDEX IF NOT EXISTS dao_proposals_created_at_idx ON dao_proposals (created_at DESC);
CREATE INDEX IF NOT EXISTS dao_votes_proposal_idx ON dao_votes (proposal_id);
CREATE INDEX IF NOT EXISTS dao_votes_user_idx ON dao_votes (user_id);
CREATE INDEX IF NOT EXISTS dao_mybot_balances_user_idx ON dao_mybot_balances (user_id);

CREATE INDEX IF NOT EXISTS mybot_profiles_card_idx ON mybot_profiles (card_id);
CREATE INDEX IF NOT EXISTS mybot_profiles_origin_idx ON mybot_profiles (origin_map_id);
CREATE INDEX IF NOT EXISTS mybot_profiles_current_idx ON mybot_profiles (current_map_id);
CREATE INDEX IF NOT EXISTS mybot_battle_queue_status_idx ON mybot_battle_queue (status, bet_amount, level, rarity_rank);
CREATE INDEX IF NOT EXISTS mybot_battles_user_a_idx ON mybot_battles (user_id_a, created_at DESC);
CREATE INDEX IF NOT EXISTS mybot_battles_user_b_idx ON mybot_battles (user_id_b, created_at DESC);
CREATE INDEX IF NOT EXISTS mybot_activations_user_idx ON mybot_activations (user_id);
CREATE INDEX IF NOT EXISTS mybot_activations_cpf_idx ON mybot_activations (cpf_hash);
CREATE INDEX IF NOT EXISTS mybot_bets_user_idx ON mybot_bets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mybot_bets_battle_idx ON mybot_bets (battle_id);
CREATE INDEX IF NOT EXISTS mybot_movements_bot_idx ON mybot_movements (bot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mybot_movements_created_idx ON mybot_movements (created_at DESC);


-- Backfill product.base_project_id by name match
UPDATE products pr
SET base_project_id = p.id
FROM projects p
WHERE pr.base_project_id IS NULL
  AND regexp_replace(lower(p.name), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(pr.name), '[^a-z0-9]+', '', 'g');

-- Mark base projects as templates
UPDATE projects p
SET is_template = true
FROM products pr
WHERE pr.base_project_id = p.id
  AND (p.is_template = false OR p.is_template IS NULL);

-- Backfill project/product linkage by name match
UPDATE projects p
SET product_id = pr.id
FROM products pr
WHERE p.product_id IS NULL
  AND regexp_replace(lower(p.name), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(pr.name), '[^a-z0-9]+', '', 'g');

-- Backfill owner_user_id for linked projects when missing
UPDATE projects p
SET owner_user_id = pu.user_id
FROM purchases pu
WHERE (p.owner_user_id IS NULL OR p.owner_user_id = '')
  AND p.product_id = pu.product_id
  AND pu.status = 'completed';

-- Backfill purchases.project_id based on product ownership
UPDATE purchases pu
SET project_id = p.id
FROM projects p
WHERE pu.project_id IS NULL
  AND p.product_id = pu.product_id
  AND p.owner_user_id = pu.user_id;

-- Mark owned projects linked to products as clones
UPDATE projects p
SET created_from_purchase = true,
    base_project_id = COALESCE(p.base_project_id, pr.base_project_id)
FROM products pr
WHERE p.owner_user_id <> ''
  AND p.product_id = pr.id
  AND (p.created_from_purchase = false OR p.created_from_purchase IS NULL);

-- Create missing projects for completed purchases without a linked project
WITH missing_projects AS (
  SELECT pu.user_id,
         pr.id AS product_id,
         pr.base_project_id,
         pr.name,
         pr.description,
         pr.sale_price,
         pr.purchase_price
  FROM purchases pu
  JOIN products pr ON pr.id = pu.product_id
  LEFT JOIN projects p ON p.product_id = pu.product_id AND p.owner_user_id = pu.user_id
  WHERE pu.status = 'completed'
    AND p.id IS NULL
)
INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, created_from_purchase, is_template)
SELECT mp.name,
       COALESCE(mp.description, ''),
       'Projeto de Website',
       COALESCE(mp.sale_price, ''),
       COALESCE(mp.purchase_price, ''),
       1,
       '',
       '',
       'Vercel',
       'Ativo',
       true,
       false,
       mp.user_id,
  mp.product_id,
  mp.base_project_id,
  true,
  false
FROM missing_projects mp
ON CONFLICT (owner_user_id, product_id) DO NOTHING;

UPDATE projects p
SET base_project_id = COALESCE(p.base_project_id, pr.base_project_id),
    created_from_purchase = true
FROM products pr
WHERE p.product_id = pr.id
  AND p.owner_user_id <> ''
  AND (p.created_from_purchase = false OR p.created_from_purchase IS NULL);

-- Link purchases to newly created projects
UPDATE purchases pu
SET project_id = p.id
FROM projects p
WHERE pu.project_id IS NULL
  AND p.product_id = pu.product_id
  AND p.owner_user_id = pu.user_id;

-- Backfill projects.purchase_id from purchases
UPDATE projects p
SET purchase_id = pu.id
FROM purchases pu
WHERE p.purchase_id IS NULL
  AND pu.project_id = p.id;

-- Cleanup: remove inconsistent users (purchases without valid cloned project)
WITH invalid_users AS (
  SELECT DISTINCT pu.user_id
  FROM purchases pu
  LEFT JOIN projects p
    ON p.id = pu.project_id
   AND p.created_from_purchase = true
   AND p.is_template = false
   AND p.owner_user_id = pu.user_id
   AND p.product_id = pu.product_id
   AND p.purchase_id = pu.id
  WHERE pu.status = 'completed'
    AND p.id IS NULL
)
DELETE FROM purchases pu
USING invalid_users iu
WHERE pu.user_id = iu.user_id;

WITH invalid_users AS (
  SELECT DISTINCT pu.user_id
  FROM purchases pu
  LEFT JOIN projects p
    ON p.id = pu.project_id
   AND p.created_from_purchase = true
   AND p.is_template = false
   AND p.owner_user_id = pu.user_id
   AND p.product_id = pu.product_id
   AND p.purchase_id = pu.id
  WHERE pu.status = 'completed'
    AND p.id IS NULL
)
DELETE FROM projects p
USING invalid_users iu
WHERE p.owner_user_id = iu.user_id
  AND p.created_from_purchase = true
  AND p.is_template = false;

-- Self-healing: cancel duplicate purchases (keep most recent)
WITH ranked_purchases AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, product_id ORDER BY created_at DESC) AS rn
  FROM purchases
  WHERE status = 'completed'
)
UPDATE purchases pu
SET status = 'canceled'
FROM ranked_purchases rp
WHERE pu.id = rp.id
  AND rp.rn > 1;

-- Self-healing: remove duplicate clones (keep most recent)
WITH ranked_clones AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id, base_project_id ORDER BY created_at DESC) AS rn
  FROM projects
  WHERE created_from_purchase = true
    AND is_template = false
    AND base_project_id IS NOT NULL
)
DELETE FROM projects p
USING ranked_clones rc
WHERE p.id = rc.id
  AND rc.rn > 1;

-- Self-healing: remove duplicate owner/product projects (keep most recent)
WITH ranked_owner_products AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id, product_id ORDER BY created_at DESC) AS rn
  FROM projects
  WHERE owner_user_id <> ''
    AND product_id IS NOT NULL
)
DELETE FROM projects p
USING ranked_owner_products rop
WHERE p.id = rop.id
  AND rop.rn > 1;

-- Self-healing: remove clones without valid purchase
DELETE FROM projects p
WHERE p.created_from_purchase = true
  AND p.is_template = false
  AND (p.purchase_id IS NULL OR NOT EXISTS (SELECT 1 FROM purchases pu WHERE pu.id = p.purchase_id AND pu.status = 'completed'));

-- Re-link purchases and projects after cleanup
UPDATE purchases pu
SET project_id = p.id
FROM projects p
WHERE pu.status = 'completed'
  AND pu.project_id IS NULL
  AND p.owner_user_id = pu.user_id
  AND p.product_id = pu.product_id
  AND p.created_from_purchase = true
  AND p.is_template = false;

UPDATE projects p
SET purchase_id = pu.id
FROM purchases pu
WHERE p.created_from_purchase = true
  AND p.is_template = false
  AND p.purchase_id IS NULL
  AND pu.project_id = p.id
  AND pu.status = 'completed';

-- Reset purchases and cloned projects to start a fresh purchase flow
DELETE FROM purchases;
DELETE FROM projects WHERE created_from_purchase = true AND is_template = false;
UPDATE projects SET purchase_id = NULL, product_id = NULL, created_from_purchase = false WHERE purchase_id IS NOT NULL;

-- Final cleanup: enforce single project per owner/product before unique index
WITH ranked_owner_products_final AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id, product_id ORDER BY created_at DESC) AS rn
  FROM projects
  WHERE owner_user_id <> ''
    AND product_id IS NOT NULL
    AND is_template = false
)
DELETE FROM projects p
USING ranked_owner_products_final rop
WHERE p.id = rop.id
  AND rop.rn > 1;

-- Recreate uniqueness indexes after cleanup
DROP INDEX IF EXISTS purchases_user_product_active_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_product_active_uidx ON purchases (user_id, product_id) WHERE status = 'completed';

DROP INDEX IF EXISTS projects_owner_base_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_base_uidx ON projects (owner_user_id, base_project_id) WHERE created_from_purchase = true;

DROP INDEX IF EXISTS projects_owner_product_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_product_uidx ON projects (owner_user_id, product_id) WHERE owner_user_id <> '' AND product_id IS NOT NULL AND is_template = false;

CREATE TABLE IF NOT EXISTS llm_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  agent TEXT,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(14,6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  source TEXT NOT NULL DEFAULT 'api',
  latency_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS llm_telemetry_created_at_idx ON llm_telemetry (created_at);
CREATE INDEX IF NOT EXISTS llm_telemetry_model_idx ON llm_telemetry (model);
CREATE INDEX IF NOT EXISTS llm_telemetry_agent_idx ON llm_telemetry (agent);



