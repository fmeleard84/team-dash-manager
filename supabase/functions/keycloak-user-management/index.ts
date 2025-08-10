import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-keycloak-sub, x-keycloak-email',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  password: string;
  profileType?: string;
  companyName?: string;
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
    const actionRaw = body?.action as string | undefined;

    // Normalize/alias some actions for backward-compatibility
    const aliasMap: Record<string, string> = {
      'ping': 'health-check',
      'create_project_group': 'create-project-group',
      'createProjectGroup': 'create-project-group',
      'create-project-groups': 'create-project-group', // plural variant (see guidance below)
    };
    const action = (actionRaw && aliasMap[actionRaw]) ? aliasMap[actionRaw] : actionRaw;

    console.log(`Keycloak user management request: ${action} (raw: ${actionRaw})`);
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
      case 'create-user': {
        const createResult = await handleCreateUser(body, supabase);
        return new Response(
          JSON.stringify(createResult),
          { 
            status: createResult.success ? 200 : 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      case 'add-user-to-group':
        return await handleAddUserToGroup(body, supabase);
      case 'create-project-group':
        return await handleCreateProjectGroup(body, supabase);
      // Deprecated/unsupported bulk alias with different payload shape
      case 'create_project_groups':
      case 'create-project-groups': {
        const supported = ['health-check','test-connection','create-user','add-user-to-group','create-project-group'];
        const examples = {
          'health-check': { action: 'health-check' },
          'test-connection': { action: 'test-connection' },
          'create-project-group': { action: 'create-project-group', projectId: 'uuid-project', groupName: 'project-slug-client' },
        };
        return new Response(
          JSON.stringify({
            error: 'Invalid payload for bulk group creation. Use "create-project-group" and call it per group (client, ressource).',
            supported,
            examples,
            note: 'Expected body for create-project-group: { projectId, groupName }',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      default: {
        const supported = ['health-check','test-connection','create-user','add-user-to-group','create-project-group'];
        const examples = {
          'health-check': { action: 'health-check' },
          'test-connection': { action: 'test-connection' },
          'create-project-group': { action: 'create-project-group', projectId: 'uuid-project', groupName: 'project-slug-client' },
        };
        return new Response(
          JSON.stringify({ error: 'Invalid action', supported, examples }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
  const adminRealm = Deno.env.get('KEYCLOAK_ADMIN_REALM') || Deno.env.get('KEYCLOAK_REALM') || 'haas';
  const clientId = Deno.env.get('KEYCLOAK_CLIENT_ID') || 'svc-supabase-admin';
  const clientSecret = Deno.env.get('KEYCLOAK_CLIENT_SECRET');
  
  // Fallback to username/password if no client secret provided
  const adminUsername = Deno.env.get('KEYCLOAK_ADMIN_USERNAME');
  const adminPassword = Deno.env.get('KEYCLOAK_ADMIN_PASSWORD');

  console.log(`=== Keycloak Admin Token Request ===`);
  console.log(`Environment Variables Check:`);
  console.log(`- KEYCLOAK_BASE_URL: ${keycloakBaseUrl || 'NOT SET'}`);
  console.log(`- KEYCLOAK_ADMIN_REALM: ${adminRealm}`);
  console.log(`- KEYCLOAK_CLIENT_ID: ${clientId}`);
  console.log(`- KEYCLOAK_CLIENT_SECRET: ${clientSecret ? 'SET (length: ' + clientSecret.length + ')' : 'NOT SET'}`);
  console.log(`- KEYCLOAK_ADMIN_USERNAME: ${adminUsername || 'NOT SET'}`);
  console.log(`- KEYCLOAK_ADMIN_PASSWORD: ${adminPassword ? 'SET' : 'NOT SET'}`);

  if (!keycloakBaseUrl) {
    throw new Error('Missing KEYCLOAK_BASE_URL environment variable');
  }

  const tokenUrl = `${keycloakBaseUrl}/realms/${adminRealm}/protocol/openid-connect/token`;
  console.log(`Token URL: ${tokenUrl}`);

  let authParams: URLSearchParams;
  
  // For service account client (svc-supabase-admin), use client_credentials
  if (clientId === 'svc-supabase-admin' && clientSecret) {
    console.log('Using client_credentials grant type for service account');
    authParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });
  } else if (clientSecret) {
    console.log('Using client_credentials grant type with client secret');
    authParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });
  } else if (adminUsername && adminPassword) {
    console.log('Using password grant type with admin credentials');
    authParams = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: adminUsername,
      password: adminPassword,
    });
  } else {
    throw new Error('Either KEYCLOAK_CLIENT_SECRET or both KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD must be provided');
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: authParams,
  });

  console.log(`Token response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`=== Keycloak Token Error ===`);
    console.error(`Status: ${response.status} ${response.statusText}`);
    console.error(`Response body: ${errorText}`);
    console.error(`Token URL used: ${tokenUrl}`);
    console.error(`Client ID used: ${clientId}`);
    console.error(`Grant type: ${authParams.get('grant_type')}`);
    console.error(`SUGGESTION: Check credentials and realm accessibility: ${keycloakBaseUrl}/realms/${adminRealm}/.well-known/openid_configuration`);
    
    // Return the actual Keycloak error instead of 500
    throw new Error(`Keycloak auth failed (${response.status}): ${errorText}`);
  }

  const tokenData = await response.json();
  console.log(`Successfully obtained Keycloak admin token from realm '${adminRealm}'`);
  return tokenData.access_token as string;

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
    phoneNumber: body.phoneNumber,
    profileType: body.profileType
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
    
    // Assign user to appropriate group
    if (body.profileType) {
      console.log(`Assigning user to ${body.profileType} group...`);
      const groupAssigned = await assignUserToGroup(adminToken, keycloakUserId, body.profileType);
      if (!groupAssigned.success) {
        console.warn('Failed to assign user to group:', groupAssigned.error);
        // Don't fail the whole process if group assignment fails
      }
    }
    
    // Store profile in appropriate table
    console.log('Storing user profile...');
    let profileStored = { success: false, error: 'Unknown error' };
    
    if (body.profileType === 'client') {
      profileStored = await storeClientProfile({
        keycloakUserId,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
        companyName: body.companyName
      });
    } else {
      profileStored = await storeCandidateProfile({
        keycloakUserId,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber
      });
    }

    if (!profileStored.success) {
      console.error('Failed to store user profile:', profileStored.error);
      return {
        success: false,
        error: profileStored.error || 'Failed to store user profile'
      };
    }

    console.log('User created successfully in Keycloak with ID:', keycloakUserId);

    return {
      success: true,
      message: 'User created successfully',
      keycloakUserId,
      userDetails: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
        profileType: body.profileType
      }
    };
    
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
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

interface StoreProfileParams {
  keycloakUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  companyName?: string;
}

async function createGroupIfNotExists(token: string, groupName: string): Promise<{ success: boolean; groupId?: string; error?: string; status?: number }> {
  try {
    const keycloakBaseUrl = Deno.env.get('KEYCLOAK_BASE_URL');
    const realm = Deno.env.get('KEYCLOAK_REALM') || 'haas';

    const listUrl = `${keycloakBaseUrl}/admin/realms/${realm}/groups`;
    // Check if group exists
    const groupsResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const groupsText = await groupsResponse.text();
    console.log('LIST groups status', groupsResponse.status, groupsResponse.statusText, groupsText);

    if (!groupsResponse.ok) {
      return { success: false, error: `Failed to fetch groups (${groupsResponse.status}): ${groupsText}`, status: groupsResponse.status };
    }

    let groups: any[] = [];
    try {
      groups = JSON.parse(groupsText);
    } catch (e) {
      console.error('Failed to parse groups list JSON:', e);
      return { success: false, error: 'Failed to parse groups list response', status: 500 };
    }

    const existingGroup = groups.find((group: any) => group.name === groupName);

    if (existingGroup) {
      console.log(`Group ${groupName} already exists with ID: ${existingGroup.id}`);
      return { success: true, groupId: existingGroup.id };
    }

    // Create the group
    const createUrl = `${keycloakBaseUrl}/admin/realms/${realm}/groups`;
    console.log(`Creating group: ${groupName}`);
    const createGroupResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: groupName }),
    });

    const createText = await createGroupResponse.text();
    console.log('CREATE group status', createGroupResponse.status, createGroupResponse.statusText, createText);

    if (!createGroupResponse.ok) {
      return { success: false, error: `Failed to create group (${createGroupResponse.status}): ${createText}`, status: createGroupResponse.status };
    }

    // Get the created group ID from the location header
    const locationHeader = createGroupResponse.headers.get('location');
    if (locationHeader) {
      const groupId = locationHeader.split('/').pop();
      console.log(`Group ${groupName} created with ID: ${groupId}`);
      return { success: true, groupId: groupId! };
    }

    // If no location header, fetch the group again to get its ID
    const newGroupsResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (newGroupsResponse.ok) {
      const newGroups = await newGroupsResponse.json();
      const newGroup = newGroups.find((group: any) => group.name === groupName);
      if (newGroup) {
        return { success: true, groupId: newGroup.id };
      }
    }

    return { success: false, error: 'Failed to get group ID after creation', status: 500 };
  } catch (error) {
    console.error(`Failed to create group ${groupName}: ${error.message}`);
    return { success: false, error: `Failed to create group: ${error.message}`, status: 500 };
  }
}

async function assignUserToGroup(token: string, userId: string, profileType: string): Promise<{ success: boolean; error?: string }> {
  try {
    const keycloakBaseUrl = Deno.env.get('KEYCLOAK_BASE_URL');
    const realm = Deno.env.get('KEYCLOAK_REALM') || 'haas';

    // Ensure the group exists, create if it doesn't
    const groupResult = await createGroupIfNotExists(token, profileType);
    if (!groupResult.success || !groupResult.groupId) {
      console.error(`Failed to ensure group ${profileType} exists:`, groupResult.error);
      return { success: false, error: groupResult.error || 'Failed to create group' };
    }

    // Assign user to group
    const assignResponse = await fetch(`${keycloakBaseUrl}/admin/realms/${realm}/users/${userId}/groups/${groupResult.groupId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!assignResponse.ok) {
      const errorText = await assignResponse.text();
      console.error('Failed to assign user to group:', errorText);
      return { success: false, error: 'Failed to assign user to group' };
    }

    console.log(`User assigned to ${profileType} group successfully`);
    return { success: true };

  } catch (error) {
    console.error('Error assigning user to group:', error);
    return { success: false, error: `Failed to assign user to group: ${error.message}` };
  }
}

async function storeCandidateProfile(params: StoreProfileParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { keycloakUserId, email, firstName, lastName, phoneNumber } = params;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/rest/v1/candidate_profiles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        keycloak_user_id: keycloakUserId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phoneNumber,
        profile_type: 'resource',
        password_hash: 'managed_by_keycloak'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to store candidate profile:', errorText);
      return { success: false, error: `Failed to store profile: ${errorText}` };
    }

    console.log('Candidate profile stored successfully');
    return { success: true };

  } catch (error) {
    console.error('Error storing candidate profile:', error);
    return { success: false, error: `Failed to store profile: ${error.message}` };
  }
}

async function storeClientProfile(params: StoreProfileParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { keycloakUserId, email, firstName, lastName, phoneNumber, companyName } = params;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/rest/v1/client_profiles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        keycloak_user_id: keycloakUserId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phoneNumber,
        company_name: companyName,
        user_id: crypto.randomUUID()
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to store client profile:', errorText);
      return { success: false, error: `Failed to store profile: ${errorText}` };
    }

    console.log('Client profile stored successfully');
    return { success: true };

  } catch (error) {
    console.error('Error storing client profile:', error);
    return { success: false, error: `Failed to store profile: ${error.message}` };
  }
}

async function handleCreateProjectGroup(body: CreateProjectGroupRequest, supabase: any) {
  console.log('Creating project group:', body);
  
  try {
    // Get admin token
    const adminToken = await getKeycloakAdminToken();
    
    // Create the group in Keycloak
    const groupResult = await createGroupIfNotExists(adminToken, body.groupName);
    
    if (!groupResult.success || !groupResult.groupId) {
      console.error('createGroupIfNotExists failed', groupResult);
      return new Response(
        JSON.stringify({ success: false, error: groupResult.error || 'Failed to create project group' }),
        { status: groupResult.status ?? 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the project group mapping in Supabase
    const { data: existingGroup } = await supabase
      .from('project_groups')
      .select('id')
      .eq('project_id', body.projectId)
      .eq('keycloak_group_id', groupResult.groupId)
      .maybeSingle();

    if (!existingGroup) {
      const { error: insertError } = await supabase
        .from('project_groups')
        .insert({
          project_id: body.projectId,
          keycloak_group_id: groupResult.groupId,
          keycloak_group_name: body.groupName
        });

      if (insertError) {
        console.error('Failed to store project group mapping:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to store project group mapping' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Project group created successfully: ${body.groupName} (${groupResult.groupId})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        groupId: groupResult.groupId,
        groupName: body.groupName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating project group:', error);
    // Try to extract a status code from known Keycloak error pattern
    let status = 500;
    const match = /Keycloak auth failed \((\d{3})\)/.exec(error.message || '');
    if (match) {
      status = parseInt(match[1], 10);
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
