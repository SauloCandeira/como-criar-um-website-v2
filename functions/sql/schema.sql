CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT DEFAULT '',
  product_type TEXT DEFAULT 'digital',
  purchase_price TEXT DEFAULT '',
  sale_price TEXT DEFAULT '',
  show_on_home BOOLEAN DEFAULT false,
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
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'digital';

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
  created_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  balance NUMERIC(14,2) DEFAULT 0,
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

INSERT INTO costs (name, cost_value, billing_cycle)
VALUES
  ('Copilot GitHub Pro', '', 'monthly'),
  ('ChatGPT', '', 'monthly'),
  ('Domínio BR (2 anos)', '', 'annual')
ON CONFLICT (name) DO NOTHING;

UPDATE costs
SET billing_cycle = 'annual'
WHERE name = 'Domínio BR (2 anos)' AND (billing_cycle IS NULL OR billing_cycle = 'monthly');

INSERT INTO sales (customer_name, amount, currency)
SELECT 'Venda modelo', 149.90, 'BRL'
WHERE NOT EXISTS (
  SELECT 1 FROM sales WHERE customer_name = 'Venda modelo' AND amount = 149.90
);

INSERT INTO accesses (source)
SELECT 'web'
WHERE NOT EXISTS (
  SELECT 1 FROM accesses WHERE source = 'web'
);

INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, status, paid, is_public)
SELECT 'Landingpage Institucional', 'Landingpage institucional pronta para uso', 'Landingpage', '999,99', '', 0, 'Ativo', false, true
WHERE NOT EXISTS (
  SELECT 1 FROM projects WHERE name = 'Landingpage Institucional'
);

INSERT INTO products (name, price, description, show_on_home, purchase_price, sale_price)
SELECT 'Landing Page Institucional', '999,00', 'Landing page institucional pronta para publicação', true, '0,00', '0,00'
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE name = 'Landing Page Institucional'
);

UPDATE products
SET product_type = 'servico'
WHERE name = 'Landing Page Institucional' AND (product_type IS NULL OR product_type = '');

INSERT INTO assets (name, asset_class, ticker, risk_level, current_price, total_supply, available_supply, is_primary, currency)
SELECT 'Cotas SPE Principal', 'SPE', 'SPE-PRINC', 'Médio', 1.00, 1000000, 1000000, true, 'BRL'
WHERE NOT EXISTS (
  SELECT 1 FROM assets WHERE ticker = 'SPE-PRINC'
);

INSERT INTO settings (key, value)
SELECT 'master_email', 'master@hktech.com.br'
WHERE NOT EXISTS (
  SELECT 1 FROM settings WHERE key = 'master_email'
);

WITH owner_wallet AS (
  INSERT INTO wallets (user_id, cash_balance, currency)
  SELECT 'master@hktech.com.br', 0, 'BRL'
  WHERE NOT EXISTS (
    SELECT 1 FROM wallets WHERE user_id = 'master@hktech.com.br'
  )
  RETURNING id
),
wallet_ref AS (
  SELECT id FROM owner_wallet
  UNION ALL
  SELECT id FROM wallets WHERE user_id = 'master@hktech.com.br'
),
primary_asset AS (
  SELECT id FROM assets WHERE ticker = 'SPE-PRINC' LIMIT 1
)
INSERT INTO wallet_positions (wallet_id, asset_id, quantity, avg_price)
SELECT wallet_ref.id, primary_asset.id, 1000000, 1.00
FROM wallet_ref, primary_asset
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_positions wp
  WHERE wp.wallet_id = wallet_ref.id AND wp.asset_id = primary_asset.id
);

INSERT INTO price_history (asset_id, price, recorded_at)
SELECT a.id, a.current_price, CURRENT_DATE
FROM assets a
WHERE a.ticker = 'SPE-PRINC'
  AND NOT EXISTS (
    SELECT 1 FROM price_history ph WHERE ph.asset_id = a.id AND ph.recorded_at = CURRENT_DATE
  );

UPDATE assets
SET available_supply = total_supply
WHERE is_primary = true AND (available_supply IS NULL OR available_supply = 0);

INSERT INTO funds (name, description, management_fee, nav)
SELECT 'SPE Multiativos Simulado', 'Fundo simulado com foco em imóveis, tecnologia e ações.', 1.50, 1000000
WHERE NOT EXISTS (
  SELECT 1 FROM funds WHERE name = 'SPE Multiativos Simulado'
);


