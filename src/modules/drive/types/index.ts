// Types pour le module Drive modernisé

export interface Drive {
  id: string;
  name: string;
  type: 'project' | 'personal' | 'shared' | 'team';
  project_id?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  storage_quota_bytes?: number;
  storage_used_bytes?: number;
  is_public?: boolean;
  settings?: DriveSettings;
}

export interface DriveNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent_id: string | null;
  drive_id: string;
  size_bytes?: number;
  mime_type?: string;
  file_extension?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_modified_by?: string;
  last_accessed_at?: string;
  is_deleted?: boolean;
  is_starred?: boolean;
  is_shared?: boolean;
  children?: DriveNode[];
  metadata?: DriveNodeMetadata;
  permissions?: DrivePermissions;
  version?: number;
  checksum?: string;
}

export interface DriveNodeMetadata {
  description?: string;
  tags?: string[];
  thumbnail_url?: string;
  preview_url?: string;
  download_count?: number;
  last_preview_at?: string;
  file_properties?: {
    width?: number;
    height?: number;
    duration?: number;
    page_count?: number;
    encoding?: string;
    format?: string;
  };
  sync_status?: 'synced' | 'syncing' | 'conflict' | 'error';
  external_links?: ExternalLink[];
}

export interface ExternalLink {
  id: string;
  service: 'google_drive' | 'dropbox' | 'onedrive' | 'figma' | 'notion' | 'custom';
  external_id: string;
  url: string;
  sync_enabled: boolean;
  last_sync_at?: string;
}

export interface DrivePermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_share: boolean;
  can_manage_permissions: boolean;
  inherited_from?: string; // parent folder ID
}

export interface DriveSettings {
  allow_public_sharing: boolean;
  allow_anonymous_upload: boolean;
  auto_backup_enabled: boolean;
  version_history_days: number;
  max_file_size_mb: number;
  allowed_file_types: string[];
  blocked_file_types: string[];
  auto_organize_enabled: boolean;
  thumbnail_generation: boolean;
  full_text_search: boolean;
}

export interface DriveShare {
  id: string;
  node_id: string;
  shared_with_type: 'user' | 'group' | 'public' | 'link';
  shared_with_id?: string; // User/Group ID
  permissions: DrivePermissions;
  expires_at?: string;
  created_by: string;
  created_at: string;
  access_token?: string; // Pour les liens publics
  password_protected?: boolean;
  download_limit?: number;
  download_count?: number;
}

export interface DriveActivity {
  id: string;
  drive_id: string;
  node_id?: string;
  action: 'upload' | 'download' | 'delete' | 'move' | 'copy' | 'share' |
          'rename' | 'create_folder' | 'restore' | 'sync' | 'preview';
  user_id: string;
  user_name: string;
  created_at: string;
  metadata?: {
    old_name?: string;
    new_name?: string;
    old_parent_id?: string;
    new_parent_id?: string;
    file_size?: number;
    mime_type?: string;
  };
}

export interface DriveVersion {
  id: string;
  node_id: string;
  version_number: number;
  size_bytes: number;
  checksum: string;
  created_by: string;
  created_at: string;
  comment?: string;
  storage_path: string;
  is_current: boolean;
}

export interface DriveUpload {
  id: string;
  node_id?: string; // null pendant l'upload
  drive_id: string;
  parent_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  upload_status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  upload_progress: number;
  chunk_size: number;
  chunks_total: number;
  chunks_uploaded: number;
  upload_session_id: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface DriveThumbnail {
  id: string;
  node_id: string;
  size: 'small' | 'medium' | 'large';
  width: number;
  height: number;
  format: 'webp' | 'jpeg' | 'png';
  storage_path: string;
  created_at: string;
  file_size_bytes: number;
}

// Types pour les filtres et recherche
export interface DriveFilters {
  node_type?: DriveNode['type'];
  mime_type?: string;
  file_extension?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  size_min?: number;
  size_max?: number;
  is_starred?: boolean;
  is_shared?: boolean;
  tags?: string[];
  search_query?: string;
}

export interface DriveSearchResult {
  node: DriveNode;
  relevance_score: number;
  matched_fields: string[];
  preview_snippet?: string;
}

// Types pour les actions CRUD
export interface CreateDriveData {
  name: string;
  type: Drive['type'];
  project_id?: string;
  settings?: Partial<DriveSettings>;
  storage_quota_bytes?: number;
}

export interface UpdateDriveData extends Partial<CreateDriveData> {
  storage_used_bytes?: number;
  is_public?: boolean;
}

export interface CreateFolderData {
  name: string;
  parent_id: string | null;
  drive_id: string;
  description?: string;
  tags?: string[];
}

export interface UpdateNodeData {
  name?: string;
  description?: string;
  tags?: string[];
  is_starred?: boolean;
  parent_id?: string;
}

export interface UploadFileData {
  file: File;
  parent_id: string | null;
  drive_id: string;
  description?: string;
  tags?: string[];
  chunk_size?: number;
  generate_thumbnail?: boolean;
}

export interface ShareNodeData {
  node_id: string;
  shared_with_type: DriveShare['shared_with_type'];
  shared_with_id?: string;
  permissions: Partial<DrivePermissions>;
  expires_at?: string;
  password?: string;
  download_limit?: number;
}

// Types pour les statistiques
export interface DriveStats {
  total_files: number;
  total_folders: number;
  total_size_bytes: number;
  files_by_type: Record<string, number>;
  storage_usage_percent: number;
  recent_uploads: number;
  recent_downloads: number;
  shared_items: number;
  starred_items: number;
  active_uploads: number;
  quota_remaining_bytes: number;
}

export interface DriveAnalytics {
  drive_id: string;
  period: 'day' | 'week' | 'month' | 'year';
  uploads_by_day: Record<string, number>;
  downloads_by_day: Record<string, number>;
  most_active_users: Array<{
    user_id: string;
    user_name: string;
    action_count: number;
  }>;
  popular_files: Array<{
    node_id: string;
    file_name: string;
    download_count: number;
    last_accessed: string;
  }>;
  storage_trend: Array<{
    date: string;
    storage_used_bytes: number;
  }>;
}

// Types pour l'intégration avec autres modules
export interface DriveIntegration {
  id: string;
  drive_id: string;
  integration_type: 'kanban' | 'messages' | 'projects' | 'wiki';
  target_id: string; // ID du kanban, thread, project, etc.
  sync_enabled: boolean;
  auto_attach: boolean;
  filter_rules?: {
    file_types?: string[];
    folders?: string[];
    tags?: string[];
  };
  created_at: string;
  last_sync_at?: string;
}

// Types pour la synchronisation externe
export interface ExternalSync {
  id: string;
  drive_id: string;
  service: 'google_drive' | 'dropbox' | 'onedrive' | 'box';
  service_account_id: string;
  sync_direction: 'import' | 'export' | 'bidirectional';
  sync_frequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  last_sync_at?: string;
  next_sync_at?: string;
  sync_status: 'idle' | 'syncing' | 'error' | 'paused';
  sync_rules: {
    include_patterns: string[];
    exclude_patterns: string[];
    preserve_structure: boolean;
    conflict_resolution: 'local' | 'remote' | 'prompt';
  };
  error_log?: Array<{
    timestamp: string;
    error: string;
    file_path: string;
  }>;
}

// Types pour les templates et automatisation
export interface DriveTemplate {
  id: string;
  name: string;
  description: string;
  folder_structure: Array<{
    name: string;
    type: 'folder';
    parent_path: string;
    metadata?: {
      description?: string;
      tags?: string[];
    };
  }>;
  default_files: Array<{
    name: string;
    template_content?: string;
    source_url?: string;
    parent_path: string;
  }>;
  permissions: DrivePermissions;
  created_by: string;
  is_public: boolean;
  usage_count: number;
}

export interface DriveAutomation {
  id: string;
  drive_id: string;
  name: string;
  trigger_type: 'file_upload' | 'folder_create' | 'file_modify' | 'schedule';
  trigger_conditions: {
    file_patterns?: string[];
    folder_paths?: string[];
    file_size_range?: [number, number];
    mime_types?: string[];
    cron_schedule?: string;
  };
  actions: Array<{
    type: 'move' | 'copy' | 'rename' | 'tag' | 'share' | 'notify' | 'convert' | 'backup';
    parameters: Record<string, any>;
  }>;
  is_enabled: boolean;
  created_by: string;
  last_executed_at?: string;
  execution_count: number;
}

// Types pour les événements temps réel
export interface DriveRealtimeEvent {
  type: 'node_created' | 'node_updated' | 'node_deleted' | 'node_moved' |
        'upload_progress' | 'upload_completed' | 'share_created' | 'share_accessed';
  drive_id: string;
  node_id?: string;
  user_id: string;
  data: any;
  timestamp: string;
}

export interface DriveNotification {
  id: string;
  user_id: string;
  drive_id: string;
  node_id?: string;
  notification_type: 'upload_completed' | 'share_received' | 'quota_warning' |
                     'sync_conflict' | 'access_granted' | 'file_commented';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

// Types utilitaires
export type DriveNodeType = DriveNode['type'];
export type DriveType = Drive['type'];
export type UploadStatus = DriveUpload['upload_status'];
export type ShareType = DriveShare['shared_with_type'];
export type SyncStatus = ExternalSync['sync_status'];

export default {
  Drive,
  DriveNode,
  DriveNodeMetadata,
  DrivePermissions,
  DriveSettings,
  DriveShare,
  DriveActivity,
  DriveVersion,
  DriveUpload,
  DriveThumbnail,
  DriveFilters,
  DriveSearchResult,
  CreateDriveData,
  UpdateDriveData,
  CreateFolderData,
  UpdateNodeData,
  UploadFileData,
  ShareNodeData,
  DriveStats,
  DriveAnalytics,
  DriveIntegration,
  ExternalSync,
  DriveTemplate,
  DriveAutomation,
  DriveRealtimeEvent,
  DriveNotification
};