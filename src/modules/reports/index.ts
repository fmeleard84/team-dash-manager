/**
 * Module RAPPORTS - Export Principal
 *
 * Ce module gère tous les aspects liés aux rapports et analytics client :
 * - Tableaux de bord avancés et métriques temps réel
 * - Rapports personnalisables et templates réutilisables
 * - Export multi-format (PDF, Excel, CSV, JSON, XML)
 * - Analytics avancés avec visualisation de données
 * - Planification et automatisation de rapports
 * - Comparaisons périodiques et benchmarks
 * - Rapports financiers et opérationnels
 * - Système de recommandations intelligent
 * - Intégration complète avec time tracking et projets
 *
 * Architecture modulaire suivant le pattern établi dans les autres modules.
 */

// ==========================================
// COMPOSANTS
// ==========================================

export {
  ModularReportsView,
  ClientReports, // Alias pour compatibilité
  ReportsView, // Alias pour compatibilité
  ReportsCenter, // Alias pour compatibilité
  Analytics, // Alias pour compatibilité
  ReportsHub, // Alias pour compatibilité
  REPORTS_MODULE_CONFIG
} from './components';

// ==========================================
// HOOKS
// ==========================================

export {
  useReports,
  useReportAnalytics,
  useReportTemplates,
  useReportExport
} from './hooks';

// ==========================================
// SERVICES
// ==========================================

export {
  ReportsAPI
} from './services';

// ==========================================
// TYPES
// ==========================================

export type {
  // Core types
  Report,
  ReportData,
  ReportTemplate,
  ReportSchedule,
  ReportExport,
  CompanyInfo,

  // Analytics et métriques
  DashboardMetrics,
  ProjectAnalytics,
  CandidatePerformance,
  FinancialReport,
  TrendData,
  TimeSeriesData,

  // Configuration et filtres
  ReportConfig,
  ReportFilters,
  ReportBranding,
  ExportConfig,
  ChartConfig,
  ChartData,
  ChartDataset,

  // Visualisation
  ChartMetadata,
  AxisConfig,
  BenchmarkData,
  ExecutiveSummary,
  KeyMetrics,
  TrendAnalysis,
  Recommendation,

  // Status et enums
  ReportStatus,
  ReportType,
  ReportCategory,
  ReportFormat,
  ScheduleFrequency,
  TimePeriod,
  ChartType,
  ChartExportFormat,
  ProjectStatus,
  ReportSection,

  // API types
  ReportAPIResponse,
  ReportPaginatedResponse,
  ReportMetadata,
  DateRange,
  CostBreakdown,
  ProjectRevenue,
  CostCategory,
  MonthlyFinancial,
  FinancialComparison,
  SeasonalPattern,

  // Hooks return types
  UseReportsReturn,
  UseReportAnalyticsReturn,
  UseReportTemplatesReturn,
  UseReportExportReturn,

  // Component props
  ModularReportsViewProps,
  ReportBuilderProps,
  ReportViewerProps,
  AnalyticsDashboardProps,

  // Données de création/mise à jour
  CreateReportData,
  UpdateReportData,
  CreateReportTemplateData,
  UpdateReportTemplateData,
  ReportRecipient,

  // Utilities
  KeysOf,
  PartialBy,
  ReportsModuleConfig,
  PaginatedResult,
  ReportDataContent
} from './types';

// ==========================================
// CONSTANTES ET UTILITAIRES
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

  // Status
  REPORT_STATUSES: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    GENERATING: 'generating',
    READY: 'ready',
    SCHEDULED: 'scheduled',
    FAILED: 'failed',
    ARCHIVED: 'archived'
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

  // Fréquences de planification
  FREQUENCIES: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    YEARLY: 'yearly',
    CUSTOM: 'custom'
  } as const,

  // Périodes temporelles
  TIME_PERIODS: {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    QUARTER: 'quarter',
    YEAR: 'year',
    CUSTOM: 'custom'
  } as const,

  // Types de graphiques
  CHART_TYPES: {
    LINE: 'line',
    BAR: 'bar',
    PIE: 'pie',
    DOUGHNUT: 'doughnut',
    AREA: 'area',
    SCATTER: 'scatter',
    RADAR: 'radar',
    HEATMAP: 'heatmap'
  } as const,

  // Formats d'export de graphiques
  CHART_EXPORT_FORMATS: {
    PNG: 'png',
    JPG: 'jpg',
    SVG: 'svg',
    PDF: 'pdf'
  } as const,

  // Sections de rapport
  REPORT_SECTIONS: {
    EXECUTIVE_SUMMARY: 'executive_summary',
    KEY_METRICS: 'key_metrics',
    PROJECT_ANALYTICS: 'project_analytics',
    FINANCIAL_ANALYSIS: 'financial_analysis',
    TEAM_PERFORMANCE: 'team_performance',
    TRENDS: 'trends',
    RECOMMENDATIONS: 'recommendations',
    APPENDIX: 'appendix'
  } as const,

  // Paramètres par défaut
  DEFAULTS: {
    PAGE_SIZE: 20,
    RETENTION_DAYS: 90,
    MAX_EXPORT_SIZE_MB: 50,
    MAX_CHART_DATA_POINTS: 1000,
    MAX_REPORTS_PER_CLIENT: 100,
    MAX_SCHEDULED_REPORTS: 20,
    AUTO_REFRESH_INTERVAL: 60000 // 1 minute
  } as const,

  // Couleurs pour les graphiques
  CHART_COLORS: [
    '#8b5cf6', // Violet principal
    '#ec4899', // Rose
    '#3b82f6', // Bleu
    '#10b981', // Vert
    '#f59e0b', // Orange
    '#ef4444', // Rouge
    '#8b5a2b', // Marron
    '#6b7280'  // Gris
  ] as const,

  // Thèmes de branding
  BRANDING_THEMES: {
    PROFESSIONAL: 'professional',
    MODERN: 'modern',
    MINIMAL: 'minimal',
    COLORFUL: 'colorful'
  } as const,

  // Couleurs de statut
  STATUS_COLORS: {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    generating: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    scheduled: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  } as const,

  // Validation
  VALIDATION: {
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_NOTES_LENGTH: 5000,
    MIN_DATE_RANGE_DAYS: 1,
    MAX_DATE_RANGE_DAYS: 365 * 2, // 2 ans
    MAX_COMPARISON_PERIODS: 12,
    MAX_TEMPLATE_NAME_LENGTH: 100
  } as const
} as const;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Formate un montant en devise
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
 * Formate une taille de fichier
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Calcule un pourcentage de changement
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Génère une plage de dates
 */
export const generateDateRange = (period: TimePeriod, customDays?: number): DateRange => {
  const end = new Date().toISOString().split('T')[0];
  let days: number;

  switch (period) {
    case 'day':
      days = 1;
      break;
    case 'week':
      days = 7;
      break;
    case 'month':
      days = 30;
      break;
    case 'quarter':
      days = 90;
      break;
    case 'year':
      days = 365;
      break;
    case 'custom':
      days = customDays || 30;
      break;
    default:
      days = 30;
  }

  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return { start, end };
};

/**
 * Obtient la couleur d'un statut de rapport
 */
export const getReportStatusColor = (status: string): string => {
  return REPORTS_CONSTANTS.STATUS_COLORS[status as keyof typeof REPORTS_CONSTANTS.STATUS_COLORS] ||
         REPORTS_CONSTANTS.STATUS_COLORS.draft;
};

/**
 * Valide un objet de configuration de rapport
 */
export const validateReportConfig = (config: ReportConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.sections || config.sections.length === 0) {
    errors.push('Au moins une section doit être sélectionnée');
  }

  if (!config.export_formats || config.export_formats.length === 0) {
    errors.push('Au moins un format d\'export doit être sélectionné');
  }

  if (config.comparison_periods && config.comparison_periods > REPORTS_CONSTANTS.VALIDATION.MAX_COMPARISON_PERIODS) {
    errors.push(`Le nombre de périodes de comparaison ne peut pas dépasser ${REPORTS_CONSTANTS.VALIDATION.MAX_COMPARISON_PERIODS}`);
  }

  if (config.retention_days && config.retention_days > 365 * 2) {
    errors.push('La durée de rétention ne peut pas dépasser 2 ans');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Génère un nom de fichier pour l'export
 */
export const generateExportFileName = (
  reportTitle: string,
  format: ReportFormat,
  timestamp?: Date
): string => {
  const date = timestamp || new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');

  const cleanTitle = reportTitle
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  return `${cleanTitle}_${dateStr}_${timeStr}.${format}`;
};

// ==========================================
// DOCUMENTATION DU MODULE
// ==========================================

/**
 * ## Module RAPPORTS
 *
 * ### Fonctionnalités principales :
 *
 * 1. **Analytics avancés**
 *    - Métriques temps réel et historiques
 *    - Tableaux de bord interactifs
 *    - Visualisation de données avancée
 *    - Tendances et comparaisons périodiques
 *
 * 2. **Rapports personnalisables**
 *    - Templates réutilisables et configurables
 *    - Génération automatique et manuelle
 *    - Rapports planifiés et récurrents
 *    - Branding et personnalisation visuelle
 *
 * 3. **Export multi-format**
 *    - PDF professionnel avec graphiques
 *    - Excel avec formules et données
 *    - CSV pour analyse externe
 *    - JSON/XML pour intégrations
 *    - HTML pour partage web
 *
 * 4. **Analytics financiers**
 *    - Analyse des coûts et revenus
 *    - Marges et rentabilité
 *    - Prévisions et budgets
 *    - Comparaisons périodiques
 *
 * 5. **Performance et équipe**
 *    - Analytics par projet et candidat
 *    - Métriques de productivité
 *    - Évaluations et scores
 *    - Recommandations automatiques
 *
 * ### Architecture :
 *
 * - **Services** : ReportsAPI pour toutes les interactions Supabase
 * - **Hooks** : 4 hooks spécialisés pour différents aspects
 * - **Composants** : Interface modulaire avec 5 onglets principaux
 * - **Types** : Plus de 80 types TypeScript pour la sécurité
 *
 * ### Visualisation :
 *
 * - Graphiques interactifs avec Recharts
 * - 8 types de graphiques supportés
 * - Thèmes personnalisables
 * - Export haute qualité
 *
 * ### Usage :
 *
 * ```typescript
 * import { ModularReportsView, useReports } from '@/modules/reports';
 *
 * // Dans un composant client
 * <ModularReportsView
 *   clientId={user.id}
 *   showOverview={true}
 *   showReports={true}
 *   showAnalytics={true}
 *   showTemplates={true}
 *   initialView="overview"
 * />
 *
 * // Ou utiliser les hooks directement
 * const { reports, createReport, generateReport } = useReports();
 * const { dashboardMetrics, exportMetrics } = useReportAnalytics();
 * const { templates, useTemplate } = useReportTemplates();
 * const { exportReport, downloadExport } = useReportExport();
 * ```
 *
 * ### Intégration :
 *
 * Le module s'intègre parfaitement avec :
 * - Module TIME TRACKING (métriques automatiques)
 * - Module PROJETS (analytics par projet)
 * - Module FACTURES (données financières)
 * - Système d'authentification
 * - Recharts pour visualisation
 * - Export PDF et Excel
 * - Real-time synchronisation
 * - Email notifications
 */