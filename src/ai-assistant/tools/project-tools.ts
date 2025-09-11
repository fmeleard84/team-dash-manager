import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Outils pour la gestion des projets via l'assistant vocal
 */

// Types pour les paramètres des outils
export interface CreateMeetingParams {
  project_id?: string;
  project_name?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration?: number; // en minutes
  participants?: string[];
}

export interface CreateTeamParams {
  project_id?: string;
  project_name?: string;
  profiles: Array<{
    profession: string;
    seniority: 'junior' | 'medior' | 'senior' | 'expert';
    skills?: string[];
    languages?: string[];
  }>;
}

export interface CreateProjectParams {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget?: number;
  team?: CreateTeamParams['profiles'];
}

export interface SearchProjectParams {
  query: string;
}

// Fonction pour créer une réunion
export async function createMeeting(params: CreateMeetingParams) {
  try {
    // Si on a un nom de projet mais pas d'ID, chercher le projet
    let projectId = params.project_id;
    if (!projectId && params.project_name) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .ilike('name', `%${params.project_name}%`)
        .limit(1);
      
      if (projects && projects.length > 0) {
        projectId = projects[0].id;
      }
    }

    if (!projectId) {
      throw new Error('Projet non trouvé. Veuillez spécifier un projet valide.');
    }

    // Créer l'événement
    const eventDate = new Date(`${params.date}T${params.time}`);
    const endDate = new Date(eventDate);
    endDate.setMinutes(endDate.getMinutes() + (params.duration || 60));

    const { data, error } = await supabase
      .from('project_events')
      .insert({
        project_id: projectId,
        title: params.title,
        description: params.description || '',
        event_type: 'meeting',
        start_date: eventDate.toISOString(),
        end_date: endDate.toISOString(),
        location: 'En ligne', // Par défaut
        is_all_day: false
      })
      .select()
      .single();

    if (error) throw error;

    // Ajouter les participants si spécifiés
    if (params.participants && params.participants.length > 0 && data) {
      // Ici on pourrait ajouter les participants à la table project_event_attendees
      console.log('Participants à ajouter:', params.participants);
    }

    // Logger l'action
    await supabase.from('ai_action_logs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action_type: 'create_meeting',
      action_data: params,
      result: data,
      status: 'success'
    });

    return {
      success: true,
      message: `Réunion "${params.title}" créée avec succès le ${params.date} à ${params.time}`,
      data
    };

  } catch (error: any) {
    console.error('Error creating meeting:', error);
    
    // Logger l'erreur
    await supabase.from('ai_action_logs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action_type: 'create_meeting',
      action_data: params,
      status: 'failed',
      error_message: error.message
    });

    return {
      success: false,
      error: error.message || 'Erreur lors de la création de la réunion'
    };
  }
}

// Fonction pour créer une équipe projet
export async function createTeam(params: CreateTeamParams) {
  try {
    // Si on a un nom de projet mais pas d'ID, chercher le projet
    let projectId = params.project_id;
    if (!projectId && params.project_name) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .ilike('name', `%${params.project_name}%`)
        .limit(1);
      
      if (projects && projects.length > 0) {
        projectId = projects[0].id;
      }
    }

    if (!projectId) {
      throw new Error('Projet non trouvé. Veuillez spécifier un projet valide.');
    }

    // Créer les ressources HR pour l'équipe
    const resources = [];
    for (const profile of params.profiles) {
      // Trouver le hr_profile correspondant
      const { data: hrProfiles } = await supabase
        .from('hr_profiles')
        .select('id')
        .ilike('label', `%${profile.profession}%`)
        .limit(1);
      
      if (hrProfiles && hrProfiles.length > 0) {
        const { data, error } = await supabase
          .from('hr_resource_assignments')
          .insert({
            project_id: projectId,
            profile_id: hrProfiles[0].id,
            seniority: profile.seniority,
            required_skills: profile.skills || [],
            spoken_languages: profile.languages || ['Français'],
            booking_status: 'draft',
            position_x: Math.random() * 500,
            position_y: Math.random() * 500
          })
          .select()
          .single();
        
        if (!error && data) {
          resources.push(data);
        }
      }
    }

    // Logger l'action
    await supabase.from('ai_action_logs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action_type: 'create_team',
      action_data: params,
      result: resources,
      status: 'success'
    });

    return {
      success: true,
      message: `Équipe de ${resources.length} membres créée avec succès`,
      data: resources
    };

  } catch (error: any) {
    console.error('Error creating team:', error);
    
    // Logger l'erreur
    await supabase.from('ai_action_logs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action_type: 'create_team',
      action_data: params,
      status: 'failed',
      error_message: error.message
    });

    return {
      success: false,
      error: error.message || 'Erreur lors de la création de l\'équipe'
    };
  }
}

// Fonction pour créer un projet complet
export async function createProject(params: CreateProjectParams) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Utilisateur non connecté');

    // Créer le projet
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: params.name,
        description: params.description,
        start_date: params.start_date,
        end_date: params.end_date,
        budget: params.budget || 0,
        status: 'pause',
        owner_id: userData.user.id
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Si une équipe est définie, la créer
    if (params.team && params.team.length > 0) {
      await createTeam({
        project_id: project.id,
        profiles: params.team
      });
    }

    // Logger l'action
    await supabase.from('ai_action_logs').insert({
      user_id: userData.user.id,
      action_type: 'create_project',
      action_data: params,
      result: project,
      status: 'success'
    });

    return {
      success: true,
      message: `Projet "${params.name}" créé avec succès`,
      data: project
    };

  } catch (error: any) {
    console.error('Error creating project:', error);
    
    // Logger l'erreur
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from('ai_action_logs').insert({
        user_id: userData.user.id,
        action_type: 'create_project',
        action_data: params,
        status: 'failed',
        error_message: error.message
      });
    }

    return {
      success: false,
      error: error.message || 'Erreur lors de la création du projet'
    };
  }
}

// Fonction pour rechercher un projet
export async function searchProject(params: SearchProjectParams) {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, status, start_date, end_date')
      .ilike('name', `%${params.query}%`)
      .limit(5);

    if (error) throw error;

    return {
      success: true,
      message: `${projects.length} projet(s) trouvé(s)`,
      data: projects
    };

  } catch (error: any) {
    console.error('Error searching projects:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la recherche'
    };
  }
}

// Fonction pour obtenir les FAQ
export async function getFAQ(query?: string) {
  try {
    let queryBuilder = supabase
      .from('ai_faq')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (query) {
      queryBuilder = queryBuilder.or(`question.ilike.%${query}%,answer.ilike.%${query}%,tags.cs.{${query}}`);
    }

    const { data: faqs, error } = await queryBuilder.limit(5);

    if (error) throw error;

    return {
      success: true,
      data: faqs
    };

  } catch (error: any) {
    console.error('Error getting FAQs:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération des FAQ'
    };
  }
}