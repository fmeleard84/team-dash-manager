/**
 * Module PAIEMENTS - Hooks
 *
 * Ce fichier centralise tous les exports des hooks du module Paiements
 */

// ==========================================
// HOOKS PRINCIPAUX
// ==========================================

export { usePayments } from './usePayments';
export { usePaymentActions } from './usePaymentActions';
export { usePaymentStats } from './usePaymentStats';
export { useTimeTracking } from './useTimeTracking';

// ==========================================
// TYPES DES HOOKS
// ==========================================

export type {
  UsePaymentsReturn,
  UsePaymentActionsReturn,
  UsePaymentStatsReturn,
  UseTimeTrackingReturn
} from '../types';

// ==========================================
// CONFIGURATION DES HOOKS
// ==========================================

export const PAYMENTS_HOOKS_CONFIG = {
  usePayments: {
    description: 'Hook principal pour la gestion des paiements avec real-time',
    features: ['pagination', 'filtres', 'real-time', 'auto-refresh']
  },
  usePaymentActions: {
    description: 'Hook pour les actions CRUD sur les paiements',
    features: ['create', 'update', 'delete', 'validate', 'export', 'invoice']
  },
  usePaymentStats: {
    description: 'Hook pour les statistiques et analytiques',
    features: ['stats', 'trends', 'predictions', 'tax-reports']
  },
  useTimeTracking: {
    description: 'Hook pour le suivi du temps de travail',
    features: ['start/stop', 'pause/resume', 'auto-save', 'daily/weekly-totals']
  }
} as const;