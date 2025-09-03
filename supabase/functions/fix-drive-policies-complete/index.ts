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

    // 1. D'abord, vérifier qu'il y a bien des candidats avec des projets acceptés
    const { data: candidates, error: candidatesError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status,
        candidate_profiles!inner(
          id,
          user_id,
          first_name,
          last_name
        ),
        projects!inner(
          id,
          title
        )
      `)
      .eq('booking_status', 'accepted')
      .not('candidate_profiles.user_id', 'is', null)
      .limit(5);

    if (candidatesError) {
      throw new Error(`Failed to fetch candidates: ${candidatesError.message}`);
    }

    console.log(`Found ${candidates?.length || 0} candidates with accepted projects`);

    // 2. Vérifier les politiques existantes
    const checkPoliciesQuery = `
      SELECT 
        policyname,
        cmd,
        roles::text[]
      FROM pg_policies 
      WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      ORDER BY policyname;
    `;

    const { data: existingPolicies, error: policiesError } = await supabase
      .rpc('exec_sql', { sql: checkPoliciesQuery })
      .single();

    let policiesInfo = [];
    if (!policiesError && existingPolicies) {
      policiesInfo = existingPolicies;
    }

    // 3. Créer une politique de test temporaire très permissive
    const testPolicySQL = `
      -- Créer une politique temporaire très permissive pour tester
      DO $$ 
      BEGIN
        -- Essayer de créer la politique, ignorer si elle existe déjà
        BEGIN
          CREATE POLICY "temp_allow_authenticated_upload" 
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = 'project-files' AND 
            name LIKE 'projects/%'
          );
        EXCEPTION WHEN duplicate_object THEN
          NULL; -- Ignorer si la politique existe déjà
        END;
      END $$;
    `;

    const { error: testPolicyError } = await supabase
      .rpc('exec_sql', { sql: testPolicySQL })
      .single();

    // 4. Tester si un candidat spécifique peut uploader
    let testResult = null;
    if (candidates && candidates.length > 0) {
      const testCandidate = candidates[0];
      const testPath = `projects/${testCandidate.project_id}/test_${Date.now()}.txt`;
      
      // Essayer de créer un fichier test
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(testPath, 'test content', {
          contentType: 'text/plain',
          upsert: false
        });

      testResult = {
        candidate: testCandidate.candidate_profiles.first_name + ' ' + testCandidate.candidate_profiles.last_name,
        project: testCandidate.projects.title,
        path: testPath,
        uploadSuccess: !uploadError,
        error: uploadError?.message
      };

      // Nettoyer le fichier test si créé
      if (!uploadError) {
        await supabase.storage
          .from('project-files')
          .remove([testPath]);
      }
    }

    // 5. Obtenir des informations de diagnostic
    const diagnosticSQL = `
      SELECT 
        'Total storage objects' as metric,
        COUNT(*) as value
      FROM storage.objects
      WHERE bucket_id = 'project-files'
      UNION ALL
      SELECT 
        'Objects with projects/ path',
        COUNT(*)
      FROM storage.objects
      WHERE bucket_id = 'project-files'
      AND name LIKE 'projects/%'
      UNION ALL
      SELECT 
        'Objects with old project/ path',
        COUNT(*)
      FROM storage.objects
      WHERE bucket_id = 'project-files'
      AND name LIKE 'project/%';
    `;

    const { data: diagnostics } = await supabase
      .rpc('exec_sql', { sql: diagnosticSQL })
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Diagnostic complet du système Drive',
        candidates: {
          count: candidates?.length || 0,
          sample: candidates?.slice(0, 3).map(c => ({
            name: `${c.candidate_profiles.first_name} ${c.candidate_profiles.last_name}`,
            project: c.projects.title,
            project_id: c.project_id,
            user_id: c.candidate_profiles.user_id
          }))
        },
        policies: {
          existing: policiesInfo,
          temporaryPolicyCreated: !testPolicyError
        },
        uploadTest: testResult,
        storage: diagnostics,
        recommendations: [
          '1. Allez dans Dashboard > Authentication > Policies',
          '2. Cherchez storage.objects',
          '3. Supprimez toutes les anciennes politiques',
          '4. Créez la politique "temp_allow_authenticated_upload" avec:',
          '   - Target roles: authenticated',
          '   - WITH CHECK: bucket_id = \'project-files\' AND name LIKE \'projects/%\'',
          '5. Testez si les candidats peuvent uploader',
          '6. Une fois que ça marche, affinez les restrictions'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fix-drive-policies-complete:', error);
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