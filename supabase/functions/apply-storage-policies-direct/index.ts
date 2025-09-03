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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Utiliser le Management API pour gérer les politiques
    const projectRef = 'egdelmcijszuapcpglsy';
    const managementToken = 'sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e';
    
    // 1. D'abord, obtenir la liste des politiques existantes
    const getPoliciesUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/postgres/policies`;
    
    const policiesResponse = await fetch(getPoliciesUrl, {
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json',
      }
    });

    const existingPolicies = await policiesResponse.json();
    console.log('Existing policies:', existingPolicies);

    // 2. Supprimer les anciennes politiques storage.objects
    const policiesToDelete = [];
    if (Array.isArray(existingPolicies)) {
      for (const policy of existingPolicies) {
        if (policy.schema === 'storage' && policy.table === 'objects') {
          policiesToDelete.push(policy);
        }
      }
    }

    for (const policy of policiesToDelete) {
      const deleteUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/postgres/policies`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: `${policy.schema}.${policy.table}.${policy.name}`
        })
      });
      console.log(`Deleted policy ${policy.name}: ${deleteResponse.status}`);
    }

    // 3. Créer les nouvelles politiques directement via SQL
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Créer d'abord la fonction helper
    const createFunctionSQL = `
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
        
        RETURN false;
      END;
      $$;
    `;

    // Exécuter via le client admin pour avoir les permissions
    const { data: funcResult, error: funcError } = await supabase
      .rpc('exec_sql', { sql: createFunctionSQL })
      .single();

    // 4. Créer les politiques directement
    const policies = [
      {
        name: "storage_allow_upload",
        command: "INSERT",
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND public.user_has_project_access(((split_part(name, '/'::text, 2))::uuid)))`
      },
      {
        name: "storage_allow_view",
        command: "SELECT", 
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND public.user_has_project_access(((split_part(name, '/'::text, 2))::uuid)))`
      },
      {
        name: "storage_allow_update",
        command: "UPDATE",
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND public.user_has_project_access(((split_part(name, '/'::text, 2))::uuid)))`,
        check: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND public.user_has_project_access(((split_part(name, '/'::text, 2))::uuid)))`
      },
      {
        name: "storage_allow_delete",
        command: "DELETE",
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND public.user_has_project_access(((split_part(name, '/'::text, 2))::uuid)))`
      }
    ];

    const createdPolicies = [];
    const failedPolicies = [];

    for (const policy of policies) {
      let sql = '';
      
      if (policy.command === 'INSERT') {
        sql = `
          CREATE POLICY "${policy.name}"
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (${policy.definition});
        `;
      } else if (policy.command === 'SELECT') {
        sql = `
          CREATE POLICY "${policy.name}"
          ON storage.objects FOR SELECT
          TO authenticated
          USING (${policy.definition});
        `;
      } else if (policy.command === 'UPDATE') {
        sql = `
          CREATE POLICY "${policy.name}"
          ON storage.objects FOR UPDATE
          TO authenticated
          USING (${policy.definition})
          WITH CHECK (${policy.check});
        `;
      } else if (policy.command === 'DELETE') {
        sql = `
          CREATE POLICY "${policy.name}"
          ON storage.objects FOR DELETE
          TO authenticated
          USING (${policy.definition});
        `;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          failedPolicies.push({ name: policy.name, error: error.message });
          
          // Essayer une version alternative plus simple
          const simpleSql = `
            CREATE POLICY "${policy.name}_simple"
            ON storage.objects FOR ${policy.command}
            TO authenticated
            ${policy.command === 'INSERT' ? 'WITH CHECK' : 'USING'} (
              bucket_id = 'project-files' AND 
              name LIKE 'projects/%' AND
              (
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
          
          await supabase.rpc('exec_sql', { sql: simpleSql });
          createdPolicies.push(policy.name + '_simple');
        } else {
          createdPolicies.push(policy.name);
        }
      } catch (e) {
        failedPolicies.push({ name: policy.name, error: e.message });
      }
    }

    // 5. Vérifier les politiques créées
    const { data: finalPolicies } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tentative d\'application des politiques RLS',
        deletedPolicies: policiesToDelete.map(p => p.name),
        createdPolicies,
        failedPolicies,
        currentPolicies: finalPolicies,
        nextSteps: failedPolicies.length > 0 ? [
          'Certaines politiques n\'ont pas pu être créées automatiquement.',
          'Allez dans le Dashboard Supabase > SQL Editor',
          'Exécutez le script apply-storage-policies-manual.sql'
        ] : ['Les politiques ont été appliquées. Testez l\'upload maintenant.']
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
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