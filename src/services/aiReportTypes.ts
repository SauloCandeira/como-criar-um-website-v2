export interface AiReport {
  id: string;
  projectId: string;
  kanbanItemId: string;
  agent: string;
  summary: string;
  decisions: string[];
  risks: string[];
  nextActions: string[];
  createdAt?: string;
  updatedAt?: string;
}
