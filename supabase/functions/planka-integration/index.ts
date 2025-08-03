import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlankaCredentials {
  baseUrl: string;
  email: string;
  password: string;
}

interface PlankaUser {
  id: string;
  username: string;
  email: string;
  name: string;
  accessToken: string;
}

interface PlankaProject {
  id: string;
  name: string;
  background: {
    color?: string;
    imageUrl?: string;
  };
}

interface PlankaBoard {
  id: string;
  name: string;
  projectId: string;
  lists?: PlankaList[];
}

interface PlankaList {
  id: string;
  name: string;
  boardId: string;
  position: number;
}

interface PlankaCard {
  id: string;
  name: string;
  description?: string;
  listId: string;
  position: number;
}

class PlankaClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  async authenticate(email: string, password: string): Promise<PlankaUser> {
    console.log('Authenticating with Planka...');
    console.log('Base URL:', this.baseUrl);
    console.log('Email:', email);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/access-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrUsername: email,
          password: password,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Planka authentication failed:', errorText);
        throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Authentication response:', JSON.stringify(data, null, 2));
      
      // Planka returns the JWT directly in data.item
      if (!data.item || typeof data.item !== 'string') {
        console.error('Invalid authentication response structure:', data);
        throw new Error('Invalid authentication response from Planka');
      }
      
      this.accessToken = data.item;
      
      // For now, we'll create a minimal user object since Planka just returns the JWT
      // We could decode the JWT to get user info, but for basic functionality this works
      return {
        id: 'planka-user', // We don't have the actual user ID from this response
        username: email.split('@')[0], // Use email prefix as username
        email: email,
        name: email.split('@')[0], // Use email prefix as name
        accessToken: data.item,
      };
    } catch (error) {
      console.error('Authentication error details:', error);
      throw error;
    }
  }

  private async apiCall(endpoint: string, method: string = 'GET', body?: any) {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API call failed: ${method} ${endpoint}`, errorText);
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getProjects(): Promise<PlankaProject[]> {
    console.log('Fetching Planka projects...');
    const data = await this.apiCall('/projects');
    return data.items || [];
  }

  async createProject(name: string, description?: string): Promise<PlankaProject> {
    console.log(`Creating Planka project: ${name}`);
    
    // First attempt with type: 0 (most common default for APIs)
    const projectData = {
      name,
      type: 0, // Adding required type parameter (integer)
      ...(description && { description }),
      background: {
        color: '#0079bf', // Default blue color
      },
    };
    
    console.log('Project data being sent:', JSON.stringify(projectData, null, 2));
    
    try {
      const data = await this.apiCall('/projects', 'POST', projectData);
      console.log('Project created successfully with type: 0');
      return data.item;
    } catch (error) {
      console.log('Failed with type: 0, trying type: 1...');
      
      // Fallback: try with type: 1
      try {
        const fallbackData = { ...projectData, type: 1 };
        console.log('Fallback project data:', JSON.stringify(fallbackData, null, 2));
        const data = await this.apiCall('/projects', 'POST', fallbackData);
        console.log('Project created successfully with type: 1');
        return data.item;
      } catch (fallbackError) {
        console.log('Failed with type: 1, trying type: "kanban"...');
        
        // Second fallback: try with type as string
        try {
          const stringTypeData = { ...projectData, type: "kanban" };
          console.log('String type project data:', JSON.stringify(stringTypeData, null, 2));
          const data = await this.apiCall('/projects', 'POST', stringTypeData);
          console.log('Project created successfully with type: "kanban"');
          return data.item;
        } catch (stringError) {
          console.error('All type attempts failed. Original error:', error);
          console.error('Type 1 error:', fallbackError);
          console.error('String type error:', stringError);
          throw new Error(`Failed to create project with any type value. Last error: ${stringError.message}`);
        }
      }
    }
  }

  async getProjectBoards(projectId: string): Promise<PlankaBoard[]> {
    console.log(`Fetching boards for project: ${projectId}`);
    const data = await this.apiCall(`/projects/${projectId}/boards`);
    return data.items || [];
  }

  async createBoard(projectId: string, name: string): Promise<PlankaBoard> {
    console.log(`Creating board: ${name} in project: ${projectId}`);
    
    const data = await this.apiCall(`/projects/${projectId}/boards`, 'POST', {
      name,
      position: 1,
    });
    
    return data.item;
  }

  async createList(boardId: string, name: string, position: number): Promise<PlankaList> {
    console.log(`Creating list: ${name} in board: ${boardId}`);
    
    const data = await this.apiCall(`/boards/${boardId}/lists`, 'POST', {
      name,
      position,
    });
    
    return data.item;
  }

  async createCard(listId: string, name: string, description?: string, position?: number): Promise<PlankaCard> {
    console.log(`Creating card: ${name} in list: ${listId}`);
    
    const data = await this.apiCall(`/lists/${listId}/cards`, 'POST', {
      name,
      description: description || '',
      position: position || 1,
    });
    
    return data.item;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const body = await req.json();
    const { action, projectId, adminUserId } = body;
    
    console.log('Request body:', { action, projectId, adminUserId });

    // Validate admin user if provided
    if (adminUserId) {
      const { data: adminUser, error: adminError } = await supabaseClient
        .from('admin_users')
        .select('id, login')
        .eq('id', adminUserId)
        .single();

      if (adminError || !adminUser) {
        console.error('Admin user validation failed:', adminError);
        return new Response(JSON.stringify({ error: 'Unauthorized - Invalid admin user' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('Admin user validated:', adminUser.login);
    } else {
      // Fallback to Supabase auth
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        console.error('No valid authentication found');
        return new Response(JSON.stringify({ error: 'Unauthorized - No authentication' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'sync-project') {
      console.log(`Syncing project ${projectId} with Planka...`);

      // Get project details from Supabase
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      // Check if project already exists in Planka
      const { data: existingPlanka } = await supabaseClient
        .from('planka_projects')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (existingPlanka) {
        console.log('Project already exists in Planka');
        return new Response(JSON.stringify({
          success: true,
          exists: true,
          plankaUrl: existingPlanka.planka_url,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get Planka credentials from environment
      const plankaBaseUrl = Deno.env.get('PLANKA_BASE_URL');
      const plankaEmail = Deno.env.get('PLANKA_EMAIL');
      const plankaPassword = Deno.env.get('PLANKA_PASSWORD');

      if (!plankaBaseUrl || !plankaEmail || !plankaPassword) {
        throw new Error('Missing Planka credentials');
      }

      // Initialize Planka client and authenticate
      const planka = new PlankaClient(plankaBaseUrl);
      await planka.authenticate(plankaEmail, plankaPassword);

      // Create project in Planka
      const plankaProject = await planka.createProject(
        project.title,
        project.description || `Projet HR System: ${project.title}`
      );

      // Create main board
      const plankaBoard = await planka.createBoard(
        plankaProject.id,
        `Ressources - ${project.title}`
      );

      // Create default lists
      const lists = [
        { name: 'À faire', position: 1 },
        { name: 'En cours', position: 2 },
        { name: 'Terminé', position: 3 },
      ];

      for (const listData of lists) {
        await planka.createList(plankaBoard.id, listData.name, listData.position);
      }

      // Get HR resource assignments for this project
      const { data: hrResources } = await supabaseClient
        .from('hr_resource_assignments')
        .select(`
          *,
          hr_profiles (
            name,
            hr_categories (name)
          )
        `)
        .eq('project_id', projectId);

      // Create cards for each HR resource
      if (hrResources) {
        const todoList = await planka.createList(plankaBoard.id, 'Ressources assignées', 0);
        
        for (let i = 0; i < hrResources.length; i++) {
          const resource = hrResources[i];
          const profile = resource.hr_profiles;
          
          const cardName = `${profile?.name || 'Ressource'} - ${resource.seniority}`;
          const cardDescription = `
**Catégorie**: ${profile?.hr_categories?.name || 'Non définie'}
**Séniorité**: ${resource.seniority}
**Prix calculé**: ${resource.calculated_price}€/min
**Langues**: ${resource.languages?.join(', ') || 'Aucune'}
**Expertises**: ${resource.expertises?.join(', ') || 'Aucune'}
          `.trim();

          await planka.createCard(
            todoList.id,
            cardName,
            cardDescription,
            i + 1
          );
        }
      }

      // Save Planka project info to Supabase
      const plankaUrl = `${plankaBaseUrl}/projects/${plankaProject.id}/boards/${plankaBoard.id}`;
      
      const { error: insertError } = await supabaseClient
        .from('planka_projects')
        .insert({
          project_id: projectId,
          planka_project_id: plankaProject.id,
          planka_board_id: plankaBoard.id,
          planka_url: plankaUrl,
        });

      if (insertError) {
        console.error('Error saving Planka project info:', insertError);
        throw insertError;
      }

      console.log('Project successfully synced with Planka');

      return new Response(JSON.stringify({
        success: true,
        exists: false,
        plankaUrl,
        plankaProjectId: plankaProject.id,
        plankaBoardId: plankaBoard.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in planka-integration function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});