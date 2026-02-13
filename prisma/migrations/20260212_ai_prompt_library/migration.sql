-- IA Prompt Library
-- Non-destructive: new tables + columns

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ia_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  storage_url TEXT NOT NULL,
  content TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ia_prompts_file_name_idx ON ia_prompts (file_name);
CREATE INDEX IF NOT EXISTS ia_prompts_category_idx ON ia_prompts (category);
CREATE INDEX IF NOT EXISTS ia_prompts_active_idx ON ia_prompts (is_active);

CREATE TABLE IF NOT EXISTS ia_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES ia_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storage_url TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ia_prompt_versions_prompt_idx ON ia_prompt_versions (prompt_id, version DESC);

ALTER TABLE ia_memory ADD COLUMN IF NOT EXISTS prompt_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ia_memory_prompt_fkey') THEN
    ALTER TABLE ia_memory
      ADD CONSTRAINT ia_memory_prompt_fkey
      FOREIGN KEY (prompt_id) REFERENCES ia_prompts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ia_memory_prompt_idx ON ia_memory (prompt_id);

COMMIT;
