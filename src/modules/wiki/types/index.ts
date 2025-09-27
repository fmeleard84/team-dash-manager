// Types pour le module WIKI - Architecture modulaire
export interface WikiPage {
  id: string;
  project_id: string;
  title: string;
  content: string;
  parent_id: string | null;
  author_id: string;
  author_name?: string;
  author_email?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  last_edited_by?: string;
  last_editor_name?: string;
  version: number;
  display_order?: number;
  slug?: string;
  tags?: string[];
  template_id?: string;
  children?: WikiPage[];
  path?: string[];
  depth?: number;
  has_comments?: boolean;
  comments_count?: number;
  is_favorite?: boolean;
  view_count?: number;
  last_viewed_at?: string;
  is_template?: boolean;
  permissions?: WikiPermissions;
  metadata?: WikiMetadata;
}

export interface WikiComment {
  id: string;
  page_id: string;
  author_id: string;
  author_name?: string;
  author_email?: string;
  parent_comment_id: string | null;
  content: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  replies?: WikiComment[];
  mentions?: WikiMention[];
  thread_id?: string;
  is_edited?: boolean;
  edit_history?: WikiCommentEdit[];
}

export interface WikiCommentEdit {
  id: string;
  comment_id: string;
  content: string;
  edited_by: string;
  edited_at: string;
}

export interface WikiMention {
  id: string;
  user_id: string;
  user_name: string;
  position: number;
  length: number;
}

export interface WikiPermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_comment: boolean;
  can_share: boolean;
  can_manage: boolean;
  is_owner: boolean;
}

export interface WikiMetadata {
  reading_time?: number; // en minutes
  word_count?: number;
  character_count?: number;
  last_backup_at?: string;
  external_links?: WikiExternalLink[];
  attachments?: WikiAttachment[];
  related_pages?: string[];
  custom_fields?: Record<string, any>;
}

export interface WikiExternalLink {
  url: string;
  title: string;
  domain: string;
  is_working: boolean;
  last_checked_at: string;
}

export interface WikiAttachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  download_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface WikiTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: WikiTemplateCategory;
  is_public: boolean;
  created_by: string;
  created_at: string;
  usage_count: number;
  tags: string[];
}

export type WikiTemplateCategory =
  | 'meeting-notes'
  | 'project-brief'
  | 'technical-spec'
  | 'user-guide'
  | 'api-documentation'
  | 'process'
  | 'template'
  | 'other';

export interface WikiNavigation {
  pages: WikiPage[];
  breadcrumb: WikiPage[];
  current_page: WikiPage | null;
  authors: WikiAuthor[];
  categories: WikiCategory[];
  recent_pages: WikiPage[];
  favorites: WikiPage[];
}

export interface WikiAuthor {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  pages_count: number;
  is_current_user: boolean;
  pages: WikiPage[];
  last_activity_at?: string;
}

export interface WikiCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  pages_count: number;
  pages: WikiPage[];
  parent_id?: string;
  children?: WikiCategory[];
}

export interface WikiVersion {
  id: string;
  page_id: string;
  version: number;
  title: string;
  content: string;
  changed_by: string;
  changed_at: string;
  change_summary?: string;
  is_major: boolean;
  diff?: WikiDiff;
}

export interface WikiDiff {
  additions: WikiDiffLine[];
  deletions: WikiDiffLine[];
  modifications: WikiDiffLine[];
  stats: {
    additions_count: number;
    deletions_count: number;
    modifications_count: number;
  };
}

export interface WikiDiffLine {
  line_number: number;
  content: string;
  type: 'add' | 'remove' | 'modify';
}

export interface WikiSearch {
  query: string;
  results: WikiSearchResult[];
  total_results: number;
  search_time_ms: number;
  filters?: WikiSearchFilters;
  suggestions?: string[];
}

export interface WikiSearchResult {
  page: WikiPage;
  score: number;
  highlights: WikiSearchHighlight[];
  context: string;
  match_type: 'title' | 'content' | 'tags' | 'comments';
}

export interface WikiSearchHighlight {
  field: string;
  fragments: string[];
  start_offset: number;
  end_offset: number;
}

export interface WikiSearchFilters {
  authors?: string[];
  categories?: string[];
  tags?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  content_type?: WikiContentType[];
  visibility?: ('public' | 'private')[];
  has_comments?: boolean;
  is_template?: boolean;
}

export type WikiContentType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'code'
  | 'table'
  | 'diagram'
  | 'embed';

export interface WikiStats {
  total_pages: number;
  public_pages: number;
  private_pages: number;
  total_comments: number;
  total_authors: number;
  total_views: number;
  average_reading_time: number;
  most_viewed_pages: WikiPage[];
  most_commented_pages: WikiPage[];
  recent_activity: WikiActivity[];
  growth_stats: WikiGrowthStats;
}

export interface WikiActivity {
  id: string;
  type: WikiActivityType;
  user_id: string;
  user_name: string;
  page_id?: string;
  page_title?: string;
  comment_id?: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export type WikiActivityType =
  | 'page_created'
  | 'page_updated'
  | 'page_deleted'
  | 'comment_added'
  | 'comment_resolved'
  | 'page_shared'
  | 'template_used'
  | 'page_favorited'
  | 'page_viewed';

export interface WikiGrowthStats {
  pages_this_week: number;
  pages_this_month: number;
  comments_this_week: number;
  comments_this_month: number;
  active_contributors: number;
  growth_rate: number; // pourcentage
}

export interface WikiExport {
  format: WikiExportFormat;
  pages: string[];
  include_comments: boolean;
  include_metadata: boolean;
  include_versions: boolean;
  created_at: string;
  download_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export type WikiExportFormat = 'pdf' | 'html' | 'markdown' | 'docx' | 'json';

export interface WikiBackup {
  id: string;
  project_id: string;
  created_by: string;
  created_at: string;
  size_bytes: number;
  pages_count: number;
  comments_count: number;
  download_url: string;
  expires_at: string;
  status: 'active' | 'expired' | 'deleted';
}

// Paramètres et configurations
export interface WikiSettings {
  project_id: string;
  auto_save_interval: number; // en secondes
  default_visibility: 'public' | 'private';
  allow_comments: boolean;
  allow_anonymous_comments: boolean;
  require_approval_for_comments: boolean;
  enable_version_history: boolean;
  max_versions_per_page: number;
  enable_notifications: boolean;
  notification_types: WikiNotificationType[];
  export_formats: WikiExportFormat[];
  custom_css?: string;
  custom_templates: WikiTemplate[];
}

export type WikiNotificationType =
  | 'page_created'
  | 'page_updated'
  | 'comment_added'
  | 'mention_received'
  | 'page_shared';

// Types pour les hooks et API
export interface CreateWikiPageData {
  project_id: string;
  title: string;
  content?: string;
  parent_id?: string;
  is_public?: boolean;
  tags?: string[];
  template_id?: string;
  metadata?: Partial<WikiMetadata>;
}

export interface UpdateWikiPageData {
  title?: string;
  content?: string;
  is_public?: boolean;
  tags?: string[];
  metadata?: Partial<WikiMetadata>;
  change_summary?: string;
  is_major_change?: boolean;
}

export interface CreateWikiCommentData {
  page_id: string;
  content: string;
  parent_comment_id?: string;
  mentions?: WikiMention[];
}

export interface WikiFilters {
  search?: string;
  authors?: string[];
  categories?: string[];
  tags?: string[];
  visibility?: ('public' | 'private')[];
  date_range?: {
    start: string;
    end: string;
  };
  has_comments?: boolean;
  is_template?: boolean;
  sort_by?: WikiSortOption;
  sort_order?: 'asc' | 'desc';
}

export type WikiSortOption =
  | 'title'
  | 'created_at'
  | 'updated_at'
  | 'author'
  | 'views'
  | 'comments'
  | 'relevance';

export interface WikiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

// Types pour les réponses de l'API
export interface WikiAPIResponse<T> {
  data: T;
  success: boolean;
  error?: WikiError;
  metadata?: {
    total_count?: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
  };
}

export interface WikiPaginatedResponse<T> extends WikiAPIResponse<T[]> {
  pagination: {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
    has_previous: boolean;
    has_next: boolean;
  };
}

// Types pour les hooks React
export interface UseWikiReturn {
  pages: WikiPage[];
  loading: boolean;
  error: WikiError | null;
  navigation: WikiNavigation | null;
  stats: WikiStats | null;
  settings: WikiSettings | null;
  refetch: () => Promise<void>;
  refetchPages: () => Promise<void>;
  refetchNavigation: () => Promise<void>;
  refetchStats: () => Promise<void>;
}

export interface UseWikiActionsReturn {
  createPage: (data: CreateWikiPageData) => Promise<WikiPage>;
  updatePage: (pageId: string, data: UpdateWikiPageData) => Promise<WikiPage>;
  deletePage: (pageId: string) => Promise<boolean>;
  duplicatePage: (pageId: string, newTitle?: string) => Promise<WikiPage>;
  movePage: (pageId: string, newParentId: string | null) => Promise<WikiPage>;
  reorderPages: (pageIds: string[], parentId: string | null) => Promise<void>;
  togglePageVisibility: (pageId: string) => Promise<WikiPage>;
  addPageToFavorites: (pageId: string) => Promise<void>;
  removePageFromFavorites: (pageId: string) => Promise<void>;
  createFromTemplate: (templateId: string, data: Partial<CreateWikiPageData>) => Promise<WikiPage>;
  exportPages: (pageIds: string[], format: WikiExportFormat) => Promise<WikiExport>;
  createBackup: () => Promise<WikiBackup>;
}

export interface UseWikiCommentsReturn {
  comments: WikiComment[];
  loading: boolean;
  error: WikiError | null;
  addComment: (data: CreateWikiCommentData) => Promise<WikiComment>;
  updateComment: (commentId: string, content: string) => Promise<WikiComment>;
  deleteComment: (commentId: string) => Promise<void>;
  resolveComment: (commentId: string) => Promise<WikiComment>;
  unresolveComment: (commentId: string) => Promise<WikiComment>;
  refetch: () => Promise<void>;
}

export interface UseWikiSearchReturn {
  results: WikiSearchResult[];
  loading: boolean;
  error: WikiError | null;
  totalResults: number;
  searchTime: number;
  search: (query: string, filters?: WikiSearchFilters) => Promise<void>;
  clearSearch: () => void;
  suggestions: string[];
  recentSearches: string[];
}

export interface UseWikiVersionsReturn {
  versions: WikiVersion[];
  loading: boolean;
  error: WikiError | null;
  loadVersions: (pageId: string) => Promise<void>;
  compareVersions: (versionId1: string, versionId2: string) => Promise<WikiDiff>;
  restoreVersion: (pageId: string, versionId: string) => Promise<WikiPage>;
  createVersion: (pageId: string, summary?: string, isMajor?: boolean) => Promise<WikiVersion>;
}

// Types pour les événements temps réel
export interface WikiRealtimeEvent {
  type: WikiEventType;
  page_id?: string;
  comment_id?: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  data: Record<string, any>;
}

export type WikiEventType =
  | 'page_created'
  | 'page_updated'
  | 'page_deleted'
  | 'comment_added'
  | 'comment_updated'
  | 'comment_deleted'
  | 'comment_resolved'
  | 'user_joined'
  | 'user_left'
  | 'page_locked'
  | 'page_unlocked';

export interface WikiSubscriptionOptions {
  page_id?: string;
  include_comments?: boolean;
  include_page_changes?: boolean;
  user_id?: string;
}