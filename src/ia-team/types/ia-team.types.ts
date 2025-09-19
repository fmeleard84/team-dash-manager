// Types for IA Team module
// Date: 19/09/2025

export interface IAResource {
  id: string;
  name: string;
  profile_id: string;
  prompt_id?: string;
  is_ai: boolean;
  base_price: number;
  category_id: string;
  prompt?: IAPrompt;
}

export interface IAPrompt {
  id: string;
  name: string;
  context: string;
  prompt: string;
  active: boolean;
  priority: number;
  variables?: Record<string, any>;
}

export interface IAResourcePrompt {
  id: string;
  profile_id: string;
  prompt_id: string;
  is_primary: boolean;
  context?: string;
  created_at: string;
  updated_at: string;
}

export interface IAMessage {
  id: string;
  project_id: string;
  sender_id: string; // ID de la ressource IA
  content: string;
  metadata?: {
    type: 'text' | 'deliverable' | 'file' | 'task';
    deliverable_type?: 'document' | 'kanban_card' | 'file';
    deliverable_id?: string;
    file_path?: string;
    task_id?: string;
  };
  created_at: string;
}

export interface IADeliverable {
  id: string;
  project_id: string;
  ia_resource_id: string;
  type: 'document' | 'kanban_card' | 'file' | 'analysis';
  title: string;
  content?: string;
  file_path?: string;
  kanban_column_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface IAWorkflowContext {
  project_id: string;
  ia_resource: IAResource;
  team_members: Array<{
    id: string;
    name: string;
    role: string;
    is_ai: boolean;
  }>;
  request: string;
  requester_id: string;
}

export interface IAWorkflowResult {
  success: boolean;
  deliverable?: IADeliverable;
  message?: string;
  error?: string;
}