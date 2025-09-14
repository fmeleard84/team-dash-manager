import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { expertiseProvider } from './expertise-provider';
import { validateProfile, normalizeProfile } from './validation-helper';

// Helper function to generate UUID v4 compatible with all browsers
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
  project_description?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  profiles: Array<{
    profession: string;
    seniority: 'junior' | 'intermediate' | 'senior';
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

export interface CreateTodoKanbanParams {
  project_id?: string;
  project_name?: string;
  title: string;
  description?: string;
  column: 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
}

export interface CreateEventCalendarParams {
  project_id?: string;
  project_name?: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  duration?: number;
  type: 'meeting' | 'milestone' | 'deadline' | 'review';
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
  console.log('🚀 createTeam appelé avec:', params);
  try {
    // Charger les données de référence
    await expertiseProvider.loadData();
    console.log('📚 Données métiers chargées');
    
    // Récupérer l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      console.error('❌ Utilisateur non connecté');
      throw new Error('Utilisateur non connecté');
    }
    console.log('👤 Utilisateur:', userData.user.id);

    // Pour create_team, on crée TOUJOURS un nouveau projet
    // On ne cherche PAS de projet existant
    let projectId = params.project_id;

    // Debug
    console.log('🔍 Debug createTeam:', {
      projectId,
      project_name: params.project_name,
      hasProjectName: !!params.project_name,
      condition: !projectId && params.project_name
    });

    // Si pas de project_id fourni, créer un nouveau projet
    if (!projectId && params.project_name) {
      // Calculer les dates si non fournies
      const today = new Date();
      const startDate = params.start_date || today.toISOString().split('T')[0];
      
      // Si end_date est fournie, vérifier qu'elle est valide et dans le futur
      let endDate = params.end_date;
      if (endDate) {
        // Parser la date pour vérifier si elle est valide
        const parsedEnd = new Date(endDate);
        const parsedStart = new Date(startDate);
        const now = new Date();

        // Si la date de fin est dans le passé, la corriger
        if (parsedEnd < now) {
          console.log('⚠️ Date de fin dans le passé détectée, correction automatique');
          // Calculer la durée originale et l'appliquer depuis aujourd'hui
          const originalDuration = parsedEnd.getTime() - parsedStart.getTime();
          const durationDays = Math.max(7, Math.floor(originalDuration / (1000 * 60 * 60 * 24)));
          endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        // Si la date de fin est avant la date de début
        else if (parsedEnd <= parsedStart) {
          console.log('⚠️ Date de fin avant date de début, utilisation durée par défaut');
          endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
      } else {
        // Par défaut: 90 jours
        endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      
      console.log('📅 Dates du projet:', { startDate, endDate });
      
      // Créer le projet avec les mêmes colonnes que CreateProjectModal
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: params.project_name || `Projet ${new Date().toLocaleDateString('fr-FR')}`,
          description: params.project_description || `Projet créé par l'assistant IA avec ${params.profiles.length} membres d'équipe`,
          project_date: startDate,
          due_date: endDate || null,
          client_budget: params.budget || null,
          owner_id: userData.user.id,
          status: 'pause'
        })
        .select()
        .single();

      if (projectError) {
        console.error('Erreur création projet:', projectError);
        throw new Error('Impossible de créer le projet');
      }

      projectId = newProject.id;
      console.log('Nouveau projet créé:', projectId);

      // Générer les nodes et edges ReactFlow pour l'équipe
      const nodes = [];
      const edges = [];
      
      // Ajouter le node client au centre (comme dans Project.tsx)
      const clientNode = {
        id: 'client-node',
        type: 'clientNode',
        position: { x: 400, y: 50 },
        data: { label: 'Client' },
        draggable: false,
        deletable: false,
        selectable: false,
      };
      nodes.push(clientNode);
      
      // Créer les hr_resource_assignments comme le fait saveFlow
      const resources = [];
      const radius = 250;
      const angleStep = (2 * Math.PI) / params.profiles.length;
      
      for (let i = 0; i < params.profiles.length; i++) {
        const profile = params.profiles[i];
        const angle = angleStep * i - Math.PI / 2;
        const x = 400 + radius * Math.cos(angle);
        const y = 300 + radius * Math.sin(angle);
        
        // NOUVEAU: Valider le profil avec validation-helper
        console.log(`🔍 Validation du profil ${i + 1}: ${profile.profession}`);
        const validationResult = await validateProfile({
          profession: profile.profession,
          seniority: profile.seniority || 'medior',
          skills: profile.skills,
          languages: profile.languages
        });
        
        if (!validationResult.isValid) {
          console.error(`❌ Profil invalide:`, validationResult.errors);
          
          // Afficher les erreurs à l'utilisateur
          toast({
            title: `❌ Profil ${i + 1} invalide`,
            description: validationResult.errors.join('\n'),
            variant: "destructive",
            duration: 10000
          });
          
          // Si des suggestions sont disponibles, les afficher
          if (validationResult.suggestions) {
            let suggestionText = '';
            if (validationResult.suggestions.profession) {
              suggestionText += `\n💡 Métier suggéré: ${validationResult.suggestions.profession}`;
            }
            if (validationResult.suggestions.expertises) {
              suggestionText += `\n💡 Expertises suggérées: ${validationResult.suggestions.expertises.join(', ')}`;
            }
            if (validationResult.suggestions.languages) {
              suggestionText += `\n💡 Langues disponibles: ${validationResult.suggestions.languages.join(', ')}`;
            }
            
            if (suggestionText) {
              toast({
                title: "💡 Suggestions",
                description: suggestionText,
                duration: 10000
              });
            }
          }
          
          continue; // Passer au profil suivant
        }
        
        // Normaliser le profil avec les valeurs correctes
        const normalizedProfile = await normalizeProfile({
          profession: profile.profession,
          seniority: profile.seniority || 'medior',
          skills: profile.skills,
          languages: profile.languages
        });
        
        if (!normalizedProfile) {
          console.error(`❌ Impossible de normaliser le profil`);
          continue;
        }
        
        // Récupérer le métier validé
        const hrProfile = expertiseProvider.findProfile(normalizedProfile.profession);
        if (!hrProfile) {
          console.error(`❌ Métier introuvable après normalisation: ${normalizedProfile.profession}`);
          continue;
        }
        
        console.log(`✅ Profil validé et normalisé: ${hrProfile.name}`);
        
        // Les langues et expertises sont déjà validées et normalisées
        const validLanguages = normalizedProfile.languages || ['Français'];
        const validExpertises = normalizedProfile.skills || [];
        
        // Utiliser la séniorité normalisée
        const normalizedSeniority = expertiseProvider.normalizeSeniority(normalizedProfile.seniority);
        
        const resourceId = generateUUID();
        
        console.log(`✅ Création de la ressource pour ${hrProfile.name} avec:`);
        console.log(`   - Séniorité: ${normalizedSeniority}`);
        console.log(`   - Langues: ${validLanguages.join(', ')}`);
        console.log(`   - Expertises: ${validExpertises.join(', ')}`);
        
        // Créer le node pour ReactFlow
        const resourceNode = {
          id: resourceId,
          type: 'hrResource',
          position: { x, y },
          data: {
            id: resourceId,
            profileName: hrProfile.name,
            seniority: normalizedSeniority,
            languages: [],
            expertises: [],
            calculatedPrice: hrProfile.base_price || 0,
            languageNames: validLanguages,
            expertiseNames: validExpertises,
            selected: false,
          }
        };
        nodes.push(resourceNode);
          
          // Créer l'edge du client vers la ressource
          edges.push({
            id: `edge-client-${resourceId}`,
            source: 'client-node',
            target: resourceId,
            type: 'smoothstep',
            animated: false
          });
          
        // Créer le hr_resource_assignment avec la structure exacte du système existant
        const { data: resource, error } = await supabase
          .from('hr_resource_assignments')
          .insert({
            id: resourceId,
            project_id: projectId,
            profile_id: hrProfile.id,
            seniority: normalizedSeniority,
            languages: validLanguages, // Utiliser les langues validées
            expertises: validExpertises, // Utiliser les expertises validées
            calculated_price: hrProfile.base_price || 0,
            booking_status: 'draft',
            node_data: {
              position: { x, y },
              languageNames: validLanguages,
              expertiseNames: validExpertises,
              profileName: hrProfile.name,
              is_ai: false,
              is_team_member: false
            }
          })
          .select()
          .single();
          
        if (!error && resource) {
          resources.push(resource);
          console.log('✅ Ressource créée:', resource.id);
        } else if (error) {
          console.error('❌ Erreur création ressource:', error);
        }
      }
      
      // Sauvegarder les nodes et edges dans project_flows (comme saveFlow)
      if (nodes.length > 1) { // Plus que juste le client node
        const { error: flowError } = await supabase
          .from('project_flows')
          .insert({
            project_id: projectId,
            nodes: nodes,
            edges: edges
          });
        
        if (flowError) {
          console.error('Erreur création project_flows:', flowError);
          // Pas grave si ça échoue, les hr_resource_assignments suffisent pour reconstruire
        }
      }

      // Logger l'action réussie (ignorer les erreurs de log)
      try {
        await supabase.from('ai_action_logs').insert({
          user_id: userData.user.id,
          action_type: 'create_team',
          action_data: params,
          result: { project_id: projectId, resources: resources },
          status: 'success'
        });
      } catch (logError) {
        console.log('Log error (ignored):', logError);
      }

      // Retourner les données avec l'URL pour naviguer vers le projet
      return {
        success: true,
        message: `Projet "${newProject.title}" créé avec une équipe de ${resources.length} membres`,
        data: {
          project_id: projectId,
          project_name: newProject.title,
          project_url: `/project/${projectId}`,
          resources: resources
        }
      };
    }

    // Si on arrive ici, on a un project_id mais pas de project_name
    // C'est un cas d'erreur
    return {
      success: false,
      error: 'Paramètres invalides : project_name requis pour créer un projet'
    };

  } catch (error: any) {
    console.error('Error creating team:', error);
    
    // Logger l'erreur (ignorer les erreurs de log)
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from('ai_action_logs').insert({
          user_id: userData.user.id,
          action_type: 'create_team',
          action_data: params,
          status: 'failed',
          error_message: error.message
        });
      }
    } catch (logError) {
      console.log('Log error (ignored):', logError);
    }

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
        title: params.name,
        description: params.description,
        project_date: params.start_date,
        due_date: params.end_date || null,
        client_budget: params.budget || null,
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
      .select('id, title, description, status, project_date, due_date')
      .ilike('title', `%${params.query}%`)
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

// Fonction pour créer une tâche dans le kanban
export async function createTodoKanban(params: CreateTodoKanbanParams) {
  console.log('📋 createTodoKanban appelé avec:', params);
  try {
    // Récupérer l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('Utilisateur non connecté');
    }

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

    // Créer la tâche dans le kanban
    const { data, error } = await supabase
      .from('kanban_tasks')
      .insert({
        project_id: projectId,
        title: params.title,
        description: params.description || '',
        column: params.column,
        priority: params.priority || 'medium',
        assigned_to: params.assignee,
        created_by: userData.user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Logger l'action
    await supabase.from('ai_action_logs').insert({
      user_id: userData.user.id,
      action_type: 'create_todo_kanban',
      action_data: params,
      result: data,
      status: 'success'
    });

    console.log('✅ Tâche kanban créée:', data);

    return {
      success: true,
      message: `Tâche "${params.title}" créée dans la colonne ${params.column}`,
      data
    };

  } catch (error: any) {
    console.error('Error creating kanban task:', error);
    
    // Logger l'erreur
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('ai_action_logs').insert({
        user_id: userData.user.id,
        action_type: 'create_todo_kanban',
        action_data: params,
        status: 'failed',
        error_message: error.message
      });
    }

    return {
      success: false,
      error: error.message || 'Erreur lors de la création de la tâche'
    };
  }
}

// Fonction pour créer un événement dans le calendrier
export async function createEventCalendar(params: CreateEventCalendarParams) {
  console.log('📅 createEventCalendar appelé avec:', params);
  try {
    // Récupérer l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('Utilisateur non connecté');
    }

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
    const eventDate = params.time 
      ? new Date(`${params.date}T${params.time}`)
      : new Date(`${params.date}T09:00:00`); // Par défaut 9h du matin
    
    const endDate = new Date(eventDate);
    endDate.setMinutes(endDate.getMinutes() + (params.duration || 60));

    const { data, error } = await supabase
      .from('project_events')
      .insert({
        project_id: projectId,
        title: params.title,
        description: params.description || '',
        event_type: params.type,
        start_date: eventDate.toISOString(),
        end_date: endDate.toISOString(),
        location: params.type === 'meeting' ? 'En ligne' : '',
        is_all_day: !params.time
      })
      .select()
      .single();

    if (error) throw error;

    // Logger l'action
    await supabase.from('ai_action_logs').insert({
      user_id: userData.user.id,
      action_type: 'create_event_calendar',
      action_data: params,
      result: data,
      status: 'success'
    });

    console.log('✅ Événement calendrier créé:', data);

    return {
      success: true,
      message: `Événement "${params.title}" créé le ${params.date}`,
      data
    };

  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    
    // Logger l'erreur
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('ai_action_logs').insert({
        user_id: userData.user.id,
        action_type: 'create_event_calendar',
        action_data: params,
        status: 'failed',
        error_message: error.message
      });
    }

    return {
      success: false,
      error: error.message || 'Erreur lors de la création de l\'événement'
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