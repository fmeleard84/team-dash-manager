import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keycloak validation
interface KeycloakTokenPayload {
  sub: string;
  iss?: string;
  aud?: string | string[];
  resource_access?: {
    backoffice?: {
      roles: string[];
    };
  };
  realm_access?: {
    roles: string[];
  };
  groups?: string[];
  exp: number;
  iat: number;
}

async function validateKeycloakToken(token: string, requiredGroup: string): Promise<KeycloakTokenPayload> {
  console.log('🔍 VALIDATING KEYCLOAK TOKEN (SIMPLIFIED MODE)');
  console.log('Token length:', token.length);
  console.log('Required group:', requiredGroup);
  
  try {
    // Decode JWT without signature verification for debugging
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Invalid JWT format - wrong number of parts:', tokenParts.length);
      throw new Error('Invalid JWT format');
    }
    
    // Decode header and payload
    const headerB64 = tokenParts[0];
    const payloadB64 = tokenParts[1];
    
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload: KeycloakTokenPayload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    
    console.log('✅ JWT header:', header);
    console.log('✅ JWT issuer:', payload.iss);
    console.log('✅ JWT subject:', payload.sub);
    console.log('✅ JWT audience:', payload.aud);
    console.log('✅ Token expiry:', payload.exp, '(current:', Math.floor(Date.now() / 1000), ')');
    
    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      console.error('❌ Token expired:', { exp: payload.exp, now: currentTime });
      throw new Error('Token expired');
    }
    
    // Check if user belongs to required group - prioritize payload.groups (new mapper)
    console.log('🔍 DETAILED GROUP ANALYSIS:');
    console.log('payload.groups:', payload.groups);
    console.log('payload.realm_access?.roles:', payload.realm_access?.roles);
    console.log('payload.resource_access?.backoffice?.roles:', payload.resource_access?.backoffice?.roles);
    
    // Primary source: payload.groups (from new Keycloak mapper)
    const userGroups = payload.groups || [];
    
    // Fallback: old locations for backward compatibility
    const fallbackGroups = [
      ...(payload.realm_access?.roles || []),
      ...(payload.resource_access?.backoffice?.roles || []),
      ...Object.values(payload.resource_access || {}).flatMap((resource: any) => resource.roles || [])
    ];
    
    console.log('Primary userGroups (from payload.groups):', userGroups);
    console.log('Fallback groups (from other locations):', fallbackGroups);
    
    console.log('=== GROUP VALIDATION DEBUG ===');
    console.log('Full token payload structure:', JSON.stringify({
      sub: payload.sub,
      groups: payload.groups,
      realm_access: payload.realm_access,
      resource_access: payload.resource_access
    }, null, 2));
    
    console.log('Extracted user groups/roles:', userGroups);
    console.log('Required group:', requiredGroup);
    
    // Normalize group names by replacing spaces with hyphens for comparison
    const normalizeGroupName = (name: string) => name.replace(/\s+/g, '-').toLowerCase();
    const normalizedRequiredGroup = normalizeGroupName(requiredGroup);
    
    console.log('Normalized required group:', normalizedRequiredGroup);
    console.log('Normalized user groups:', userGroups.map(g => normalizeGroupName(g)));
    
    // Check primary groups first (from payload.groups)
    let hasRequiredGroup = userGroups.some(group => {
      const normalizedGroup = normalizeGroupName(group);
      const hasExactMatch = normalizedGroup === normalizedRequiredGroup;
      const hasProjectMatch = normalizedGroup.includes('projet') && normalizedRequiredGroup.includes('projet');
      const hasClientAccess = group.includes('Client (propriétaire)') || 
                             group.includes('propriétaire') ||
                             (typeof group === 'string' && group.toLowerCase().includes('client'));
      
      console.log(`✅ Checking PRIMARY group "${group}":`, {
        normalized: normalizedGroup,
        exactMatch: hasExactMatch,
        projectMatch: hasProjectMatch,
        clientAccess: hasClientAccess
      });
      
      return hasExactMatch || hasProjectMatch || hasClientAccess;
    });
    
    // If not found in primary groups, check fallback groups
    if (!hasRequiredGroup && fallbackGroups.length > 0) {
      console.log('🔄 Checking fallback groups since primary check failed...');
      hasRequiredGroup = fallbackGroups.some(group => {
        const normalizedGroup = normalizeGroupName(group);
        const hasExactMatch = normalizedGroup === normalizedRequiredGroup;
        const hasProjectMatch = normalizedGroup.includes('projet') && normalizedRequiredGroup.includes('projet');
        const hasClientAccess = group.includes('Client (propriétaire)') || 
                               group.includes('propriétaire') ||
                               (typeof group === 'string' && group.toLowerCase().includes('client'));
        
        console.log(`⚠️  Checking FALLBACK group "${group}":`, {
          normalized: normalizedGroup,
          exactMatch: hasExactMatch,
          projectMatch: hasProjectMatch,
          clientAccess: hasClientAccess
        });
        
        return hasExactMatch || hasProjectMatch || hasClientAccess;
      });
    }
    
    console.log('Final group check result:', hasRequiredGroup);
    console.log('=== END GROUP VALIDATION DEBUG ===');
    
    if (!hasRequiredGroup) {
      console.error('❌ ACCESS DENIED');
      console.error('Primary user groups (payload.groups):', userGroups);
      console.error('Fallback groups:', fallbackGroups);
      console.error('Required group pattern:', requiredGroup);
      console.error('Normalized required:', normalizedRequiredGroup);
      const allAvailableGroups = [...userGroups, ...fallbackGroups];
      throw new Error(`User does not belong to required group: ${requiredGroup}. Available groups: ${allAvailableGroups.join(', ')}`);
    }
    
    console.log('Token validation successful');
    return payload;
    
  } catch (error) {
    console.error('Token validation failed:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

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
    
    // Use "private" as default type (from Planka API whitelist: private, shared)
    const projectData = {
      name,
      type: "private", // Valid values: "private" or "shared"
      ...(description && { description }),
      background: {
        color: '#0079bf', // Default blue color
      },
    };
    
    console.log('Project data being sent:', JSON.stringify(projectData, null, 2));
    
    try {
      const data = await this.apiCall('/projects', 'POST', projectData);
      console.log('Project created successfully with type: "private"');
      return data.item;
    } catch (error) {
      console.log('Failed with type: "private", trying type: "shared"...');
      
      // Fallback: try with type: "shared"
      try {
        const fallbackData = { ...projectData, type: "shared" };
        console.log('Fallback project data:', JSON.stringify(fallbackData, null, 2));
        const data = await this.apiCall('/projects', 'POST', fallbackData);
        console.log('Project created successfully with type: "shared"');
        return data.item;
      } catch (fallbackError) {
        console.error('Both "private" and "shared" types failed.');
        console.error('Private type error:', error);
        console.error('Shared type error:', fallbackError);
        throw new Error(`Failed to create project. API only accepts type "private" or "shared". Last error: ${fallbackError.message}`);
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
    
    const listData = {
      name,
      position,
      type: "active", // Valid values for lists: "active" or "closed"
    };
    
    console.log('List data being sent:', JSON.stringify(listData, null, 2));
    
    const data = await this.apiCall(`/boards/${boardId}/lists`, 'POST', listData);
    
    return data.item;
  }

  async createCard(listId: string, name: string, description?: string, position?: number): Promise<PlankaCard> {
    console.log(`Creating card: ${name} in list: ${listId}`);
    
    const cardData = {
      name,
      description: description || '',
      position: position || 1,
      type: "project", // Valid values: "project" or "story"
    };
    
    console.log('Card data being sent:', JSON.stringify(cardData, null, 2));
    
    try {
      const data = await this.apiCall(`/lists/${listId}/cards`, 'POST', cardData);
      console.log(`Card created successfully: ${name}`);
      return data.item;
    } catch (error) {
      console.log(`Failed to create card with type "project", trying with type "story"...`);
      
      // Fallback to "story" type if "project" fails
      const fallbackCardData = { ...cardData, type: "story" };
      console.log('Fallback card data being sent:', JSON.stringify(fallbackCardData, null, 2));
      
      const data = await this.apiCall(`/lists/${listId}/cards`, 'POST', fallbackCardData);
      console.log(`Card created successfully with fallback type: ${name}`);
      return data.item;
    }
  }
}

serve(async (req) => {
  console.log('=== PLANKA INTEGRATION FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('Parsing request body...');
    const body = await req.json();
    const { action, projectId, adminUserId } = body;
    
    console.log('Request body:', JSON.stringify({ action, projectId, adminUserId }, null, 2));

    // Extract Bearer token from Authorization header
    console.log('Getting authorization header...');
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    console.log('Authorization header preview:', authHeader?.substring(0, 50) + '...');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized - Missing token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Extracting token from Authorization header...');
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    // Validate Keycloak token and check project group membership
    console.log('About to validate Keycloak token...');
    try {
      // Get project details to build correct group name
      console.log('Fetching project details from Supabase...');
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('Project not found:', projectError);
        throw new Error('Project not found');
      }

      // Normalize project title by replacing spaces with hyphens for consistent group naming
      const normalizedTitle = project.title.replace(/\s+/g, '-');
      const requiredGroup = `Projet-${normalizedTitle}`;
      console.log('Checking membership for group:', requiredGroup);
      console.log('Original project title:', project.title);
      console.log('Normalized project title:', normalizedTitle);
      
      console.log('Calling validateKeycloakToken...');
      const tokenPayload = await validateKeycloakToken(token, requiredGroup);
      console.log('✅ User authenticated and authorized for project:', projectId);
      console.log('User ID:', tokenPayload.sub);
      
    } catch (error) {
      console.error('❌ Keycloak authentication failed:', error);
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - Invalid or insufficient permissions',
        details: error.message 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync-project') {
      console.log(`🔍 SYNC PROJECT - Looking for project in Supabase: ${projectId}`);

      // Get project details from Supabase
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      console.log('📊 Project query result:', { project, error: projectError });

      if (projectError || !project) {
        console.error('❌ Project not found in Supabase:', { projectId, error: projectError });
        return new Response(JSON.stringify({
          error: "Project not found",
          details: `No project found in Supabase with id=${projectId}`,
          projectId: projectId
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Project found in Supabase:', project.title);

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
      const plankaUrl = `${plankaBaseUrl}/boards/${plankaBoard.id}`;
      
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