/**
 * Module RAPPORTS - Types Principal
 *
 * Types TypeScript complets pour le système de rapports client avec :
 * - Analytics avancés et tableaux de bord
 * - Métriques temps réel et tendances
 * - Export multi-format (PDF, Excel, CSV, JSON)
 * - Rapports personnalisables et planifiés
 * - Visualisation de données et graphiques
 * - Comparaisons périodiques et benchmarks
 * - Rapports financiers et opérationnels
 */

// ==========================================
// CORE TYPES - RAPPORTS
// ==========================================

export interface Report {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  type: ReportType;
  category: ReportCategory;

  // Configuration
  config: ReportConfig;
  filters: ReportFilters;

  // Scheduling
  is_scheduled: boolean;
  schedule_frequency: ScheduleFrequency | null;
  next_run_date: string | null;

  // Status et metadata
  status: ReportStatus;
  last_generated: string | null;
  last_generated_by: string | null;
  generation_time_ms: number | null;
  file_size_bytes: number | null;

  // Données de base
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ReportData {
  id: string;
  report_id: string;

  // Contenu
  data: ReportDataContent;
  metadata: ReportMetadata;

  // Export
  format: ReportFormat;
  file_path: string | null;
  file_size: number | null;

  // Statut
  status: 'generating' | 'ready' | 'expired' | 'failed';
  error_message: string | null;

  // Timestamps
  generated_at: string;
  expires_at: string | null;
}

export interface ReportTemplate {
  id: string;
  client_id: string;
  name: string;
  description: string | null;

  // Configuration template
  config: ReportConfig;
  default_filters: ReportFilters;

  // Style et branding
  branding: ReportBranding;

  // Partage
  is_public: boolean;
  is_system_template: boolean;

  // Métadonnées
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ==========================================
// DONNÉES ET MÉTRIQUES
// ==========================================

export interface DashboardMetrics {
  // Métriques temps réel
  current_cost_per_minute: number;
  active_candidates_count: number;
  paused_candidates_count: number;
  total_current_cost: number;

  // Métriques périodiques
  total_time_period: number; // en minutes
  total_cost_period: number;
  active_projects_count: number;
  completed_projects_count: number;

  // Tendances
  cost_trend: TrendData;
  time_trend: TrendData;
  project_trend: TrendData;

  // Comparaisons
  previous_period_cost: number;
  previous_period_time: number;
  cost_change_percentage: number;
  time_change_percentage: number;
}

export interface ProjectAnalytics {
  project_id: string;
  project_name: string;

  // Coûts et temps
  total_cost: number;
  total_time_minutes: number;
  hourly_rate_average: number;

  // Équipe
  team_size: number;
  candidates_active: number;
  candidates_completed: number;

  // Performance
  efficiency_score: number;
  completion_rate: number;
  on_time_rate: number;
  budget_utilization: number;

  // Historique
  daily_costs: TimeSeriesData[];
  weekly_hours: TimeSeriesData[];
  monthly_progress: TimeSeriesData[];

  // Statut
  status: ProjectStatus;
  health_score: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface CandidatePerformance {
  candidate_id: string;
  candidate_name: string;

  // Productivité
  total_hours_period: number;
  total_cost_period: number;
  hourly_rate: number;
  projects_count: number;

  // Performance
  efficiency_rating: number;
  quality_score: number;
  punctuality_score: number;
  communication_score: number;

  // Comparaisons
  ranking_position: number;
  peer_comparison: number; // pourcentage vs moyenne équipe
  improvement_trend: 'improving' | 'stable' | 'declining';

  // Activité
  active_sessions_count: number;
  completed_sessions_count: number;
  average_session_length: number;

  // Coûts détaillés
  cost_breakdown: CostBreakdown[];
  billable_rate: number;
  utilization_rate: number;
}

export interface FinancialReport {
  // Période
  period_start: string;
  period_end: string;
  period_type: TimePeriod;

  // Revenus
  total_revenue: number;
  billable_hours: number;
  average_hourly_rate: number;

  // Coûts
  total_costs: number;
  candidate_costs: number;
  platform_fees: number;
  other_expenses: number;

  // Marge
  gross_margin: number;
  margin_percentage: number;

  // Comparaisons
  previous_period: FinancialComparison;
  year_over_year: FinancialComparison;

  // Détails
  revenue_by_project: ProjectRevenue[];
  cost_by_category: CostCategory[];
  monthly_breakdown: MonthlyFinancial[];

  // Prévisions
  forecast_next_month: number;
  forecast_confidence: number;
}

// ==========================================
// VISUALISATION ET GRAPHIQUES
// ==========================================

export interface ChartConfig {
  type: ChartType;
  title: string;
  subtitle?: string;

  // Données
  data_source: string;
  x_axis: AxisConfig;
  y_axis: AxisConfig;

  // Style
  colors: string[];
  theme: 'light' | 'dark' | 'auto';
  animation: boolean;

  // Interactions
  interactive: boolean;
  zoom_enabled: boolean;
  tooltip_enabled: boolean;

  // Export
  exportable: boolean;
  formats: ChartExportFormat[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  change_percentage: number;
  direction: 'up' | 'down' | 'stable';
  trend_line: TimeSeriesData[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  metadata: ChartMetadata;
}

export interface ChartDataset {
  label: string;
  data: number[];
  background_color?: string | string[];
  border_color?: string | string[];
  border_width?: number;
  fill?: boolean;
}

// ==========================================
// CONFIGURATION ET FILTRES
// ==========================================

export interface ReportConfig {
  // Sections à inclure
  sections: ReportSection[];

  // Format et layout
  layout: 'single_column' | 'two_columns' | 'dashboard';
  page_size: 'A4' | 'A3' | 'letter' | 'custom';
  orientation: 'portrait' | 'landscape';

  // Contenu
  include_charts: boolean;
  include_tables: boolean;
  include_summary: boolean;
  include_recommendations: boolean;

  // Données
  data_aggregation: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  comparison_periods: number;
  include_forecasts: boolean;

  // Export
  export_formats: ReportFormat[];
  auto_archive: boolean;
  retention_days: number;
}

export interface ReportFilters {
  // Période
  date_range: DateRange;
  period_type: TimePeriod;

  // Projets
  project_ids?: string[];
  project_status?: ProjectStatus[];
  project_categories?: string[];

  // Équipe
  candidate_ids?: string[];
  roles?: string[];
  seniority_levels?: string[];

  // Métriques
  min_cost?: number;
  max_cost?: number;
  min_hours?: number;
  max_hours?: number;

  // Status
  status_filters?: string[];

  // Personnalisé
  custom_filters?: Record<string, any>;
}

export interface ReportBranding {
  // Logo et couleurs
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;

  // Textes
  company_name: string;
  company_address?: string;
  footer_text?: string;
  header_text?: string;

  // Style
  font_family: string;
  font_size: number;
  theme: 'professional' | 'modern' | 'minimal' | 'colorful';
}

// ==========================================
// DONNÉES DÉTAILLÉES
// ==========================================

export interface ReportDataContent {
  // Résumé exécutif
  executive_summary: ExecutiveSummary;

  // Métriques principales
  key_metrics: KeyMetrics;

  // Analytics détaillés
  project_analytics: ProjectAnalytics[];
  candidate_performance: CandidatePerformance[];
  financial_analysis: FinancialReport;

  // Tendances
  trends: TrendAnalysis;

  // Recommandations
  recommendations: Recommendation[];

  // Données brutes pour les graphiques
  charts_data: Record<string, ChartData>;

  // Comparaisons
  benchmarks: BenchmarkData[];
}

export interface ExecutiveSummary {
  period: string;
  total_cost: number;
  total_hours: number;
  active_projects: number;
  key_achievements: string[];
  main_challenges: string[];
  next_period_forecast: string[];
}

export interface KeyMetrics {
  cost_per_hour: number;
  utilization_rate: number;
  project_success_rate: number;
  team_satisfaction: number;
  budget_variance: number;
  delivery_performance: number;
}

export interface TrendAnalysis {
  cost_trends: TrendData;
  productivity_trends: TrendData;
  quality_trends: TrendData;
  satisfaction_trends: TrendData;
  seasonal_patterns: SeasonalPattern[];
}

export interface Recommendation {
  id: string;
  category: 'cost' | 'productivity' | 'quality' | 'team' | 'process';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: string;
  timeline: string;
  expected_roi: number | null;
}

// ==========================================
// SCHEDULING ET AUTOMATISATION
// ==========================================

export interface ReportSchedule {
  id: string;
  report_template_id: string;
  client_id: string;

  // Configuration
  name: string;
  description?: string;
  frequency: ScheduleFrequency;

  // Timing
  start_date: string;
  end_date?: string;
  time_of_day: string; // HH:MM format
  timezone: string;

  // Destinataires
  recipients: ReportRecipient[];

  // Options
  auto_send: boolean;
  auto_archive: boolean;
  compress_files: boolean;

  // Status
  is_active: boolean;
  next_run: string;
  last_run?: string;
  runs_count: number;

  // Métadonnées
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ReportRecipient {
  email: string;
  name: string;
  role: string;
  formats: ReportFormat[];
  delivery_method: 'email' | 'download_link' | 'api';
}

// ==========================================
// EXPORT ET FORMATS
// ==========================================

export interface ReportExport {
  id: string;
  report_data_id: string;
  format: ReportFormat;

  // Fichier
  file_name: string;
  file_path: string;
  file_size: number;

  // Configuration export
  export_config: ExportConfig;

  // Status
  status: 'pending' | 'processing' | 'ready' | 'failed';
  progress_percentage: number;
  error_message?: string;

  // Métadonnées
  exported_at: string;
  exported_by: string;
  download_count: number;
  expires_at?: string;
}

export interface ExportConfig {
  // PDF Options
  pdf?: {
    quality: 'low' | 'medium' | 'high';
    include_charts: boolean;
    include_raw_data: boolean;
    watermark?: string;
  };

  // Excel Options
  excel?: {
    include_formulas: boolean;
    include_charts: boolean;
    worksheet_per_section: boolean;
    protect_sheets: boolean;
  };

  // CSV Options
  csv?: {
    delimiter: ',' | ';' | '\t';
    encoding: 'utf-8' | 'utf-16' | 'iso-8859-1';
    include_headers: boolean;
    quote_all: boolean;
  };

  // JSON Options
  json?: {
    pretty_print: boolean;
    include_metadata: boolean;
    compress: boolean;
  };
}

// ==========================================
// ENUMS ET CONSTANTES
// ==========================================

export type ReportType =
  | 'dashboard'
  | 'financial'
  | 'project_summary'
  | 'team_performance'
  | 'cost_analysis'
  | 'time_tracking'
  | 'custom';

export type ReportCategory =
  | 'operational'
  | 'financial'
  | 'strategic'
  | 'compliance'
  | 'performance'
  | 'analytics';

export type ReportStatus =
  | 'draft'
  | 'active'
  | 'generating'
  | 'ready'
  | 'scheduled'
  | 'failed'
  | 'archived';

export type ReportFormat =
  | 'pdf'
  | 'excel'
  | 'csv'
  | 'json'
  | 'html'
  | 'xml';

export type ScheduleFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';

export type TimePeriod =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'custom';

export type ChartType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'area'
  | 'scatter'
  | 'radar'
  | 'heatmap';

export type ChartExportFormat =
  | 'png'
  | 'jpg'
  | 'svg'
  | 'pdf';

export type ProjectStatus =
  | 'pause'
  | 'attente-team'
  | 'play'
  | 'completed';

export type ReportSection =
  | 'executive_summary'
  | 'key_metrics'
  | 'project_analytics'
  | 'financial_analysis'
  | 'team_performance'
  | 'trends'
  | 'recommendations'
  | 'appendix';

// ==========================================
// TYPES D'ASSISTANCE ET UTILITAIRES
// ==========================================

export interface DateRange {
  start: string;
  end: string;
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  description?: string;
}

export interface ProjectRevenue {
  project_id: string;
  project_name: string;
  revenue: number;
  hours: number;
  margin: number;
}

export interface CostCategory {
  category: string;
  amount: number;
  percentage: number;
  breakdown: CostBreakdown[];
}

export interface MonthlyFinancial {
  month: string;
  revenue: number;
  costs: number;
  margin: number;
  hours: number;
}

export interface FinancialComparison {
  revenue_change: number;
  cost_change: number;
  margin_change: number;
  percentage_change: number;
}

export interface SeasonalPattern {
  period: string;
  average_value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

export interface BenchmarkData {
  metric: string;
  current_value: number;
  benchmark_value: number;
  industry_average: number;
  performance: 'above' | 'at' | 'below';
}

export interface AxisConfig {
  label: string;
  type: 'linear' | 'time' | 'category';
  format?: string;
  min?: number;
  max?: number;
}

export interface ChartMetadata {
  generated_at: string;
  data_points: number;
  period: DateRange;
  aggregation: string;
}

export interface ReportMetadata {
  generated_at: string;
  generated_by: string;
  data_points: number;
  processing_time_ms: number;
  data_sources: string[];
  version: string;
}

// ==========================================
// API ET RÉPONSES
// ==========================================

export interface ReportAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    total_count?: number;
    page?: number;
    limit?: number;
    processing_time?: number;
  };
}

export interface ReportPaginatedResponse<T> {
  data: T[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ==========================================
// HOOKS RETURN TYPES
// ==========================================

export interface UseReportsReturn {
  // Données
  reports: Report[];
  totalCount: number;
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  createReport: (data: CreateReportData) => Promise<string | null>;
  updateReport: (id: string, data: UpdateReportData) => Promise<boolean>;
  deleteReport: (id: string) => Promise<boolean>;
  generateReport: (id: string) => Promise<string | null>;

  // Filtres
  filters: ReportFilters;
  updateFilters: (filters: Partial<ReportFilters>) => void;
  resetFilters: () => void;

  // Pagination
  hasMore: boolean;
  loadMore: () => void;
}

export interface UseReportAnalyticsReturn {
  // Métriques
  dashboardMetrics: DashboardMetrics | null;
  projectAnalytics: ProjectAnalytics[];
  candidatePerformance: CandidatePerformance[];

  // États
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Actions
  refreshMetrics: () => Promise<void>;
  exportMetrics: (format: ReportFormat) => Promise<string | null>;

  // Filtres
  timeRange: DateRange;
  setTimeRange: (range: DateRange) => void;
  selectedProjects: string[];
  setSelectedProjects: (projects: string[]) => void;
}

export interface UseReportTemplatesReturn {
  // Templates
  templates: ReportTemplate[];
  systemTemplates: ReportTemplate[];
  loading: boolean;
  error: string | null;

  // Actions
  createTemplate: (data: CreateReportTemplateData) => Promise<string | null>;
  updateTemplate: (id: string, data: UpdateReportTemplateData) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  duplicateTemplate: (id: string, name: string) => Promise<string | null>;

  // Template actuel
  selectedTemplate: ReportTemplate | null;
  selectTemplate: (template: ReportTemplate | null) => void;

  // Utilisation
  useTemplate: (templateId: string, filters: ReportFilters) => Promise<string | null>;
}

export interface UseReportExportReturn {
  // Exports
  exports: ReportExport[];
  loading: boolean;
  error: string | null;

  // Actions
  exportReport: (reportDataId: string, format: ReportFormat, config?: ExportConfig) => Promise<string | null>;
  downloadExport: (exportId: string) => Promise<boolean>;
  deleteExport: (exportId: string) => Promise<boolean>;

  // Status
  getExportStatus: (exportId: string) => ReportExport | null;
  isExporting: boolean;
  exportProgress: Record<string, number>;
}

// ==========================================
// DONNÉES DE CRÉATION/MISE À JOUR
// ==========================================

export interface CreateReportData {
  title: string;
  description?: string;
  type: ReportType;
  category: ReportCategory;
  config: ReportConfig;
  filters: ReportFilters;
  is_scheduled?: boolean;
  schedule_frequency?: ScheduleFrequency;
  template_id?: string;
}

export interface UpdateReportData extends Partial<CreateReportData> {
  status?: ReportStatus;
  last_generated?: string;
}

export interface CreateReportTemplateData {
  name: string;
  description?: string;
  config: ReportConfig;
  default_filters: ReportFilters;
  branding: ReportBranding;
  is_public?: boolean;
}

export interface UpdateReportTemplateData extends Partial<CreateReportTemplateData> {}

// ==========================================
// PROPS DES COMPOSANTS
// ==========================================

export interface ModularReportsViewProps {
  clientId?: string;
  showOverview?: boolean;
  showReports?: boolean;
  showAnalytics?: boolean;
  showTemplates?: boolean;
  showSchedules?: boolean;
  initialView?: 'overview' | 'reports' | 'analytics' | 'templates' | 'schedules';
  className?: string;
}

export interface ReportBuilderProps {
  template?: ReportTemplate;
  onSave?: (report: Report) => void;
  onCancel?: () => void;
  className?: string;
}

export interface ReportViewerProps {
  reportData: ReportData;
  interactive?: boolean;
  exportEnabled?: boolean;
  className?: string;
}

export interface AnalyticsDashboardProps {
  timeRange: DateRange;
  selectedProjects?: string[];
  realTimeEnabled?: boolean;
  className?: string;
}

// ==========================================
// TYPES UTILITAIRES
// ==========================================

export type KeysOf<T> = keyof T;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type PaginatedResult<T> = ReportPaginatedResponse<T>;

export interface ReportsModuleConfig {
  name: string;
  version: string;
  features: string[];
  supported_formats: ReportFormat[];
  max_export_size_mb: number;
  retention_days: number;
}

// ==========================================
// CONSTANTES DU MODULE
// ==========================================

export const REPORTS_CONSTANTS = {
  // Types de rapports
  REPORT_TYPES: {
    DASHBOARD: 'dashboard',
    FINANCIAL: 'financial',
    PROJECT_SUMMARY: 'project_summary',
    TEAM_PERFORMANCE: 'team_performance',
    COST_ANALYSIS: 'cost_analysis',
    TIME_TRACKING: 'time_tracking',
    CUSTOM: 'custom'
  } as const,

  // Catégories
  CATEGORIES: {
    OPERATIONAL: 'operational',
    FINANCIAL: 'financial',
    STRATEGIC: 'strategic',
    COMPLIANCE: 'compliance',
    PERFORMANCE: 'performance',
    ANALYTICS: 'analytics'
  } as const,

  // Formats d'export
  EXPORT_FORMATS: {
    PDF: 'pdf',
    EXCEL: 'excel',
    CSV: 'csv',
    JSON: 'json',
    HTML: 'html',
    XML: 'xml'
  } as const,

  // Fréquences
  FREQUENCIES: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    YEARLY: 'yearly',
    CUSTOM: 'custom'
  } as const,

  // Limites
  LIMITS: {
    MAX_REPORTS_PER_CLIENT: 100,
    MAX_EXPORT_SIZE_MB: 50,
    MAX_CHART_DATA_POINTS: 1000,
    RETENTION_DAYS_DEFAULT: 90,
    MAX_SCHEDULED_REPORTS: 20
  } as const,

  // Couleurs pour les graphiques
  CHART_COLORS: [
    '#8b5cf6', '#ec4899', '#3b82f6', '#10b981',
    '#f59e0b', '#ef4444', '#8b5a2b', '#6b7280'
  ] as const
} as const;