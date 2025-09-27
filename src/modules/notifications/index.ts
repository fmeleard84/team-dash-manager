/**
 * Module NOTIFICATIONS - Index Principal
 *
 * Module complet de gestion des notifications pour Team Dash Manager.
 * Centralise toutes les fonctionnalités de notifications avec architecture modulaire.
 *
 * Fonctionnalités:
 * - API complète avec cache et real-time
 * - Hook React optimisé avec filtres et tri
 * - Interface utilisateur moderne avec glassmorphism
 * - Support multi-canal (in-app, email, push, SMS, webhook)
 * - Gestion des événements et invitations
 * - Statistiques et métriques
 * - Intégration Supabase avec RLS
 * - Compatibilité totale avec composants existants
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

// ==========================================
// EXPORTS TYPES
// ==========================================

export type {
  // Types de base
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationMetadata,
  NotificationAction,
  NotificationChannel,

  // Interfaces API
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationResponse,
  NotificationFilters,
  NotificationSorting,
  NotificationStats,
  BulkNotificationRequest,

  // Types de préférences
  NotificationPreferences,
  ChannelSettings,
  UpdatePreferencesRequest,

  // Types de composants
  ModularNotificationCenterProps,
  NotificationItemProps,
  NotificationStatsProps,

  // Types de hooks
  UseNotificationsProps,
  UseNotificationsReturn,
  RealTimeSubscriptionOptions,

  // Types de threads et messages
  MessageThread,
  Message,
  ThreadType,
  ThreadStatus,
  MessageType
} from './types';

// ==========================================
// EXPORTS SERVICES
// ==========================================

export { NotificationsAPI } from './services';

// ==========================================
// EXPORTS HOOKS
// ==========================================

export { useNotifications } from './hooks';

// ==========================================
// EXPORTS COMPOSANTS
// ==========================================

export {
  ModularNotificationCenter,
  NotificationCenter,
  NotificationPanel,
  NotificationHub,
  NotificationCenterView,
  NotificationManager,
  NotificationCenterDefault
} from './components';

// ==========================================
// CONSTANTES ET CONFIGURATION
// ==========================================

/**
 * Configuration par défaut des notifications
 */
export const NOTIFICATION_CONSTANTS = {
  // Types de notifications disponibles
  TYPES: {
    NEW_PROJECT: 'new_project',
    PROJECT_STARTED: 'project_started',
    PROJECT_COMPLETED: 'project_completed',
    PROJECT_ARCHIVED: 'project_archived',
    PROJECT_CANCELLED: 'project_cancelled',

    CARD_ASSIGNED: 'card_assigned',
    CARD_COMPLETED: 'card_completed',
    CARD_UPDATED: 'card_updated',

    TASK_RATING: 'task_rating',
    TASK_DEADLINE: 'task_deadline',

    NEW_MESSAGE: 'new_message',
    MESSAGE_MENTION: 'message_mention',

    EVENT_INVITATION: 'event_invitation',
    EVENT_REMINDER: 'event_reminder',
    EVENT_CANCELLED: 'event_cancelled',

    MISSION_REQUEST: 'mission_request',
    MISSION_ACCEPTED: 'mission_accepted',
    MISSION_DECLINED: 'mission_declined',

    TEAM_COMPLETE: 'team_complete',
    TEAM_INCOMPLETE: 'team_incomplete',

    SYSTEM_ALERT: 'system_alert',
    SYSTEM_MAINTENANCE: 'system_maintenance',

    QUALIFICATION_STARTED: 'qualification_started',
    QUALIFICATION_COMPLETED: 'qualification_completed',

    PROFILE_UPDATED: 'profile_updated',
    SETTINGS_CHANGED: 'settings_changed'
  } as const,

  // Priorités disponibles
  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  } as const,

  // Statuts disponibles
  STATUSES: {
    UNREAD: 'unread',
    READ: 'read',
    ARCHIVED: 'archived'
  } as const,

  // Canaux de diffusion
  CHANNELS: {
    IN_APP: 'in_app',
    EMAIL: 'email',
    PUSH: 'push',
    SMS: 'sms',
    WEBHOOK: 'webhook'
  } as const,

  // Configuration cache
  CACHE: {
    TTL: 1000 * 60 * 2, // 2 minutes
    MAX_ENTRIES: 100
  },

  // Configuration real-time
  REAL_TIME: {
    CHANNEL_PREFIX: 'notifications-',
    RECONNECT_DELAY: 1000,
    MAX_RECONNECT_ATTEMPTS: 5
  },

  // Configuration UI
  UI: {
    MAX_DISPLAY_NOTIFICATIONS: 50,
    AUTO_REFRESH_INTERVAL: 30000, // 30 secondes
    ANIMATION_DURATION: 200,
    TOAST_DURATION: 3000
  },

  // Messages par défaut
  MESSAGES: {
    LOADING: 'Chargement des notifications...',
    ERROR: 'Erreur lors du chargement des notifications',
    EMPTY: 'Aucune notification',
    EMPTY_SUBTITLE: 'Les nouvelles notifications apparaîtront ici',
    MARK_ALL_READ: 'Tout marquer comme lu',
    MARK_READ: 'Marquer comme lu',
    ARCHIVE: 'Archiver',
    ACCEPT: 'Accepter',
    DECLINE: 'Décliner'
  }
};

/**
 * Utilitaires de notifications système prédéfinies
 */
export const NOTIFICATION_HELPERS = {
  /**
   * Crée une notification de nouveau projet
   */
  createNewProjectNotification: (projectName: string, projectId: string) => ({
    type: NOTIFICATION_CONSTANTS.TYPES.NEW_PROJECT,
    priority: NOTIFICATION_CONSTANTS.PRIORITIES.MEDIUM,
    title: 'Nouveau projet disponible',
    message: `Le projet "${projectName}" est maintenant disponible`,
    metadata: { projectId, project_name: projectName },
    channels: [NOTIFICATION_CONSTANTS.CHANNELS.IN_APP, NOTIFICATION_CONSTANTS.CHANNELS.PUSH]
  }),

  /**
   * Crée une notification de tâche assignée
   */
  createTaskAssignedNotification: (taskTitle: string, cardId: string) => ({
    type: NOTIFICATION_CONSTANTS.TYPES.CARD_ASSIGNED,
    priority: NOTIFICATION_CONSTANTS.PRIORITIES.HIGH,
    title: 'Nouvelle tâche assignée',
    message: `Vous avez été assigné à la tâche: ${taskTitle}`,
    metadata: { cardId, card_title: taskTitle },
    channels: [NOTIFICATION_CONSTANTS.CHANNELS.IN_APP, NOTIFICATION_CONSTANTS.CHANNELS.PUSH]
  }),

  /**
   * Crée une notification de message reçu
   */
  createNewMessageNotification: (senderName: string, threadId: string, preview: string) => ({
    type: NOTIFICATION_CONSTANTS.TYPES.NEW_MESSAGE,
    priority: NOTIFICATION_CONSTANTS.PRIORITIES.MEDIUM,
    title: 'Nouveau message',
    message: `${senderName}: ${preview}`,
    metadata: { threadId, sender_name: senderName, messagePreview: preview },
    channels: [NOTIFICATION_CONSTANTS.CHANNELS.IN_APP, NOTIFICATION_CONSTANTS.CHANNELS.PUSH]
  }),

  /**
   * Crée une notification de note reçue
   */
  createTaskRatingNotification: (rating: number, projectName?: string) => ({
    type: NOTIFICATION_CONSTANTS.TYPES.TASK_RATING,
    priority: NOTIFICATION_CONSTANTS.PRIORITIES.MEDIUM,
    title: 'Nouvelle évaluation reçue',
    message: `Vous avez reçu une note de ${rating}/5 étoiles${projectName ? ` sur le projet ${projectName}` : ''}`,
    metadata: { rating, project_name: projectName },
    channels: [NOTIFICATION_CONSTANTS.CHANNELS.IN_APP]
  })
};

/**
 * Configuration des préférences par défaut
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  channels: {
    in_app: {
      enabled: true,
      priority_filter: 'low'
    },
    email: {
      enabled: true,
      priority_filter: 'medium',
      digest_frequency: 'daily'
    },
    push: {
      enabled: true,
      priority_filter: 'high',
      quiet_hours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
      }
    },
    sms: {
      enabled: false,
      priority_filter: 'urgent'
    },
    webhook: {
      enabled: false,
      priority_filter: 'high',
      url: ''
    }
  },
  types: {
    new_project: { enabled: true, channels: ['in_app', 'push'] },
    card_assigned: { enabled: true, channels: ['in_app', 'push', 'email'] },
    task_rating: { enabled: true, channels: ['in_app'] },
    new_message: { enabled: true, channels: ['in_app', 'push'] },
    event_invitation: { enabled: true, channels: ['in_app', 'email'] },
    system_alert: { enabled: true, channels: ['in_app', 'email', 'push'] }
  },
  ui: {
    sound_enabled: true,
    desktop_notifications: true,
    auto_mark_read: false,
    group_similar: true
  }
};

/**
 * Filtres prédéfinis pour les notifications
 */
export const NOTIFICATION_FILTERS = {
  // Filtres rapides
  UNREAD_ONLY: {
    status: [NOTIFICATION_CONSTANTS.STATUSES.UNREAD]
  },
  HIGH_PRIORITY: {
    priorities: [NOTIFICATION_CONSTANTS.PRIORITIES.HIGH, NOTIFICATION_CONSTANTS.PRIORITIES.URGENT]
  },
  PROJECTS: {
    types: [
      NOTIFICATION_CONSTANTS.TYPES.NEW_PROJECT,
      NOTIFICATION_CONSTANTS.TYPES.PROJECT_STARTED,
      NOTIFICATION_CONSTANTS.TYPES.PROJECT_COMPLETED
    ]
  },
  TASKS: {
    types: [
      NOTIFICATION_CONSTANTS.TYPES.CARD_ASSIGNED,
      NOTIFICATION_CONSTANTS.TYPES.CARD_COMPLETED,
      NOTIFICATION_CONSTANTS.TYPES.TASK_RATING
    ]
  },
  MESSAGES: {
    types: [
      NOTIFICATION_CONSTANTS.TYPES.NEW_MESSAGE,
      NOTIFICATION_CONSTANTS.TYPES.MESSAGE_MENTION
    ]
  },
  EVENTS: {
    types: [
      NOTIFICATION_CONSTANTS.TYPES.EVENT_INVITATION,
      NOTIFICATION_CONSTANTS.TYPES.EVENT_REMINDER
    ]
  },
  TODAY: {
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString()
    }
  }
};

// ==========================================
// API QUICK ACCESS
// ==========================================

/**
 * API de raccourci pour les actions courantes
 */
export const notificationAPI = {
  // Actions utilisateur
  markAsRead: NotificationsAPI.markAsRead,
  markAllAsRead: NotificationsAPI.markAllAsRead,
  archive: NotificationsAPI.archiveNotification,
  acceptEvent: NotificationsAPI.acceptEvent,
  declineEvent: NotificationsAPI.declineEvent,

  // Notifications système prédéfinies
  notifyNewProject: NotificationsAPI.notifyNewProject,
  notifyTaskAssigned: NotificationsAPI.notifyTaskAssigned,
  notifyNewMessage: NotificationsAPI.notifyNewMessage,
  notifyTaskRating: NotificationsAPI.notifyTaskRating,

  // Statistiques
  calculateStats: NotificationsAPI.calculateStats
};

// Export par défaut du module complet
export default {
  NotificationsAPI,
  useNotifications,
  ModularNotificationCenter,
  NOTIFICATION_CONSTANTS,
  NOTIFICATION_HELPERS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_FILTERS,
  notificationAPI
};