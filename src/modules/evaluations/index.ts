/**
 * Module ÉVALUATIONS - Export Principal
 *
 * Ce module gère tous les aspects liés aux évaluations et notes des candidats :
 * - Système de notation 5 étoiles
 * - Commentaires détaillés des clients
 * - Statistiques de performance
 * - Analytiques et tendances
 * - Export et rapports
 *
 * Architecture modulaire suivant le pattern établi dans les autres modules.
 */

// ==========================================
// COMPOSANTS
// ==========================================

export {
  ModularEvaluationsView,
  CandidateRatings, // Alias pour compatibilité
  CandidateEvaluations, // Alias pour compatibilité
  EVALUATIONS_MODULE_CONFIG
} from './components';

// ==========================================
// HOOKS
// ==========================================

export {
  useEvaluations,
  useEvaluationActions,
  useEvaluationStats,
  useRatingDialog
} from './hooks';

// ==========================================
// SERVICES
// ==========================================

export {
  EvaluationsAPI
} from './services';

// ==========================================
// TYPES
// ==========================================

export type {
  // Core types
  TaskRating,
  TaskComment,
  EvaluationItem,
  EvaluationStats,

  // Filters and params
  EvaluationFilters,
  EvaluationSortBy,
  EvaluationExportFormat,
  CreateRatingData,
  UpdateRatingData,

  // API types
  EvaluationAPIResponse,
  EvaluationPaginatedResponse,
  EvaluationExport,
  EvaluationError,
  EvaluationErrorCode,

  // Hooks return types
  UseEvaluationsReturn,
  UseEvaluationActionsReturn,
  UseEvaluationStatsReturn,
  UseRatingDialogReturn,

  // Stats and analytics
  RatingDistribution,
  MonthlyEvaluationStats,
  ProjectEvaluationStats,
  ClientEvaluationStats,

  // Component props
  ModularEvaluationsViewProps,
  StarRatingProps,
  RatingCardProps,

  // Utilities
  KeysOf,
  PartialBy,
  EvaluationModuleConfig
} from './types';

// ==========================================
// CONSTANTES ET UTILITAIRES
// ==========================================

export const EVALUATION_CONSTANTS = {
  // Système de notation
  RATING_RANGE: {
    MIN: 1,
    MAX: 5
  } as const,

  // Labels des notes
  RATING_LABELS: {
    1: 'Insuffisant',
    2: 'Moyen',
    3: 'Bien',
    4: 'Très bien',
    5: 'Excellent'
  } as const,

  // Couleurs des notes
  RATING_COLORS: {
    1: 'text-red-600',
    2: 'text-orange-600',
    3: 'text-yellow-600',
    4: 'text-green-600',
    5: 'text-emerald-600'
  } as const,

  // Seuils de performance
  PERFORMANCE_THRESHOLDS: {
    EXCELLENT: 4.5,
    GOOD: 3.5,
    AVERAGE: 2.5,
    POOR: 0
  } as const,

  // Formats d'export
  EXPORT_FORMATS: {
    CSV: 'csv',
    PDF: 'pdf',
    EXCEL: 'excel',
    JSON: 'json'
  } as const
} as const;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Formate une note en label lisible
 */
export const formatRatingLabel = (rating: number): string => {
  const labels = EVALUATION_CONSTANTS.RATING_LABELS;
  return labels[rating as keyof typeof labels] || '';
};

/**
 * Obtient la couleur CSS d'une note
 */
export const getRatingColor = (rating: number): string => {
  const colors = EVALUATION_CONSTANTS.RATING_COLORS;
  return colors[rating as keyof typeof colors] || 'text-gray-600';
};

/**
 * Calcule la moyenne d'un tableau de notes
 */
export const calculateAverageRating = (ratings: number[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Number((sum / ratings.length).toFixed(2));
};

/**
 * Détermine le niveau de performance basé sur la note moyenne
 */
export const getPerformanceLevel = (averageRating: number): 'excellent' | 'good' | 'average' | 'poor' => {
  const thresholds = EVALUATION_CONSTANTS.PERFORMANCE_THRESHOLDS;

  if (averageRating >= thresholds.EXCELLENT) return 'excellent';
  if (averageRating >= thresholds.GOOD) return 'good';
  if (averageRating >= thresholds.AVERAGE) return 'average';
  return 'poor';
};

/**
 * Calcule la distribution des notes
 */
export const calculateRatingDistribution = (ratings: number[]): Record<number, number> => {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach(rating => {
    if (rating >= 1 && rating <= 5) {
      distribution[rating]++;
    }
  });

  return distribution;
};

/**
 * Valide une note
 */
export const isValidRating = (rating: number): boolean => {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
};

/**
 * Génère des statistiques rapides
 */
export const generateQuickStats = (ratings: TaskRating[]) => {
  if (ratings.length === 0) {
    return {
      total: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      withComments: 0,
      excellentRate: 0,
      satisfactionScore: 0
    };
  }

  const ratingValues = ratings.map(r => r.rating);
  const average = calculateAverageRating(ratingValues);
  const distribution = calculateRatingDistribution(ratingValues);
  const withComments = ratings.filter(r => r.comment && r.comment.trim().length > 0).length;
  const excellentCount = (distribution[4] || 0) + (distribution[5] || 0);
  const excellentRate = (excellentCount / ratings.length) * 100;
  const satisfactionScore = (average / 5) * 100;

  return {
    total: ratings.length,
    average,
    distribution,
    withComments,
    excellentRate: Math.round(excellentRate),
    satisfactionScore: Math.round(satisfactionScore)
  };
};

// ==========================================
// DOCUMENTATION DU MODULE
// ==========================================

/**
 * ## Module ÉVALUATIONS
 *
 * ### Fonctionnalités principales :
 *
 * 1. **Système de notation**
 *    - Notes de 1 à 5 étoiles
 *    - Commentaires détaillés optionnels
 *    - Validation côté client et serveur
 *
 * 2. **Gestion des évaluations**
 *    - Création et modification des notes
 *    - Suppression avec confirmation
 *    - Notifications automatiques
 *
 * 3. **Statistiques avancées**
 *    - Moyenne générale et par projet
 *    - Distribution des notes
 *    - Tendances temporelles
 *    - Métriques de performance
 *
 * 4. **Analytiques**
 *    - Comparaisons de périodes
 *    - Recommandations d'amélioration
 *    - Scores de consistance
 *    - Potentiel d'amélioration
 *
 * 5. **Export et rapports**
 *    - Export en CSV, PDF, Excel
 *    - Filtres avancés
 *    - Rapports personnalisés
 *
 * ### Architecture :
 *
 * - **Services** : EvaluationsAPI pour toutes les interactions Supabase
 * - **Hooks** : 4 hooks spécialisés pour différents aspects
 * - **Composants** : Interface modulaire avec tabs et analytics
 * - **Types** : Plus de 25 types TypeScript pour la sécurité
 *
 * ### Real-time :
 *
 * - Mises à jour automatiques des évaluations
 * - Notifications en temps réel
 * - Synchronisation multi-onglets
 *
 * ### Usage :
 *
 * ```typescript
 * import { ModularEvaluationsView, useEvaluations } from '@/modules/evaluations';
 *
 * // Dans un composant candidat
 * <ModularEvaluationsView
 *   candidateId={user.id}
 *   availableProjects={projects}
 *   showAnalytics={true}
 *   showExportOptions={true}
 * />
 * ```
 *
 * ### Intégration :
 *
 * Le module s'intègre parfaitement avec :
 * - Module KANBAN (évaluation des tâches)
 * - Module PROJETS (évaluations par projet)
 * - Module MESSAGES (notifications)
 * - Système d'authentification
 */