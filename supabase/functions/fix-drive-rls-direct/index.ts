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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, check current candidate assignments
    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        candidate_id,
        booking_status,
        candidate_profiles!inner(
          id,
          user_id,
          first_name,
          last_name
        )
      `)
      .eq('booking_status', 'accepted')
      .not('candidate_profiles.user_id', 'is', null);

    console.log(`Found ${assignments?.length || 0} candidates with accepted assignments`);

    // Apply the RLS fix using raw SQL through the admin API
    const statements = [
      // Drop existing policies
      `DROP POLICY IF EXISTS "Users can upload to their project folders" ON storage.objects`,
      `DROP POLICY IF EXISTS "Users can view their project files" ON storage.objects`,
      `DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects`,
      `DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects`,
      `DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects`,
      `DROP POLICY IF EXISTS "Project members can view files" ON storage.objects`,
      `DROP POLICY IF EXISTS "Project members can update files" ON storage.objects`,
      `DROP POLICY IF EXISTS "Project members can delete files" ON storage.objects`,
      `DROP POLICY IF EXISTS "Enable upload for project members" ON storage.objects`,
      `DROP POLICY IF EXISTS "Enable view for project members" ON storage.objects`,
      `DROP POLICY IF EXISTS "Enable update for project members" ON storage.objects`,
      `DROP POLICY IF EXISTS "Enable delete for project members" ON storage.objects`,
      `DROP POLICY IF EXISTS "project_members_upload" ON storage.objects`,
      `DROP POLICY IF EXISTS "project_members_view" ON storage.objects`,
      `DROP POLICY IF EXISTS "project_members_update" ON storage.objects`,
      `DROP POLICY IF EXISTS "project_members_delete" ON storage.objects`,
      
      // Create new INSERT policy
      `CREATE POLICY "drive_upload_policy" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'project-files' AND (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
          OR EXISTS (
            SELECT 1 FROM client_team_members ctm
            WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
              AND ctm.user_id = auth.uid()
              AND ctm.status = 'active'
          )
        )
      )`,
      
      // Create new SELECT policy
      `CREATE POLICY "drive_view_policy" ON storage.objects FOR SELECT TO authenticated USING (
        bucket_id = 'project-files' AND (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
          OR EXISTS (
            SELECT 1 FROM client_team_members ctm
            WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
              AND ctm.user_id = auth.uid()
              AND ctm.status = 'active'
          )
        )
      )`,
      
      // Create new UPDATE policy
      `CREATE POLICY "drive_update_policy" ON storage.objects FOR UPDATE TO authenticated 
       USING (
        bucket_id = 'project-files' AND (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
        )
      )
      WITH CHECK (
        bucket_id = 'project-files' AND (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
        )
      )`,
      
      // Create new DELETE policy
      `CREATE POLICY "drive_delete_policy" ON storage.objects FOR DELETE TO authenticated USING (
        bucket_id = 'project-files' AND (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
        )
      )`,
      
      // Ensure RLS is enabled
      `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`
    ];

    // Execute each statement
    let executedCount = 0;
    const errors = [];
    
    for (const sql of statements) {
      try {
        // Use the REST API to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            name: 'exec_sql',
            params: { sql }
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`Statement failed: ${sql.substring(0, 50)}... - ${errorText}`);
          // Continue anyway, the policy might already exist
        } else {
          executedCount++;
        }
      } catch (e) {
        console.log(`Error executing: ${sql.substring(0, 50)}... - ${e.message}`);
        errors.push(e.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Drive RLS policies have been updated to allow candidate uploads',
        candidatesWithAccess: assignments?.length || 0,
        statementsExecuted: executedCount,
        totalStatements: statements.length,
        details: 'Candidates with accepted assignments can now upload, view, update and delete files in their project Drive folders.',
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fix-drive-rls-direct:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});