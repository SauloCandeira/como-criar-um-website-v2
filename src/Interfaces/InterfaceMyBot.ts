export type MyBotStage = "assistant" | "copilot" | "representative";

export interface InterfaceMyBot {
  userId: string;
  myalienUserId: string;
  stage: MyBotStage;
  stageReason: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterfaceMyBotStats {
  userId: string;
  contentAccessedCount: number;
  projectsPurchasedCount: number;
  projectsCreatedCount: number;
  coursesStartedCount: number;
  coursesCompletedCount: number;
  marketplaceInteractionsCount: number;
  toolUsageCount: number;
  feedbackScore: number;
  lastEventAt?: string;
}

export interface InterfaceMyBotEvent {
  id: string;
  eventType: string;
  source: string;
  payload: any;
  reversible: boolean;
  occurredAt?: string;
  createdAt?: string;
  revertedAt?: string;
  correlationId?: string;
  version?: number;
}

export interface InterfaceMyBotMemory {
  id: string;
  userId: string;
  layer: "short" | "mid" | "long";
  memoryKey: string;
  value: any;
  version: number;
  isActive: boolean;
  lastEventId?: string;
  createdAt?: string;
  updatedAt?: string;
}
