ALTER TABLE ia_orchestrators DROP COLUMN IF EXISTS supreme_prompt;
ALTER TABLE ia_prompts DROP COLUMN IF EXISTS content;
ALTER TABLE ia_prompt_versions DROP COLUMN IF EXISTS content;
