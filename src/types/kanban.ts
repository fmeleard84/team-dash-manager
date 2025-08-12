export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
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
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'review' | 'done'; // Statuts d'avancement
  labels: string[];
  attachments: KanbanAttachment[];
  comments: KanbanComment[];
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
}

export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
  cardIds: string[];
  color?: string;
  limit?: number; // WIP limit
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
}

export interface KanbanComment {
  id: string;
  cardId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KanbanAttachment {
  id: string;
  cardId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Drag & Drop types
export interface DragResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination: {
    droppableId: string;
    index: number;
  } | null;
  mode: string;
  reason: string;
}

// Filter and view options
export interface KanbanFilters {
  assignedTo?: string[];
  labels?: string[];
  priority?: ('low' | 'medium' | 'high')[];
  dueDate?: 'overdue' | 'today' | 'week' | 'month';
  search?: string;
}

export interface KanbanViewOptions {
  showArchived: boolean;
  groupBy: 'none' | 'assignee' | 'label' | 'priority';
  sortBy: 'created' | 'updated' | 'title' | 'dueDate';
  sortOrder: 'asc' | 'desc';
}

// API types for CRUD operations
export interface CreateCardInput {
  title: string;
  description?: string;
  columnId: string;
  assignedTo?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'review' | 'done';
  labels?: string[];
}

export interface UpdateCardInput extends Partial<CreateCardInput> {
  id: string;
  progress?: number;
}

export interface CreateColumnInput {
  title: string;
  position: number;
  color?: string;
  limit?: number;
}

export interface UpdateColumnInput extends Partial<CreateColumnInput> {
  id: string;
}

export interface CreateBoardInput {
  title: string;
  description?: string;
  teamId?: string;
  projectId?: string;
}

export interface UpdateBoardInput extends Partial<CreateBoardInput> {
  id: string;
}