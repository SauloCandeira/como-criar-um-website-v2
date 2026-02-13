export interface IaConversation {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IaMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | string;
  content: string;
  created_at?: string;
}

export interface IaChatResponse {
  conversationId: string;
  assistantMessage: string;
}
