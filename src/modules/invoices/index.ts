/**
 * Module FACTURES - Export Principal
 *
 * Ce module gère tous les aspects liés à la facturation et aux paiements client :
 * - Génération automatique depuis time tracking
 * - Paiements sécurisés via Stripe
 * - Export PDF et formats comptables (XML, CSV)
 * - Templates de factures personnalisables
 * - Statistiques financières et analytics
 * - Gestion de la TVA et réglementations
 * - Suivi des paiements en temps réel
 * - Relances automatiques
 *
 * Architecture modulaire suivant le pattern établi dans les autres modules.
 */

// ==========================================
// COMPOSANTS
// ==========================================

export {
  ModularInvoicesView,
  ClientInvoices, // Alias pour compatibilité
  InvoicesView, // Alias pour compatibilité
  InvoiceList, // Alias pour compatibilité
  INVOICES_MODULE_CONFIG
} from './components';

// ==========================================
// HOOKS
// ==========================================

export {
  useInvoices,
  useInvoiceActions,
  useInvoiceStats,
  useInvoiceTemplates
} from './hooks';

// ==========================================
// SERVICES
// ==========================================

export {
  InvoicesAPI
} from './services';

// ==========================================
// TYPES
// ==========================================

export type {
  // Core types
  Invoice,
  InvoiceItem,
  InvoiceTemplate,
  InvoiceStats,
  CompanyInfo,
  InvoicePayment,

  // Données relationnelles
  InvoiceProject,
  InvoiceClient,
  InvoiceCandidate,
  TaskDetail,
  TimeSession,
  MonthlyRevenue,
  PaymentTrend,
  ClientInvoicingStats,

  // Filters and params
  InvoiceFilters,
  InvoiceSortBy,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  UpdateInvoiceItemData,
  CreateCompanyInfoData,
  UpdateCompanyInfoData,

  // Status et enums
  InvoiceStatus,
  InvoiceType,
  PaymentStatus,
  PaymentMethod,
  InvoiceFormat,
  TimeRange,

  // API types
  InvoiceAPIResponse,
  InvoicePaginatedResponse,
  InvoiceExport,
  InvoiceError,
  InvoiceErrorCode,
  StripeSessionData,
  StripeWebhookPayload,
  AccountingExport,
  AccountingEntry,

  // Hooks return types
  UseInvoicesReturn,
  UseInvoiceActionsReturn,
  UseInvoiceStatsReturn,
  UseInvoiceTemplatesReturn,

  // Component props
  ModularInvoicesViewProps,
  InvoiceDetailViewProps,
  InvoiceListProps,
  StripePaymentProps,

  // Utilities
  KeysOf,
  PartialBy,
  InvoicesModuleConfig,
  PaginatedResult,
  InvoiceValidationResult,
  InvoiceValidationRules
} from './types';

// ==========================================
// CONSTANTES ET UTILITAIRES
// ==========================================

export const INVOICES_CONSTANTS = {
  // Statuts de facture
  INVOICE_STATUSES: {
    DRAFT: 'draft',
    PENDING: 'pending',
    SENT: 'sent',
    VIEWED: 'viewed',
    PAID: 'paid',
    PARTIAL: 'partial',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  } as const,

  // Types de facture
  INVOICE_TYPES: {
    REGULAR: 'regular',
    CREDIT_NOTE: 'credit_note',
    PROFORMA: 'proforma',
    RECURRING: 'recurring',
    FINAL: 'final'
  } as const,

  // Statuts de paiement
  PAYMENT_STATUSES: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  } as const,

  // Méthodes de paiement
  PAYMENT_METHODS: {
    STRIPE: 'stripe',
    BANK_TRANSFER: 'bank_transfer',
    CHECK: 'check',
    CASH: 'cash',
    OTHER: 'other'
  } as const,

  // Formats d'export
  EXPORT_FORMATS: {
    PDF: 'pdf',
    HTML: 'html',
    JSON: 'json',
    XML: 'xml',
    CSV: 'csv'
  } as const,

  // Plages temporelles
  TIME_RANGES: {
    WEEK: 'week',
    MONTH: 'month',
    QUARTER: 'quarter',
    YEAR: 'year',
    CUSTOM: 'custom'
  } as const,

  // Paramètres par défaut
  DEFAULTS: {
    VAT_RATE: 20, // 20% par défaut
    CURRENCY: 'EUR',
    PAYMENT_TERMS: 30, // 30 jours
    PAGE_SIZE: 20,
    HOURLY_RATE_CENTS: 4500, // 45€/heure
    RATE_PER_MINUTE_CENTS: 75 // 45€/h = 0.75€/min
  } as const,

  // Couleurs pour les statuts
  STATUS_COLORS: {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    viewed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  } as const,

  // Limites de validation
  VALIDATION: {
    MAX_INVOICE_NUMBER_LENGTH: 50,
    MAX_NOTES_LENGTH: 2000,
    MAX_ITEMS_PER_INVOICE: 100,
    MIN_AMOUNT_CENTS: 1,
    MAX_AMOUNT_CENTS: 999999999, // ~10M€
    MAX_VAT_RATE: 100,
    MIN_PAYMENT_TERMS: 0,
    MAX_PAYMENT_TERMS: 365
  } as const
} as const;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Formate un montant en centimes en devise
 */
export const formatCurrency = (cents: number, currency: string = 'EUR'): string => {
  const locale = currency === 'EUR' ? 'fr-FR' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(cents / 100);
};

/**
 * Formate une durée en minutes en format lisible
 */
export const formatMinutesToHours = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
};

/**
 * Calcule la TVA pour un montant donné
 */
export const calculateVAT = (amountCents: number, vatRate: number = 20): number => {
  return Math.round(amountCents * (vatRate / 100));
};

/**
 * Calcule le montant TTC
 */
export const calculateTotalWithVAT = (amountCents: number, vatRate: number = 20): number => {
  const vatAmount = calculateVAT(amountCents, vatRate);
  return amountCents + vatAmount;
};

/**
 * Génère un numéro de facture
 */
export const generateInvoiceNumber = (year?: number, sequence?: number): string => {
  const currentYear = year || new Date().getFullYear();
  const nextNumber = sequence || 1;
  return `INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
};

/**
 * Valide un numéro de facture
 */
export const validateInvoiceNumber = (invoiceNumber: string): boolean => {
  const pattern = /^INV-\d{4}-\d{4}$/;
  return pattern.test(invoiceNumber);
};

/**
 * Obtient la couleur d'un statut de facture
 */
export const getInvoiceStatusColor = (status: string): string => {
  return INVOICES_CONSTANTS.STATUS_COLORS[status as keyof typeof INVOICES_CONSTANTS.STATUS_COLORS] ||
         INVOICES_CONSTANTS.STATUS_COLORS.draft;
};

/**
 * Calcule les jours jusqu'à l'échéance
 */
export const getDaysUntilDue = (dueDate: string): number => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Détermine si une facture est en retard
 */
export const isInvoiceOverdue = (invoice: Invoice): boolean => {
  return getDaysUntilDue(invoice.due_date) < 0 &&
         invoice.status !== 'paid' &&
         invoice.status !== 'cancelled';
};

/**
 * Calcule le taux de conversion des paiements
 */
export const calculatePaymentConversionRate = (invoices: Invoice[]): number => {
  const totalInvoices = invoices.length;
  if (totalInvoices === 0) return 0;

  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  return Math.round((paidInvoices / totalInvoices) * 100);
};

/**
 * Groupe les factures par période
 */
export const groupInvoicesByPeriod = (
  invoices: Invoice[],
  periodType: 'month' | 'quarter' | 'year' = 'month'
): Record<string, Invoice[]> => {
  return invoices.reduce((groups, invoice) => {
    const date = new Date(invoice.issued_date);
    let key: string;

    switch (periodType) {
      case 'month':
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(invoice);
    return groups;
  }, {} as Record<string, Invoice[]>);
};

/**
 * Valide les données d'une facture
 */
export const validateInvoiceData = (data: CreateInvoiceData | UpdateInvoiceData): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if ('project_id' in data && !data.project_id) {
    errors.push('Le projet est obligatoire');
  }

  if ('period_start' in data && 'period_end' in data && data.period_start && data.period_end) {
    const start = new Date(data.period_start);
    const end = new Date(data.period_end);

    if (start >= end) {
      errors.push('La date de fin doit être postérieure à la date de début');
    }
  }

  if ('notes' in data && data.notes && data.notes.length > INVOICES_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH) {
    errors.push(`Les notes ne peuvent pas dépasser ${INVOICES_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH} caractères`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Génère un template de facture par défaut
 */
export const getDefaultInvoiceTemplate = (): Partial<CreateInvoiceData> => {
  return {
    auto_generate_items: true,
    notes: 'Merci pour votre confiance.',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 jours
  };
};

// ==========================================
// DOCUMENTATION DU MODULE
// ==========================================

/**
 * ## Module FACTURES
 *
 * ### Fonctionnalités principales :
 *
 * 1. **Gestion des factures**
 *    - Génération automatique depuis le time tracking
 *    - Templates personnalisables et réutilisables
 *    - Gestion complète du cycle de vie
 *    - Numérotation automatique et validation
 *
 * 2. **Paiements intégrés**
 *    - Integration Stripe pour paiements en ligne
 *    - Gestion des sessions de paiement sécurisées
 *    - Webhooks pour mise à jour automatique
 *    - Support multi-devises
 *
 * 3. **Export et comptabilité**
 *    - Export PDF professionnel
 *    - Export comptable (XML FEC, CSV)
 *    - Rapports financiers détaillés
 *    - Conformité réglementaire (TVA, etc.)
 *
 * 4. **Analytics et rapports**
 *    - Statistiques de revenus et tendances
 *    - Analyse des performances de paiement
 *    - Tableaux de bord interactifs
 *    - Prévisions et recommandations
 *
 * 5. **Automatisation**
 *    - Génération périodique automatique
 *    - Relances de paiement programmées
 *    - Calculs automatiques (TVA, totaux)
 *    - Archivage et organisation
 *
 * ### Architecture :
 *
 * - **Services** : InvoicesAPI pour toutes les interactions Supabase et Stripe
 * - **Hooks** : 4 hooks spécialisés pour différents aspects
 * - **Composants** : Interface modulaire avec intégration paiements
 * - **Types** : Plus de 50 types TypeScript pour la sécurité
 *
 * ### Real-time :
 *
 * - Synchronisation des statuts de paiement
 * - Mises à jour automatiques via webhooks
 * - Notifications de changements d'état
 * - Synchronisation multi-utilisateurs
 *
 * ### Usage :
 *
 * ```typescript
 * import { ModularInvoicesView, useInvoices } from '@/modules/invoices';
 *
 * // Dans un composant client
 * <ModularInvoicesView
 *   clientId={user.id}
 *   showOverview={true}
 *   showStats={true}
 *   showTemplates={true}
 *   showExportOptions={true}
 *   showStripeIntegration={true}
 * />
 *
 * // Ou utiliser les hooks directement
 * const { invoices, createInvoice, generateInvoiceForPeriod } = useInvoices();
 * const { sendInvoice, createStripeSession } = useInvoiceActions();
 * const { stats, revenueGrowth } = useInvoiceStats();
 * ```
 *
 * ### Intégration :
 *
 * Le module s'intègre parfaitement avec :
 * - Module TIME TRACKING (génération automatique)
 * - Module PROJETS (facturation par projet)
 * - Stripe Connect (paiements sécurisés)
 * - Système d'authentification
 * - Export comptable (FEC, CSV)
 * - Tables invoices, invoice_items, invoice_payments
 * - Email notifications et relances
 */