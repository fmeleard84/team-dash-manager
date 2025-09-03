import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create admin client
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

    console.log('Starting RLS fix for candidate storage...');

    // 1. Check current booking_status values
    const { data: statusCheck, error: statusError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select('booking_status')
      .not('booking_status', 'is', null);

    if (statusError) throw statusError;

    const statusCounts = statusCheck.reduce((acc: any, curr: any) => {
      acc[curr.booking_status] = (acc[curr.booking_status] || 0) + 1;
      return acc;
    }, {});

    console.log('Current booking_status distribution:', statusCounts);

    // 2. Drop existing policies
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "Candidats can upload to accepted projects" ON storage.objects;
      DROP POLICY IF EXISTS "Candidats can view files in accepted projects" ON storage.objects;
      DROP POLICY IF EXISTS "Candidats can update their own files" ON storage.objects;
      DROP POLICY IF EXISTS "Candidats can delete their own files" ON storage.objects;
    `;

    const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
      sql: dropPoliciesSQL
    });

    if (dropError) {
      console.log('Note: Policies might not exist, continuing...');
    }

    // 3. Create new policies that accept both 'accepted' AND 'booké'
    const createPoliciesSQL = `
      -- Upload policy
      CREATE POLICY "Candidats can upload to accepted projects" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
          bucket_id = 'project-files'
          AND (name LIKE 'projects/%')
          AND EXISTS (
              SELECT 1 FROM hr_resource_assignments hra
              JOIN candidate_profiles cp ON cp.id = hra.candidate_id
              WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
                  AND cp.user_id = auth.uid()
                  AND hra.booking_status IN ('accepted', 'booké')
          )
      );

      -- View policy
      CREATE POLICY "Candidats can view files in accepted projects" ON storage.objects
      FOR SELECT TO authenticated
      USING (
          bucket_id = 'project-files'
          AND (name LIKE 'projects/%')
          AND EXISTS (
              SELECT 1 FROM hr_resource_assignments hra
              JOIN candidate_profiles cp ON cp.id = hra.candidate_id
              WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
                  AND cp.user_id = auth.uid()
                  AND hra.booking_status IN ('accepted', 'booké')
          )
      );

      -- Update policy
      CREATE POLICY "Candidats can update their own files" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
          bucket_id = 'project-files'
          AND (name LIKE 'projects/%')
          AND EXISTS (
              SELECT 1 FROM hr_resource_assignments hra
              JOIN candidate_profiles cp ON cp.id = hra.candidate_id
              WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
                  AND cp.user_id = auth.uid()
                  AND hra.booking_status IN ('accepted', 'booké')
          )
      );

      -- Delete policy
      CREATE POLICY "Candidats can delete their own files" ON storage.objects
      FOR DELETE TO authenticated
      USING (
          bucket_id = 'project-files'
          AND (name LIKE 'projects/%')
          AND EXISTS (
              SELECT 1 FROM hr_resource_assignments hra
              JOIN candidate_profiles cp ON cp.id = hra.candidate_id
              WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
                  AND cp.user_id = auth.uid()
                  AND hra.booking_status IN ('accepted', 'booké')
          )
      );
    `;

    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      sql: createPoliciesSQL
    });

    if (createError) throw createError;

    // 4. Optional: Standardize all 'booké' to 'accepted' for consistency
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .update({ booking_status: 'accepted' })
      .eq('booking_status', 'booké')
      .select();

    let updatedCount = 0;
    if (!updateError && updateData) {
      updatedCount = updateData.length;
      console.log(`Standardized ${updatedCount} records from 'booké' to 'accepted'`);
    }

    // 5. Verify the fix by checking a specific project
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status,
        candidate_id,
        candidate_profiles!inner(
          first_name,
          last_name,
          user_id
        )
      `)
      .eq('project_id', 'd7dff6ec-5019-40ab-a00f-8bac8806eca7');

    console.log('Project assignments after fix:', verifyData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policies updated successfully',
        statusDistribution: statusCounts,
        standardizedRecords: updatedCount,
        projectAssignments: verifyData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error fixing RLS:', error);
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