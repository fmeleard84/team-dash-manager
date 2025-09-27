/**
 * Module PAIEMENTS - Export Principal
 *
 * Ce module gère tous les aspects liés aux paiements et revenus des candidats :
 * - Suivi des paiements et factures
 * - Calculs de rémunération
 * - Statistiques financières
 * - Suivi du temps de travail
 * - Export et rapports
 *
 * Architecture modulaire suivant le pattern établi dans les autres modules.
 */

// ==========================================
// COMPOSANTS
// ==========================================

export {
  ModularPaymentsView,
  CandidatePayments, // Alias pour compatibilité
  PAYMENTS_MODULE_CONFIG
} from './components';

// ==========================================
// HOOKS
// ==========================================

export {
  usePayments,
  usePaymentActions,
  usePaymentStats,
  useTimeTracking
} from './hooks';

// ==========================================
// SERVICES
// ==========================================

export {
  PaymentsAPI
} from './services';

// ==========================================
// TYPES
// ==========================================

export type {
  // Core types
  Payment,
  TimeRecord,
  Invoice,
  PaymentStats,

  // Status and enums
  PaymentStatus,
  PaymentMethod,
  InvoiceStatus,
  TimeTrackingStatus,

  // Filters and params
  PaymentFilters,
  PaymentSortBy,
  PaymentExportFormat,

  // API types
  PaymentAPIResponse,
  PaymentPaginatedResponse,
  PaymentCalculation,
  PaymentExport,

  // Hooks return types
  UsePaymentsReturn,
  UsePaymentActionsReturn,
  UsePaymentStatsReturn,
  UseTimeTrackingReturn,

  // Form data types
  CreatePaymentData,
  UpdatePaymentData,
  TimeTrackingSession,

  // Analytics types
  TopClient,
  ProjectEarnings,
  MonthlyEarnings,
  TaxReport,
  PaymentTrend,
  EarningsPrediction,

  // Error handling
  PaymentError
} from './types';

// ==========================================
// CONSTANTES ET UTILITAIRES
// ==========================================

export const PAYMENT_CONSTANTS = {
  // Statuts de paiement
  PAYMENT_STATUSES: {
    PENDING: 'pending',
    VALIDATED: 'validated',
    PROCESSING: 'processing',
    PAID: 'paid',
    CANCELLED: 'cancelled',
    DISPUTED: 'disputed'
  } as const,

  // Méthodes de paiement
  PAYMENT_METHODS: {
    STRIPE: 'stripe',
    BANK_TRANSFER: 'bank_transfer',
    PAYPAL: 'paypal',
    CRYPTO: 'crypto',
    CASH: 'cash',
    OTHER: 'other'
  } as const,

  // Formats d'export
  EXPORT_FORMATS: {
    CSV: 'csv',
    PDF: 'pdf',
    EXCEL: 'excel'
  } as const,

  // Taux par défaut
  DEFAULT_RATES: {
    HOURLY_RATE_CENTS: 4500, // 45€/heure
    VAT_RATE: 0.20, // 20%
    PLATFORM_FEE: 0.05 // 5%
  }
} as const;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Formate un montant en centimes vers une chaîne de devise
 */
export const formatCurrency = (cents: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency
  }).format(cents / 100);
};

/**
 * Formate des minutes en format heures/minutes
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
};

/**
 * Calcule le montant TTC à partir du montant HT et du taux de TVA
 */
export const calculateTTC = (htCents: number, vatRate: number): number => {
  return Math.round(htCents * (1 + vatRate));
};

/**
 * Calcule les revenus nets après déduction des frais de plateforme
 */
export const calculateNetEarnings = (grossCents: number, platformFeeRate: number): number => {
  return Math.round(grossCents * (1 - platformFeeRate));
};

// ==========================================
// DOCUMENTATION DU MODULE
// ==========================================

/**
 * ## Module PAIEMENTS
 *
 * ### Fonctionnalités principales :
 *
 * 1. **Gestion des paiements**
 *    - Création et suivi des demandes de paiement
 *    - Validation et traitement des paiements
 *    - Historique complet des transactions
 *
 * 2. **Suivi du temps**
 *    - Chronomètre intégré avec pause/reprise
 *    - Sauvegarde automatique des sessions
 *    - Calcul automatique des montants
 *
 * 3. **Statistiques et analytiques**
 *    - Revenus par projet/client/période
 *    - Tendances et prédictions
 *    - Rapports fiscaux automatisés
 *
 * 4. **Export et facturation**
 *    - Export en CSV, PDF, Excel
 *    - Génération de factures
 *    - Justificatifs de paiement
 *
 * ### Architecture :
 *
 * - **Services** : PaymentsAPI pour toutes les interactions Supabase
 * - **Hooks** : 4 hooks spécialisés pour différents aspects
 * - **Composants** : Interface modulaire avec tabs et filtres
 * - **Types** : Plus de 30 types TypeScript pour la sécurité
 *
 * ### Usage :
 *
 * ```typescript
 * import { ModularPaymentsView, usePayments } from '@/modules/payments';
 *
 * // Dans un composant candidat
 * <ModularPaymentsView
 *   candidateId={user.id}
 *   availableProjects={projects}
 * />
 * ```
 */