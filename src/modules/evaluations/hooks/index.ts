/**
 * Module ÉVALUATIONS - Hooks
 *
 * Ce fichier centralise tous les exports des hooks du module Évaluations
 */

// ==========================================
// HOOKS PRINCIPAUX
// ==========================================

export { useEvaluations } from './useEvaluations';
export { useEvaluationActions } from './useEvaluationActions';
export { useEvaluationStats } from './useEvaluationStats';
export { useRatingDialog } from './useRatingDialog';

// ==========================================
// TYPES DES HOOKS
// ==========================================

export type {
  UseEvaluationsReturn,
  UseEvaluationActionsReturn,
  UseEvaluationStatsReturn,
  UseRatingDialogReturn
} from '../types';

// ==========================================
// CONFIGURATION DES HOOKS
// ==========================================

export const EVALUATIONS_HOOKS_CONFIG = {
  useEvaluations: {
    description: 'Hook principal pour la gestion des évaluations avec real-time',
    features: ['pagination', 'filtres', 'real-time', 'auto-refresh', 'ratings-comments']
  },
  useEvaluationActions: {
    description: 'Hook pour les actions CRUD sur les évaluations',
    features: ['create', 'update', 'delete', 'export', 'validation', 'quick-stats']
  },
  useEvaluationStats: {
    description: 'Hook pour les statistiques et analytiques des évaluations',
    features: ['stats', 'trends', 'performance-metrics', 'recommendations', 'comparisons']
  },
  useRatingDialog: {
    description: 'Hook pour la gestion du dialog de notation',
    features: ['form-management', 'validation', 'existing-rating-check', 'auto-reset']
  }
} as const;