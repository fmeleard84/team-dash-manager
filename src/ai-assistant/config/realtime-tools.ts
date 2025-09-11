/**
 * Configuration des outils pour l'API OpenAI Realtime
 */

export const REALTIME_TOOLS = [
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
    description: 'Créer ou composer une équipe pour un projet',
    parameters: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Le nom du projet'
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
                enum: ['junior', 'medior', 'senior', 'expert'],
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
                enum: ['junior', 'medior', 'senior', 'expert']
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

// Mapper les noms des outils aux fonctions
import { 
  createMeeting, 
  createTeam, 
  createProject, 
  searchProject, 
  getFAQ 
} from '../tools/project-tools';

export const TOOL_FUNCTIONS: Record<string, Function> = {
  'create_meeting': createMeeting,
  'create_team': createTeam,
  'create_project': createProject,
  'search_project': searchProject,
  'get_faq': getFAQ
};

// Fonction pour exécuter un outil
export async function executeRealtimeTool(name: string, parameters: any) {
  const toolFunction = TOOL_FUNCTIONS[name];
  
  if (!toolFunction) {
    throw new Error(`Outil inconnu: ${name}`);
  }

  try {
    const result = await toolFunction(parameters);
    return result;
  } catch (error) {
    console.error(`Erreur lors de l'exécution de l'outil ${name}:`, error);
    throw error;
  }
}