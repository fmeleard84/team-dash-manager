export type NotificationType = 
  | 'new_project'
  | 'project_status_change'
  | 'message_received'
  | 'project_assigned'
  | 'project_deadline'
  | 'payment_received'
  | 'profile_updated'
  | 'system_alert'
  | 'event_invitation'
  | 'kanban_new_project'
  | 'kanban_card_created'
  | 'kanban_card_updated'
  | 'kanban_card_deleted'
  | 'kanban_column_created'
  | 'kanban_column_deleted';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  metadata?: {
    projectId?: string;
    userId?: string;
    actionUrl?: string;
    eventId?: string;
    eventDate?: string;
    location?: string;
    videoUrl?: string;
    [key: string]: any;
  };
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationTypes: {
    [K in NotificationType]: {
      enabled: boolean;
      email: boolean;
      push: boolean;
    };
  };
}

export interface MessageThread {
  id: string;
  projectId?: string;
  participants: string[];
  title: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  createdAt: string;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
}