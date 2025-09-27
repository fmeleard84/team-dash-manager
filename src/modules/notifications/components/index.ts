/**
 * Module NOTIFICATIONS - Composants Index
 *
 * Centralise l'export de tous les composants du module notifications.
 * Fournit des alias pour la compatibilité avec l'architecture existante.
 */

export { ModularNotificationCenter } from './ModularNotificationCenter';

// Aliases pour compatibilité et simplicité d'usage
export { ModularNotificationCenter as NotificationCenter } from './ModularNotificationCenter';
export { ModularNotificationCenter as NotificationPanel } from './ModularNotificationCenter';
export { ModularNotificationCenter as NotificationHub } from './ModularNotificationCenter';
export { ModularNotificationCenter as NotificationCenterView } from './ModularNotificationCenter';
export { ModularNotificationCenter as NotificationManager } from './ModularNotificationCenter';

// Export du composant par défaut
export { default as NotificationCenterDefault } from './ModularNotificationCenter';