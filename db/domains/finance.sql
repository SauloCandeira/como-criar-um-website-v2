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
