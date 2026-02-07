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
