/**
 * Définition des tools/functions disponibles pour l'AI Assistant
 * Ces outils permettent à l'assistant d'effectuer des actions concrètes
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export const ASSISTANT_TOOLS: ToolDefinition[] = [
  // ========== KNOWLEDGE & EXPLANATION TOOLS ==========
  {
    type: 'function',
    function: {
      name: 'explain_platform_feature',
      description: 'Expliquer en détail une fonctionnalité de la plateforme Team Dash Manager',
      parameters: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            enum: [
              'reactflow', 'kanban', 'planning', 'messages', 'drive', 'wiki',
              'project_creation', 'candidate_matching', 'project_status', 'roles'
            ],
            description: 'La fonctionnalité à expliquer'
          },
          detail_level: {
            type: 'string',
            enum: ['brief', 'detailed', 'tutorial'],
            description: 'Niveau de détail souhaité',
            default: 'detailed'
          },
          include_workflow: {
            type: 'boolean',
            description: 'Inclure le workflow étape par étape',
            default: false
          }
        },
        required: ['feature']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Rechercher des informations dans la base de connaissances',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'La requête de recherche'
          },
          category: {
            type: 'string',
            enum: ['features', 'workflows', 'troubleshooting', 'all'],
            description: 'Catégorie de recherche',
            default: 'all'
          }
        },
        required: ['query']
      }
    }
  },

  // ========== TEAM COMPOSITION TOOLS ==========
  {
    type: 'function',
    function: {
      name: 'compose_team',
      description: 'Composer une équipe optimale pour un projet',
      parameters: {
        type: 'object',
        properties: {
          project_type: {
            type: 'string',
            enum: ['web', 'mobile', 'data', 'ecommerce', 'saas', 'custom'],
            description: 'Type de projet'
          },
          project_complexity: {
            type: 'string',
            enum: ['simple', 'medium', 'complex'],
            description: 'Complexité du projet',
            default: 'medium'
          },
          team_size: {
            type: 'number',
            description: 'Taille d\'Team souhaitée (Namebre de personnes)',
            minimum: 1,
            maximum: 20
          },
          budget_range: {
            type: 'object',
            properties: {
              min: { type: 'number', description: 'Budget minimum en euros' },
              max: { type: 'number', description: 'Budget maximum en euros' }
            }
          },
          duration_months: {
            type: 'number',
            description: 'Durée estimée du Project en mois',
            minimum: 1,
            maximum: 24
          },
          required_skills: {
            type: 'array',
            items: { type: 'string' },
            description: 'Skills spécifiques requises'
          },
          languages: {
            type: 'array',
            items: { type: 'string' },
            description: 'Languages requises pour l\'équipe',
            default: ['Français']
          },
          open_in_reactflow: {
            type: 'boolean',
            description: 'Ouvrir directement dans ReactFlow',
            default: true
          }
        },
        required: ['project_type']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'suggest_team_member',
      description: 'Suggérer un profil spécifique pour compléter une équipe',
      parameters: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            description: 'Le rôle recherché (ex: Développeur Frontend, Chef de projet)'
          },
          seniority: {
            type: 'string',
            enum: ['junior', 'medior', 'senior', 'expert'],
            description: 'Niveau de séniorité requis'
          },
          skills: {
            type: 'array',
            items: { type: 'string' },
            description: 'Compétences techniques requises'
          },
          project_context: {
            type: 'string',
            description: 'Contexte du projet pour affiner la suggestion'
          }
        },
        required: ['role']
      }
    }
  },

  // ========== MEETING MANAGEMENT TOOLS ==========
  {
    type: 'function',
    function: {
      name: 'create_meeting',
      description: 'Créer une réunion dans le planning',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Titre de la réunion'
          },
          type: {
            type: 'string',
            enum: ['kickoff', 'daily', 'sprint_planning', 'sprint_review', 'retrospective', 'brainstorm', 'one_on_one', 'custom'],
            description: 'Type de réunion',
            default: 'custom'
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Date de la réunion (YYYY-MM-DD)'
          },
          time: {
            type: 'string',
            format: 'time',
            description: 'Heure de début (HH:MM)'
          },
          duration_minutes: {
            type: 'number',
            description: 'Durée en minutes',
            default: 60,
            minimum: 15,
            maximum: 480
          },
          participants: {
            type: 'array',
            items: { type: 'string' },
            description: 'Liste des participants (emails ou noms)'
          },
          project_id: {
            type: 'string',
            description: 'ID du projet associé'
          },
          description: {
            type: 'string',
            description: 'Description et ordre du jour'
          },
          location: {
            type: 'string',
            enum: ['online', 'office', 'client_site', 'custom'],
            description: 'Lieu de la réunion',
            default: 'online'
          },
          meeting_url: {
            type: 'string',
            description: 'Lien de visioconférence si online'
          },
          send_invites: {
            type: 'boolean',
            description: 'Envoyer les invitations automatiquement',
            default: true
          },
          reminder_minutes: {
            type: 'number',
            description: 'Rappel X minutes avant',
            default: 15
          }
        },
        required: ['title', 'date', 'time']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'find_available_slot',
      description: 'Trouver un créneau disponible pour une réunion',
      parameters: {
        type: 'object',
        properties: {
          participants: {
            type: 'array',
            items: { type: 'string' },
            description: 'Liste des participants requis'
          },
          duration_minutes: {
            type: 'number',
            description: 'Durée souhaitée en minutes',
            default: 60
          },
          date_range: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date', description: 'Date de début de recherche' },
              end: { type: 'string', format: 'date', description: 'Date de fin de recherche' }
            }
          },
          preferred_time: {
            type: 'string',
            enum: ['morning', 'afternoon', 'any'],
            description: 'Préférence horaire',
            default: 'any'
          }
        },
        required: ['participants', 'duration_minutes']
      }
    }
  },

  // ========== TASK MANAGEMENT TOOLS ==========
  {
    type: 'function',
    function: {
      name: 'add_task',
      description: 'Ajouter une nouvelle tâche au Kanban',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Titre de la tâche (court et descriptif)'
          },
          description: {
            type: 'string',
            description: 'Description détaillée et critères d\'acceptation'
          },
          assignee: {
            type: 'string',
            description: 'Personne assignée (EMayl ou Name)'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Niveau de priorité',
            default: 'medium'
          },
          column: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'],
            description: 'Colonne initiale',
            default: 'todo'
          },
          project_id: {
            type: 'string',
            description: 'ID du Project'
          },
          due_date: {
            type: 'string',
            format: 'date',
            description: 'Date d\'échéance (YYYY-MM-DD)'
          },
          estimation_hours: {
            type: 'number',
            description: 'Estimation en heures',
            minimum: 0.5,
            maximum: 100
          },
          labels: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['bug', 'feature', 'improvement', 'documentation', 'test', 'urgent']
            },
            description: 'Labels de catégorisation'
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des tâches dont celle-ci dépend'
          }
        },
        required: ['title', 'assignee']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'update_task_status',
      description: 'Mettre à jour le statut d\'une tâche',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'ID de la tâche à mettre à day'
          },
          new_status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
            description: 'Nouveau Status'
          },
          comment: {
            type: 'string',
            description: 'Commentaire sur le changement de Status'
          }
        },
        required: ['task_id', 'new_status']
      }
    }
  },

  // ========== PROJECT MANAGEMENT TOOLS ==========
  {
    type: 'function',
    function: {
      name: 'get_project_status',
      description: 'Obtenir le Status détaillé d\'un projet',
      parameters: {
        type: 'object',
        properties: {
          project_identifier: {
            type: 'string',
            description: 'Nom ou ID du projet'
          },
          include_metrics: {
            type: 'boolean',
            description: 'Inclure les métriques (budget, avancement, etc.)',
            default: true
          },
          include_team: {
            type: 'boolean',
            description: 'Inclure les informations d\'Team',
            default: true
          },
          include_tasks: {
            type: 'boolean',
            description: 'Inclure le résumé des tâches',
            default: false
          }
        },
        required: ['project_identifier']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'list_projects',
      description: 'Lister les Projects avec filtres',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['all', 'pause', 'attente-team', 'play', 'completed'],
            description: 'Filter par Status',
            default: 'all'
          },
          role: {
            type: 'string',
            enum: ['all', 'owner', 'participant'],
            description: 'Filter par Role',
            default: 'all'
          },
          sort_by: {
            type: 'string',
            enum: ['date_created', 'date_updated', 'deadline', 'Budget'],
            description: 'Critère de tri',
            default: 'date_updated'
          },
          limit: {
            type: 'number',
            description: 'Namebre maximum de résultats',
            default: 10,
            minimum: 1,
            maximum: 50
          }
        }
      }
    }
  },

  // ========== NAVIGATION & UI TOOLS ==========
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Naviguer vers une section spécifique de l\'application',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            enum: [
              'dashboard', 'projects', 'kanban', 'planning', 'messages', 
              'drive', 'wiki', 'invoices', 'settings', 'reactflow'
            ],
            description: 'Section de destination'
          },
          project_id: {
            type: 'string',
            description: 'ID du projet si navigation vers un projet spécifique'
          },
          open_in_new_tab: {
            type: 'boolean',
            description: 'Ouvrir dans un nouvel onglet',
            default: false
          }
        },
        required: ['destination']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'show_notification',
      description: 'Afficher une notification à l\'utilisateur',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message à afficher'
          },
          type: {
            type: 'string',
            enum: ['info', 'success', 'warning', 'error'],
            description: 'Type de notification',
            default: 'info'
          },
          duration: {
            type: 'number',
            description: 'Durée d\'affichage en secondes',
            default: 5,
            minimum: 1,
            maximum: 30
          }
        },
        required: ['message']
      }
    }
  }
];

// Export des noms de tools pour validation
export const TOOL_NAMES = ASSISTANT_TOOLS.map(tool => tool.function.name);

// Helper pour obtenir un tool par son nom
export function getToolByName(name: string): ToolDefinition | undefined {
  return ASSISTANT_TOOLS.find(tool => tool.function.name === name);
}

// Helper pour valider les paramètres d'un tool
export function validateToolParameters(
  toolName: string,
  parameters: any
): { valid: boolean; errors?: string[] } {
  const tool = getToolByName(toolName);
  if (!tool) {
    return { valid: false, errors: [`Tool '${toolName}' not found`] };
  }

  const errors: string[] = [];
  const required = tool.function.parameters.required || [];
  
  // Vérifier les paramètres requis
  for (const param of required) {
    if (!(param in parameters)) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }

  // Vérifier les types et enum values
  const properties = tool.function.parameters.properties;
  for (const [key, value] of Object.entries(parameters)) {
    if (key in properties) {
      const prop = properties[key];
      
      // Vérifier le type
      if (prop.type && typeof value !== prop.type && prop.type !== 'array' && prop.type !== 'object') {
        errors.push(`Parameter '${key}' should be of type ${prop.type}`);
      }
      
      // Vérifier les valeurs enum
      if (prop.enum && !prop.enum.includes(value)) {
        errors.push(`Parameter '${key}' should be one of: ${prop.enum.join(', ')}`);
      }
      
      // Vérifier les limites numériques
      if (prop.type === 'number') {
        if (prop.minimum !== undefined && value < prop.minimum) {
          errors.push(`Parameter '${key}' should be at least ${prop.minimum}`);
        }
        if (prop.maximum !== undefined && value > prop.maximum) {
          errors.push(`Parameter '${key}' should be at most ${prop.maximum}`);
        }
      }
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}