import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    // Execute SQL directly via Supabase Management API
    const managementUrl = `https://api.supabase.com/v1/projects/egdelmcijszuapcpglsy/database/query`;
    
    const fixPoliciesSQL = `
      -- Drop existing problematic policies if they exist
      DROP POLICY IF EXISTS "Users can upload to their project folders" ON storage.objects;
      DROP POLICY IF EXISTS "Users can view their project files" ON storage.objects;
      DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects;
      DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects;
      DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
      DROP POLICY IF EXISTS "Project members can view files" ON storage.objects;
      DROP POLICY IF EXISTS "Project members can update files" ON storage.objects;
      DROP POLICY IF EXISTS "Project members can delete files" ON storage.objects;
      
      -- Create new comprehensive policies for project-files bucket
      
      -- 1. INSERT policy: Allow both clients and candidates to upload files
      CREATE POLICY "Allow project members to upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'project-files' AND
        (
          -- Client owners can upload to their projects
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          -- Candidates with accepted assignments can upload
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
          OR
          -- Team members can upload
          EXISTS (
            SELECT 1 FROM public.project_teams pt
            JOIN public.profiles p ON p.id = pt.member_id
            WHERE pt.project_id::text = SPLIT_PART(name, '/', 2)
              AND p.id = auth.uid()
          )
        )
      );

      -- 2. SELECT policy: Allow viewing files
      CREATE POLICY "Allow project members to view"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          -- Client owners can view their project files
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          -- Candidates with accepted assignments can view
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
          OR
          -- Team members can view
          EXISTS (
            SELECT 1 FROM public.project_teams pt
            JOIN public.profiles p ON p.id = pt.member_id
            WHERE pt.project_id::text = SPLIT_PART(name, '/', 2)
              AND p.id = auth.uid()
          )
        )
      );

      -- 3. UPDATE policy: Allow updating own files
      CREATE POLICY "Allow project members to update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          -- Client owners can update
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          -- Candidates with accepted assignments can update
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
        )
      );

      -- 4. DELETE policy: Allow deleting own files
      CREATE POLICY "Allow project members to delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        (
          -- Client owners can delete
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
          )
          OR
          -- Candidates with accepted assignments can delete
          EXISTS (
            SELECT 1 FROM public.hr_resource_assignments hra
            JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
            WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
        )
      );

      -- Ensure RLS is enabled
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    `;

    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: fixPoliciesSQL })
    });

    let result;
    const responseText = await response.text();
    
    try {
      result = JSON.parse(responseText);
    } catch {
      // If not JSON, treat as success if status is ok
      if (response.ok) {
        result = { success: true, message: responseText };
      } else {
        throw new Error(`API returned non-JSON response: ${responseText}`);
      }
    }

    if (!response.ok) {
      throw new Error(`Management API error: ${JSON.stringify(result)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Drive RLS policies have been fixed. Candidates can now upload files to their project folders.',
        details: 'Policies updated to allow candidates with accepted assignments to upload, view, update and delete files in their project folders.',
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in apply-drive-rls-fix:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to apply RLS fix. The policies may need to be updated manually.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});