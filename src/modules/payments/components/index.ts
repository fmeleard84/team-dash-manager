/**
 * Module PAIEMENTS - Composants
 *
 * Ce fichier centralise tous les exports des composants du module Paiements
 * et assure la compatibilité ascendante avec l'ancienne architecture.
 */

// ==========================================
// COMPOSANTS MODULAIRES
// ==========================================

export { default as ModularPaymentsView } from './ModularPaymentsView';

// ==========================================
// COMPATIBILITÉ ARRIÈRE
// ==========================================

/**
 * Alias pour la compatibilité avec l'ancien composant CandidatePayments
 * @deprecated Utilisez ModularPaymentsView à la place
 */
export { default as CandidatePayments } from './ModularPaymentsView';

// ==========================================
// TYPES ET INTERFACES
// ==========================================

export type {
  Payment,
  PaymentStatus,
  PaymentFilters,
  PaymentStats,
  TimeRecord,
  Invoice,
  PaymentCalculation,
  PaymentExport,
  TaxReport
} from '../types';

// ==========================================
// COMPOSANTS À VENIR
// ==========================================

/**
 * Composants prévus pour la version complète :
 *
 * - PaymentCard: Affichage individuel d'un paiement
 * - TimeTrackingCard: Widget de suivi du temps
 * - PaymentFilters: Composant de filtres avancés
 * - InvoiceGenerator: Générateur de factures
 * - PaymentStats: Composant de statistiques
 * - TaxReportGenerator: Générateur de rapports fiscaux
 * - PaymentHistory: Historique détaillé
 * - ExportTools: Outils d'export
 */

// ==========================================
// CONFIGURATION DU MODULE
// ==========================================

export const PAYMENTS_MODULE_CONFIG = {
  name: 'PAIEMENTS',
  version: '1.0.0',
  description: 'Module de gestion des paiements et revenus candidats',
  components: [
    'ModularPaymentsView'
  ],
  hooks: [
    'usePayments',
    'usePaymentActions',
    'usePaymentStats',
    'useTimeTracking'
  ],
  services: [
    'PaymentsAPI'
  ]
} as const;