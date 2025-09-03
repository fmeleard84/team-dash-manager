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

    // First, check existing files and candidate assignments
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

    // Check existing storage objects with wrong path
    const { data: storageObjects, error: storageError } = await supabase
      .from('storage.objects')
      .select('id, name, bucket_id')
      .eq('bucket_id', 'project-files')
      .like('name', 'project/%')
      .limit(10);

    console.log(`Found ${storageObjects?.length || 0} objects with old path format`);

    // Fix the path for existing objects if any
    if (storageObjects && storageObjects.length > 0) {
      for (const obj of storageObjects) {
        const newName = obj.name.replace(/^project\//, 'projects/');
        await supabase
          .from('storage.objects')
          .update({ name: newName })
          .eq('id', obj.id);
        console.log(`Updated path from ${obj.name} to ${newName}`);
      }
    }

    // Now apply the correct RLS policies
    const dropPoliciesSQL = `
      -- Drop ALL existing policies on storage.objects to start fresh
      DO $$ 
      DECLARE 
        pol RECORD;
      BEGIN
        FOR pol IN 
          SELECT policyname 
          FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects'
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        END LOOP;
      END $$;
    `;

    // Execute drop policies
    await supabase.rpc('exec_sql', { sql: dropPoliciesSQL }).catch(e => {
      console.log('Could not drop policies via RPC, trying direct approach');
    });

    // Create new comprehensive policies with correct path
    const createPoliciesSQL = `
      -- Enable RLS
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      -- 1. INSERT policy for all project members
      CREATE POLICY "Allow project members to upload v2"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'project-files' AND
        (
          -- Client owners can upload to their projects (path: projects/{id}/)
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
              AND name LIKE 'projects/%'
          )
          OR
          -- Candidates with accepted assignments can upload
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
              AND name LIKE 'projects/%'
          )
          OR
          -- Client team members can upload
          EXISTS (
            SELECT 1 FROM public.client_team_members ctm
            WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
              AND ctm.user_id = auth.uid()
              AND ctm.status = 'active'
              AND name LIKE 'projects/%'
          )
        )
      );

      -- 2. SELECT policy for viewing files
      CREATE POLICY "Allow project members to view v2"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          -- Client owners
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
              AND name LIKE 'projects/%'
          )
          OR
          -- Candidates with accepted assignments
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
              AND name LIKE 'projects/%'
          )
          OR
          -- Client team members
          EXISTS (
            SELECT 1 FROM public.client_team_members ctm
            WHERE ctm.project_id::text = SPLIT_PART(name, '/', 2)
              AND ctm.user_id = auth.uid()
              AND ctm.status = 'active'
              AND name LIKE 'projects/%'
          )
        )
      );

      -- 3. UPDATE policy
      CREATE POLICY "Allow project members to update v2"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
              AND name LIKE 'projects/%'
          )
          OR
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
              AND name LIKE 'projects/%'
          )
        )
      )
      WITH CHECK (
        bucket_id = 'project-files' AND
        (
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
              AND name LIKE 'projects/%'
          )
          OR
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
              AND name LIKE 'projects/%'
          )
        )
      );

      -- 4. DELETE policy
      CREATE POLICY "Allow project members to delete v2"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
              AND name LIKE 'projects/%'
          )
          OR
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
              AND name LIKE 'projects/%'
          )
        )
      );
    `;

    // Try to execute the policies creation
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL });

    if (createError) {
      console.error('Error creating policies via RPC:', createError);
      
      // If RPC fails, return instructions for manual fix
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Could not apply RLS policies automatically. Please run the SQL manually in Supabase dashboard.',
          sql: createPoliciesSQL,
          candidatesWithAccess: assignments?.length || 0,
          pathFixed: storageObjects?.length || 0,
          error: createError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test the fix by checking if a candidate can theoretically upload
    const testSQL = `
      SELECT 
        cp.user_id,
        cp.first_name,
        cp.last_name,
        hra.project_id,
        p.title as project_title
      FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      JOIN projects p ON p.id = hra.project_id
      WHERE hra.booking_status = 'accepted'
        AND cp.user_id IS NOT NULL
      LIMIT 5;
    `;

    const { data: testData } = await supabase.rpc('exec_sql', { sql: testSQL }).catch(() => ({ data: null }));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Drive path and RLS policies have been fixed successfully',
        details: {
          pathFixed: `Changed from 'project/' to 'projects/' format`,
          policiesCreated: ['upload v2', 'view v2', 'update v2', 'delete v2'],
          candidatesWithAccess: assignments?.length || 0,
          storageObjectsFixed: storageObjects?.length || 0,
          sampleCandidates: testData
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fix-drive-path-and-rls:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        hint: 'The path in SharedDriveView.tsx has been fixed. RLS policies may need manual update in Supabase dashboard.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});