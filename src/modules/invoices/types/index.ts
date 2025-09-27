/**
 * Module FACTURES - Types et Interfaces
 *
 * Définit tous les types TypeScript pour le système de facturation client :
 * - Factures avec ligne de détail
 * - Paiements Stripe et gestion des statuts
 * - Génération automatique depuis time tracking
 * - Export et rapports comptables
 * - Informations d'entreprise et TVA
 */

// ==========================================
// TYPES PRINCIPAUX - FACTURES
// ==========================================

/**
 * Structure principale d'une facture
 */
export interface Invoice {
  id: string;
  invoice_number: string;
  project_id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  status: InvoiceStatus;
  subtotal_cents: number;
  vat_rate: number;
  vat_amount_cents: number;
  total_cents: number;
  currency: string;
  payment_method?: string;
  payment_date?: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  issued_date: string;
  due_date: string;
  notes?: string;
  late_fee_cents?: number;
  discount_cents?: number;
  created_at: string;
  updated_at: string;

  // Relations calculées
  project?: InvoiceProject;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
  client?: InvoiceClient;
}

/**
 * Ligne de détail d'une facture
 */
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  candidate_id: string;
  service_name: string;
  service_description?: string;
  total_minutes: number;
  rate_per_minute_cents: number;
  amount_cents: number;
  task_details: TaskDetail[];
  created_at: string;
  updated_at: string;

  // Relations
  candidate?: InvoiceCandidate;
  time_sessions?: TimeSession[];
}

/**
 * Détail d'une tâche facturée
 */
export interface TaskDetail {
  id?: string;
  description: string;
  duration_minutes: number;
  date: string;
  start_time?: string;
  end_time?: string;
  time_tracking_id: string;
  activity_type?: string;
  tags?: string[];
}

/**
 * Session de temps associée à une facture
 */
export interface TimeSession {
  id: string;
  candidate_id: string;
  project_id: string;
  activity_description: string;
  activity_type?: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  hourly_rate?: number;
  total_cost?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// ==========================================
// TYPES DE STATUTS ET ÉNUMÉRATIONS
// ==========================================

export type InvoiceStatus =
  | 'draft'        // Brouillon
  | 'pending'      // En attente de validation
  | 'sent'         // Envoyée au client
  | 'viewed'       // Vue par le client
  | 'paid'         // Payée
  | 'partial'      // Partiellement payée
  | 'overdue'      // En retard
  | 'cancelled'    // Annulée
  | 'refunded';    // Remboursée

export type InvoiceType =
  | 'regular'      // Facture normale
  | 'credit_note'  // Avoir
  | 'proforma'     // Pro forma
  | 'recurring'    // Récurrente
  | 'final';       // Facture de solde

export type PaymentStatus =
  | 'pending'      // En attente
  | 'processing'   // En cours
  | 'succeeded'    // Réussi
  | 'failed'       // Échoué
  | 'cancelled'    // Annulé
  | 'refunded';    // Remboursé

export type PaymentMethod =
  | 'stripe'       // Stripe (CB)
  | 'bank_transfer'// Virement
  | 'check'        // Chèque
  | 'cash'         // Espèces
  | 'other';       // Autre

export type InvoiceFormat =
  | 'pdf'          // PDF standard
  | 'html'         // HTML pour prévisualisation
  | 'json'         // JSON pour API
  | 'xml'          // XML pour comptabilité
  | 'csv';         // CSV pour export

export type TimeRange =
  | 'week'         // Semaine
  | 'month'        // Mois
  | 'quarter'      // Trimestre
  | 'year'         // Année
  | 'custom';      // Période personnalisée

// ==========================================
// TYPES DE DONNÉES RELATIONNELLES
// ==========================================

export interface InvoiceProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  owner_id: string;
  created_at: string;
}

export interface InvoiceClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name?: string;
  company_info?: CompanyInfo;
}

export interface InvoiceCandidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  daily_rate?: number;
  hourly_rate?: number;
}

export interface CompanyInfo {
  id: string;
  user_id?: string;
  company_name: string;
  legal_name?: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  siret?: string;
  vat_number?: string;
  logo_url?: string;
  signature_url?: string;
  bank_name?: string;
  bank_iban?: string;
  bank_bic?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_date: string;
  status: PaymentStatus;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// TYPES D'ENTRÉE ET DE CRÉATION
// ==========================================

export interface CreateInvoiceData {
  project_id: string;
  period_start: string;
  period_end: string;
  due_date?: string;
  notes?: string;
  invoice_type?: InvoiceType;
  auto_generate_items?: boolean;
}

export interface UpdateInvoiceData {
  status?: InvoiceStatus;
  due_date?: string;
  notes?: string;
  discount_cents?: number;
  late_fee_cents?: number;
  payment_method?: PaymentMethod;
  payment_date?: string;
}

export interface CreateInvoiceItemData {
  invoice_id: string;
  candidate_id: string;
  service_name: string;
  service_description?: string;
  total_minutes?: number;
  rate_per_minute_cents?: number;
  amount_cents: number;
  task_details?: TaskDetail[];
}

export interface UpdateInvoiceItemData {
  service_name?: string;
  service_description?: string;
  amount_cents?: number;
  task_details?: TaskDetail[];
}

export interface CreateCompanyInfoData {
  company_name: string;
  address_line1: string;
  postal_code: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  siret?: string;
  vat_number?: string;
}

export interface UpdateCompanyInfoData extends Partial<CreateCompanyInfoData> {
  logo_url?: string;
  signature_url?: string;
  bank_name?: string;
  bank_iban?: string;
  bank_bic?: string;
}

// ==========================================
// TYPES DE FILTRES ET DE RECHERCHE
// ==========================================

export interface InvoiceFilters {
  client_id?: string;
  project_id?: string;
  status?: InvoiceStatus[];
  date_from?: string;
  date_to?: string;
  amount_min_cents?: number;
  amount_max_cents?: number;
  payment_method?: PaymentMethod[];
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: InvoiceSortBy;
  sort_direction?: 'asc' | 'desc';
}

export type InvoiceSortBy =
  | 'created_at'
  | 'updated_at'
  | 'issued_date'
  | 'due_date'
  | 'payment_date'
  | 'total_cents'
  | 'invoice_number'
  | 'status';

export interface InvoiceSearchResult {
  invoice: Invoice;
  relevance_score: number;
  matched_fields: string[];
  highlight_snippets: {
    field: string;
    snippet: string;
  }[];
}

// ==========================================
// TYPES DE STATISTIQUES ET D'ANALYTICS
// ==========================================

export interface InvoiceStats {
  total_invoices: number;
  draft_invoices: number;
  sent_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_revenue_cents: number;
  pending_revenue_cents: number;
  overdue_revenue_cents: number;
  average_invoice_cents: number;
  average_payment_days: number;
  total_vat_cents: number;
  this_month_revenue_cents: number;
  this_quarter_revenue_cents: number;
  this_year_revenue_cents: number;
  payment_method_distribution: Record<PaymentMethod, number>;
  status_distribution: Record<InvoiceStatus, number>;
  monthly_revenue: MonthlyRevenue[];
}

export interface MonthlyRevenue {
  year: number;
  month: number;
  revenue_cents: number;
  invoice_count: number;
  average_days_to_payment: number;
}

export interface PaymentTrend {
  period: string;
  amount_cents: number;
  invoice_count: number;
  average_amount_cents: number;
  payment_success_rate: number;
}

export interface ClientInvoicingStats {
  client_id: string;
  client_name: string;
  total_invoices: number;
  total_revenue_cents: number;
  average_payment_days: number;
  last_invoice_date?: string;
  last_payment_date?: string;
  preferred_payment_method?: PaymentMethod;
}

// ==========================================
// TYPES D'EXPORT ET DE RAPPORTS
// ==========================================

export interface InvoiceExportFormat {
  format: InvoiceFormat;
  include_items: boolean;
  include_payments: boolean;
  include_company_info: boolean;
  template?: string;
}

export interface InvoiceExport {
  id: string;
  format: InvoiceFormat;
  file_url: string;
  file_size: number;
  created_at: string;
  expires_at: string;
  download_count: number;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description?: string;
  template_data: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountingExport {
  period_start: string;
  period_end: string;
  format: 'xml' | 'csv' | 'json';
  entries: AccountingEntry[];
  total_revenue_cents: number;
  total_vat_cents: number;
  currency: string;
}

export interface AccountingEntry {
  date: string;
  invoice_number: string;
  client_name: string;
  description: string;
  amount_ht_cents: number;
  vat_rate: number;
  vat_amount_cents: number;
  amount_ttc_cents: number;
  account_code?: string;
}

// ==========================================
// TYPES D'API ET DE RÉPONSES
// ==========================================

export interface InvoiceAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    total_count?: number;
    page?: number;
    limit?: number;
    has_more?: boolean;
  };
}

export interface InvoicePaginatedResponse<T = any> {
  data: T[];
  total_count: number;
  page: number;
  limit: number;
  has_more: boolean;
  total_pages: number;
}

export interface StripeSessionData {
  session_id: string;
  payment_url: string;
  expires_at: string;
}

export interface StripeWebhookPayload {
  type: string;
  data: {
    object: {
      id: string;
      payment_intent?: string;
      customer?: string;
      amount_total?: number;
      currency?: string;
      payment_status?: string;
      metadata?: Record<string, string>;
    };
  };
}

// ==========================================
// TYPES D'ERREURS
// ==========================================

export type InvoiceErrorCode =
  | 'INVOICE_NOT_FOUND'
  | 'INVOICE_ALREADY_PAID'
  | 'INVOICE_CANCELLED'
  | 'PAYMENT_FAILED'
  | 'STRIPE_ERROR'
  | 'INVALID_PERIOD'
  | 'NO_TIME_TRACKED'
  | 'COMPANY_INFO_MISSING'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR';

export interface InvoiceError {
  code: InvoiceErrorCode;
  message: string;
  field?: string;
  details?: any;
}

// ==========================================
// TYPES DE RETOUR DES HOOKS
// ==========================================

export interface UseInvoicesReturn {
  // Données
  invoices: Invoice[];
  projects: InvoiceProject[];
  totalCount: number;
  companyInfo: CompanyInfo | null;

  // États
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  filters: InvoiceFilters;

  // Actions principales
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (filters: Partial<InvoiceFilters>) => void;
  resetFilters: () => void;

  // Actions spécialisées
  getInvoiceById: (id: string) => Promise<Invoice | null>;
  generateInvoiceForPeriod: (projectId: string, startDate: string, endDate: string) => Promise<string | null>;

  // Utilitaires
  formatCurrency: (cents: number) => string;
  formatMinutesToHours: (minutes: number) => string;
  getInvoiceStatusInfo: (invoice: Invoice) => { label: string; color: string; };
}

export interface UseInvoiceActionsReturn {
  // États
  loading: boolean;
  error: string | null;
  progress: number;

  // Actions CRUD
  createInvoice: (data: CreateInvoiceData) => Promise<Invoice | null>;
  updateInvoice: (id: string, data: UpdateInvoiceData) => Promise<Invoice | null>;
  deleteInvoice: (id: string) => Promise<boolean>;
  duplicateInvoice: (id: string) => Promise<Invoice | null>;

  // Actions de statut
  sendInvoice: (id: string) => Promise<boolean>;
  markAsPaid: (id: string, paymentMethod: PaymentMethod, paymentDate?: string) => Promise<boolean>;
  cancelInvoice: (id: string, reason?: string) => Promise<boolean>;

  // Actions Stripe
  createStripeSession: (invoiceId: string) => Promise<StripeSessionData | null>;
  processStripeWebhook: (payload: StripeWebhookPayload) => Promise<boolean>;

  // Gestion des éléments
  addInvoiceItem: (data: CreateInvoiceItemData) => Promise<boolean>;
  updateInvoiceItem: (id: string, data: UpdateInvoiceItemData) => Promise<boolean>;
  removeInvoiceItem: (id: string) => Promise<boolean>;

  // Export et impression
  exportInvoice: (id: string, format: InvoiceFormat) => Promise<string | null>;
  printInvoice: (id: string) => Promise<boolean>;

  // Utilitaires
  clearError: () => void;
  resetProgress: () => void;
}

export interface UseInvoiceStatsReturn {
  // Données principales
  stats: InvoiceStats | null;
  monthlyRevenue: MonthlyRevenue[];
  paymentTrends: PaymentTrend[];
  clientStats: ClientInvoicingStats[];

  // États
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
  lastUpdated: Date | null;

  // Actions
  refresh: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  exportAccountingData: (format: 'xml' | 'csv' | 'json') => Promise<string | null>;

  // Métriques calculées
  revenueGrowth: number;
  averageInvoiceValue: number;
  paymentEfficiency: number;
  overdueRate: number;
}

export interface UseInvoiceTemplatesReturn {
  // Données
  templates: InvoiceTemplate[];
  defaultTemplate: InvoiceTemplate | null;

  // États
  loading: boolean;
  error: string | null;

  // Actions
  createTemplate: (name: string, templateData: any) => Promise<InvoiceTemplate | null>;
  updateTemplate: (id: string, data: Partial<InvoiceTemplate>) => Promise<InvoiceTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  setDefaultTemplate: (id: string) => Promise<boolean>;

  // Génération
  generateInvoiceFromTemplate: (templateId: string, data: CreateInvoiceData) => Promise<Invoice | null>;
}

// ==========================================
// TYPES DE PROPS DES COMPOSANTS
// ==========================================

export interface ModularInvoicesViewProps {
  clientId: string;
  showOverview?: boolean;
  showStats?: boolean;
  showTemplates?: boolean;
  showExportOptions?: boolean;
  showStripeIntegration?: boolean;
  initialFilters?: Partial<InvoiceFilters>;
  className?: string;
  onInvoiceClick?: (invoice: Invoice) => void;
  onPaymentSuccess?: (invoice: Invoice) => void;
}

export interface InvoiceDetailViewProps {
  invoice: Invoice;
  onUpdate?: (invoice: Invoice) => void;
  onDelete?: (invoiceId: string) => void;
  onPay?: (invoice: Invoice) => void;
  showPaymentButton?: boolean;
  showEditButton?: boolean;
  editable?: boolean;
}

export interface InvoiceListProps {
  invoices: Invoice[];
  loading?: boolean;
  onInvoiceClick?: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: string, status: InvoiceStatus) => void;
  showFilters?: boolean;
  showBulkActions?: boolean;
}

export interface StripePaymentProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

// ==========================================
// TYPES UTILITAIRES
// ==========================================

export type KeysOf<T> = keyof T;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface PaginatedResult<T> {
  data: T[];
  total_count: number;
  page: number;
  limit: number;
  has_more: boolean;
  total_pages: number;
}

export interface InvoicesModuleConfig {
  name: string;
  version: string;
  features: string[];
  integrations: string[];
  stripe_enabled: boolean;
  default_vat_rate: number;
  default_currency: string;
  default_payment_terms: number;
}

// ==========================================
// VALIDATION DES TYPES
// ==========================================

export type InvoiceValidationResult = {
  valid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
};

export interface InvoiceValidationRules {
  required_fields: (keyof Invoice)[];
  min_amount_cents: number;
  max_amount_cents: number;
  allowed_currencies: string[];
  max_items: number;
  max_description_length: number;
}