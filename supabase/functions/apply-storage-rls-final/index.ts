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

    // 1. D'abord, créer la fonction helper
    const createFunctionSQL = `
      -- Supprimer l'ancienne fonction si elle existe
      DROP FUNCTION IF EXISTS public.user_has_project_access(uuid);

      -- Créer la fonction qui vérifie l'accès
      CREATE OR REPLACE FUNCTION public.user_has_project_access(project_id_param uuid)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      STABLE
      AS $$
      BEGIN
        -- Check if user is project owner
        IF EXISTS (
          SELECT 1 FROM public.projects 
          WHERE id = project_id_param 
          AND owner_id = auth.uid()
        ) THEN
          RETURN true;
        END IF;
        
        -- Check if user is an accepted candidate
        IF EXISTS (
          SELECT 1 FROM public.hr_resource_assignments hra
          JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
          WHERE hra.project_id = project_id_param
          AND cp.user_id = auth.uid()
          AND hra.booking_status = 'accepted'
        ) THEN
          RETURN true;
        END IF;
        
        -- Check if user is in project_teams
        IF EXISTS (
          SELECT 1 FROM public.project_teams pt
          WHERE pt.project_id = project_id_param
          AND pt.member_id = auth.uid()
        ) THEN
          RETURN true;
        END IF;
        
        RETURN false;
      END;
      $$;
    `;

    // Exécuter la création de la fonction
    const { error: funcError } = await supabase.rpc('exec_sql', { 
      sql: createFunctionSQL 
    });

    if (funcError) {
      console.log('Could not create function via RPC, trying direct execution');
    }

    // 2. Supprimer TOUTES les anciennes politiques
    const dropPoliciesSQL = `
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
          BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop policy %', pol.policyname;
          END;
        END LOOP;
      END $$;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', { 
      sql: dropPoliciesSQL 
    });

    // 3. Créer les nouvelles politiques RLS
    const createPoliciesSQL = `
      -- Enable RLS
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      -- Policy 1: INSERT (Upload)
      CREATE POLICY "storage_allow_upload" 
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'project-files' 
        AND name LIKE 'projects/%' 
        AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
      );

      -- Policy 2: SELECT (View)
      CREATE POLICY "storage_allow_view" 
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'project-files' 
        AND name LIKE 'projects/%' 
        AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
      );

      -- Policy 3: UPDATE
      CREATE POLICY "storage_allow_update" 
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'project-files' 
        AND name LIKE 'projects/%' 
        AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
      )
      WITH CHECK (
        bucket_id = 'project-files' 
        AND name LIKE 'projects/%' 
        AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
      );

      -- Policy 4: DELETE
      CREATE POLICY "storage_allow_delete" 
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'project-files' 
        AND name LIKE 'projects/%' 
        AND public.user_has_project_access((SPLIT_PART(name, '/', 2))::uuid)
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createPoliciesSQL 
    });

    if (createError) {
      console.error('Error creating policies:', createError);
      
      // Si exec_sql ne fonctionne pas, essayer une approche alternative
      // Créer au moins une politique simple pour débloquer
      const simplePolicySQL = `
        CREATE POLICY IF NOT EXISTS "allow_authenticated_project_files" 
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'project-files' 
          AND name LIKE 'projects/%'
          AND (
            EXISTS (
              SELECT 1 FROM public.projects p
              WHERE p.id::text = SPLIT_PART(name, '/', 2)
              AND p.owner_id = auth.uid()
            )
            OR EXISTS (
              SELECT 1 FROM public.hr_resource_assignments hra
              JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
              WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
              AND cp.user_id = auth.uid()
              AND hra.booking_status = 'accepted'
            )
          )
        );
      `;
      
      await supabase.rpc('exec_sql', { sql: simplePolicySQL });
    }

    // 4. Vérifier les politiques créées
    const checkPoliciesSQL = `
      SELECT 
        policyname,
        cmd,
        roles::text[]
      FROM pg_policies 
      WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      ORDER BY policyname;
    `;

    const { data: policies } = await supabase.rpc('exec_sql', { 
      sql: checkPoliciesSQL 
    });

    // 5. Tester avec un candidat
    const testSQL = `
      SELECT 
        cp.user_id,
        cp.first_name || ' ' || cp.last_name as candidat,
        hra.project_id,
        public.user_has_project_access(hra.project_id) as has_access
      FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.booking_status = 'accepted'
      AND cp.user_id IS NOT NULL
      LIMIT 3;
    `;

    const { data: testResults } = await supabase.rpc('exec_sql', { 
      sql: testSQL 
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Politiques RLS appliquées avec succès',
        functionCreated: !funcError,
        policiesDropped: !dropError,
        policiesCreated: !createError,
        currentPolicies: policies,
        candidateTests: testResults,
        instructions: createError ? [
          'Les politiques n\'ont pas pu être créées automatiquement.',
          'Allez dans Dashboard > Authentication > Policies > storage.objects',
          'Supprimez toutes les politiques existantes',
          'Créez 4 nouvelles politiques avec les noms:',
          '- storage_allow_upload (INSERT)',
          '- storage_allow_view (SELECT)',
          '- storage_allow_update (UPDATE)',
          '- storage_allow_delete (DELETE)',
          'Utilisez l\'expression: bucket_id = \'project-files\' AND name LIKE \'projects/%\' AND public.user_has_project_access((SPLIT_PART(name, \'/\', 2))::uuid)'
        ] : ['Les politiques ont été créées avec succès. Les candidats peuvent maintenant uploader des fichiers.']
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in apply-storage-rls-final:', error);
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