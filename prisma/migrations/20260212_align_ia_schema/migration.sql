-- Safe alignment migration for IA domain
-- Non-destructive: adds nullable columns and tables, no drops

BEGIN;

-- project_tasks: allow NULL project_id and add IA columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_tasks' AND column_name='project_id') THEN
    ALTER TABLE project_tasks ALTER COLUMN project_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN DEFAULT false;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS domain VARCHAR(50);
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS pr_link TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS confidence_score NUMERIC;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS execution_result TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS report_id UUID;

CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON project_tasks (project_id);
CREATE INDEX IF NOT EXISTS project_tasks_domain_idx ON project_tasks (domain);
CREATE INDEX IF NOT EXISTS project_tasks_generated_ai_idx ON project_tasks (generated_by_ai);
CREATE INDEX IF NOT EXISTS project_tasks_ia_created_at_idx ON project_tasks (created_at DESC) WHERE domain = 'IA' AND project_id IS NULL;

-- ai_reports table
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(50) DEFAULT 'IA',
  status TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  decisions JSONB DEFAULT '[]'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  next_actions JSONB DEFAULT '[]'::jsonb,
  issue_keys JSONB DEFAULT '[]'::jsonb,
  files_modified JSONB DEFAULT '[]'::jsonb,
  risk_classification TEXT DEFAULT '',
  pr_link TEXT DEFAULT '',
  quality_gate TEXT DEFAULT '',
  build_result TEXT DEFAULT '',
  test_result TEXT DEFAULT '',
  execution_duration_ms INTEGER,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_reports_domain_idx ON ai_reports (domain);
CREATE INDEX IF NOT EXISTS ai_reports_created_at_idx ON ai_reports (created_at DESC);

-- system_config table
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS system_config_key_idx ON system_config (key);

COMMIT;
