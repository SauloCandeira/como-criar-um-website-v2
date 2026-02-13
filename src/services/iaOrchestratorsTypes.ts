export interface IaOrchestrator {
  id: string;
  name: string;
  storage_url?: string;
  execution_flow: unknown;
  is_active: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IaOrchestratorContent {
  id: string;
  name: string;
  storage_url?: string;
  version?: number;
  is_active?: boolean;
  content: string;
}

export interface IaOrchestratorExecutionStep {
  step: string;
  status: string;
  execution_time_ms?: number;
  token_usage?: number;
}

export interface IaOrchestratorExecution {
  id: string;
  orchestrator_id?: string;
  version: number;
  steps_executed: IaOrchestratorExecutionStep[];
  agents_used: string[];
  memory_retrieved_count: number;
  token_usage: number;
  execution_time?: number;
  status?: string;
  created_at?: string;
}

export interface IaAuthorityFlags {
  managedByAI?: boolean;
  taskCreationPolicy?: string;
  allowAutoBacklogIfEmpty?: boolean;
}

export interface IaOrchestratorSummary {
  activeOrchestrator: IaOrchestrator | null;
  activeContextsCount: number;
  activeAgentsCount: number;
  activeAgents?: { id: string; name: string; specialty?: string }[];
  systemFlags: IaAuthorityFlags;
  lastExecution?: IaOrchestratorExecution | null;
}
