import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔧 Applying storage RLS fix...');

    // First, let's check the current situation
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select('booking_status')
      .in('booking_status', ['accepted', 'booké']);

    if (checkError) throw checkError;
    
    const counts = {
      accepted: checkData.filter(d => d.booking_status === 'accepted').length,
      booke: checkData.filter(d => d.booking_status === 'booké').length
    };

    console.log('Current booking_status distribution:', counts);

    // The SQL to fix the policies - needs to be run with service role
    const fixSQL = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "project_members_upload" ON storage.objects;
      DROP POLICY IF EXISTS "project_members_view" ON storage.objects;
      DROP POLICY IF EXISTS "project_members_update" ON storage.objects;
      DROP POLICY IF EXISTS "project_members_delete" ON storage.objects;
      
      -- Create new policies that accept both 'accepted' and 'booké'
      CREATE POLICY "project_members_upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'project-files' AND
        name LIKE 'projects/%' AND
        (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status IN ('accepted', 'booké')
          )
        )
      );

      CREATE POLICY "project_members_view"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        name LIKE 'projects/%' AND
        (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status IN ('accepted', 'booké')
          )
        )
      );

      CREATE POLICY "project_members_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        name LIKE 'projects/%' AND
        (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status IN ('accepted', 'booké')
          )
        )
      )
      WITH CHECK (
        bucket_id = 'project-files' AND
        name LIKE 'projects/%' AND
        (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status IN ('accepted', 'booké')
          )
        )
      );

      CREATE POLICY "project_members_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        name LIKE 'projects/%' AND
        (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            JOIN candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status IN ('accepted', 'booké')
          )
        )
      );
    `;

    // Execute the SQL using service role permissions
    const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { sql: fixSQL });
    
    if (sqlError) {
      console.error('SQL execution error:', sqlError);
      throw sqlError;
    }

    // Verify the fix
    const { data: policies, error: polError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE 'project_members_%'
      `
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage RLS policies updated successfully',
        booking_status_counts: counts,
        policies_created: policies
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});