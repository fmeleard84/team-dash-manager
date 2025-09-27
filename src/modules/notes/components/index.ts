/**
 * Module NOTES - Composants Index
 *
 * Centralise l'export de tous les composants du module notes avec les alias
 * de compatibilité pour faciliter l'adoption progressive.
 */

export { ModularNotesView } from './ModularNotesView';

// ==========================================
// ALIAS DE COMPATIBILITÉ
// ==========================================

// Alias principal pour le composant candidat
export { ModularNotesView as CandidateNotes } from './ModularNotesView';

// Alias générique
export { ModularNotesView as NotesView } from './ModularNotesView';

// ==========================================
// CONFIGURATION DU MODULE
// ==========================================

export const NOTES_MODULE_CONFIG = {
  name: 'notes',
  version: '1.0.0',
  description: 'Système de gestion des notes personnelles avec notebooks, tags et recherche',
  features: [
    'Création et édition de notes riches',
    'Organisation par notebooks',
    'Système de tags avancé',
    'Recherche full-text intelligente',
    'Export multi-format',
    'Statistiques et analytiques',
    'Auto-sauvegarde',
    'Mode hors-ligne'
  ],
  integrations: [
    'Système d\'authentification',
    'Base de données Supabase',
    'Real-time synchronisation',
    'Export vers Drive',
    'Partage via Messages'
  ],
  components: {
    primary: 'ModularNotesView',
    aliases: ['CandidateNotes', 'NotesView']
  }
} as const;