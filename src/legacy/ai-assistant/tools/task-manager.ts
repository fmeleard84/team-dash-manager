/**
 * Implémentation des fonctions de gestion des tâches
 */

import { supabase } from '@/integrations/supabase/client';

export interface TaskData {
  title: string;
  description?: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  column: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
  project_id?: string;
  due_date?: string;
  estimation_hours?: number;
  labels?: string[];
  dependencies?: string[];
}

export interface ProjectStatus {
  id: string;
  name: string;
  status: string;
  progress: number;
  team: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  tasks: {
    total: number;
    completed: number;
    in_progress: number;
    todo: number;
  };
  budget: {
    allocated: number;
    consumed: number;
    percentage: number;
  };
  deadlines: {
    next_milestone?: string;
    project_end?: string;
  };
}

export interface AddTaskResult {
  success: boolean;
  taskId?: string;
  message: string;
  error?: string;
}

export interface UpdateTaskResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface ProjectStatusResult {
  success: boolean;
  project?: ProjectStatus;
  message: string;
  error?: string;
}

export interface ProjectListResult {
  success: boolean;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    updated_at: string;
    role: string;
  }>;
  total: number;
  message: string;
  error?: string;
}

/**
 * Ajouter une nouvelle tâche au Kanban
 */
export async function add_task(args: {
  title: string;
  description?: string;
  assignee?: string;
  priority?: string;
  column?: string;
  project_id?: string;
  due_date?: string;
  estimation_hours?: number;
  labels?: string[];
  dependencies?: string[];
}): Promise<AddTaskResult> {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        message: 'Utilisateur non authentifié',
        error: userError?.message
      };
    }

    // Si pas de project_id, essayer de récupérer le projet actif
    let projectId = args.project_id;
    if (!projectId) {
      const { data: activeProject } = await supabase
        .from('projects')
        .select('id')
        .eq('status', 'play')
        .eq('owner_id', user.id)
        .single();
      
      projectId = activeProject?.id;
    }

    if (!projectId) {
      return {
        success: false,
        message: 'Aucun projet actif trouvé. Veuillez spécifier un projet.',
        error: 'No active project'
      };
    }

    // Mapper le statut de colonne
    const statusMap: Record<string, string> = {
      'backlog': 'backlog',
      'todo': 'todo',
      'in_progress': 'in_progress',
      'in_review': 'review',
      'done': 'done'
    };

    const taskStatus = statusMap[args.column || 'todo'] || 'todo';

    // Préparer les données de la tâche
    const taskData = {
      project_id: projectId,
      title: args.title,
      description: args.description || '',
      assigned_to: args.assignee,
      priority: args.priority || 'medium',
      status: taskStatus,
      due_date: args.due_date,
      estimated_hours: args.estimation_hours,
      labels: args.labels || [],
      created_by: user.id,
      metadata: {
        dependencies: args.dependencies || []
      }
    };

    // Créer la tâche
    const { data: task, error: taskError } = await supabase
      .from('kanban_cards')
      .insert(taskData)
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      return {
        success: false,
        message: 'Erreur lors de la création de la tâche',
        error: taskError.message
      };
    }

    // Créer une notification pour l'assigné
    if (args.assignee && args.assignee !== user.id) {
      await supabase
        .from('Notifications')
        .insert({
          user_id: args.assignee,
          type: 'task_assigned',
          title: 'Nouvelle tâche assignée',
          message: `La tâche "${args.title}" vous a été assignée`,
          metadata: {
            task_id: task.id,
            project_id: projectId
          }
        });
    }

    return {
      success: true,
      taskId: task?.id,
      message: `Tâche "${args.title}" créée avec succès dans la colonne ${args.column || 'todo'}`
    };

  } catch (error) {
    console.error('Error in add_task:', error);
    return {
      success: false,
      message: 'An error occurred lors de la création de la tâche',
      error: error instanceof Error ? error.message : 'Error inconnue'
    };
  }
}

/**
 * Mettre à jour le statut d'une tâche
 */
export async function update_task_status(args: {
  task_id: string;
  new_status: string;
  comment?: string;
}): Promise<UpdateTaskResult> {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        message: 'Utilisateur non authentifié',
        error: userError?.message
      };
    }

    // Mapper le nouveau statut
    const statusMap: Record<string, string> = {
      'backlog': 'backlog',
      'todo': 'todo',
      'in_progress': 'in_progress',
      'in_review': 'review',
      'done': 'done',
      'cancelled': 'cancelled'
    };

    const newStatus = statusMap[args.new_status] || args.new_status;

    // Mettre à jour la tâche
    const { data: updatedTask, error: updateError } = await supabase
      .from('kanban_cards')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', args.task_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return {
        success: false,
        message: 'Error lors de la mise à day de la tâche',
        error: updateError.message
      };
    }

    // Ajouter un commentaire si fourni
    if (args.comment) {
      await supabase
        .from('kanban_comments')
        .insert({
          card_id: args.task_id,
          user_id: user.id,
          content: args.comment
        });
    }

    // Notifier l'assigné si le Status change vers 'done" ou "cancelled"
    if (updatedTask?.assigned_to && (newStatus === 'done' || newStatus === 'cancelled')) {
      await supabase
        .from('notifications')
        .insert({
          user_id: updatedTask.assigned_to,
          type: 'task_status_changed',
          title: `Tâche ${newStatus === 'done' ? 'terminée' : 'annulée'}`,
          message: `La tâche "${updatedTask.title}" a été ${newStatus === 'done' ? 'marquée comme terminée' : 'annulée'}`,
          metadata: {
            task_id: args.task_id,
            new_status: newStatus
          }
        });
    }

    return {
      success: true,
      message: `Tâche mise à jour avec le statut "${args.new_status}"`
    };

  } catch (error) {
    console.error('Error in update_task_status:', error);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour de la tâche',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Obtenir le statut détaillé d'un projet
 */
export async function get_project_status(args: {
  project_identifier: string;
  include_metrics?: boolean;
  include_team?: boolean;
  include_tasks?: boolean;
}): Promise<ProjectStatusResult> {
  try {
    // Rechercher le projet par nom ou ID
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        hr_resource_assignments (
          *,
          candidate_profiles (
            id,
            first_name,
            last_name
          ),
          hr_profiles (
            label
          )
        ),
        kanban_cards (
          id,
          status
        )
      `)
      .or(`id.eq.${args.project_identifier},name.ilike.%${args.project_identifier}%`)
      .single();

    if (projectError || !project) {
      return {
        success: false,
        message: `Projet "${args.project_identifier}" non trouvé`,
        error: projectError?.message
      };
    }

    // Construire les informations d'équipe
    const team = args.include_team !== false ? project.hr_resource_assignments.map(a => ({
      id: a.candidate_profile_id || '',
      name: a.candidate_profiles ? 
        `${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name}` : 
        'Non assigné',
      role: a.hr_profiles?.label || 'Non défini'
    })) : [];

    // Calculer les métriques de tâches
    const tasks = args.include_tasks !== false ? {
      total: project.kanban_cards?.length || 0,
      completed: project.kanban_cards?.filter(t => t.status === 'done').length || 0,
      in_progress: project.kanban_cards?.filter(t => t.status === 'in_progress').length || 0,
      todo: project.kanban_cards?.filter(t => t.status === 'todo').length || 0
    } : { total: 0, completed: 0, in_progress: 0, todo: 0 };

    // Calculer le pourcentage d'avancement
    const progress = tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0;

    // Calculer le budget (estimation)
    const budget = args.include_metrics !== false ? {
      allocated: project.budget || 0,
      consumed: Math.round((project.budget || 0) * (progress / 100)), // Estimation basée sur l'avancement
      percentage: progress
    } : { allocated: 0, consumed: 0, percentage: 0 };

    // Récupérer les prochaines échéances
    const deadlines = {
      next_milestone: project.next_milestone_date,
      project_end: project.end_date
    };

    const status: ProjectStatus = {
      id: project.id,
      name: project.name,
      status: project.status,
      progress,
      team,
      tasks,
      budget,
      deadlines
    };

    return {
      success: true,
      project: status,
      message: `Projet "${project.name}" - Statut: ${project.status}, Avancement: ${progress}%`
    };

  } catch (error) {
    console.error('Error in get_project_status:', error);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la récupération du statut',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Lister les projets avec filtres
 */
export async function list_projects(args: {
  status?: string;
  role?: string;
  sort_by?: string;
  limit?: number;
}): Promise<ProjectListResult> {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        projects: [],
        total: 0,
        message: 'Utilisateur non authentifié',
        error: userError?.message
      };
    }

    // Construire la requête
    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' });

    // Filtrer par statut
    if (args.status && args.status !== 'all') {
      query = query.eq('status', args.status);
    }

    // Filtrer par rôle
    if (args.role === 'owner') {
      query = query.eq('owner_id', user.id);
    } else if (args.role === 'participant') {
      // Pour les participants, on devrait faire une jointure avec hr_resource_assignments
      // Simplifié ici pour l'exemple
      query = query.neq('owner_id', user.id);
    }

    // Tri
    const sortColumn = args.sort_by === 'date_created' ? 'created_at' :
                       args.sort_by === 'date_updated' ? 'updated_at' :
                       args.sort_by === 'deadline' ? 'end_date' :
                       args.sort_by === 'budget' ? 'budget' :
                       'updated_at';
    
    query = query.order(sortColumn, { ascending: false });

    // Limite
    if (args.limit) {
      query = query.limit(args.limit);
    }

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('Error listing projects:', error);
      return {
        success: false,
        projects: [],
        total: 0,
        message: 'Erreur lors de la récupération des projets',
        error: error.message
      };
    }

    // Formater les résultats
    const formattedProjects = (projects || []).map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      updated_at: p.updated_at,
      role: p.owner_id === user.id ? 'owner' : 'participant'
    }));

    return {
      success: true,
      projects: formattedProjects,
      total: count || 0,
      message: `${count || 0} projet(s) trouvé(s)`
    };

  } catch (error) {
    console.error('Error in list_projects:', error);
    return {
      success: false,
      projects: [],
      total: 0,
      message: 'Une erreur est survenue lors de la récupération des projets',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}