/**
 * Module NOTIFICATIONS - Types TypeScript
 *
 * Types complets pour le système de notifications.
 * Basé sur la logique métier existante de useNotifications.ts et NotificationCenter.tsx.
 *
 * Fonctionnalités couvertes:
 * - Notifications temps réel multi-types
 * - Gestion des événements et invitations
 * - Messages et communication
 * - Projets et tâches Kanban
 * - Système de ratings et évaluations
 * - Préférences de notifications
 * - Centre de notifications unifié
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

// ==========================================
// TYPES PRINCIPAUX NOTIFICATIONS
// ==========================================

/**
 * Types de notifications supportés
 * Basé sur la logique existante dans useNotifications.ts
 */
export type NotificationType =
  // Projets
  | 'new_project'              // Nouveau projet créé
  | 'project_started'          // Projet démarré
  | 'project_status_change'    // Changement de statut projet
  | 'project_assigned'         // Assignation projet
  | 'project_deadline'         // Échéance projet
  | 'project_archived'         // Projet archivé
  | 'project_unarchived'       // Projet réactivé
  | 'project_deleted'          // Projet supprimé
  | 'project_cancelled'        // Projet annulé

  // Messages et communication
  | 'new_message'              // Nouveau message
  | 'message_received'         // Message reçu
  | 'message_thread_created'   // Nouveau fil de discussion

  // Tâches et Kanban
  | 'card_assigned'            // Tâche assignée
  | 'card_updated'             // Tâche mise à jour
  | 'card_completed'           // Tâche terminée
  | 'kanban_new_project'       // Nouveau projet Kanban
  | 'kanban_card_created'      // Nouvelle carte Kanban
  | 'kanban_card_updated'      // Carte Kanban mise à jour
  | 'kanban_card_deleted'      // Carte Kanban supprimée
  | 'kanban_column_created'    // Nouvelle colonne Kanban
  | 'kanban_column_deleted'    // Colonne Kanban supprimée

  // Évaluations et notes
  | 'task_rating'              // Note reçue sur une tâche
  | 'project_rating'           // Note reçue sur un projet
  | 'client_feedback'          // Feedback client

  // Événements et invitations
  | 'event_invitation'         // Invitation à un événement
  | 'event_reminder'           // Rappel d'événement
  | 'event_cancelled'          // Événement annulé
  | 'event_updated'            // Événement modifié

  // Équipe et missions
  | 'mission_request'          // Demande de mission
  | 'mission_accepted'         // Mission acceptée
  | 'mission_declined'         // Mission refusée
  | 'team_complete'            // Équipe complète
  | 'team_incomplete'          // Équipe incomplète

  // Finances
  | 'payment_received'         // Paiement reçu
  | 'invoice_generated'        // Facture générée
  | 'billing_alert'           // Alerte facturation

  // Profil et compte
  | 'profile_updated'          // Profil mis à jour
  | 'qualification_completed'  // Qualification terminée
  | 'qualification_expired'    // Qualification expirée

  // Système
  | 'system_alert'             // Alerte système
  | 'maintenance_scheduled'    // Maintenance programmée
  | 'feature_announcement';    // Annonce de fonctionnalité

/**
 * Niveaux de priorité des notifications
 */
export type NotificationPriority =
  | 'low'                      // Priorité basse (info)
  | 'medium'                   // Priorité normale
  | 'high'                     // Priorité haute (attention requise)
  | 'urgent';                  // Priorité urgente (action immédiate)

/**
 * États des notifications
 */
export type NotificationStatus =
  | 'unread'                   // Non lue
  | 'read'                     // Lue
  | 'archived';                // Archivée

/**
 * Canaux de diffusion des notifications
 */
export type NotificationChannel =
  | 'in_app'                   // Dans l'application
  | 'email'                    // Par email
  | 'push'                     // Notification push
  | 'sms'                      // Par SMS
  | 'webhook';                 // Via webhook

// ==========================================
// INTERFACES PRINCIPALES
// ==========================================

/**
 * Structure principale d'une notification
 * Compatible avec l'existant dans useNotifications.ts
 */
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;

  // Contenu
  title: string;
  message: string;

  // Métadonnées spécifiques selon le type
  metadata?: NotificationMetadata;

  // Timestamps
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  expiresAt?: string;

  // Destinataire
  userId: string;
  userType: 'candidate' | 'client' | 'admin';

  // Actions possibles
  actions?: NotificationAction[];

  // Canaux utilisés
  channels: NotificationChannel[];
}

/**
 * Métadonnées des notifications
 * Structure flexible selon le type de notification
 */
export interface NotificationMetadata {
  // Projets
  projectId?: string;
  project_name?: string;
  projectStatus?: string;

  // Événements (compatible avec candidate_event_notifications)
  eventId?: string;
  eventDate?: string;
  location?: string;
  videoUrl?: string;
  eventStatus?: string;

  // Messages
  threadId?: string;
  senderId?: string;
  sender_name?: string;
  messagePreview?: string;

  // Tâches Kanban
  cardId?: string;
  card_title?: string;
  columnId?: string;
  columnName?: string;
  assignedBy?: string;

  // Évaluations
  rating?: number;
  ratingComment?: string;
  ratedBy?: string;

  // Missions
  missionId?: string;
  clientName?: string;
  candidateName?: string;

  // Finances
  amount?: number;
  currency?: string;
  invoiceId?: string;

  // URLs d'action
  actionUrl?: string;
  deepLink?: string;

  // Données arbitraires
  [key: string]: any;
}

/**
 * Actions possibles sur une notification
 */
export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: NotificationActionType;
  data?: Record<string, any>;
}

/**
 * Types d'actions disponibles
 */
export type NotificationActionType =
  | 'mark_as_read'             // Marquer comme lu
  | 'archive'                  // Archiver
  | 'accept_event'             // Accepter événement
  | 'decline_event'            // Refuser événement
  | 'accept_mission'           // Accepter mission
  | 'decline_mission'          // Refuser mission
  | 'view_project'             // Voir projet
  | 'open_message'             // Ouvrir message
  | 'rate_back'                // Noter en retour
  | 'open_calendar'            // Ouvrir calendrier
  | 'download_invoice'         // Télécharger facture
  | 'custom';                  // Action personnalisée

// ==========================================
// PRÉFÉRENCES NOTIFICATIONS
// ==========================================

/**
 * Préférences de notifications utilisateur
 * Basé sur les paramètres des modules candidat/client
 */
export interface NotificationPreferences {
  userId: string;
  userType: 'candidate' | 'client' | 'admin';

  // Canaux globaux
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;

  // Configuration par type de notification
  notificationTypes: {
    [K in NotificationType]: NotificationTypeConfig;
  };

  // Heures silencieuses
  quietHours: {
    enabled: boolean;
    start: string;        // HH:mm
    end: string;          // HH:mm
    timezone: string;
    days: WeekDay[];
  };

  // Fréquence des résumés
  digestFrequency: DigestFrequency;

  // Paramètres avancés
  groupSimilarNotifications: boolean;
  autoArchiveAfterDays: number;
  maxNotificationsPerDay: number;

  // Dernière mise à jour
  updatedAt: string;
}

/**
 * Configuration par type de notification
 */
export interface NotificationTypeConfig {
  enabled: boolean;
  channels: {
    in_app: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  priority: NotificationPriority;
  autoArchive: boolean;
}

/**
 * Jours de la semaine
 */
export type WeekDay =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  | 'friday' | 'saturday' | 'sunday';

/**
 * Fréquence des résumés
 */
export type DigestFrequency =
  | 'never'                    // Jamais
  | 'daily'                    // Quotidien
  | 'weekly'                   // Hebdomadaire
  | 'monthly';                 // Mensuel

// ==========================================
// THREADS DE MESSAGES
// ==========================================

/**
 * Fil de discussion de messages
 * Compatible avec la logique existante
 */
export interface MessageThread {
  id: string;
  projectId?: string;
  participants: ThreadParticipant[];
  title: string;
  description?: string;

  // Messages
  lastMessage?: Message;
  lastMessageAt: string;
  messageCount: number;

  // Statut non lu par participant
  unreadCounts: Record<string, number>;

  // Métadonnées
  type: ThreadType;
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;

  // Paramètres
  isArchived: boolean;
  isPinned: boolean;
  notifications: boolean;
}

/**
 * Participant d'un thread
 */
export interface ThreadParticipant {
  userId: string;
  userType: 'candidate' | 'client' | 'admin';
  name: string;
  avatar?: string;
  role: ParticipantRole;
  joinedAt: string;
  lastSeenAt?: string;
}

/**
 * Message dans un thread
 */
export interface Message {
  id: string;
  threadId: string;

  // Expéditeur
  senderId: string;
  senderName: string;
  senderType: 'candidate' | 'client' | 'admin' | 'system';

  // Contenu
  content: string;
  contentType: MessageContentType;

  // Pièces jointes
  attachments?: MessageAttachment[];

  // Métadonnées
  metadata?: MessageMetadata;

  // Statuts de lecture
  readBy: MessageReadStatus[];

  // Réactions
  reactions?: MessageReaction[];

  // Timestamps
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;

  // États
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
}

/**
 * Types de threads
 */
export type ThreadType =
  | 'project'                  // Discussion projet
  | 'direct'                   // Message direct
  | 'team'                     // Discussion équipe
  | 'support'                  // Support client
  | 'announcement';            // Annonces

/**
 * États des threads
 */
export type ThreadStatus =
  | 'active'                   // Actif
  | 'archived'                 // Archivé
  | 'closed'                   // Fermé
  | 'locked';                  // Verrouillé

/**
 * Rôles des participants
 */
export type ParticipantRole =
  | 'owner'                    // Propriétaire
  | 'admin'                    // Administrateur
  | 'member'                   // Membre
  | 'guest';                   // Invité

/**
 * Types de contenu de message
 */
export type MessageContentType =
  | 'text'                     // Texte simple
  | 'markdown'                 // Markdown
  | 'html'                     // HTML
  | 'system';                  // Message système

/**
 * Pièce jointe
 */
export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;               // MIME type
  size: number;               // Taille en octets
  thumbnail?: string;         // Miniature pour images
  createdAt: string;
}

/**
 * Métadonnées de message
 */
export interface MessageMetadata {
  quotedMessageId?: string;    // Message cité
  mentionedUsers?: string[];   // Utilisateurs mentionnés
  tags?: string[];             // Tags
  priority?: MessagePriority;  // Priorité

  // Données spécifiques
  [key: string]: any;
}

/**
 * Priorité des messages
 */
export type MessagePriority =
  | 'normal'                   // Normal
  | 'high'                     // Haute
  | 'urgent';                  // Urgente

/**
 * Statut de lecture d'un message
 */
export interface MessageReadStatus {
  userId: string;
  readAt: string;
  deviceType?: string;
}

/**
 * Réaction à un message
 */
export interface MessageReaction {
  emoji: string;
  users: string[];             // IDs des utilisateurs
  count: number;
}

// ==========================================
// CENTRE DE NOTIFICATIONS
// ==========================================

/**
 * État du centre de notifications
 */
export interface NotificationCenterState {
  notifications: Notification[];
  threads: MessageThread[];

  // Filtres et tri
  filters: NotificationFilters;
  sorting: NotificationSorting;

  // Statistiques
  stats: NotificationStats;

  // États UI
  isLoading: boolean;
  error: string | null;
  lastSync: string | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Filtres de notifications
 */
export interface NotificationFilters {
  status?: NotificationStatus[];
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
}

/**
 * Tri des notifications
 */
export interface NotificationSorting {
  field: 'createdAt' | 'priority' | 'status' | 'type';
  direction: 'asc' | 'desc';
}

/**
 * Statistiques des notifications
 */
export interface NotificationStats {
  total: number;
  unread: number;
  byStatus: Record<NotificationStatus, number>;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// ==========================================
// API ET SERVICES
// ==========================================

/**
 * Réponse API générique
 */
export interface NotificationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Requête de création de notification
 */
export interface CreateNotificationRequest {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  userId: string;
  userType: 'candidate' | 'client' | 'admin';
  metadata?: NotificationMetadata;
  channels?: NotificationChannel[];
  expiresAt?: string;
  actions?: NotificationAction[];
}

/**
 * Requête de mise à jour de notification
 */
export interface UpdateNotificationRequest {
  id: string;
  status?: NotificationStatus;
  metadata?: Partial<NotificationMetadata>;
}

/**
 * Requête de mise à jour des préférences
 */
export interface UpdatePreferencesRequest {
  userId: string;
  preferences: Partial<NotificationPreferences>;
}

/**
 * Configuration d'envoi en lot
 */
export interface BulkNotificationRequest {
  notifications: CreateNotificationRequest[];
  options?: {
    throttle: boolean;
    maxPerSecond: number;
    skipDuplicates: boolean;
  };
}

// ==========================================
// HOOKS ET GESTION D'ÉTAT
// ==========================================

/**
 * Retour du hook useNotifications
 * Compatible avec l'existant
 */
export interface UseNotificationsReturn {
  // État des notifications
  notifications: Notification[];
  threads: MessageThread[];
  stats: NotificationStats;
  isLoading: boolean;
  error: string | null;

  // Actions de base
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  archiveAll: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // Actions spécifiques événements
  acceptEvent: (id: string) => Promise<void>;
  declineEvent: (id: string) => Promise<void>;

  // Actions spécifiques missions
  acceptMission: (id: string) => Promise<void>;
  declineMission: (id: string) => Promise<void>;

  // Gestion des threads
  createThread: (participants: string[], title: string, projectId?: string) => Promise<MessageThread>;
  sendMessage: (threadId: string, content: string, attachments?: File[]) => Promise<Message>;
  markThreadAsRead: (threadId: string) => Promise<void>;

  // Filtres et recherche
  applyFilters: (filters: NotificationFilters) => void;
  setSorting: (sorting: NotificationSorting) => void;
  search: (query: string) => void;

  // Pagination
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Préférences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;

  // Real-time
  subscribe: () => void;
  unsubscribe: () => void;
}

/**
 * Configuration du système de notifications
 */
export interface NotificationSystemConfig {
  // Real-time
  realTimeEnabled: boolean;
  channels: string[];

  // Limites
  maxNotificationsPerUser: number;
  maxThreadsPerUser: number;
  maxMessagesPerThread: number;

  // Rétention
  autoArchiveDays: number;
  autoDeleteDays: number;

  // Performance
  cacheEnabled: boolean;
  cacheTtl: number;
  batchSize: number;

  // Sécurité
  rateLimiting: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
}

// Export par défaut de toutes les interfaces principales
export default {
  // Types principaux
  Notification,
  NotificationPreferences,
  MessageThread,
  Message,

  // États
  NotificationCenterState,
  NotificationStats,

  // API
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationResponse,

  // Hooks
  UseNotificationsReturn,

  // Configuration
  NotificationSystemConfig
};