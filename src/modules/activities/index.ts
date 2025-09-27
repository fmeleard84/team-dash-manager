/**
 * Module ACTIVITÉS - Export Principal
 *
 * Ce module gère tous les aspects liés au suivi du temps et des activités :
 * - Timer en temps réel avec contrôles
 * - Suivi automatique des sessions
 * - Statistiques de productivité et analytiques
 * - Export et rapports détaillés
 * - Templates d'activités réutilisables
 *
 * Architecture modulaire suivant le pattern établi dans les autres modules.
 */

// ==========================================
// COMPOSANTS
// ==========================================

export {
  ModularActivitiesView,
  CandidateActivities, // Alias pour compatibilité
  ActivitiesView, // Alias pour compatibilité
  ACTIVITIES_MODULE_CONFIG
} from './components';

// ==========================================
// HOOKS
// ==========================================

export {
  useActivities,
  useActivityActions,
  useActivityStats,
  useActivityTimer
} from './hooks';

// ==========================================
// SERVICES
// ==========================================

export {
  ActivitiesAPI
} from './services';

// ==========================================
// TYPES
// ==========================================

export type {
  // Core types
  TimeSession,
  ActivityItem,
  ActivityStats,
  ActivityTemplate,

  // Filters and params
  ActivityFilters,
  ActivitySortBy,
  ActivityExportFormat,
  CreateTimeSessionData,
  UpdateTimeSessionData,
  ActivityType,
  ActivityStatus,
  ActivityPriority,

  // API types
  ActivityAPIResponse,
  ActivityPaginatedResponse,
  ActivityExport,
  ActivityError,
  ActivityErrorCode,

  // Hooks return types
  UseActivitiesReturn,
  UseActivityActionsReturn,
  UseActivityStatsReturn,
  UseActivityTimerReturn,

  // Stats and analytics
  ActivityTypeDistribution,
  ProjectActivityStats,
  MonthlyActivityStats,
  ActivityRecommendation,
  ActivityGoal,
  PeriodComparison,
  BenchmarkComparison,

  // Component props
  ModularActivitiesViewProps,
  ActivityTimerProps,
  ActivityStatsCardProps,
  ActivityListProps,

  // Utilities
  KeysOf,
  PartialBy,
  ActivityModuleConfig
} from './types';

// ==========================================
// CONSTANTES ET UTILITAIRES
// ==========================================

export const ACTIVITY_CONSTANTS = {
  // Types d'activité
  ACTIVITY_TYPES: {
    TASK: 'task',
    MEETING: 'meeting',
    RESEARCH: 'research',
    DEVELOPMENT: 'development',
    DOCUMENTATION: 'documentation',
    OTHER: 'other'
  } as const,

  // Statuts de session
  STATUSES: {
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  } as const,

  // Niveaux de priorité
  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  } as const,

  // Formats d'export
  EXPORT_FORMATS: {
    CSV: 'csv',
    PDF: 'pdf',
    EXCEL: 'excel',
    JSON: 'json'
  } as const,

  // Durées et limites
  DURATIONS: {
    MIN_SESSION: 1, // 1 minute minimum
    MAX_SESSION: 480, // 8 heures maximum
    AUTO_SAVE_INTERVAL: 60, // 1 minute
    IDLE_TIMEOUT: 1800 // 30 minutes
  } as const,

  // Couleurs pour les types d'activité
  TYPE_COLORS: {
    task: 'text-blue-600 bg-blue-100',
    meeting: 'text-purple-600 bg-purple-100',
    research: 'text-green-600 bg-green-100',
    development: 'text-orange-600 bg-orange-100',
    documentation: 'text-gray-600 bg-gray-100',
    other: 'text-indigo-600 bg-indigo-100'
  } as const,

  // Couleurs pour les statuts
  STATUS_COLORS: {
    active: 'text-green-600 bg-green-100 animate-pulse',
    paused: 'text-orange-600 bg-orange-100',
    completed: 'text-gray-600 bg-gray-100',
    cancelled: 'text-red-600 bg-red-100'
  } as const,

  // Seuils de performance
  PERFORMANCE_THRESHOLDS: {
    EXCELLENT: 80,
    GOOD: 60,
    AVERAGE: 40,
    POOR: 0
  } as const
} as const;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Formate une durée en minutes en format lisible
 */
export const formatActivityDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Formate un temps en secondes au format HH:MM:SS
 */
export const formatActivityTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formate un coût en euros
 */
export const formatActivityCost = (cost: number): string => {
  return `${cost.toFixed(2)}€`;
};

/**
 * Obtient la couleur d'un type d'activité
 */
export const getActivityTypeColor = (type: string): string => {
  return ACTIVITY_CONSTANTS.TYPE_COLORS[type as keyof typeof ACTIVITY_CONSTANTS.TYPE_COLORS] || ACTIVITY_CONSTANTS.TYPE_COLORS.other;
};

/**
 * Obtient la couleur d'un statut d'activité
 */
export const getActivityStatusColor = (status: string): string => {
  return ACTIVITY_CONSTANTS.STATUS_COLORS[status as keyof typeof ACTIVITY_CONSTANTS.STATUS_COLORS] || ACTIVITY_CONSTANTS.STATUS_COLORS.completed;
};

/**
 * Valide une durée de session
 */
export const validateSessionDuration = (minutes: number): boolean => {
  return minutes >= ACTIVITY_CONSTANTS.DURATIONS.MIN_SESSION &&
         minutes <= ACTIVITY_CONSTANTS.DURATIONS.MAX_SESSION;
};

/**
 * Calcule le niveau de performance basé sur un score
 */
export const getPerformanceLevel = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
  if (score >= ACTIVITY_CONSTANTS.PERFORMANCE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= ACTIVITY_CONSTANTS.PERFORMANCE_THRESHOLDS.GOOD) return 'good';
  if (score >= ACTIVITY_CONSTANTS.PERFORMANCE_THRESHOLDS.AVERAGE) return 'average';
  return 'poor';
};

/**
 * Génère des tags par défaut pour un type d'activité
 */
export const getDefaultActivityTags = (type: string): string[] => {
  const tagMap: Record<string, string[]> = {
    task: ['tâche', 'travail'],
    meeting: ['réunion', 'équipe', 'client'],
    research: ['recherche', 'analyse'],
    development: ['dev', 'code', 'programmation'],
    documentation: ['doc', 'rédaction'],
    other: ['divers']
  };

  return tagMap[type] || tagMap.other;
};

// ==========================================
// DOCUMENTATION DU MODULE
// ==========================================

/**
 * ## Module ACTIVITÉS
 *
 * ### Fonctionnalités principales :
 *
 * 1. **Suivi du temps**
 *    - Timer en temps réel avec millisecondes
 *    - Contrôles play/pause/stop
 *    - Auto-sauvegarde périodique
 *    - Gestion des interruptions
 *
 * 2. **Gestion des sessions**
 *    - Création et modification des sessions
 *    - Support des templates d'activité
 *    - Categorisation par type et priorité
 *    - Notes et tags personnalisables
 *
 * 3. **Statistiques avancées**
 *    - Scores de productivité et consistance
 *    - Distribution par projet et type
 *    - Tendances temporelles
 *    - Comparaisons de périodes
 *
 * 4. **Analytiques**
 *    - Recommandations d'amélioration
 *    - Objectifs et suivi de progression
 *    - Benchmarking avec moyennes
 *    - Prédictions basées sur l'historique
 *
 * 5. **Export et rapports**
 *    - Export en CSV, JSON, PDF, Excel
 *    - Filtres avancés pour les exports
 *    - Rapports personnalisés
 *    - Génération automatique
 *
 * ### Architecture :
 *
 * - **Services** : ActivitiesAPI pour toutes les interactions Supabase
 * - **Hooks** : 4 hooks spécialisés pour différents aspects
 * - **Composants** : Interface modulaire avec timer intégré
 * - **Types** : Plus de 30 types TypeScript pour la sécurité
 *
 * ### Real-time :
 *
 * - Timer synchronisé en temps réel
 * - Mises à jour automatiques des statistiques
 * - Notifications de changements d'état
 * - Synchronisation multi-onglets
 *
 * ### Usage :
 *
 * ```typescript
 * import { ModularActivitiesView, useActivityTimer } from '@/modules/activities';
 *
 * // Dans un composant candidat
 * <ModularActivitiesView
 *   candidateId={user.id}
 *   availableProjects={projects}
 *   showTimer={true}
 *   showStats={true}
 *   showExportOptions={true}
 * />
 *
 * // Ou utiliser le timer directement
 * const { startTimer, pauseTimer, stopTimer, formattedTime } = useActivityTimer();
 * ```
 *
 * ### Intégration :
 *
 * Le module s'intègre parfaitement avec :
 * - Module KANBAN (timer pour les tâches)
 * - Module PROJETS (suivi par projet)
 * - Module PAIEMENTS (calcul des revenus)
 * - Système d'authentification
 * - Tables time_tracking_sessions
 */