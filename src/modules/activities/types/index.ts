/**
 * Module ACTIVITÉS - Types
 *
 * Ce fichier définit tous les types TypeScript nécessaires pour le module Activités.
 * Il couvre les sessions de temps, les activités, les statistiques, les exports et les filtres.
 *
 * Types principaux :
 * - TimeSession : Session de suivi du temps
 * - ActivityItem : Élément d'activité générique
 * - ActivityStats : Statistiques et métriques d'activité
 * - ActivityFilters : Filtres et paramètres de recherche
 * - ActivityExport : Fonctionnalités d'export
 */

// ==========================================
// CORE TYPES - Sessions de temps et activités
// ==========================================

export type ActivityStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type ActivityType = 'task' | 'meeting' | 'research' | 'development' | 'documentation' | 'other';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TimeSession {
  id: string;
  project_id: string;
  candidate_id: string;
  task_id?: string | null;
  activity_description: string;
  activity_type?: ActivityType;
  priority?: ActivityPriority;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  hourly_rate: number;
  total_cost: number | null;
  status: ActivityStatus;
  tags?: string[];
  notes?: string | null;
  edit_history?: ActivityEditHistory[];
  created_at: string;
  updated_at: string;

  // Relations enrichies
  project_title?: string;
  project_status?: string;
  task_title?: string;
  task_status?: string;
}

export interface ActivityEditHistory {
  id: string;
  edited_at: string;
  edited_by: string;
  old_duration: number | null;
  new_duration: number | null;
  old_description?: string;
  new_description?: string;
  reason: string;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  project_id: string;
  project_title: string;
  candidate_id: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  duration_minutes?: number;
  cost?: number;
  start_time: string;
  end_time?: string | null;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  activity_type: ActivityType;
  estimated_duration: number;
  default_tags: string[];
  is_public: boolean;
  created_by: string;
  usage_count: number;
}

// ==========================================
// STATISTICS & ANALYTICS
// ==========================================

export interface ActivityStats {
  // Données générales
  total_sessions: number;
  total_minutes: number;
  total_cost: number;
  active_sessions: number;
  completed_sessions: number;
  average_session_duration: number;

  // Distribution par type d'activité
  activity_distribution: ActivityTypeDistribution[];

  // Distribution par projet
  project_distribution: ProjectActivityStats[];

  // Statistiques temporelles
  daily_stats: DailyActivityStats[];
  weekly_stats: WeeklyActivityStats[];
  monthly_stats: MonthlyActivityStats[];

  // Métriques de performance
  productivity_score: number; // 0-100
  consistency_score: number; // 0-100
  efficiency_trend: 'improving' | 'declining' | 'stable';
  trend_percentage: number;

  // Recommandations
  recommendations: ActivityRecommendation[];
  goals: ActivityGoal[];

  // Comparaisons
  vs_previous_period: PeriodComparison;
  vs_average_candidate: BenchmarkComparison;
}

export interface ActivityTypeDistribution {
  type: ActivityType;
  count: number;
  total_minutes: number;
  total_cost: number;
  percentage: number;
  average_duration: number;
}

export interface ProjectActivityStats {
  project_id: string;
  project_title: string;
  project_status: string;
  total_sessions: number;
  total_minutes: number;
  total_cost: number;
  efficiency_score: number;
  last_activity: string;
  most_common_activity: ActivityType;
  tags: string[];
}

export interface DailyActivityStats {
  date: string;
  total_minutes: number;
  sessions_count: number;
  cost: number;
  productivity_score: number;
  most_productive_hour: number;
  activity_types: ActivityType[];
}

export interface WeeklyActivityStats {
  week_start: string;
  week_end: string;
  total_minutes: number;
  sessions_count: number;
  cost: number;
  average_daily_minutes: number;
  peak_day: string;
  lowest_day: string;
}

export interface MonthlyActivityStats {
  month: string;
  year: number;
  total_minutes: number;
  sessions_count: number;
  cost: number;
  billable_percentage: number;
  growth_rate: number;
  target_achievement: number; // 0-100%
}

export interface ActivityRecommendation {
  id: string;
  type: 'productivity' | 'efficiency' | 'balance' | 'goal';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  impact_score: number; // 1-10
  effort_required: number; // 1-10
  category: string;
}

export interface ActivityGoal {
  id: string;
  title: string;
  description: string;
  target_type: 'duration' | 'sessions' | 'cost' | 'productivity';
  target_value: number;
  current_value: number;
  progress_percentage: number;
  deadline?: string;
  status: 'active' | 'completed' | 'paused' | 'failed';
  created_at: string;
}

export interface PeriodComparison {
  period_type: 'week' | 'month' | 'quarter';
  current_value: number;
  previous_value: number;
  change_percentage: number;
  change_type: 'increase' | 'decrease' | 'stable';
  is_improvement: boolean;
}

export interface BenchmarkComparison {
  metric: string;
  user_value: number;
  average_value: number;
  percentile: number; // 0-100
  ranking: 'top_10' | 'above_average' | 'average' | 'below_average' | 'bottom_10';
}

// ==========================================
// FILTERS & SEARCH
// ==========================================

export type ActivitySortBy =
  | 'created_at'
  | 'start_time'
  | 'duration'
  | 'cost'
  | 'project_title'
  | 'activity_type'
  | 'status';

export interface ActivityFilters {
  // Filtres basiques
  project_id?: string;
  task_id?: string;
  activity_type?: ActivityType;
  status?: ActivityStatus;
  priority?: ActivityPriority;

  // Filtres temporels
  date_from?: string;
  date_to?: string;
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

  // Filtres de durée et coût
  min_duration?: number;
  max_duration?: number;
  min_cost?: number;
  max_cost?: number;

  // Filtres avancés
  has_notes?: boolean;
  has_tags?: boolean;
  tags?: string[];
  search?: string; // Recherche textuelle

  // Pagination et tri
  page?: number;
  per_page?: number;
  sort_by?: ActivitySortBy;
  sort_order?: 'asc' | 'desc';

  // Options d'affichage
  include_archived?: boolean;
  include_deleted?: boolean;
  group_by?: 'date' | 'project' | 'type' | 'status';
}

// ==========================================
// API RESPONSES & REQUESTS
// ==========================================

export interface CreateTimeSessionData {
  project_id: string;
  task_id?: string | null;
  activity_description: string;
  activity_type?: ActivityType;
  priority?: ActivityPriority;
  hourly_rate: number;
  tags?: string[];
  notes?: string;
}

export interface UpdateTimeSessionData {
  activity_description?: string;
  activity_type?: ActivityType;
  priority?: ActivityPriority;
  duration_minutes?: number;
  notes?: string;
  tags?: string[];
  end_time?: string;
  status?: ActivityStatus;
}

export interface ActivityAPIResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: ActivityError;
  metadata?: {
    total?: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
  };
}

export interface ActivityPaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_more: boolean;
  has_previous: boolean;
}

export interface ActivityError {
  code: ActivityErrorCode;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

export type ActivityErrorCode =
  | 'ACTIVITY_NOT_FOUND'
  | 'SESSION_ALREADY_ACTIVE'
  | 'SESSION_NOT_ACTIVE'
  | 'INVALID_TIME_RANGE'
  | 'INVALID_DURATION'
  | 'INVALID_RATE'
  | 'PERMISSION_DENIED'
  | 'PROJECT_NOT_FOUND'
  | 'CANDIDATE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'EXPORT_ERROR'
  | 'TEMPLATE_ERROR';

// ==========================================
// EXPORT & REPORTING
// ==========================================

export type ActivityExportFormat = 'csv' | 'pdf' | 'excel' | 'json';

export interface ActivityExport {
  id: string;
  format: ActivityExportFormat;
  filename: string;
  file_url?: string;
  filters: ActivityFilters;
  total_records: number;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  download_count: number;
  error_message?: string;
}

export interface ActivityReport {
  id: string;
  title: string;
  description: string;
  type: 'summary' | 'detailed' | 'analytics' | 'comparison';
  template_id?: string;
  filters: ActivityFilters;
  data: ActivityReportData;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  scheduled_generation?: boolean;
  next_generation?: string;
}

export interface ActivityReportData {
  summary: ActivityStats;
  charts: ActivityChart[];
  tables: ActivityTable[];
  insights: ActivityInsight[];
  recommendations: ActivityRecommendation[];
}

export interface ActivityChart {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter';
  title: string;
  data: any;
  options: any;
}

export interface ActivityTable {
  id: string;
  title: string;
  headers: string[];
  rows: any[][];
  summary?: Record<string, any>;
}

export interface ActivityInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'achievement' | 'warning';
  title: string;
  description: string;
  value?: number;
  change?: number;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-100
}

// ==========================================
// HOOKS RETURN TYPES
// ==========================================

export interface UseActivitiesReturn {
  // Données principales
  activities: TimeSession[];
  stats: ActivityStats | null;
  loading: boolean;
  error: ActivityError | null;

  // États de pagination
  hasMore: boolean;
  totalCount: number;
  currentPage: number;

  // Actions
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  clearError: () => void;

  // Filtres et recherche
  currentFilters: ActivityFilters;
  setFilters: (filters: Partial<ActivityFilters>) => void;
  resetFilters: () => void;

  // Sessions actives
  activeSessions: TimeSession[];
  hasActiveSession: boolean;
}

export interface UseActivityActionsReturn {
  // Actions CRUD
  createSession: (data: CreateTimeSessionData) => Promise<ActivityAPIResponse<TimeSession>>;
  updateSession: (id: string, data: UpdateTimeSessionData) => Promise<ActivityAPIResponse<TimeSession>>;
  deleteSession: (id: string) => Promise<ActivityAPIResponse<void>>;

  // Actions de contrôle des sessions
  startSession: (data: CreateTimeSessionData) => Promise<ActivityAPIResponse<TimeSession>>;
  pauseSession: (id: string) => Promise<ActivityAPIResponse<TimeSession>>;
  resumeSession: (id: string) => Promise<ActivityAPIResponse<TimeSession>>;
  stopSession: (id: string) => Promise<ActivityAPIResponse<TimeSession>>;

  // Fonctions utilitaires
  formatDuration: (minutes: number) => string;
  formatCost: (cost: number) => string;
  calculateSessionCost: (session: TimeSession) => number;
  getActivityTypeColor: (type: ActivityType) => string;
  getActivityStatusColor: (status: ActivityStatus) => string;

  // Validation
  validateSessionData: (data: CreateTimeSessionData) => ActivityError | null;
  canEditSession: (session: TimeSession) => boolean;
  canDeleteSession: (session: TimeSession) => boolean;

  // Export et rapports
  exportActivities: (filters: ActivityFilters, format: ActivityExportFormat) => Promise<ActivityAPIResponse<ActivityExport>>;
  generateReport: (type: string, filters: ActivityFilters) => Promise<ActivityAPIResponse<ActivityReport>>;

  // Templates
  getTemplates: () => Promise<ActivityAPIResponse<ActivityTemplate[]>>;
  applyTemplate: (templateId: string, projectId: string) => Promise<ActivityAPIResponse<TimeSession>>;

  // États de chargement
  loading: boolean;
  submitting: boolean;
  error: ActivityError | null;
}

export interface UseActivityStatsReturn {
  // Statistiques principales
  stats: ActivityStats | null;
  loading: boolean;
  error: ActivityError | null;

  // Actions de rafraîchissement
  refreshStats: () => Promise<void>;

  // Méthodes utilitaires
  getProjectStats: (projectId: string) => ProjectActivityStats | null;
  getActivityTypeStats: (type: ActivityType) => ActivityTypeDistribution | null;
  getPeriodStats: (period: string) => MonthlyActivityStats | null;

  // Analyses avancées
  calculateProductivityTrend: (days: number) => number;
  getRecommendations: () => ActivityRecommendation[];
  getGoalProgress: () => ActivityGoal[];

  // Comparaisons
  compareWithPrevious: (metric: string) => PeriodComparison;
  getBenchmarkPosition: (metric: string) => BenchmarkComparison;

  // Prédictions (basées sur l'historique)
  predictMonthlyGoal: () => number;
  estimateProjectCompletion: (projectId: string) => string | null;

  // Cache et performance
  lastUpdated: string | null;
  cacheStatus: 'fresh' | 'stale' | 'updating';
}

export interface UseActivityTimerReturn {
  // État du timer
  currentSession: TimeSession | null;
  isActive: boolean;
  isPaused: boolean;
  elapsedTime: number; // en secondes
  currentCost: number;

  // Actions de contrôle
  startTimer: (data: CreateTimeSessionData) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;

  // Données formatées
  formattedTime: string;
  formattedCost: string;

  // États
  loading: boolean;
  error: ActivityError | null;

  // Configuration
  autoSaveInterval: number;
  lastSaved: string | null;
}

// ==========================================
// COMPONENT PROPS
// ==========================================

export interface ModularActivitiesViewProps {
  candidateId?: string;
  availableProjects?: Array<{ id: string; title: string; status?: string }>;
  initialFilters?: Partial<ActivityFilters>;
  showTimer?: boolean;
  showStats?: boolean;
  showExportOptions?: boolean;
  showTemplates?: boolean;
  className?: string;
  onSessionStart?: (session: TimeSession) => void;
  onSessionComplete?: (session: TimeSession) => void;
  onExport?: (exportData: ActivityExport) => void;
}

export interface ActivityTimerProps {
  projectId?: string;
  taskId?: string;
  hourlyRate: number;
  onStart?: (session: TimeSession) => void;
  onStop?: (session: TimeSession) => void;
  onPause?: (session: TimeSession) => void;
  autoSave?: boolean;
  className?: string;
}

export interface ActivityStatsCardProps {
  stats: ActivityStats;
  period: 'week' | 'month' | 'quarter';
  showComparison?: boolean;
  className?: string;
}

export interface ActivityListProps {
  activities: TimeSession[];
  loading?: boolean;
  onEdit?: (session: TimeSession) => void;
  onDelete?: (sessionId: string) => void;
  onExport?: () => void;
  showFilters?: boolean;
  className?: string;
}

// ==========================================
// UTILITIES TYPES
// ==========================================

export type KeysOf<T> = keyof T;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface ActivityModuleConfig {
  name: 'ACTIVITIES';
  version: string;
  description: string;
  features: string[];
  components: string[];
  hooks: string[];
  services: string[];
}

// ==========================================
// CONSTANTS
// ==========================================

export const ACTIVITY_CONSTANTS = {
  TYPES: {
    TASK: 'task',
    MEETING: 'meeting',
    RESEARCH: 'research',
    DEVELOPMENT: 'development',
    DOCUMENTATION: 'documentation',
    OTHER: 'other'
  } as const,

  STATUSES: {
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  } as const,

  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  } as const,

  EXPORT_FORMATS: {
    CSV: 'csv',
    PDF: 'pdf',
    EXCEL: 'excel',
    JSON: 'json'
  } as const,

  DURATIONS: {
    MIN_SESSION: 1, // 1 minute minimum
    MAX_SESSION: 480, // 8 heures maximum
    AUTO_SAVE_INTERVAL: 60, // 1 minute
    IDLE_TIMEOUT: 1800 // 30 minutes
  } as const
} as const;