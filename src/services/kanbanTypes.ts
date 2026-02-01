export type KanbanStatus = "no_status" | "not_started" | "in_progress" | "completed";

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  status: KanbanStatus;
  projectId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KanbanItem {
  id: string;
  text: string;
  status: KanbanStatus;
  order: number;
  projectId: string;
  columnId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KanbanProjectSnapshot {
  projectId: string;
  columns: KanbanColumn[];
  items: KanbanItem[];
}
