CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS product_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

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
  product_id UUID,
  base_project_id UUID,
  purchase_id UUID,
  created_from_purchase BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  html_content TEXT DEFAULT '',
  css_content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id UUID,
  project_id UUID,
  price NUMERIC(12,2) DEFAULT 0,
  purchase_type TEXT DEFAULT 'paid',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
