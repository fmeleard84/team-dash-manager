import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  password: string;
}

interface AddUserToGroupRequest {
  userId: string;
  groupId: string;
}

interface CreateProjectGroupRequest {
  projectId: string;
  groupName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action } = body;

    console.log(`Keycloak user management request: ${action}`);
    console.log(`Request body:`, JSON.stringify(body, null, 2));

    switch (action) {
      case 'create-user':
        return await handleCreateUser(body, supabase);
      case 'add-user-to-group':
        return await handleAddUserToGroup(body, supabase);
      case 'create-project-group':
        return await handleCreateProjectGroup(body, supabase);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in keycloak-user-management:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getKeycloakAdminToken(): Promise<string> {
  const keycloakBaseUrl = Deno.env.get('KEYCLOAK_BASE_URL');
  const adminUsername = Deno.env.get('KEYCLOAK_ADMIN_USERNAME');
  const adminPassword = Deno.env.get('KEYCLOAK_ADMIN_PASSWORD');
  const realm = Deno.env.get('KEYCLOAK_REALM') || 'haas';

  console.log(`Connecting to Keycloak at: ${keycloakBaseUrl}/realms/master`);
  console.log(`Using username: ${adminUsername}`);

  const tokenUrl = `${keycloakBaseUrl}/realms/master/protocol/openid-connect/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: adminUsername!,
      password: adminPassword!,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to get admin token: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to get admin token: ${response.statusText}`);
  }

  const tokenData = await response.json();
  console.log('Successfully obtained Keycloak admin token');
  return tokenData.access_token;
}

async function handleCreateUser(body: CreateUserRequest, supabase: any) {
  console.log('Creating user with data:', {
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    phoneNumber: body.phoneNumber
  });
  
  try {
    // Get admin token
    const adminToken = await getKeycloakAdminToken();
    const keycloakBaseUrl = Deno.env.get('KEYCLOAK_BASE_URL');
    const realm = Deno.env.get('KEYCLOAK_REALM') || 'haas';

    // Create user in Keycloak
    const createUserResponse = await fetch(
      `${keycloakBaseUrl}/admin/realms/${realm}/users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: body.email,
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          enabled: true,
          emailVerified: true,
        }),
      }
    );

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      throw new Error(`Failed to create user in Keycloak: ${errorText}`);
    }

    // Get the created user's ID from the Location header
    const locationHeader = createUserResponse.headers.get('Location');
    const keycloakUserId = locationHeader?.split('/').pop();

    if (!keycloakUserId) {
      throw new Error('Failed to get Keycloak user ID');
    }

    // Set password
    await fetch(
      `${keycloakBaseUrl}/admin/realms/${realm}/users/${keycloakUserId}/reset-password`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'password',
          value: body.password,
          temporary: false,
        }),
      }
    );

    // Store user metadata in Supabase
    const { data: user, error: dbError } = await supabase
      .from('users')
      .insert({
        keycloak_user_id: keycloakUserId,
        email: body.email,
        first_name: body.firstName,
        last_name: body.lastName,
        phone_number: body.phoneNumber,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing user in Supabase:', dbError);
      throw new Error('Failed to store user metadata');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        keycloakUserId,
        user 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCreateProjectGroup(body: CreateProjectGroupRequest, supabase: any) {
  
  try {
    const adminToken = await getKeycloakAdminToken();
    const keycloakBaseUrl = Deno.env.get('KEYCLOAK_BASE_URL');
    const realm = Deno.env.get('KEYCLOAK_REALM') || 'haas';

    // Create group in Keycloak
    const createGroupResponse = await fetch(
      `${keycloakBaseUrl}/admin/realms/${realm}/groups`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: body.groupName,
          path: `/${body.groupName}`,
        }),
      }
    );

    if (!createGroupResponse.ok) {
      const errorText = await createGroupResponse.text();
      throw new Error(`Failed to create group in Keycloak: ${errorText}`);
    }

    // Get the created group's ID
    const locationHeader = createGroupResponse.headers.get('Location');
    const keycloakGroupId = locationHeader?.split('/').pop();

    if (!keycloakGroupId) {
      throw new Error('Failed to get Keycloak group ID');
    }

    // Store group info in Supabase
    const { data: projectGroup, error: dbError } = await supabase
      .from('project_groups')
      .insert({
        project_id: body.projectId,
        keycloak_group_id: keycloakGroupId,
        keycloak_group_name: body.groupName,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing project group in Supabase:', dbError);
      throw new Error('Failed to store project group metadata');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        keycloakGroupId,
        projectGroup 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating project group:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleAddUserToGroup(body: AddUserToGroupRequest, supabase: any) {
  
  try {
    const adminToken = await getKeycloakAdminToken();
    const keycloakBaseUrl = Deno.env.get('KEYCLOAK_BASE_URL');
    const realm = Deno.env.get('KEYCLOAK_REALM') || 'haas';

    // Add user to group in Keycloak
    const addToGroupResponse = await fetch(
      `${keycloakBaseUrl}/admin/realms/${realm}/users/${body.userId}/groups/${body.groupId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!addToGroupResponse.ok) {
      const errorText = await addToGroupResponse.text();
      throw new Error(`Failed to add user to group: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error adding user to group:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}