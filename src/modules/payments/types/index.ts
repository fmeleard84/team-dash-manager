// Types pour le module PAIEMENTS - Architecture modulaire spécialisée Candidats
export interface Payment {
  id: string;
  project_id: string;
  candidate_id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  amount_cents: number;
  hourly_rate_cents: number;
  total_minutes_worked: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_date?: string;
  stripe_payment_intent_id?: string;
  transfer_id?: string;
  created_at: string;
  updated_at: string;
  // Relations enrichies
  project?: ProjectInfo;
  client?: ClientInfo;
  time_records?: TimeRecord[];
  invoice?: Invoice;
  tax_info?: TaxInfo;
  metadata?: PaymentMetadata;
}

export type PaymentStatus =
  | 'pending'       // En attente de validation client
  | 'validated'     // Validé par le client, en attente de paiement
  | 'processing'    // Paiement en cours
  | 'paid'          // Payé avec succès
  | 'failed'        // Échec du paiement
  | 'disputed'      // Contesté
  | 'refunded'      // Remboursé
  | 'cancelled';    // Annulé

export type PaymentMethod =
  | 'stripe'
  | 'bank_transfer'
  | 'paypal'
  | 'check'
  | 'cash';

export interface TimeRecord {
  id: string;
  project_id: string;
  candidate_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  activity_description: string;
  task_category?: TaskCategory;
  hourly_rate_cents: number;
  amount_cents: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  validated_by_client?: boolean;
  validation_date?: string;
  session_id?: string;
  screenshots?: Screenshot[];
  location?: WorkLocation;
  created_at: string;
  updated_at: string;
}

export type TaskCategory =
  | 'development'
  | 'design'
  | 'management'
  | 'testing'
  | 'documentation'
  | 'meeting'
  | 'research'
  | 'support'
  | 'other';

export interface Screenshot {
  id: string;
  url: string;
  timestamp: string;
  blurred: boolean;
}

export interface WorkLocation {
  country?: string;
  city?: string;
  timezone: string;
  remote: boolean;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  project_id: string;
  client_id: string;
  candidate_id?: string;
  period_start: string;
  period_end: string;
  status: InvoiceStatus;
  subtotal_cents: number;
  tax_rate: number;
  tax_amount_cents: number;
  total_cents: number;
  currency: string;
  payment_terms_days: number;
  issued_date: string;
  due_date: string;
  payment_date?: string;
  notes?: string;
  line_items: InvoiceLineItem[];
  attachments?: InvoiceAttachment[];
  client_info?: ClientInfo;
  candidate_info?: CandidateInfo;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  tax_rate: number;
  category?: TaskCategory;
  time_records?: string[]; // IDs des enregistrements de temps
}

export interface InvoiceAttachment {
  id: string;
  filename: string;
  url: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

export interface ProjectInfo {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  budget_cents?: number;
  client_id: string;
  team_size: number;
}

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface ClientInfo {
  id: string;
  company_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: Address;
  payment_terms_days: number;
  tax_id?: string;
  preferred_payment_method?: PaymentMethod;
}

export interface CandidateInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: Address;
  tax_id?: string;
  bank_info?: BankInfo;
  freelance_status: FreelanceStatus;
  hourly_rate_cents: number;
  currency: string;
  skills: string[];
  availability_status: 'available' | 'busy' | 'unavailable';
}

export type FreelanceStatus =
  | 'employee'
  | 'freelance'
  | 'contractor'
  | 'consultant';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface BankInfo {
  iban?: string;
  bic?: string;
  bank_name?: string;
  account_holder: string;
  paypal_email?: string;
  stripe_account_id?: string;
}

export interface TaxInfo {
  rate: number;
  type: 'vat' | 'sales_tax' | 'gst' | 'none';
  region: string;
  exemption?: boolean;
  exemption_reason?: string;
}

export interface PaymentMetadata {
  original_currency?: string;
  exchange_rate?: number;
  fees_cents?: number;
  processing_time_ms?: number;
  retry_count?: number;
  failure_reason?: string;
  external_transaction_id?: string;
  reconciliation_status?: 'pending' | 'matched' | 'unmatched';
}

// Analytics et rapports
export interface PaymentStats {
  total_earnings_cents: number;
  total_hours_worked: number;
  total_projects: number;
  average_hourly_rate_cents: number;
  total_payments_received: number;
  pending_payments_cents: number;
  current_month_earnings_cents: number;
  last_month_earnings_cents: number;
  growth_percentage: number;
  top_clients: TopClient[];
  earnings_by_month: MonthlyEarnings[];
  earnings_by_project: ProjectEarnings[];
  payment_methods_breakdown: PaymentMethodBreakdown[];
  tax_summary: TaxSummary;
}

export interface TopClient {
  client_id: string;
  client_name: string;
  total_earnings_cents: number;
  total_hours: number;
  projects_count: number;
  last_payment_date?: string;
}

export interface MonthlyEarnings {
  year: number;
  month: number;
  earnings_cents: number;
  hours_worked: number;
  payments_count: number;
  projects_count: number;
}

export interface ProjectEarnings {
  project_id: string;
  project_title: string;
  client_name: string;
  total_earnings_cents: number;
  total_hours: number;
  hourly_rate_cents: number;
  start_date: string;
  end_date?: string;
  status: ProjectStatus;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  count: number;
  total_cents: number;
  percentage: number;
}

export interface TaxSummary {
  total_gross_cents: number;
  total_tax_cents: number;
  total_net_cents: number;
  tax_rate_average: number;
  by_quarter: QuarterlyTax[];
}

export interface QuarterlyTax {
  year: number;
  quarter: number;
  gross_cents: number;
  tax_cents: number;
  net_cents: number;
}

// Filtres et recherche
export interface PaymentFilters {
  status?: PaymentStatus[];
  payment_method?: PaymentMethod[];
  date_range?: {
    start: string;
    end: string;
  };
  client_ids?: string[];
  project_ids?: string[];
  amount_range?: {
    min_cents: number;
    max_cents: number;
  };
  search_query?: string;
  sort_by?: PaymentSortOption;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export type PaymentSortOption =
  | 'payment_date'
  | 'amount'
  | 'client_name'
  | 'project_title'
  | 'created_at'
  | 'status';

// Types pour les hooks et API
export interface CreatePaymentData {
  project_id: string;
  period_start: string;
  period_end: string;
  time_record_ids: string[];
  notes?: string;
}

export interface UpdatePaymentData {
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_date?: string;
  notes?: string;
  metadata?: Partial<PaymentMetadata>;
}

export interface PaymentCalculation {
  total_minutes: number;
  hourly_rate_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  breakdown_by_category: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  category: TaskCategory;
  minutes: number;
  amount_cents: number;
  percentage: number;
}

// Types pour les réponses API
export interface PaymentAPIResponse<T> {
  data: T;
  success: boolean;
  error?: PaymentError;
  metadata?: {
    total_count?: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
    currency?: string;
  };
}

export interface PaymentPaginatedResponse<T> extends PaymentAPIResponse<T[]> {
  pagination: {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
    has_previous: boolean;
    has_next: boolean;
  };
}

export interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
  suggestion?: string;
}

// Export de données et rapports
export interface PaymentExport {
  id: string;
  format: PaymentExportFormat;
  filters: PaymentFilters;
  period: {
    start: string;
    end: string;
  };
  include_time_records: boolean;
  include_invoices: boolean;
  include_tax_info: boolean;
  created_at: string;
  download_url?: string;
  expires_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_size_bytes?: number;
}

export type PaymentExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface TaxReport {
  id: string;
  year: number;
  quarter?: number;
  total_income_cents: number;
  total_expenses_cents: number;
  taxable_income_cents: number;
  tax_owed_cents: number;
  payments_included: number;
  generated_at: string;
  download_url?: string;
}

// Configuration et paramètres
export interface PaymentSettings {
  candidate_id: string;
  default_hourly_rate_cents: number;
  currency: string;
  tax_rate: number;
  tax_region: string;
  auto_invoice_generation: boolean;
  invoice_template_id?: string;
  payment_reminder_days: number;
  preferred_payment_methods: PaymentMethod[];
  bank_info?: BankInfo;
  tax_info?: TaxInfo;
  invoice_numbering: {
    prefix: string;
    format: string;
    next_number: number;
  };
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  payment_received: boolean;
  payment_failed: boolean;
  invoice_overdue: boolean;
  new_project_assignment: boolean;
  weekly_summary: boolean;
  monthly_report: boolean;
}

// Types pour les hooks React
export interface UsePaymentsReturn {
  payments: Payment[];
  loading: boolean;
  error: PaymentError | null;
  stats: PaymentStats | null;
  filters: PaymentFilters;
  updateFilters: (filters: Partial<PaymentFilters>) => void;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export interface UsePaymentActionsReturn {
  createPayment: (data: CreatePaymentData) => Promise<Payment>;
  updatePayment: (paymentId: string, data: UpdatePaymentData) => Promise<Payment>;
  deletePayment: (paymentId: string) => Promise<boolean>;
  validatePayment: (paymentId: string) => Promise<Payment>;
  requestPayment: (paymentId: string) => Promise<Payment>;
  markAsPaid: (paymentId: string, paymentMethod: PaymentMethod) => Promise<Payment>;
  exportPayments: (filters: PaymentFilters, format: PaymentExportFormat) => Promise<PaymentExport>;
  generateInvoice: (paymentId: string) => Promise<Invoice>;
  sendInvoice: (invoiceId: string) => Promise<boolean>;
  calculatePayment: (timeRecordIds: string[]) => Promise<PaymentCalculation>;
}

export interface UsePaymentStatsReturn {
  stats: PaymentStats | null;
  loading: boolean;
  error: PaymentError | null;
  refreshStats: () => Promise<void>;
  getClientStats: (clientId: string) => Promise<TopClient | null>;
  getProjectStats: (projectId: string) => Promise<ProjectEarnings | null>;
  getTaxReport: (year: number, quarter?: number) => Promise<TaxReport>;
}

export interface UseTimeTrackingReturn {
  activeSession: TimeRecord | null;
  todayRecords: TimeRecord[];
  weekRecords: TimeRecord[];
  loading: boolean;
  error: PaymentError | null;
  startTracking: (projectId: string, description: string) => Promise<TimeRecord>;
  stopTracking: () => Promise<TimeRecord>;
  pauseTracking: () => Promise<void>;
  resumeTracking: () => Promise<void>;
  updateDescription: (recordId: string, description: string) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  getTotalToday: () => number;
  getTotalThisWeek: () => number;
}

export interface UseInvoicesReturn {
  invoices: Invoice[];
  loading: boolean;
  error: PaymentError | null;
  filters: InvoiceFilters;
  updateFilters: (filters: Partial<InvoiceFilters>) => void;
  createInvoice: (paymentIds: string[]) => Promise<Invoice>;
  sendInvoice: (invoiceId: string) => Promise<boolean>;
  downloadInvoice: (invoiceId: string, format: 'pdf' | 'html') => Promise<string>;
  markInvoiceAsPaid: (invoiceId: string) => Promise<Invoice>;
  refetch: () => Promise<void>;
}

export interface InvoiceFilters {
  status?: InvoiceStatus[];
  date_range?: {
    start: string;
    end: string;
  };
  client_ids?: string[];
  amount_range?: {
    min_cents: number;
    max_cents: number;
  };
  search_query?: string;
  sort_by?: 'invoice_number' | 'issued_date' | 'due_date' | 'total' | 'client_name';
  sort_order?: 'asc' | 'desc';
}

// Événements temps réel
export interface PaymentRealtimeEvent {
  type: PaymentEventType;
  payment_id?: string;
  invoice_id?: string;
  time_record_id?: string;
  candidate_id: string;
  project_id?: string;
  timestamp: string;
  data: Record<string, any>;
}

export type PaymentEventType =
  | 'payment_created'
  | 'payment_updated'
  | 'payment_validated'
  | 'payment_paid'
  | 'payment_failed'
  | 'invoice_generated'
  | 'invoice_sent'
  | 'time_tracking_started'
  | 'time_tracking_stopped'
  | 'time_record_validated'
  | 'client_viewed_invoice';

export interface PaymentSubscriptionOptions {
  candidate_id?: string;
  project_ids?: string[];
  include_time_tracking?: boolean;
  include_invoices?: boolean;
}

// Intégrations externes
export interface StripeIntegration {
  account_id: string;
  setup_complete: boolean;
  capabilities: string[];
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: StripeRequirement[];
}

export interface StripeRequirement {
  field: string;
  description: string;
  required: boolean;
  deadline?: string;
}

export interface PayPalIntegration {
  merchant_id: string;
  email: string;
  verified: boolean;
  webhook_configured: boolean;
}

export interface BankTransferIntegration {
  iban: string;
  bic: string;
  bank_name: string;
  verified: boolean;
  verification_date?: string;
}