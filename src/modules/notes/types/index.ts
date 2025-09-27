/**
 * Module NOTES - Types
 *
 * Ce fichier définit tous les types TypeScript nécessaires pour le module Notes.
 * Il couvre les notes personnelles, carnets, tags, recherche et organisation.
 *
 * Types principaux :
 * - Note : Note individuelle avec contenu riche
 * - Notebook : Carnet pour organiser les notes
 * - Tag : Étiquettes pour catégoriser
 * - NoteStats : Statistiques et métriques
 * - NoteFilters : Filtres et recherche avancée
 */

// ==========================================
// CORE TYPES - Notes et carnets
// ==========================================

export type NoteStatus = 'draft' | 'active' | 'archived' | 'deleted';
export type NotePriority = 'low' | 'medium' | 'high' | 'urgent';
export type NoteType = 'text' | 'checklist' | 'meeting' | 'idea' | 'project' | 'personal';
export type NoteFormat = 'markdown' | 'plain' | 'rich';

export interface Note {
  id: string;
  candidate_id: string;
  notebook_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;

  // Contenu
  title: string;
  content: string;
  format: NoteFormat;
  excerpt?: string; // Extrait automatique pour l'affichage

  // Métadonnées
  type: NoteType;
  status: NoteStatus;
  priority: NotePriority;
  is_pinned: boolean;
  is_favorite: boolean;

  // Organisation
  tags: string[];
  color?: string | null; // Couleur personnalisée

  // Collaboration (pour notes partagées projet)
  is_shared?: boolean;
  shared_with?: string[]; // IDs des utilisateurs

  // Automatisation
  reminder_at?: string | null;
  due_date?: string | null;

  // Métriques
  word_count: number;
  character_count: number;
  read_time_minutes: number;

  // Horodatage
  created_at: string;
  updated_at: string;
  last_opened_at?: string | null;

  // Relations enrichies
  notebook_name?: string;
  project_title?: string;
  task_title?: string;
  attachments_count?: number;
}

export interface Notebook {
  id: string;
  candidate_id: string;

  // Informations de base
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;

  // Organisation
  is_default: boolean;
  is_shared: boolean;
  parent_id?: string | null; // Pour des carnets imbriqués
  sort_order: number;

  // Métriques
  notes_count: number;
  total_words: number;
  last_activity: string;

  // Horodatage
  created_at: string;
  updated_at: string;

  // Relations
  notes?: Note[];
  sub_notebooks?: Notebook[];
}

export interface NoteTag {
  id: string;
  candidate_id: string;
  name: string;
  color?: string | null;
  usage_count: number;
  created_at: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface NoteLink {
  id: string;
  source_note_id: string;
  target_note_id: string;
  link_type: 'reference' | 'related' | 'follow_up';
  created_at: string;
}

// ==========================================
// CHECKLISTS & TASKS
// ==========================================

export interface ChecklistItem {
  id: string;
  note_id: string;
  text: string;
  is_checked: boolean;
  sort_order: number;
  created_at: string;
  completed_at?: string | null;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  type: NoteType;
  content_template: string;
  tags_template: string[];
  is_public: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
}

// ==========================================
// STATISTICS & ANALYTICS
// ==========================================

export interface NoteStats {
  // Totaux généraux
  total_notes: number;
  total_notebooks: number;
  total_words: number;
  total_characters: number;

  // Statuts
  draft_notes: number;
  active_notes: number;
  archived_notes: number;
  pinned_notes: number;
  favorite_notes: number;

  // Types de notes
  note_types_distribution: NoteTypeDistribution[];

  // Carnets
  notebook_distribution: NotebookStats[];

  // Activité temporelle
  daily_activity: DailyNoteActivity[];
  weekly_activity: WeeklyNoteActivity[];
  monthly_activity: MonthlyNoteActivity[];

  // Tags les plus utilisés
  popular_tags: TagUsage[];

  // Métriques de productivité
  writing_streak: number; // Jours consécutifs avec notes
  average_note_length: number;
  most_productive_day: string;
  most_productive_time: number; // Heure de la journée (0-23)

  // Comparaisons
  vs_previous_month: {
    notes_created: number;
    words_written: number;
    change_percentage: number;
    trend: 'up' | 'down' | 'stable';
  };

  // Recommandations
  recommendations: NoteRecommendation[];
}

export interface NoteTypeDistribution {
  type: NoteType;
  count: number;
  percentage: number;
  total_words: number;
  average_length: number;
}

export interface NotebookStats {
  notebook_id: string;
  notebook_name: string;
  notes_count: number;
  total_words: number;
  last_activity: string;
  activity_score: number; // 0-100
}

export interface DailyNoteActivity {
  date: string;
  notes_created: number;
  notes_updated: number;
  words_written: number;
  time_spent_minutes: number;
}

export interface WeeklyNoteActivity {
  week_start: string;
  notes_created: number;
  words_written: number;
  most_active_day: string;
}

export interface MonthlyNoteActivity {
  month: string;
  year: number;
  notes_created: number;
  words_written: number;
  growth_rate: number;
}

export interface TagUsage {
  tag: string;
  count: number;
  percentage: number;
  recent_usage: boolean;
}

export interface NoteRecommendation {
  id: string;
  type: 'organization' | 'productivity' | 'content' | 'maintenance';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  impact_level: number; // 1-10
}

// ==========================================
// SEARCH & FILTERS
// ==========================================

export type NoteSortBy =
  | 'created_at'
  | 'updated_at'
  | 'title'
  | 'word_count'
  | 'priority'
  | 'last_opened_at';

export interface NoteFilters {
  // Filtres de base
  notebook_id?: string;
  project_id?: string;
  type?: NoteType;
  status?: NoteStatus;
  priority?: NotePriority;

  // Filtres booléens
  is_pinned?: boolean;
  is_favorite?: boolean;
  is_shared?: boolean;
  has_reminder?: boolean;
  has_due_date?: boolean;
  has_attachments?: boolean;

  // Filtres temporels
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  due_after?: string;
  due_before?: string;

  // Recherche textuelle
  search?: string; // Recherche dans titre et contenu
  tags?: string[]; // Recherche par tags

  // Filtres avancés
  min_word_count?: number;
  max_word_count?: number;
  color?: string;

  // Pagination et tri
  page?: number;
  per_page?: number;
  sort_by?: NoteSortBy;
  sort_order?: 'asc' | 'desc';

  // Options d'affichage
  include_archived?: boolean;
  include_deleted?: boolean;
  group_by?: 'date' | 'notebook' | 'type' | 'priority';
}

export interface NoteSearchResult {
  note: Note;
  relevance_score: number;
  matched_fields: string[]; // 'title', 'content', 'tags'
  highlighted_content?: string;
  context_snippet?: string;
}

// ==========================================
// API RESPONSES & REQUESTS
// ==========================================

export interface CreateNoteData {
  title: string;
  content: string;
  format?: NoteFormat;
  type?: NoteType;
  status?: NoteStatus;
  priority?: NotePriority;
  notebook_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
  tags?: string[];
  color?: string | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
  reminder_at?: string | null;
  due_date?: string | null;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  format?: NoteFormat;
  type?: NoteType;
  status?: NoteStatus;
  priority?: NotePriority;
  notebook_id?: string | null;
  project_id?: string | null;
  tags?: string[];
  color?: string | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
  reminder_at?: string | null;
  due_date?: string | null;
}

export interface CreateNotebookData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string | null;
}

export interface UpdateNotebookData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface NoteAPIResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: NoteError;
  metadata?: {
    total?: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
  };
}

export interface NotePaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_more: boolean;
  has_previous: boolean;
}

export interface NoteError {
  code: NoteErrorCode;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

export type NoteErrorCode =
  | 'NOTE_NOT_FOUND'
  | 'NOTEBOOK_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'CONTENT_TOO_LONG'
  | 'TITLE_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'DUPLICATE_NAME'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'EXPORT_ERROR'
  | 'SEARCH_ERROR';

// ==========================================
// EXPORT & BACKUP
// ==========================================

export type NoteExportFormat = 'markdown' | 'pdf' | 'html' | 'json' | 'txt';

export interface NoteExport {
  id: string;
  format: NoteExportFormat;
  filename: string;
  file_url?: string;
  filters: NoteFilters;
  total_notes: number;
  total_notebooks: number;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  download_count: number;
  error_message?: string;
}

export interface NoteBackup {
  id: string;
  name: string;
  description?: string;
  backup_type: 'full' | 'incremental' | 'selected';
  included_notebooks?: string[];
  file_path: string;
  file_size: number;
  notes_count: number;
  created_at: string;
  is_encrypted: boolean;
}

// ==========================================
// HOOKS RETURN TYPES
// ==========================================

export interface UseNotesReturn {
  // Données principales
  notes: Note[];
  notebooks: Notebook[];
  tags: NoteTag[];
  stats: NoteStats | null;
  loading: boolean;
  error: NoteError | null;

  // États de pagination
  hasMore: boolean;
  totalCount: number;
  currentPage: number;

  // Actions
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  clearError: () => void;

  // Filtres et recherche
  currentFilters: NoteFilters;
  setFilters: (filters: Partial<NoteFilters>) => void;
  resetFilters: () => void;
  searchResults: NoteSearchResult[];

  // Notes récentes et favorites
  recentNotes: Note[];
  pinnedNotes: Note[];
  favoriteNotes: Note[];
}

export interface UseNoteActionsReturn {
  // Actions CRUD notes
  createNote: (data: CreateNoteData) => Promise<NoteAPIResponse<Note>>;
  updateNote: (id: string, data: UpdateNoteData) => Promise<NoteAPIResponse<Note>>;
  deleteNote: (id: string) => Promise<NoteAPIResponse<void>>;
  archiveNote: (id: string) => Promise<NoteAPIResponse<Note>>;
  restoreNote: (id: string) => Promise<NoteAPIResponse<Note>>;

  // Actions spéciales
  pinNote: (id: string) => Promise<NoteAPIResponse<Note>>;
  unpinNote: (id: string) => Promise<NoteAPIResponse<Note>>;
  favoriteNote: (id: string) => Promise<NoteAPIResponse<Note>>;
  unfavoriteNote: (id: string) => Promise<NoteAPIResponse<Note>>;
  duplicateNote: (id: string) => Promise<NoteAPIResponse<Note>>;

  // Actions carnets
  createNotebook: (data: CreateNotebookData) => Promise<NoteAPIResponse<Notebook>>;
  updateNotebook: (id: string, data: UpdateNotebookData) => Promise<NoteAPIResponse<Notebook>>;
  deleteNotebook: (id: string) => Promise<NoteAPIResponse<void>>;

  // Actions tags
  createTag: (name: string, color?: string) => Promise<NoteAPIResponse<NoteTag>>;
  deleteTag: (id: string) => Promise<NoteAPIResponse<void>>;

  // Utilitaires
  formatNotePreview: (content: string, maxLength: number) => string;
  calculateReadTime: (content: string) => number;
  extractTags: (content: string) => string[];
  generateSlug: (title: string) => string;

  // Validation
  validateNoteData: (data: CreateNoteData) => NoteError | null;
  validateNotebookName: (name: string) => boolean;

  // Export et backup
  exportNotes: (filters: NoteFilters, format: NoteExportFormat) => Promise<NoteAPIResponse<NoteExport>>;
  createBackup: (options: Partial<NoteBackup>) => Promise<NoteAPIResponse<NoteBackup>>;

  // États de chargement
  loading: boolean;
  submitting: boolean;
  error: NoteError | null;
}

export interface UseNoteStatsReturn {
  // Statistiques principales
  stats: NoteStats | null;
  loading: boolean;
  error: NoteError | null;

  // Actions
  refreshStats: () => Promise<void>;

  // Métriques calculées
  getNotebookStats: (notebookId: string) => NotebookStats | null;
  getTypeStats: (type: NoteType) => NoteTypeDistribution | null;
  getProductivityTrend: (days: number) => number;
  getRecommendations: () => NoteRecommendation[];

  // Comparaisons
  compareWithPreviousMonth: () => any;
  getWritingGoalProgress: () => number;

  // Cache
  lastUpdated: string | null;
  cacheStatus: 'fresh' | 'stale' | 'updating';
}

export interface UseNoteSearchReturn {
  // Recherche
  searchQuery: string;
  searchResults: NoteSearchResult[];
  isSearching: boolean;
  searchError: NoteError | null;

  // Actions
  search: (query: string) => Promise<void>;
  clearSearch: () => void;

  // Filtres de recherche
  searchFilters: Partial<NoteFilters>;
  setSearchFilters: (filters: Partial<NoteFilters>) => void;

  // Historique de recherche
  searchHistory: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;

  // Suggestions
  searchSuggestions: string[];
  getTagSuggestions: (query: string) => string[];
}

// ==========================================
// COMPONENT PROPS
// ==========================================

export interface ModularNotesViewProps {
  candidateId?: string;
  availableProjects?: Array<{ id: string; title: string }>;
  initialFilters?: Partial<NoteFilters>;
  showNotebooks?: boolean;
  showStats?: boolean;
  showExportOptions?: boolean;
  showTemplates?: boolean;
  defaultView?: 'list' | 'grid' | 'cards';
  className?: string;
  onNoteCreate?: (note: Note) => void;
  onNoteUpdate?: (note: Note) => void;
  onNoteDelete?: (noteId: string) => void;
  onExport?: (exportData: NoteExport) => void;
}

export interface NoteEditorProps {
  note?: Note | null;
  notebook?: Notebook | null;
  onSave: (data: CreateNoteData | UpdateNoteData) => Promise<void>;
  onCancel: () => void;
  availableNotebooks: Notebook[];
  availableTags: NoteTag[];
  autoSave?: boolean;
  className?: string;
}

export interface NotebookTreeProps {
  notebooks: Notebook[];
  selectedNotebookId?: string;
  onSelect: (notebookId: string | null) => void;
  onCreateNotebook: (data: CreateNotebookData) => void;
  onEditNotebook: (notebook: Notebook) => void;
  onDeleteNotebook: (notebookId: string) => void;
  className?: string;
}

export interface NoteListProps {
  notes: Note[];
  view: 'list' | 'grid' | 'cards';
  loading?: boolean;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onPin?: (noteId: string) => void;
  onFavorite?: (noteId: string) => void;
  className?: string;
}

// ==========================================
// UTILITIES TYPES
// ==========================================

export type KeysOf<T> = keyof T;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface NoteModuleConfig {
  name: 'NOTES';
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

export const NOTE_CONSTANTS = {
  TYPES: {
    TEXT: 'text',
    CHECKLIST: 'checklist',
    MEETING: 'meeting',
    IDEA: 'idea',
    PROJECT: 'project',
    PERSONAL: 'personal'
  } as const,

  STATUSES: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    ARCHIVED: 'archived',
    DELETED: 'deleted'
  } as const,

  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  } as const,

  FORMATS: {
    MARKDOWN: 'markdown',
    PLAIN: 'plain',
    RICH: 'rich'
  } as const,

  LIMITS: {
    TITLE_MAX_LENGTH: 200,
    CONTENT_MAX_LENGTH: 50000,
    TAG_MAX_LENGTH: 50,
    MAX_TAGS_PER_NOTE: 20,
    EXCERPT_LENGTH: 200,
    SEARCH_MIN_LENGTH: 2,
    MAX_SEARCH_RESULTS: 100
  } as const,

  EXPORT_FORMATS: {
    MARKDOWN: 'markdown',
    PDF: 'pdf',
    HTML: 'html',
    JSON: 'json',
    TXT: 'txt'
  } as const,

  COLORS: {
    DEFAULT: '#6b7280',
    BLUE: '#3b82f6',
    GREEN: '#10b981',
    YELLOW: '#f59e0b',
    RED: '#ef4444',
    PURPLE: '#8b5cf6',
    PINK: '#ec4899',
    INDIGO: '#6366f1',
    GRAY: '#6b7280'
  } as const
} as const;