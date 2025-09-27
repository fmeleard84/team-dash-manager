// Types pour le module Messages modernisé

export interface MessageThread {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_active: boolean;
  unread_count: number;
  participants: MessageParticipant[];
  thread_type: 'general' | 'private' | 'announcement' | 'support' | 'ai_chat';
  is_archived?: boolean;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_message_id?: string;
  is_edited: boolean;
  message_attachments?: MessageAttachment[];
  message_type: 'text' | 'file' | 'image' | 'system' | 'ai_response';
  mentions?: string[]; // User IDs mentioned
  reactions?: MessageReaction[];
  is_deleted?: boolean;
  edit_history?: MessageEdit[];
  metadata?: Record<string, any>;
}

export interface MessageParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'ai';
  joined_at: string;
  last_seen_at?: string;
  is_online?: boolean;
  is_typing?: boolean;
  notification_settings?: ParticipantNotificationSettings;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  thumbnail_url?: string;
  is_image?: boolean;
  is_video?: boolean;
  is_document?: boolean;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  user_name: string;
  emoji: string;
  created_at: string;
}

export interface MessageEdit {
  id: string;
  message_id: string;
  previous_content: string;
  new_content: string;
  edited_by: string;
  edited_at: string;
  edit_reason?: string;
}

export interface MessageGroup {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: string[]; // User IDs
  is_default: boolean;
  is_private: boolean;
  color?: string;
  avatar?: string;
}

export interface UserPresence {
  user_id: string;
  user_name: string;
  is_online: boolean;
  last_seen_at: string;
  current_activity?: string;
  is_typing_in_thread?: string;
}

export interface ParticipantNotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  mention_notifications: boolean;
  thread_notifications: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface ThreadSettings {
  allow_file_uploads: boolean;
  allow_reactions: boolean;
  allow_mentions: boolean;
  auto_archive_inactive_days?: number;
  max_participants?: number;
  require_approval_to_join: boolean;
  ai_assistant_enabled: boolean;
  ai_assistant_prompt?: string;
}

export interface MessageSystemEvent {
  type: 'user_joined' | 'user_left' | 'thread_created' | 'thread_renamed' |
        'file_uploaded' | 'ai_response' | 'system_announcement';
  user_id?: string;
  user_name?: string;
  thread_id: string;
  data?: any;
  timestamp: string;
}

// Types pour les filtres et recherche
export interface MessageFilters {
  thread_id?: string;
  sender_id?: string;
  message_type?: Message['message_type'];
  has_attachments?: boolean;
  date_from?: string;
  date_to?: string;
  mentions_me?: boolean;
  unread_only?: boolean;
  search_query?: string;
}

export interface ThreadFilters {
  project_id?: string;
  thread_type?: MessageThread['thread_type'];
  is_archived?: boolean;
  has_unread?: boolean;
  participant_id?: string;
  created_by?: string;
  search_query?: string;
}

// Types pour les actions CRUD
export interface CreateThreadData {
  project_id: string;
  title: string;
  description?: string;
  thread_type?: MessageThread['thread_type'];
  participants?: string[]; // User IDs
  settings?: Partial<ThreadSettings>;
  initial_message?: string;
}

export interface UpdateThreadData extends Partial<CreateThreadData> {
  is_archived?: boolean;
  settings?: Partial<ThreadSettings>;
}

export interface SendMessageData {
  thread_id: string;
  content: string;
  parent_message_id?: string;
  message_type?: Message['message_type'];
  mentions?: string[];
  attachments?: File[];
  metadata?: Record<string, any>;
}

export interface UpdateMessageData {
  content?: string;
  is_deleted?: boolean;
  edit_reason?: string;
}

export interface AddParticipantData {
  thread_id: string;
  user_id: string;
  role?: MessageParticipant['role'];
  notification_settings?: ParticipantNotificationSettings;
}

// Types pour les statistiques
export interface MessageStats {
  total_threads: number;
  total_messages: number;
  unread_messages: number;
  active_participants: number;
  messages_today: number;
  most_active_thread: string;
  response_time_avg_minutes: number;
  file_attachments_count: number;
}

export interface ThreadAnalytics {
  thread_id: string;
  message_count: number;
  participant_count: number;
  messages_by_day: Record<string, number>;
  most_active_participants: Array<{
    user_id: string;
    user_name: string;
    message_count: number;
  }>;
  average_response_time: number;
  file_upload_count: number;
  last_activity: string;
}

// Types pour les événements temps réel
export interface MessageRealtimeEvent {
  type: 'message_sent' | 'message_updated' | 'message_deleted' |
        'thread_created' | 'thread_updated' | 'participant_added' | 'participant_removed' |
        'user_typing' | 'user_stopped_typing' | 'user_joined' | 'user_left' |
        'reaction_added' | 'reaction_removed';
  thread_id: string;
  user_id: string;
  data: any;
  timestamp: string;
}

export interface TypingIndicator {
  thread_id: string;
  user_id: string;
  user_name: string;
  is_typing: boolean;
  timestamp: string;
}

// Types pour les notifications
export interface MessageNotification {
  id: string;
  user_id: string;
  thread_id: string;
  message_id?: string;
  notification_type: 'mention' | 'new_message' | 'thread_invitation' | 'system';
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

// Types pour l'intégration IA
export interface AIAssistant {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  is_active: boolean;
  project_id?: string;
  thread_ids: string[];
  capabilities: string[];
  response_delay_seconds: number;
  auto_respond_to_mentions: boolean;
  learning_enabled: boolean;
}

export interface AIResponse {
  id: string;
  thread_id: string;
  original_message_id: string;
  assistant_id: string;
  response_content: string;
  confidence_score: number;
  processing_time_ms: number;
  created_at: string;
  feedback_score?: number;
  was_helpful?: boolean;
}

// Types pour les intégrations externes
export interface ExternalIntegration {
  id: string;
  name: string;
  type: 'slack' | 'discord' | 'teams' | 'webhook' | 'email';
  project_id: string;
  thread_id?: string;
  config: Record<string, any>;
  is_active: boolean;
  sync_incoming: boolean;
  sync_outgoing: boolean;
  last_sync_at?: string;
}

// Types pour les templates de messages
export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'announcement' | 'meeting' | 'status_update' | 'question' | 'custom';
  project_id?: string;
  created_by: string;
  is_public: boolean;
  usage_count: number;
  variables: string[]; // Variables à remplacer dans le template
}

export default {
  MessageThread,
  Message,
  MessageParticipant,
  MessageAttachment,
  MessageReaction,
  MessageEdit,
  MessageGroup,
  UserPresence,
  MessageSystemEvent,
  MessageFilters,
  ThreadFilters,
  CreateThreadData,
  UpdateThreadData,
  SendMessageData,
  UpdateMessageData,
  AddParticipantData,
  MessageStats,
  ThreadAnalytics,
  MessageRealtimeEvent,
  TypingIndicator,
  MessageNotification,
  AIAssistant,
  AIResponse,
  ExternalIntegration,
  MessageTemplate
};