export interface IaAgent {
  id: string;
  name: string;
  description?: string;
  specialty?: string;
  system_prompt?: string;
  autonomy_level?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface IaAgentExecutionResult {
  task: {
    id: string;
    title: string;
    status: string;
    linked_agent_id: string;
    specialist_type?: string;
    created_at?: string;
  };
  reportId?: string;
}
