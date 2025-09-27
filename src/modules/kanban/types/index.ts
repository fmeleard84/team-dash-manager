// Types pour le module Kanban modernisé

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  isOnline?: boolean;
  isAI?: boolean;
  promptId?: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string; // User ID
  assignedToName?: string; // User display name
  assignedToEmail?: string;
  assignedToAvatar?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  labels: string[];
  attachments: KanbanAttachment[];
  comments: KanbanComment[];
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
  projectId?: string;
  columnId: string;
  position: number;
  estimatedHours?: number;
  actualHours?: number;
  files?: KanbanFile[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
  cardIds: string[];
  color?: string;
  limit?: number; // WIP limit
  boardId: string;
  createdAt: string;
  updatedAt: string;
  isCollapsed?: boolean;
}

export interface KanbanBoard {
  id: string;
  title: string;
  description?: string;
  columns: KanbanColumn[];
  cards: Record<string, KanbanCard>; // Card ID -> Card mapping
  teamId?: string;
  projectId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: string[]; // User IDs with access
  teamMembers: TeamMember[]; // Full team member info
  settings?: KanbanBoardSettings;
  isArchived?: boolean;
}

export interface KanbanComment {
  id: string;
  cardId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  mentions?: string[]; // User IDs mentioned
  isEdited?: boolean;
}

export interface KanbanAttachment {
  id: string;
  cardId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface KanbanFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  cardId: string;
}

export interface KanbanBoardSettings {
  allowComments: boolean;
  allowAttachments: boolean;
  allowVoting: boolean;
  defaultCardColor?: string;
  cardCoverImages: boolean;
  showCardNumbers: boolean;
  enableDueDates: boolean;
  enableTimeTracking: boolean;
  wipLimits: boolean;
}

export interface KanbanActivity {
  id: string;
  boardId: string;
  cardId?: string;
  userId: string;
  userName: string;
  action: 'card_created' | 'card_moved' | 'card_updated' | 'card_deleted' |
          'comment_added' | 'file_uploaded' | 'member_assigned' | 'due_date_set';
  description: string;
  metadata?: any;
  createdAt: string;
}

// Types pour les filtres et recherche
export interface KanbanFilters {
  assignedTo?: string;
  priority?: KanbanCard['priority'];
  status?: KanbanCard['status'];
  labels?: string[];
  dueDate?: 'overdue' | 'today' | 'this_week' | 'this_month';
  search?: string;
}

// Types pour les actions CRUD
export interface CreateBoardData {
  title: string;
  description?: string;
  projectId?: string;
  templateId?: string;
}

export interface UpdateBoardData extends Partial<CreateBoardData> {
  settings?: Partial<KanbanBoardSettings>;
  isArchived?: boolean;
}

export interface CreateColumnData {
  title: string;
  boardId: string;
  position?: number;
  color?: string;
  limit?: number;
}

export interface UpdateColumnData extends Partial<CreateColumnData> {
  isCollapsed?: boolean;
}

export interface CreateCardData {
  title: string;
  description?: string;
  columnId: string;
  boardId: string;
  assignedTo?: string;
  priority?: KanbanCard['priority'];
  dueDate?: string;
  labels?: string[];
  estimatedHours?: number;
}

export interface UpdateCardData extends Partial<CreateCardData> {
  status?: KanbanCard['status'];
  progress?: number;
  actualHours?: number;
}

export interface MoveCardData {
  cardId: string;
  sourceColumnId: string;
  targetColumnId: string;
  newPosition: number;
}

// Types pour les statistiques
export interface KanbanStats {
  totalCards: number;
  cardsByStatus: Record<KanbanCard['status'], number>;
  cardsByPriority: Record<KanbanCard['priority'], number>;
  cardsByAssignee: Record<string, number>;
  averageCardsPerColumn: number;
  completionRate: number;
  overdueTasks: number;
}

// Types pour les templates
export interface KanbanTemplate {
  id: string;
  name: string;
  description: string;
  columns: Omit<KanbanColumn, 'id' | 'boardId' | 'createdAt' | 'updatedAt' | 'cardIds'>[];
  settings: KanbanBoardSettings;
  category: 'development' | 'marketing' | 'hr' | 'general';
  isDefault?: boolean;
}

// Types pour les événements temps réel
export interface KanbanRealtimeEvent {
  type: 'board_updated' | 'card_moved' | 'card_created' | 'card_updated' | 'card_deleted' |
        'column_created' | 'column_updated' | 'column_deleted' | 'comment_added';
  boardId: string;
  userId: string;
  data: any;
  timestamp: string;
}

// Pas d'export par défaut pour éviter les conflits