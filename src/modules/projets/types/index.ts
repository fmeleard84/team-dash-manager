export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'pause' | 'attente-team' | 'play' | 'completed';
  owner_id: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  daily_rate?: number;
  budget?: number;
  currency?: string;
  created_at: string;
  updated_at?: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  firstName?: string;
  jobTitle?: string;
  role: 'client' | 'candidate' | 'admin' | 'ia';
  avatar?: string;
  isOnline?: boolean;
  isAI?: boolean;
  promptId?: string;
}

export interface ResourceAssignment {
  id: string;
  project_id: string;
  profile_id: string;
  candidate_id?: string;
  booking_status: 'draft' | 'recherche' | 'accepted' | 'declined';
  seniority: 'junior' | 'confirmé' | 'senior' | 'expert';
  languages?: string[];
  expertises?: string[];
  calculated_price?: number;
}

export interface HRProfile {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
  is_ai?: boolean;
  prompt_id?: string;
  skills?: string[];
}

export interface ProjectFilters {
  status?: string;
  search?: string;
  sortBy?: 'created_at' | 'title' | 'start_date';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProjectData {
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  currency?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  status?: Project['status'];
}