export interface AiReport {
  id: string;
  projectId: string;
  kanbanItemId: string;
  agent: string;
  summary: string;
  decisions: string[];
  risks: string[];
  nextActions: string[];
  issueKeys?: string[];
  filesModified?: string[];
  riskClassification?: string;
  prLink?: string;
  qualityGate?: string;
  status?: string;
  buildResult?: string;
  testResult?: string;
  executionDurationMs?: number | null;
  confidenceScore?: number | null;
  createdAt?: string;
  updatedAt?: string;
}
