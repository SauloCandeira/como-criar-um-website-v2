export interface IaMemoryItem {
  id: string;
  content: string;
  context_type?: string;
  related_task_id?: string | null;
  created_at?: string;
  distance?: number;
}

export interface IaMemoryStats {
  total: number;
  byType: Array<{ context_type: string; count: number }>;
  tokenEstimate?: number;
}
