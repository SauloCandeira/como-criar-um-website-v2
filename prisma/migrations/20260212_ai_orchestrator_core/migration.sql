-- IA Orchestrator + Memory source fields
-- Non-destructive

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ia_orchestrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  supreme_prompt TEXT NOT NULL,
  execution_flow JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ia_orchestrators_active_idx ON ia_orchestrators (is_active);
CREATE INDEX IF NOT EXISTS ia_orchestrators_updated_idx ON ia_orchestrators (updated_at DESC);

ALTER TABLE ia_memory ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE ia_memory ADD COLUMN IF NOT EXISTS source_id TEXT;

CREATE INDEX IF NOT EXISTS ia_memory_source_type_idx ON ia_memory (source_type);
CREATE INDEX IF NOT EXISTS ia_memory_source_id_idx ON ia_memory (source_id);

COMMIT;
