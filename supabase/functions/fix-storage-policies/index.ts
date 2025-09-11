import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
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

    // First, let's check the current policies
    const checkPoliciesSql = `
      SELECT 
        polname as policy_name,
        polcmd as command,
        polroles::regrole[] as roles,
        polqual as using_expression,
        polwithcheck as with_check_expression
      FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND polname LIKE '%project%';
    `;

    const { data: existingPolicies, error: checkError } = await supabase
      .rpc('exec_sql', { sql_query: checkPoliciesSql })
      .single();

    console.log('Existing policies:', existingPolicies);

    // Drop existing project-related policies
    const dropPoliciesSql = `
      DO $$ 
      BEGIN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
        DROP POLICY IF EXISTS "Users can view project files" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update project files" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete project files" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated users to upload project files" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated users to view project files" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated users to update project files" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated users to delete project files" ON storage.objects;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `;

    const { error: dropError } = await supabase
      .rpc('exec_sql', { sql_query: dropPoliciesSql })
      .single();

    if (dropError) {
      console.error('Error dropping policies:', dropError);
    }

    // Create new permissive policies for authenticated users
    const createPoliciesSql = `
      -- Allow authenticated users to upload files
      CREATE POLICY "Users can upload project files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'project-files' 
        AND auth.uid() IS NOT NULL
      );

      -- Allow authenticated users to view files
      CREATE POLICY "Users can view project files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'project-files'
        AND auth.uid() IS NOT NULL
      );

      -- Allow authenticated users to update files
      CREATE POLICY "Users can update project files"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'project-files'
        AND auth.uid() IS NOT NULL
      )
      WITH CHECK (
        bucket_id = 'project-files'
        AND auth.uid() IS NOT NULL
      );

      -- Allow authenticated users to delete files
      CREATE POLICY "Users can delete project files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'project-files'
        AND auth.uid() IS NOT NULL
      );
    `;

    const { error: createError } = await supabase
      .rpc('exec_sql', { sql_query: createPoliciesSql })
      .single();

    if (createError) {
      console.error('Error creating policies:', createError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create policies',
          details: createError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Verify the new policies
    const verifyPoliciesSql = `
      SELECT COUNT(*) as policy_count
      FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND polname LIKE 'Users can%project files';
    `;

    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('exec_sql', { sql_query: verifyPoliciesSql })
      .single();

    if (verifyError || !verifyResult || verifyResult.policy_count < 4) {
      return new Response(
        JSON.stringify({ 
          error: 'Policies created but verification failed',
          created: verifyResult?.policy_count || 0,
          expected: 4
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Storage policies fixed successfully',
        policies_created: 4
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in fix-storage-policies:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});