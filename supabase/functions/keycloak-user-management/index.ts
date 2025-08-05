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
  console.log(`=== Keycloak User Management Function Called ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Initializing Supabase client...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Parsing request body...');
    const body = await req.json();
    const { action } = body;

    console.log(`Keycloak user management request: ${action}`);
    console.log(`Request body:`, JSON.stringify(body, null, 2));

    // Verify Keycloak environment variables
    const keycloakUrl = Deno.env.get('KEYCLOAK_BASE_URL');
    const keycloakUsername = Deno.env.get('KEYCLOAK_ADMIN_USERNAME');
    const keycloakPassword = Deno.env.get('KEYCLOAK_ADMIN_PASSWORD');
    
    console.log('Keycloak config check:', {
      hasUrl: !!keycloakUrl,
      hasUsername: !!keycloakUsername,
      hasPassword: !!keycloakPassword,
      url: keycloakUrl
    });

    // Add health check endpoint for testing
    if (action === 'health-check') {
      console.log('Health check requested');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Keycloak function is working',
          timestamp: new Date().toISOString(),
          environment: {
            hasKeycloakUrl: !!keycloakUrl,
            hasUsername: !!keycloakUsername,
            hasPassword: !!keycloakPassword
          }
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Add connection test endpoint
    if (action === 'test-connection') {
      console.log('Connection test requested');
      const testResult = await testKeycloakConnection();
      return new Response(
        JSON.stringify(testResult),
        { 
          status: testResult.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    switch (action) {
      case 'create-user':
        const createResult = await handleCreateUser(body, supabase);
        return new Response(
          JSON.stringify(createResult),
          { 
            status: createResult.success ? 200 : 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
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
    console.error('=== FATAL ERROR in Keycloak function ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error.message}`,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getKeycloakAdminToken(): Promise<string> {
  const keycloakBaseUrl = Deno.env.get('KEYCLOAK_BASE_URL');
  const adminUsername = Deno.env.get('KEYCLOAK_ADMIN_USERNAME');
  const adminPassword = Deno.env.get('KEYCLOAK_ADMIN_PASSWORD');
  
  // IMPORTANT: Admin authentication MUST use master realm
  const adminRealm = 'master';

  console.log(`=== Keycloak Admin Token Request ===`);
  console.log(`Keycloak URL: ${keycloakBaseUrl}`);
  console.log(`Admin Realm: ${adminRealm} (fixed for admin API)`);
  console.log(`Username: ${adminUsername}`);
  console.log(`Password length: ${adminPassword?.length || 0} chars`);

  // Validate required environment variables
  if (!keycloakBaseUrl || !adminUsername || !adminPassword) {
    const missingVars = [];
    if (!keycloakBaseUrl) missingVars.push('KEYCLOAK_BASE_URL');
    if (!adminUsername) missingVars.push('KEYCLOAK_ADMIN_USERNAME');
    if (!adminPassword) missingVars.push('KEYCLOAK_ADMIN_PASSWORD');
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }

  const tokenUrl = `${keycloakBaseUrl}/realms/${adminRealm}/protocol/openid-connect/token`;
  console.log(`Token URL: ${tokenUrl}`);
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: adminUsername,
        password: adminPassword,
      }),
    });

    console.log(`Token response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`=== Keycloak Token Error ===`);
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error(`Response body: ${errorText}`);
      
      // Try to parse error for more details
      try {
        const errorData = JSON.parse(errorText);
        console.error(`Error details:`, errorData);
        
        if (errorData.error === 'invalid_grant') {
          throw new Error(`KEYCLOAK AUTH FAILED: Invalid credentials for username '${adminUsername}' in realm '${adminRealm}'. Please verify your KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD secrets.`);
        }
        if (errorData.error === 'unauthorized_client') {
          throw new Error(`KEYCLOAK CLIENT ERROR: The admin-cli client is not configured properly in realm '${adminRealm}'.`);
        }
        if (errorData.error === 'invalid_client') {
          throw new Error(`KEYCLOAK CLIENT ERROR: Invalid client configuration for admin-cli in realm '${adminRealm}'.`);
        }
      } catch (parseError) {
        // Error response is not JSON, use original error
      }
      
      // Provide actionable error message
      if (response.status === 401) {
        throw new Error(`KEYCLOAK UNAUTHORIZED: Please check your admin credentials and ensure the user '${adminUsername}' has admin permissions in realm '${adminRealm}'.`);
      }
      if (response.status === 404) {
        throw new Error(`KEYCLOAK REALM NOT FOUND: Realm '${adminRealm}' does not exist. Please verify KEYCLOAK_BASE_URL is correct.`);
      }
      
      throw new Error(`KEYCLOAK ERROR: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const tokenData = await response.json();
    console.log(`Successfully obtained Keycloak admin token from realm '${adminRealm}'`);
    return tokenData.access_token;
    
  } catch (error) {
    console.error(`=== Keycloak Connection Error ===`);
    console.error(`Error type: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    
    // Add connectivity test suggestion
    if (error.message.includes('fetch')) {
      console.error(`SUGGESTION: Test Keycloak connectivity by visiting: ${keycloakBaseUrl}/realms/${adminRealm}/.well-known/openid_configuration`);
    }
    
    throw error;
  }
}

// Add test function for Keycloak connectivity
async function testKeycloakConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const keycloakBaseUrl = Deno.env.get('KEYCLOAK_BASE_URL');
    const realm = Deno.env.get('KEYCLOAK_REALM') || 'haas';
    
    if (!keycloakBaseUrl) {
      return { success: false, message: 'KEYCLOAK_BASE_URL not configured' };
    }
    
    // Test realm accessibility
    const realmUrl = `${keycloakBaseUrl}/realms/${realm}/.well-known/openid_configuration`;
    console.log(`Testing realm accessibility: ${realmUrl}`);
    
    const response = await fetch(realmUrl);
    if (!response.ok) {
      return { 
        success: false, 
        message: `Realm '${realm}' not accessible: ${response.status} ${response.statusText}`,
        details: { url: realmUrl, status: response.status }
      };
    }
    
    const realmInfo = await response.json();
    console.log(`Realm '${realm}' is accessible`);
    
    // Test admin token
    try {
      await getKeycloakAdminToken();
      return { success: true, message: 'Keycloak connection and authentication successful' };
    } catch (authError) {
      return { 
        success: false, 
        message: `Authentication failed: ${authError.message}`,
        details: { realmAccessible: true, authError: authError.message }
      };
    }
    
  } catch (error) {
    return { 
      success: false, 
      message: `Connection test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// Helper function to set user password
async function setUserPassword(keycloakBaseUrl: string, realm: string, userId: string, password: string, adminToken: string) {
  console.log('Setting password for user:', userId);
  
  const passwordResponse = await fetch(
    `${keycloakBaseUrl}/admin/realms/${realm}/users/${userId}/reset-password`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'password',
        value: password,
        temporary: false,
      }),
    }
  );

  if (!passwordResponse.ok) {
    const errorText = await passwordResponse.text();
    console.error('Failed to set password:', errorText);
    throw new Error(`Failed to set user password: ${errorText}`);
  }
  
  console.log('Password set successfully');
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

    console.log(`Creating user in realm: ${realm}`);
    console.log(`API URL: ${keycloakBaseUrl}/admin/realms/${realm}/users`);
    
    // First, check if user already exists
    console.log('Checking if user already exists...');
    const checkUserResponse = await fetch(
      `${keycloakBaseUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(body.email)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (checkUserResponse.ok) {
      const existingUsers = await checkUserResponse.json();
      if (existingUsers && existingUsers.length > 0) {
        console.log('User already exists:', existingUsers[0]);
        return {
          success: false,
          error: `User with email ${body.email} already exists in Keycloak`
        };
      }
    } else {
      console.log('Failed to check existing users, proceeding with creation...');
    }

    // Create user payload
    const userPayload = {
      username: body.email,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      enabled: true,
      emailVerified: true,
      attributes: {
        phoneNumber: body.phoneNumber ? [body.phoneNumber] : []
      }
    };

    console.log('Creating user with payload:', JSON.stringify(userPayload, null, 2));

    // Create user in Keycloak
    const createUserResponse = await fetch(
      `${keycloakBaseUrl}/admin/realms/${realm}/users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPayload),
      }
    );

    console.log(`Create user response status: ${createUserResponse.status} ${createUserResponse.statusText}`);

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('Keycloak create user error:', errorText);
      
      // Parse the error for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
        
        if (errorJson.errorMessage) {
          return { success: false, error: `Keycloak error: ${errorJson.errorMessage}` };
        }
        if (errorJson.error_description) {
          return { success: false, error: `Keycloak error: ${errorJson.error_description}` };
        }
        if (errorJson.error) {
          return { success: false, error: `Keycloak error: ${errorJson.error}` };
        }
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      
      // Provide specific error messages based on status
      if (createUserResponse.status === 409) {
        return { success: false, error: `User with email ${body.email} already exists` };
      } else if (createUserResponse.status === 400) {
        return { success: false, error: `Invalid user data provided: ${errorText}` };
      } else if (createUserResponse.status === 403) {
        return { success: false, error: `Insufficient permissions to create user` };
      } else {
        return { success: false, error: `Failed to create user in Keycloak (${createUserResponse.status}): ${errorText}` };
      }
    }

    console.log('User created successfully in Keycloak');

    // Get the created user's ID from the Location header
    const locationHeader = createUserResponse.headers.get('Location');
    console.log('Location header:', locationHeader);
    const keycloakUserId = locationHeader?.split('/').pop();

    if (!keycloakUserId) {
      // Try to get user ID by searching for the user
      console.log('No location header, searching for created user...');
      const searchResponse = await fetch(
        `${keycloakBaseUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(body.email)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (searchResponse.ok) {
        const users = await searchResponse.json();
        if (users && users.length > 0) {
          const foundUser = users[0];
          console.log('Found created user:', foundUser);
          const foundUserId = foundUser.id;
          
          // Set password for the found user
          await setUserPassword(keycloakBaseUrl, realm, foundUserId, body.password, adminToken);
          
          return {
            success: true,
            message: 'User created successfully',
            keycloakUserId: foundUserId,
            userDetails: foundUser
          };
        }
      }
      
      return { success: false, error: 'Failed to get Keycloak user ID and could not find created user' };
    }

    console.log('Setting password for user:', keycloakUserId);
    // Set password
    await setUserPassword(keycloakBaseUrl, realm, keycloakUserId, body.password, adminToken);
    
    // Don't try to store in Supabase users table for now - focus on Keycloak only
    console.log('User created successfully in Keycloak with ID:', keycloakUserId);

    return {
      success: true,
      message: 'User created successfully',
      keycloakUserId,
      userDetails: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber
      }
    };
    
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
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