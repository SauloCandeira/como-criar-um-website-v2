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
