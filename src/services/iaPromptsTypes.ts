export interface IaPromptItem {
  id: string;
  title: string;
  file_name: string;
  category: string;
  description?: string;
  storage_url: string;
  content?: string;
  is_active?: boolean;
  version?: number;
  memory_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IaPromptVersion {
  id: string;
  prompt_id?: string;
  version: number;
  storage_url: string;
  created_at?: string;
}
