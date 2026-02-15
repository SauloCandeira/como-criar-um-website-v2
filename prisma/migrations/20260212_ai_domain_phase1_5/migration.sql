-- AI domain expansion (Phase 1-5)
-- Non-destructive: new tables + nullable columns + inde
-- IA Conversations
CREATE TABLE IF NOT EXISTS ia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IA Messages
CREATE TABLE IF NOT EXISTS ia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ia_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ia_messages_conversation_idx ON ia_messages (conversation_id, created_at DESC);

-- IA Agents
CREATE TABLE IF NOT EXISTS ia_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  specialty TEXT DEFAULT '',
  system_prompt TEXT DEFAULT '',
  autonomy_level TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ia_agents_active_idx ON ia_agents (is_active);
CREATE INDEX IF NOT EXISTS ia_agents_specialty_idx ON ia_agents (specialty);

-- IA Contexts
CREATE TABLE IF NOT EXISTS ia_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  context_type TEXT DEFAULT '',
  related_agent_id UUID REFERENCES ia_agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ia_contexts_type_idx ON ia_contexts (context_type);
CREATE INDEX IF NOT EXISTS ia_contexts_agent_idx ON ia_contexts (related_agent_id);

-- IA Memory (Vector)
CREATE TABLE IF NOT EXISTS ia_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  context_type TEXT DEFAULT '',
  related_task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ia_memory_context_type_idx ON ia_memory (context_type);
CREATE INDEX IF NOT EXISTS ia_memory_related_task_idx ON ia_memory (related_task_id);
CREATE INDEX IF NOT EXISTS ia_memory_embedding_idx ON ia_memory USING ivfflat (embedding vector_cosine_ops);

-- Extend IA Tasks (project_tasks)
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS linked_agent_id UUID;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS context_reference TEXT;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS execution_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS specialist_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_tasks_linked_agent_fkey') THEN
    ALTER TABLE project_tasks
      ADD CONSTRAINT project_tasks_linked_agent_fkey
      FOREIGN KEY (linked_agent_id) REFERENCES ia_agents(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS project_tasks_linked_agent_idx ON project_tasks (linked_agent_id);
CREATE INDEX IF NOT EXISTS project_tasks_specialist_type_idx ON project_tasks (specialist_type);

