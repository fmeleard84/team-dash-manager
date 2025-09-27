/**
 * Module ACTIVITÉS - Composants
 *
 * Point d'entrée unifié pour tous les composants du module Activités
 * avec compatibilité arrière pour l'ancien composant CandidateActivities
 */

export { default as ModularActivitiesView } from './ModularActivitiesView';

// ==========================================
// COMPATIBILITÉ ARRIÈRE
// ==========================================

/**
 * Alias pour la compatibilité avec l'ancien composant CandidateActivities
 * @deprecated Utilisez ModularActivitiesView à la place
 */
export { default as CandidateActivities } from './ModularActivitiesView';

/**
 * Alias supplémentaire pour d'autres noms possibles
 * @deprecated Utilisez ModularActivitiesView à la place
 */
export { default as ActivitiesView } from './ModularActivitiesView';

// ==========================================
// CONFIGURATION DU MODULE
// ==========================================

export const ACTIVITIES_MODULE_CONFIG = {
  name: 'ACTIVITIES',
  version: '1.0.0',
  description: 'Module de gestion des activités et suivi du temps',
  components: [
    'ModularActivitiesView'
  ],
  hooks: [
    'useActivities',
    'useActivityActions',
    'useActivityStats',
    'useActivityTimer'
  ],
  services: [
    'ActivitiesAPI'
  ],
  features: [
    'Timer temps réel avec contrôles',
    'Suivi automatique des sessions',
    'Statistiques de productivité',
    'Export multi-format (CSV, JSON)',
    'Filtres avancés et recherche',
    'Templates d\'activités',
    'Recommandations d\'amélioration',
    'Interface à onglets',
    'Real-time via Supabase',
    'Auto-sauvegarde des sessions',
    'Gestion des interruptions',
    'Analytiques de performance'
  ]
} as const;