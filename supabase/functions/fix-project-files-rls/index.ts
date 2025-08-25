import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Applying project_files RLS policies...');

    // Enable RLS on project_files if not already enabled
    await supabase.rpc('execute_sql', {
      query: 'ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;'
    });

    // Drop existing policies if they exist
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Candidates can view files for their assigned projects" ON project_files;',
      'DROP POLICY IF EXISTS "Clients can view files for their projects" ON project_files;',
      'DROP POLICY IF EXISTS "Authenticated users can upload project files" ON project_files;',
      'DROP POLICY IF EXISTS "Users can manage their uploaded files" ON project_files;'
    ];

    for (const query of dropPolicies) {
      await supabase.rpc('execute_sql', { query });
    }

    // Policy for candidates to see files for projects they have accepted assignments on
    await supabase.rpc('execute_sql', {
      query: `
        CREATE POLICY "Candidates can view files for their assigned projects" ON project_files
          FOR SELECT 
          USING (
            auth.role() = 'authenticated' AND
            EXISTS (
              SELECT 1 FROM hr_resource_assignments hra
              JOIN candidate_profiles cp ON (
                hra.profile_id = cp.profile_id AND 
                hra.seniority = cp.seniority AND
                cp.keycloak_user_id = auth.jwt() ->> 'sub'
              )
              WHERE hra.project_id = project_files.project_id
              AND hra.booking_status = 'accepted'
            )
          );
      `
    });

    // Policy for clients to see files for their own projects
    await supabase.rpc('execute_sql', {
      query: `
        CREATE POLICY "Clients can view files for their projects" ON project_files
          FOR SELECT 
          USING (
            auth.role() = 'authenticated' AND
            EXISTS (
              SELECT 1 FROM projects p
              JOIN client_profiles cp ON (
                p.client_id = cp.id AND
                cp.keycloak_user_id = auth.jwt() ->> 'sub'
              )
              WHERE p.id = project_files.project_id
            )
          );
      `
    });

    // Policy for authenticated users to upload files
    await supabase.rpc('execute_sql', {
      query: `
        CREATE POLICY "Authenticated users can upload project files" ON project_files
          FOR INSERT 
          WITH CHECK (
            auth.role() = 'authenticated'
          );
      `
    });

    // Policy for file owners to update/delete their files
    await supabase.rpc('execute_sql', {
      query: `
        CREATE POLICY "Users can manage their uploaded files" ON project_files
          FOR ALL 
          USING (
            auth.role() = 'authenticated' AND
            uploaded_by = auth.jwt() ->> 'sub'
          );
      `
    });

    console.log('✅ Project files RLS policies applied successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Project files RLS policies applied successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error applying RLS policies:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})