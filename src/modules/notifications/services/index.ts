/**
 * Module NOTIFICATIONS - Services Index
 *
 * Point d'entrée pour tous les services du module notifications.
 * Centralise l'export des services API.
 */

export { NotificationsAPI } from './notificationsAPI';

// Re-exports pour simplicité d'usage
export type {
  NotificationResponse,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationFilters,
  NotificationStats
} from '../types';