/**
 * Module NOTES - Hooks Index
 *
 * Centralise l'export de tous les hooks spécialisés pour la gestion des notes.
 * Ces hooks permettent une séparation des responsabilités claire et une réutilisabilité optimale.
 */

export { useNotes } from './useNotes';
export { useNoteActions } from './useNoteActions';
export { useNoteStats } from './useNoteStats';
export { useNoteSearch } from './useNoteSearch';

// Réexport des types de retour pour une utilisation externe
export type {
  UseNotesReturn,
  UseNoteActionsReturn,
  UseNoteStatsReturn,
  UseNoteSearchReturn
} from '../types';