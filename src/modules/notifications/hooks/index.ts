/**
 * Module NOTIFICATIONS - Hooks Index
 *
 * Point d'entrée pour tous les hooks du module notifications.
 * Centralise l'export des hooks React.
 */

export { useNotifications } from './useNotifications';

// Re-exports pour simplicité d'usage
export type {
  UseNotificationsProps,
  UseNotificationsReturn,
  NotificationFilters,
  NotificationSorting,
  RealTimeSubscriptionOptions
} from '../types';