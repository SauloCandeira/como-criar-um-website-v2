export interface AiTask {
  id: string;
  title: string;
  description?: string;
  origin?: string;
  riskLevel?: string;
  status?: string;
  prLink?: string;
  confidenceScore?: number | null;
  executionResult?: string;
  generatedByAI?: boolean;
  domain?: string;
  projectId?: string;
  reportId?: string;
  linkedAgentId?: string;
  contextReference?: string;
  executionLogs?: Array<{ event?: string; at?: string; [key: string]: any }>;
  specialistType?: string;
  createdAt?: string;
  updatedAt?: string;
}
