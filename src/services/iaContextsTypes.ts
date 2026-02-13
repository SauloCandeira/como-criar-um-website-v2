export interface IaContext {
  id: string;
  title: string;
  content: string;
  context_type?: string;
  related_agent_id?: string | null;
  created_at?: string;
}
