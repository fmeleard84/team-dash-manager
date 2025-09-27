/**
 * Module FACTURES - Hooks Index
 *
 * Centralise l'export de tous les hooks spécialisés pour la gestion des factures.
 * Ces hooks permettent une séparation des responsabilités claire et une réutilisabilité optimale.
 */

export { useInvoices } from './useInvoices';
export { useInvoiceActions } from './useInvoiceActions';
export { useInvoiceStats } from './useInvoiceStats';
export { useInvoiceTemplates } from './useInvoiceTemplates';

// Réexport des types de retour pour une utilisation externe
export type {
  UseInvoicesReturn,
  UseInvoiceActionsReturn,
  UseInvoiceStatsReturn,
  UseInvoiceTemplatesReturn
} from '../types';