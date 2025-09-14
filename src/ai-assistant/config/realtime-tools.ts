/**
 * Configuration des outils pour l'API OpenAI Realtime
 */

import { 
  createMeeting as createMeetingFunc, 
  createTeam as createTeamFunc, 
  createProject as createProjectFunc, 
  searchProject as searchProjectFunc, 
  getFAQ as getFAQFunc,
  createTodoKanban as createTodoKanbanFunc,
  createEventCalendar as createEventCalendarFunc
} from '../tools/project-tools';

// Type pour un outil Realtime simplifié
interface RealtimeTool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any) => Promise<any>;
}

// Créer l'outil create_team avec le format correct
export const createTeamTool: RealtimeTool = {
  name: 'create_team',
  description: 'Créer un projet et composer son équipe. IMPORTANT: Toujours demander le délai (durée) du projet. Le budget est optionnel mais aide à déterminer la taille et séniorité de l\'équipe.',
  parameters: {
    type: 'object',
    properties: {
      project_name: { type: 'string', description: 'Le nom du projet (requis)' },
      project_description: { type: 'string', description: 'La description du projet' },
      start_date: { type: 'string', description: 'Date de début (format YYYY-MM-DD, défaut: aujourd\'hui)' },
      end_date: { type: 'string', description: 'Date de fin (format YYYY-MM-DD, calculée selon le délai)' },
      budget: { type: 'number', description: 'Budget total en euros (optionnel mais recommandé)' },
      profiles: {
        type: 'array',
        description: 'Liste des profils professionnels à ajouter',
        items: {
          type: 'object',
          properties: {
            profession: { type: 'string', description: 'Le métier ou profession' },
            seniority: { type: 'string', enum: ['junior', 'intermediate', 'senior'], description: 'Le niveau de séniorité' },
            skills: { type: 'array', items: { type: 'string' }, description: 'Les compétences requises' },
            languages: { type: 'array', items: { type: 'string' }, description: 'Les langues parlées' }
          },
          required: ['profession', 'seniority']
        }
      }
    },
    required: ['project_name', 'profiles']
  },
  async execute(params: any) {
    console.log('🚀 Tool create_team executing with params:', params);

    // Si params est une chaîne, la parser
    let parsedParams = params;
    if (typeof params === 'string') {
      try {
        parsedParams = JSON.parse(params);
        console.log('📦 Parsed params from string:', parsedParams);
      } catch (error) {
        console.error('❌ Failed to parse params:', error);
        return { success: false, error: 'Paramètres invalides' };
      }
    }

    console.log('🔍 Params type:', typeof parsedParams);
    console.log('🔍 project_name value:', parsedParams.project_name);

    // S'assurer que les paramètres sont bien passés
    const teamParams = {
      project_name: parsedParams.project_name,
      project_description: parsedParams.project_description,
      start_date: parsedParams.start_date,
      end_date: parsedParams.end_date,
      budget: parsedParams.budget,
      profiles: parsedParams.profiles
    };

    console.log('📦 Passing to createTeam:', teamParams);
    const result = await createTeamFunc(teamParams);
    console.log('✅ Tool create_team result:', result);
    return result;
  }
};

// Créer l'outil create_meeting
export const createMeetingTool: RealtimeTool = {
  name: 'create_meeting',
  description: 'Créer une réunion ou un événement dans le planning d\'un projet',
  parameters: {
    type: 'object',
    properties: {
      project_name: { type: 'string', description: 'Le nom du projet' },
      title: { type: 'string', description: 'Le titre de la réunion' },
      description: { type: 'string', description: 'La description de la réunion' },
      date: { type: 'string', description: 'Format YYYY-MM-DD' },
      time: { type: 'string', description: 'Format HH:MM' },
      duration: { type: 'number', description: 'La durée en minutes (défaut 60)' },
      participants: { type: 'array', items: { type: 'string' }, description: 'Liste des participants' }
    },
    required: ['title', 'date', 'time']
  },
  async execute(params: any) {
    console.log('📅 Tool create_meeting executing with params:', params);
    const result = await createMeetingFunc(params);
    console.log('✅ Tool create_meeting result:', result);
    return result;
  }
};

// Créer l'outil create_todo_kanban
export const createTodoKanbanTool: RealtimeTool = {
  name: 'create_todo_kanban',
  description: 'Créer une tâche dans le kanban d\'un projet',
  parameters: {
    type: 'object',
    properties: {
      project_name: { type: 'string', description: 'Le nom du projet' },
      title: { type: 'string', description: 'Le titre de la tâche' },
      description: { type: 'string', description: 'La description de la tâche' },
      column: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'], description: 'La colonne où placer la tâche' },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'La priorité de la tâche' },
      assignee: { type: 'string', description: 'La personne assignée (optionnel)' }
    },
    required: ['title', 'column']
  },
  async execute(params: any) {
    console.log('📋 Tool create_todo_kanban executing with params:', params);
    const result = await createTodoKanbanFunc(params);
    console.log('✅ Tool create_todo_kanban result:', result);
    return result;
  }
};

// Créer l'outil create_event_calendar
export const createEventCalendarTool: RealtimeTool = {
  name: 'create_event_calendar',
  description: 'Créer un événement dans le calendrier d\'un projet',
  parameters: {
    type: 'object',
    properties: {
      project_name: { type: 'string', description: 'Le nom du projet' },
      title: { type: 'string', description: 'Le titre de l\'événement' },
      description: { type: 'string', description: 'La description de l\'événement' },
      date: { type: 'string', description: 'Format YYYY-MM-DD' },
      time: { type: 'string', description: 'Format HH:MM' },
      duration: { type: 'number', description: 'La durée en minutes' },
      type: { type: 'string', enum: ['meeting', 'milestone', 'deadline', 'review'], description: 'Le type d\'événement' }
    },
    required: ['title', 'date', 'type']
  },
  async execute(params: any) {
    console.log('📆 Tool create_event_calendar executing with params:', params);
    const result = await createEventCalendarFunc(params);
    console.log('✅ Tool create_event_calendar result:', result);
    return result;
  }
};

// Créer l'outil search_project
export const searchProjectTool: RealtimeTool = {
  name: 'search_project',
  description: 'Rechercher un projet par son nom',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Le terme de recherche' }
    },
    required: ['query']
  },
  async execute(params: any) {
    console.log('🔍 Tool search_project executing with params:', params);
    const result = await searchProjectFunc(params);
    console.log('✅ Tool search_project result:', result);
    return result;
  }
};

// Créer l'outil get_faq
export const getFAQTool: RealtimeTool = {
  name: 'get_faq',
  description: 'Obtenir des réponses aux questions fréquentes',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'La question ou le sujet recherché' }
    }
  },
  async execute(params: any) {
    console.log('❓ Tool get_faq executing with params:', params);
    const result = await getFAQFunc(params?.query);
    console.log('✅ Tool get_faq result:', result);
    return result;
  }
};

// Créer l'outil create_project
export const createProjectTool: RealtimeTool = {
  name: 'create_project',
  description: 'Créer un nouveau projet',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Le nom du projet' },
      description: { type: 'string', description: 'La description du projet' },
      start_date: { type: 'string', description: 'Format YYYY-MM-DD' },
      end_date: { type: 'string', description: 'Format YYYY-MM-DD' },
      budget: { type: 'number', description: 'Le budget du projet' },
      team: {
        type: 'array',
        description: 'L\'équipe initiale du projet',
        items: {
          type: 'object',
          properties: {
            profession: { type: 'string' },
            seniority: { type: 'string', enum: ['junior', 'intermediate', 'senior'] },
            skills: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    required: ['name', 'description', 'start_date', 'end_date']
  },
  async execute(params: any) {
    console.log('🏗️ Tool create_project executing with params:', params);
    const result = await createProjectFunc(params);
    console.log('✅ Tool create_project result:', result);
    return result;
  }
};

// Liste des outils dans le nouveau format
export const REALTIME_TOOLS: RealtimeTool[] = [
  createMeetingTool,
  createTeamTool,
  createTodoKanbanTool,
  createEventCalendarTool,
  createProjectTool,
  searchProjectTool,
  getFAQTool
];

// Ancien format pour compatibilité (sera supprimé)
export const REALTIME_TOOLS_OLD = [
  {
    name: 'create_meeting',
    description: 'Créer une réunion ou un événement dans le planning d\'un projet',
    parameters: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Le nom du projet (optionnel si project_id est fourni)'
        },
        title: {
          type: 'string',
          description: 'Le titre de la réunion'
        },
        description: {
          type: 'string',
          description: 'La description de la réunion'
        },
        date: {
          type: 'string',
          description: 'La date de la réunion (format YYYY-MM-DD)'
        },
        time: {
          type: 'string',
          description: 'L\'heure de la réunion (format HH:MM)'
        },
        duration: {
          type: 'number',
          description: 'La durée en minutes (par défaut 60)'
        },
        participants: {
          type: 'array',
          items: { type: 'string' },
          description: 'Liste des participants'
        }
      },
      required: ['title', 'date', 'time']
    }
  },
  {
    name: 'create_team',
    description: 'Créer un projet et composer son équipe. IMPORTANT: Toujours demander le délai (durée) du projet. Le budget est optionnel mais aide à déterminer la taille et séniorité de l\'équipe.',
    parameters: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Le nom du projet (requis)'
        },
        project_description: {
          type: 'string',
          description: 'La description du projet'
        },
        start_date: {
          type: 'string',
          description: 'Date de début (format YYYY-MM-DD, défaut: aujourd\'hui)'
        },
        end_date: {
          type: 'string',
          description: 'Date de fin (format YYYY-MM-DD). IMPORTANT: Si l\'utilisateur dit "1 semaine", ajouter 7 jours. Si "2 semaines", ajouter 14 jours. Si "1 mois", ajouter 30 jours. Ne pas confondre semaine et mois!'
        },
        budget: {
          type: 'number',
          description: 'Budget total en euros (optionnel mais recommandé)'
        },
        profiles: {
          type: 'array',
          description: 'Liste des profils professionnels à ajouter',
          items: {
            type: 'object',
            properties: {
              profession: {
                type: 'string',
                description: 'Le métier ou profession (ex: Développeur, Designer, Chef de projet)'
              },
              seniority: {
                type: 'string',
                enum: ['junior', 'intermediate', 'senior'],
                description: 'Le niveau de séniorité'
              },
              skills: {
                type: 'array',
                items: { type: 'string' },
                description: 'Les compétences requises'
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Les langues parlées'
              }
            },
            required: ['profession', 'seniority']
          }
        }
      },
      required: ['project_name', 'profiles']
    }
  },
  {
    name: 'create_todo_kanban',
    description: 'Créer une tâche dans le kanban d\'un projet',
    parameters: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Le nom du projet'
        },
        title: {
          type: 'string',
          description: 'Le titre de la tâche'
        },
        description: {
          type: 'string',
          description: 'La description de la tâche'
        },
        column: {
          type: 'string',
          enum: ['todo', 'in_progress', 'review', 'done'],
          description: 'La colonne où placer la tâche'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'La priorité de la tâche'
        },
        assignee: {
          type: 'string',
          description: 'La personne assignée (optionnel)'
        }
      },
      required: ['title', 'column']
    }
  },
  {
    name: 'create_event_calendar',
    description: 'Créer un événement dans le calendrier d\'un projet',
    parameters: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Le nom du projet'
        },
        title: {
          type: 'string',
          description: 'Le titre de l\'événement'
        },
        description: {
          type: 'string',
          description: 'La description de l\'événement'
        },
        date: {
          type: 'string',
          description: 'La date de l\'événement (format YYYY-MM-DD)'
        },
        time: {
          type: 'string',
          description: 'L\'heure de l\'événement (format HH:MM)'
        },
        duration: {
          type: 'number',
          description: 'La durée en minutes'
        },
        type: {
          type: 'string',
          enum: ['meeting', 'milestone', 'deadline', 'review'],
          description: 'Le type d\'événement'
        }
      },
      required: ['title', 'date', 'type']
    }
  },
  {
    name: 'create_project',
    description: 'Créer un nouveau projet',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Le nom du projet'
        },
        description: {
          type: 'string',
          description: 'La description du projet'
        },
        start_date: {
          type: 'string',
          description: 'La date de début (format YYYY-MM-DD)'
        },
        end_date: {
          type: 'string',
          description: 'La date de fin (format YYYY-MM-DD)'
        },
        budget: {
          type: 'number',
          description: 'Le budget du projet'
        },
        team: {
          type: 'array',
          description: 'L\'équipe initiale du projet',
          items: {
            type: 'object',
            properties: {
              profession: { type: 'string' },
              seniority: { 
                type: 'string',
                enum: ['junior', 'intermediate', 'senior']
              },
              skills: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      },
      required: ['name', 'description', 'start_date', 'end_date']
    }
  },
  {
    name: 'search_project',
    description: 'Rechercher un projet par son nom',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Le terme de recherche'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_faq',
    description: 'Obtenir des réponses aux questions fréquentes',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'La question ou le sujet recherché'
        }
      }
    }
  }
];

// Fonction pour exécuter un outil (pour compatibilité)
export async function executeRealtimeTool(name: string, parameters: any) {
  console.log('🔨 executeRealtimeTool appelé:', { name, parameters });
  
  // Trouver l'outil correspondant
  const tool = REALTIME_TOOLS.find(t => t.name === name);
  
  if (!tool) {
    console.error('❌ Outil inconnu:', name);
    throw new Error(`Outil inconnu: ${name}`);
  }

  try {
    console.log('▶️ Exécution de l\'outil:', name);
    // Exécuter directement la fonction execute de l'outil
    const result = await tool.execute(parameters);
    console.log('✅ Résultat:', result);
    return result;
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de l'outil ${name}:`, error);
    throw error;
  }
}