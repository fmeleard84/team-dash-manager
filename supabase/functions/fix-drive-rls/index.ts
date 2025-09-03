import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check current RLS policies for storage.objects
    const checkPoliciesSQL = `
      SELECT 
        polname as policy_name,
        polcmd as command,
        qual::text as using_expression,
        with_check::text as with_check_expression,
        roles.rolname as role_name
      FROM pg_policy 
      JOIN pg_class ON pg_policy.polrelid = pg_class.oid
      JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
      LEFT JOIN pg_roles roles ON pg_policy.polroles @> ARRAY[roles.oid]
      WHERE pg_namespace.nspname = 'storage' 
        AND pg_class.relname = 'objects'
      ORDER BY polname;
    `;

    const { data: currentPolicies, error: checkError } = await supabase
      .rpc('exec_sql', { sql: checkPoliciesSQL });

    if (checkError) {
      console.error('Error checking policies:', checkError);
    }

    console.log('Current storage.objects policies:', currentPolicies);

    // Create comprehensive RLS policies for storage
    const fixPoliciesSQL = `
      -- Drop existing problematic policies if they exist
      DROP POLICY IF EXISTS "Users can upload to their project folders" ON storage.objects;
      DROP POLICY IF EXISTS "Users can view their project files" ON storage.objects;
      DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects;
      DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects;
      
      -- Create new comprehensive policies for project-files bucket
      
      -- 1. INSERT policy: Allow both clients and candidates to upload files
      CREATE POLICY "Project members can upload files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'project-files' AND
        (
          -- Client owners can upload to their projects
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          -- Candidates with accepted assignments can upload
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
          OR
          -- Team members can upload
          EXISTS (
            SELECT 1 FROM project_teams pt
            JOIN profiles p ON p.id = pt.member_id
            WHERE pt.project_id::text = SPLIT_PART(name, '/', 2)
              AND p.id = auth.uid()
          )
        )
      );

      -- 2. SELECT policy: Allow viewing files
      CREATE POLICY "Project members can view files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          -- Client owners can view their project files
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          -- Candidates with accepted assignments can view
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
          OR
          -- Team members can view
          EXISTS (
            SELECT 1 FROM project_teams pt
            JOIN profiles p ON p.id = pt.member_id
            WHERE pt.project_id::text = SPLIT_PART(name, '/', 2)
              AND p.id = auth.uid()
          )
        )
      );

      -- 3. UPDATE policy: Allow updating own files
      CREATE POLICY "Project members can update files"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          -- Client owners can update
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          -- Candidates with accepted assignments can update
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
        )
      );

      -- 4. DELETE policy: Allow deleting own files
      CREATE POLICY "Project members can delete files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          -- Client owners can delete
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          -- Candidates with accepted assignments can delete
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
        )
      );

      -- Ensure RLS is enabled
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    `;

    const { error: fixError } = await supabase
      .rpc('exec_sql', { sql: fixPoliciesSQL });

    if (fixError) {
      throw fixError;
    }

    // Verify the new policies
    const { data: newPolicies, error: verifyError } = await supabase
      .rpc('exec_sql', { sql: checkPoliciesSQL });

    if (verifyError) {
      console.error('Error verifying policies:', verifyError);
    }

    // Test candidate access
    const testSQL = `
      SELECT 
        COUNT(*) as total_candidates,
        COUNT(DISTINCT hra.project_id) as projects_with_candidates
      FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.booking_status = 'accepted'
        AND cp.user_id IS NOT NULL;
    `;

    const { data: testData } = await supabase
      .rpc('exec_sql', { sql: testSQL });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Drive RLS policies fixed successfully',
        previousPolicies: currentPolicies,
        newPolicies: newPolicies,
        stats: testData?.[0] || {}
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fix-drive-rls:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});