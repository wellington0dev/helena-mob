export type Role = 'user' | 'assistant' | 'system' | 'tool';
export type MediaType =
  | 'image'
  | 'audio'
  | 'document'
  | 'spreadsheet'
  | 'pdf'
  | null;

export interface ChatMessage {
  id: number;
  role: Role;
  content: string;
  media_url: string | null;
  media_type: MediaType;
  media_meta: Record<string, any> | null;
  tool_name: string | null;
  created_at: string;
}

export interface User {
  id: number;
  name: string | null;
  email: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface SendResponse {
  message: ChatMessage;
  replies: ChatMessage[];
}

export interface ChatInfo {
  started_at: string | null;
  total_messages: number;
  media: ChatMessage[];
}
