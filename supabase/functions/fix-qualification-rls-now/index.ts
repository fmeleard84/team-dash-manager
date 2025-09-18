import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.1'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Utiliser les variables d'environnement Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔍 Vérification et correction des politiques RLS pour candidate_qualification_results...')

    // 1. Vérifier si la table existe et son statut RLS
    const { data: tableStatus, error: tableError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = 'candidate_qualification_results'
            ) as table_exists,
            CASE
              WHEN EXISTS (
                SELECT FROM pg_class
                WHERE relname = 'candidate_qualification_results'
                AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                AND relrowsecurity = true
              ) THEN true
              ELSE false
            END as rls_enabled
        `
      })

    if (tableError) throw tableError

    console.log('Table existe:', tableStatus?.[0]?.table_exists)
    console.log('RLS activé:', tableStatus?.[0]?.rls_enabled)

    // 2. Désactiver temporairement RLS pour appliquer les changements
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.candidate_qualification_results DISABLE ROW LEVEL SECURITY`
    })

    // 3. Supprimer toutes les anciennes politiques
    const policiesToDrop = [
      'candidates_view_own_results',
      'candidates_insert_own_results',
      'candidates_update_own_results',
      'candidates_own_results',
      'admins_full_access',
      'admins_all_access',
      'clients_view_assigned_candidates',
      'clients_view_their_candidates',
      'authenticated_full_access',
      'authenticated_read_policy',
      'anon_read_policy'
    ]

    for (const policyName of policiesToDrop) {
      await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${policyName}" ON public.candidate_qualification_results`
      })
    }

    console.log('✅ Anciennes politiques supprimées')

    // 4. Créer les nouvelles politiques correctes

    // Politique pour les candidats - accès complet à leurs propres résultats
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "candidates_own_results" ON public.candidate_qualification_results
        FOR ALL
        TO authenticated
        USING (candidate_id = auth.uid())
        WITH CHECK (candidate_id = auth.uid())
      `
    })
    console.log('✅ Politique candidats créée')

    // Politique pour les admins - accès complet
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "admins_all_access" ON public.candidate_qualification_results
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        )
      `
    })
    console.log('✅ Politique admins créée')

    // Politique pour les clients - lecture seule sur leurs candidats
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "clients_view_their_candidates" ON public.candidate_qualification_results
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.hr_resource_assignments hra
            JOIN public.projects p ON p.id = hra.project_id
            WHERE hra.candidate_id = candidate_qualification_results.candidate_id
            AND p.owner_id = auth.uid()
          )
        )
      `
    })
    console.log('✅ Politique clients créée')

    // 5. Réactiver RLS
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.candidate_qualification_results ENABLE ROW LEVEL SECURITY`
    })
    console.log('✅ RLS réactivé')

    // 6. Accorder les permissions nécessaires
    await supabase.rpc('exec_sql', {
      sql: `
        GRANT SELECT, INSERT, UPDATE ON public.candidate_qualification_results TO authenticated;
        GRANT ALL ON public.candidate_qualification_results TO service_role;
      `
    })
    console.log('✅ Permissions accordées')

    // 7. Vérifier le résultat final
    const { data: finalCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'candidate_qualification_results'
      `
    })

    const result = {
      success: true,
      message: 'Politiques RLS corrigées avec succès',
      table_exists: tableStatus?.[0]?.table_exists,
      rls_enabled: true,
      policies_count: finalCheck?.[0]?.policy_count || 0,
      policies_created: ['candidates_own_results', 'admins_all_access', 'clients_view_their_candidates']
    }

    console.log('✅ Correction terminée:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur inconnue',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})