/**
 * Module ÉVALUATIONS - Services
 *
 * Ce fichier centralise tous les exports des services du module Évaluations
 */

// ==========================================
// SERVICES PRINCIPAUX
// ==========================================

export { EvaluationsAPI } from './evaluationsAPI';

// ==========================================
// CONFIGURATION DES SERVICES
// ==========================================

export const EVALUATIONS_SERVICES_CONFIG = {
  EvaluationsAPI: {
    description: 'Service principal pour les interactions avec l\'API des évaluations',
    endpoints: [
      'getEvaluations',
      'getRating',
      'getRatingsByProject',
      'createRating',
      'updateRating',
      'deleteRating',
      'getEvaluationStats',
      'exportEvaluations'
    ],
    features: [
      'CRUD complet',
      'Gestion d\'erreurs',
      'Pagination',
      'Filtres avancés',
      'Export multiple formats',
      'Statistiques détaillées',
      'Notifications automatiques',
      'Validation des données'
    ],
    utilities: [
      'formatRatingLabel',
      'calculateAverageRating',
      'getRatingColor',
      'createRatingNotification'
    ]
  }
} as const;