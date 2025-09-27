/**
 * Module ÉVALUATIONS - Composants
 *
 * Ce fichier centralise tous les exports des composants du module Évaluations
 * et assure la compatibilité ascendante avec l'ancienne architecture.
 */

// ==========================================
// COMPOSANTS MODULAIRES
// ==========================================

export { default as ModularEvaluationsView } from './ModularEvaluationsView';

// ==========================================
// COMPATIBILITÉ ARRIÈRE
// ==========================================

/**
 * Alias pour la compatibilité avec l'ancien composant CandidateRatings
 * @deprecated Utilisez ModularEvaluationsView à la place
 */
export { default as CandidateRatings } from './ModularEvaluationsView';

/**
 * Alias pour la compatibilité avec d'autres noms possibles
 * @deprecated Utilisez ModularEvaluationsView à la place
 */
export { default as CandidateEvaluations } from './ModularEvaluationsView';

// ==========================================
// TYPES ET INTERFACES
// ==========================================

export type {
  TaskRating,
  TaskComment,
  EvaluationItem,
  EvaluationStats,
  EvaluationFilters,
  CreateRatingData,
  UpdateRatingData,
  EvaluationExport,
  EvaluationExportFormat,
  ModularEvaluationsViewProps,
  StarRatingProps,
  RatingCardProps
} from '../types';

// ==========================================
// COMPOSANTS À VENIR
// ==========================================

/**
 * Composants prévus pour la version complète :
 *
 * - RatingCard: Carte d'affichage individuel d'une évaluation
 * - RatingStars: Composant étoiles interactif avancé
 * - RatingDialog: Dialog de notation modulaire
 * - EvaluationFilters: Composant de filtres avancés
 * - RatingStatistics: Composant de statistiques visuelles
 * - RatingTrendChart: Graphique des tendances
 * - RatingDistribution: Visualisation de la distribution
 * - ExportTools: Outils d'export avancés
 * - RecommendationsPanel: Panneau de recommandations
 * - PerformanceMetrics: Métriques de performance
 */

// ==========================================
// CONFIGURATION DU MODULE
// ==========================================

export const EVALUATIONS_MODULE_CONFIG = {
  name: 'EVALUATIONS',
  version: '1.0.0',
  description: 'Module de gestion des évaluations et notes des candidats',
  components: [
    'ModularEvaluationsView'
  ],
  hooks: [
    'useEvaluations',
    'useEvaluationActions',
    'useEvaluationStats',
    'useRatingDialog'
  ],
  services: [
    'EvaluationsAPI'
  ],
  features: [
    'Système de notation 5 étoiles',
    'Commentaires détaillés',
    'Statistiques avancées',
    'Export multi-format',
    'Real-time updates',
    'Analytiques de performance',
    'Filtres avancés',
    'Recommandations IA'
  ]
} as const;