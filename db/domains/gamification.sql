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
