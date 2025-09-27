/**
 * Module ÉVALUATIONS - Types
 *
 * Types TypeScript pour le système d'évaluation des candidats.
 * Inclut les notes, commentaires, statistiques et analytiques.
 */

// ==========================================
// TYPES PRINCIPAUX
// ==========================================

/**
 * Évaluation d'une tâche par un client
 */
export interface TaskRating {
  id: string;
  task_id: string;
  project_id: string;
  candidate_id: string | null;
  client_id: string;
  rating: number; // 1-5
  comment: string | null;
  created_at: string;
  updated_at: string;

  // Données enrichies (non en DB)
  task_title?: string;
  project_title?: string;
  client_name?: string;
  task_category?: string;
  task_priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Commentaire sur une carte Kanban
 */
export interface TaskComment {
  id: string;
  card_id: string;
  project_id: string;
  content: string;
  created_at: string;
  created_by: string;

  // Données enrichies
  card_title?: string;
  project_title?: string;
  author_name?: string;
  author_avatar?: string;
}

/**
 * Item combiné (évaluation ou commentaire) pour l'affichage
 */
export interface EvaluationItem {
  id: string;
  type: 'rating' | 'comment';
  date: string;
  project_id: string;
  project_title?: string;

  // Spécifique aux ratings
  rating?: number;
  comment?: string;
  task_title?: string;
  client_name?: string;

  // Spécifique aux commentaires
  content?: string;
  card_title?: string;
  author_name?: string;
  author_avatar?: string;
}

// ==========================================
// STATISTIQUES ET ANALYTIQUES
// ==========================================

/**
 * Statistiques générales des évaluations
 */
export interface EvaluationStats {
  // Métriques globales
  total_ratings: number;
  average_rating: number;
  rating_distribution: RatingDistribution;
  total_comments: number;

  // Tendances temporelles
  monthly_stats: MonthlyEvaluationStats[];
  recent_trend: 'improving' | 'declining' | 'stable';
  trend_percentage: number;

  // Par projet/client
  project_stats: ProjectEvaluationStats[];
  client_stats: ClientEvaluationStats[];

  // Métriques de performance
  tasks_rated: number;
  completion_rate: number; // % de tâches évaluées
  response_rate: number; // % de clients qui évaluent
}

/**
 * Distribution des notes (1-5 étoiles)
 */
export interface RatingDistribution {
  [key: number]: number; // rating -> count
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/**
 * Statistiques mensuelles
 */
export interface MonthlyEvaluationStats {
  year: number;
  month: number;
  month_name: string;
  total_ratings: number;
  average_rating: number;
  total_comments: number;
  tasks_completed: number;
  evaluation_rate: number; // % de tâches évaluées
}

/**
 * Statistiques par projet
 */
export interface ProjectEvaluationStats {
  project_id: string;
  project_title: string;
  total_ratings: number;
  average_rating: number;
  latest_rating_date: string;
  tasks_completed: number;
  evaluation_rate: number;
  client_satisfaction: 'excellent' | 'good' | 'average' | 'poor';
}

/**
 * Statistiques par client
 */
export interface ClientEvaluationStats {
  client_id: string;
  client_name: string;
  total_ratings: number;
  average_rating: number;
  projects_count: number;
  latest_evaluation: string;
  feedback_frequency: 'high' | 'medium' | 'low';
}

// ==========================================
// FILTRES ET PARAMÈTRES
// ==========================================

/**
 * Filtres pour les évaluations
 */
export interface EvaluationFilters {
  project_id?: string;
  client_id?: string;
  rating_min?: number;
  rating_max?: number;
  date_from?: string;
  date_to?: string;
  has_comment?: boolean;
  task_category?: string;
  sort_by?: EvaluationSortBy;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

/**
 * Champs de tri disponibles
 */
export type EvaluationSortBy =
  | 'created_at'
  | 'rating'
  | 'project_title'
  | 'task_title'
  | 'client_name';

/**
 * Formats d'export disponibles
 */
export type EvaluationExportFormat =
  | 'csv'
  | 'pdf'
  | 'excel'
  | 'json';

/**
 * Données pour créer une évaluation
 */
export interface CreateRatingData {
  task_id: string;
  project_id: string;
  candidate_id: string | null;
  rating: number;
  comment?: string;
}

/**
 * Données pour mettre à jour une évaluation
 */
export interface UpdateRatingData {
  rating?: number;
  comment?: string;
}

// ==========================================
// API RESPONSES
// ==========================================

/**
 * Réponse API générique pour les évaluations
 */
export interface EvaluationAPIResponse<T> {
  success: boolean;
  data: T;
  error?: EvaluationError;
  metadata?: {
    timestamp: string;
    request_id: string;
  };
}

/**
 * Réponse paginée pour les évaluations
 */
export interface EvaluationPaginatedResponse<T> extends EvaluationAPIResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * Export d'évaluations
 */
export interface EvaluationExport {
  id: string;
  format: EvaluationExportFormat;
  file_size: number;
  download_url: string;
  expires_at: string;
  generated_at: string;
  filters_applied: EvaluationFilters;
  total_records: number;
}

// ==========================================
// GESTION D'ERREURS
// ==========================================

/**
 * Types d'erreurs spécifiques aux évaluations
 */
export type EvaluationErrorCode =
  | 'RATING_NOT_FOUND'
  | 'TASK_NOT_FOUND'
  | 'ALREADY_RATED'
  | 'INVALID_RATING'
  | 'PERMISSION_DENIED'
  | 'EXPORT_FAILED'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Structure d'erreur pour les évaluations
 */
export interface EvaluationError {
  code: EvaluationErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// ==========================================
// HOOKS RETURN TYPES
// ==========================================

/**
 * Type de retour pour useEvaluations
 */
export interface UseEvaluationsReturn {
  // Données principales
  evaluations: EvaluationItem[];
  ratings: TaskRating[];
  comments: TaskComment[];
  loading: boolean;
  error: EvaluationError | null;

  // Pagination
  hasMore: boolean;
  loadMore: () => Promise<void>;

  // Actions
  refetch: () => Promise<void>;
  updateFilters: (filters: Partial<EvaluationFilters>) => void;

  // État actuel
  filters: EvaluationFilters;
}

/**
 * Type de retour pour useEvaluationActions
 */
export interface UseEvaluationActionsReturn {
  // Actions principales
  createRating: (data: CreateRatingData) => Promise<TaskRating>;
  updateRating: (ratingId: string, data: UpdateRatingData) => Promise<TaskRating>;
  deleteRating: (ratingId: string) => Promise<boolean>;

  // Actions d'export
  exportEvaluations: (
    filters: EvaluationFilters,
    format: EvaluationExportFormat
  ) => Promise<EvaluationExport>;

  // Utilitaires
  calculateAverageRating: (ratings: TaskRating[]) => number;
  formatRatingLabel: (rating: number) => string;
  canEditRating: (rating: TaskRating, currentUserId: string) => boolean;
}

/**
 * Type de retour pour useEvaluationStats
 */
export interface UseEvaluationStatsReturn {
  // Données principales
  stats: EvaluationStats | null;
  loading: boolean;
  error: EvaluationError | null;

  // Actions
  refreshStats: () => Promise<void>;
  getProjectStats: (projectId: string) => Promise<ProjectEvaluationStats | null>;
  getClientStats: (clientId: string) => Promise<ClientEvaluationStats | null>;

  // Analytiques avancées
  getTrendAnalysis: (months: number) => Promise<{
    trend: 'improving' | 'declining' | 'stable';
    percentage: number;
    confidence: number;
  }>;

  // Comparaisons
  compareWithPreviousPeriod: (currentStats: EvaluationStats) => {
    rating_change: number;
    volume_change: number;
    satisfaction_change: 'improved' | 'declined' | 'stable';
  };
}

/**
 * Type de retour pour useRatingDialog
 */
export interface UseRatingDialogReturn {
  // État du dialog
  isOpen: boolean;
  openDialog: (task: { id: string; title: string; projectId: string; candidateId?: string }) => void;
  closeDialog: () => void;

  // Données du formulaire
  rating: number;
  comment: string;
  isSubmitting: boolean;
  existingRating: TaskRating | null;

  // Actions du formulaire
  setRating: (rating: number) => void;
  setComment: (comment: string) => void;
  submitRating: () => Promise<void>;
  resetForm: () => void;

  // Métadonnées
  taskInfo: {
    id: string;
    title: string;
    projectId: string;
    candidateId?: string;
  } | null;
}

// ==========================================
// COMPOSANT PROPS
// ==========================================

/**
 * Props pour le composant principal ModularEvaluationsView
 */
export interface ModularEvaluationsViewProps {
  candidateId: string;
  className?: string;
  availableProjects?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  initialFilters?: Partial<EvaluationFilters>;
  showExportOptions?: boolean;
  showAnalytics?: boolean;
}

/**
 * Props pour le composant StarRating
 */
export interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

/**
 * Props pour le composant RatingCard
 */
export interface RatingCardProps {
  rating: TaskRating;
  showProject?: boolean;
  showTask?: boolean;
  showClient?: boolean;
  showActions?: boolean;
  onEdit?: (rating: TaskRating) => void;
  onDelete?: (ratingId: string) => void;
  className?: string;
}

// ==========================================
// CONSTANTES ET ENUMS
// ==========================================

/**
 * Labels des notes pour l'affichage
 */
export const RATING_LABELS = {
  1: 'Insuffisant',
  2: 'Moyen',
  3: 'Bien',
  4: 'Très bien',
  5: 'Excellent'
} as const;

/**
 * Couleurs des notes pour l'UI
 */
export const RATING_COLORS = {
  1: 'text-red-600',
  2: 'text-orange-600',
  3: 'text-yellow-600',
  4: 'text-green-600',
  5: 'text-emerald-600'
} as const;

/**
 * Seuils pour la satisfaction client
 */
export const SATISFACTION_THRESHOLDS = {
  EXCELLENT: 4.5,
  GOOD: 3.5,
  AVERAGE: 2.5,
  POOR: 0
} as const;

// ==========================================
// UTILITAIRES DE TYPE
// ==========================================

/**
 * Type helper pour extraire les clés d'un objet
 */
export type KeysOf<T> = keyof T;

/**
 * Type helper pour rendre certaines propriétés optionnelles
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Type helper pour les options de configuration
 */
export type EvaluationModuleConfig = {
  readonly name: 'EVALUATIONS';
  readonly version: string;
  readonly features: readonly string[];
  readonly components: readonly string[];
  readonly hooks: readonly string[];
  readonly services: readonly string[];
};

// Export all types
export type {
  // Core types (already exported above)
  TaskRating,
  TaskComment,
  EvaluationItem,

  // Stats and analytics (already exported above)
  EvaluationStats,
  RatingDistribution,
  MonthlyEvaluationStats,
  ProjectEvaluationStats,
  ClientEvaluationStats,

  // Filters and params (already exported above)
  EvaluationFilters,
  EvaluationSortBy,
  EvaluationExportFormat,
  CreateRatingData,
  UpdateRatingData,

  // API types (already exported above)
  EvaluationAPIResponse,
  EvaluationPaginatedResponse,
  EvaluationExport,
  EvaluationError,
  EvaluationErrorCode,

  // Hook return types (already exported above)
  UseEvaluationsReturn,
  UseEvaluationActionsReturn,
  UseEvaluationStatsReturn,
  UseRatingDialogReturn,

  // Component props (already exported above)
  ModularEvaluationsViewProps,
  StarRatingProps,
  RatingCardProps,

  // Utilities (already exported above)
  KeysOf,
  PartialBy,
  EvaluationModuleConfig
};