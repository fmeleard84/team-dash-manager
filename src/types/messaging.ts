// Types pour le système de messagerie amélioré

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
  is_typing: string[];
  online_users: string[];
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_message_id?: string;
  is_edited: boolean;
  edit_count: number;
  attachments?: MessageAttachment[];
  read_by?: MessageReadStatus[];
  reactions?: MessageReaction[];
  mentions?: string[];
  is_system_message: boolean;
}

export interface MessageParticipant {
  id: string;
  thread_id: string;
  user_id?: string;
  email: string;
  name: string;
  role: 'client' | 'candidate';
  joined_at: string;
  last_read_at?: string;
  last_seen_at?: string;
  is_active: boolean;
  is_online: boolean;
  is_typing: boolean;
  notification_preferences?: NotificationPreferences;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  download_count: number;
  is_image: boolean;
  thumbnail_url?: string;
}

export interface MessageReadStatus {
  id: string;
  message_id: string;
  user_email: string;
  read_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_email: string;
  emoji: string;
  created_at: string;
}

export interface TypingIndicator {
  user_email: string;
  user_name: string;
  thread_id: string;
  started_at: string;
  expires_at: string;
}

export interface UserPresence {
  id: string;
  user_email: string;
  user_name: string;
  project_id?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  sound: boolean;
  desktop: boolean;
  email: boolean;
  mobile: boolean;
}

export interface MessageNotification {
  id: string;
  type: 'new_message' | 'file_shared' | 'video_call_started' | 'mention';
  title: string;
  message: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  threadId: string;
  projectId: string;
  metadata?: {
    messageId?: string;
    attachmentCount?: number;
    callRoomName?: string;
    mentionedUsers?: string[];
  };
  createdAt: string;
}

export interface JitsiMeetConfig {
  roomName: string;
  displayName: string;
  participants: MessageParticipant[];
  moderator?: boolean;
  password?: string;
  domain?: string;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

// Utilitaires pour les types
export type MessageEventType = 'message_sent' | 'message_edited' | 'message_deleted' | 'reaction_added' | 'reaction_removed' | 'typing_start' | 'typing_stop' | 'user_joined' | 'user_left';

export interface MessageEvent {
  type: MessageEventType;
  payload: any;
  timestamp: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ThreadStats {
  total_messages: number;
  total_participants: number;
  online_participants: number;
  unread_messages: number;
  last_activity: string;
}

export interface MessageFilter {
  sender?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachments?: boolean;
  isSystemMessage?: boolean;
  searchQuery?: string;
}

export interface MessageSearchResult {
  message: Message;
  thread: MessageThread;
  highlightedContent: string;
  matchScore: number;
}

// Constantes
export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  IMAGE: 'image',
  VIDEO_CALL: 'video_call',
  AUDIO_CALL: 'audio_call',
  SYSTEM: 'system'
} as const;

export const USER_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline'
} as const;

export const EMOJI_REACTIONS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏'
] as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type EmojiReaction = typeof EMOJI_REACTIONS[number];