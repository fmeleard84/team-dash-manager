import { supabase } from '@/integrations/supabase/client';
import type {
  Project,
  ProjectFilters,
  CreateProjectData,
  UpdateProjectData,
  ResourceAssignment,
  ProjectMember,
  HRProfile
} from '../types';

export class ProjetAPI {
  /**
   * Récupère tous les projets avec filtres optionnels
   */
  static async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    let query = supabase
      .from('projects')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    if (filters?.sortBy) {
      const ascending = filters.sortOrder !== 'desc';
      query = query.order(filters.sortBy, { ascending });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [ProjetAPI] Error fetching projects:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Récupère les projets pour un candidat spécifique
   */
  static async getCandidateProjects(candidateId: string): Promise<Project[]> {
    console.log('🔍 [ProjetAPI] Loading projects for candidate:', candidateId);

    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        project_id,
        booking_status,
        projects (
          id,
          title,
          description,
          status,
          owner_id,
          user_id,
          start_date,
          end_date,
          daily_rate,
          budget,
          currency,
          created_at,
          updated_at
        )
      `)
      .eq('candidate_id', candidateId)
      .eq('booking_status', 'accepted');

    if (assignError) {
      console.error('❌ [ProjetAPI] Error fetching candidate projects:', assignError);
      throw assignError;
    }

    // Extraire les projets des assignments et filtrer les projets actifs
    const projects = assignments
      ?.map(assignment => assignment.projects)
      .filter(project => project && project.status === 'play') || [];

    console.log('✅ [ProjetAPI] Found projects for candidate:', projects.length);
    return projects as Project[];
  }

  /**
   * Récupère les projets pour un client spécifique
   */
  static async getClientProjects(clientId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [ProjetAPI] Error fetching client projects:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Récupère un projet par son ID
   */
  static async getProjectById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Projet non trouvé
      }
      console.error('❌ [ProjetAPI] Error fetching project:', error);
      throw error;
    }

    return data;
  }

  /**
   * Crée un nouveau projet
   */
  static async createProject(projectData: CreateProjectData): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        status: 'pause'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [ProjetAPI] Error creating project:', error);
      throw error;
    }

    return data;
  }

  /**
   * Met à jour un projet
   */
  static async updateProject(projectId: string, updates: UpdateProjectData): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('❌ [ProjetAPI] Error updating project:', error);
      throw error;
    }

    return data;
  }

  /**
   * Supprime un projet
   */
  static async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'completed' }) // Soft delete
      .eq('id', projectId);

    if (error) {
      console.error('❌ [ProjetAPI] Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Récupère les membres d'équipe d'un projet
   */
  static async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    console.log('🔍 [ProjetAPI] Loading members for project:', projectId);

    // 1. Récupérer le propriétaire/client du projet
    const { data: project } = await supabase
      .from('projects')
      .select('owner_id, user_id')
      .eq('id', projectId)
      .single();

    const allMembers: ProjectMember[] = [];

    // Ajouter le client
    if (project) {
      const clientId = project.owner_id || project.user_id;
      if (clientId) {
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .single();

        if (clientProfile) {
          allMembers.push({
            id: clientProfile.id,
            userId: clientProfile.user_id || clientProfile.id,
            email: clientProfile.email,
            name: clientProfile.first_name || 'Client',
            firstName: clientProfile.first_name,
            jobTitle: 'Client',
            role: 'client',
            isOnline: false
          });
        }
      }
    }

    // 2. Récupérer les candidats/IA assignés
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          name,
          is_ai,
          prompt_id
        )
      `)
      .eq('project_id', projectId)
      .in('booking_status', ['accepted', 'completed']);

    if (assignments) {
      for (const assignment of assignments) {
        const jobTitle = assignment.hr_profiles?.name || 'Ressource';
        const isAI = assignment.hr_profiles?.is_ai || false;
        const promptId = assignment.hr_profiles?.prompt_id;

        const candidateId = assignment.candidate_id || assignment.profile_id;

        if (candidateId) {
          let userProfile = null;
          let candidateProfile = null;

          if (isAI) {
            // Pour l'IA, récupérer depuis candidate_profiles
            const { data: aiProfile } = await supabase
              .from('candidate_profiles')
              .select('*')
              .eq('id', candidateId)
              .single();

            candidateProfile = aiProfile;
            userProfile = {
              id: candidateId,
              email: aiProfile?.email || '',
              first_name: aiProfile?.first_name || 'IA',
              user_id: candidateId
            };
          } else {
            // Pour les humains, récupérer depuis profiles
            const { data: humanProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', candidateId)
              .single();

            userProfile = humanProfile;

            const { data: humanCandidateProfile } = await supabase
              .from('candidate_profiles')
              .select('*')
              .eq('id', candidateId)
              .single();

            candidateProfile = humanCandidateProfile;
          }

          if (userProfile) {
            allMembers.push({
              id: isAI ? `ia_${userProfile.id}` : userProfile.id,
              userId: isAI ? `ia_${userProfile.id}` : (userProfile.user_id || userProfile.id),
              email: userProfile.email,
              name: candidateProfile?.first_name || userProfile.first_name || (isAI ? jobTitle : 'Candidat'),
              firstName: candidateProfile?.first_name || userProfile.first_name,
              jobTitle: jobTitle,
              role: isAI ? 'ia' : 'candidate',
              isOnline: isAI ? true : false,
              isAI: isAI,
              promptId: promptId
            });
          }
        }
      }
    }

    console.log('✅ [ProjetAPI] Found members:', allMembers.length);
    return allMembers;
  }

  /**
   * Récupère les assignations de ressources d'un projet
   */
  static async getResourceAssignments(projectId: string): Promise<ResourceAssignment[]> {
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          name,
          base_price,
          is_ai,
          prompt_id
        ),
        candidate_profiles (
          first_name,
          last_name,
          email
        )
      `)
      .eq('project_id', projectId);

    if (error) {
      console.error('❌ [ProjetAPI] Error fetching resource assignments:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Récupère les profils HR disponibles
   */
  static async getHRProfiles(): Promise<HRProfile[]> {
    const { data, error } = await supabase
      .from('hr_profiles')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ [ProjetAPI] Error fetching HR profiles:', error);
      throw error;
    }

    return data || [];
  }
}