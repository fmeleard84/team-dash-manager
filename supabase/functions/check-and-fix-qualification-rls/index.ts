import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Vérification et correction des politiques RLS pour candidate_qualification_results...')

    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client({
      user: 'postgres.egdelmcijszuapcpglsy',
      password: 'R@ymonde7510_2a',
      database: 'postgres',
      hostname: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 6543,
    })
    await client.connect()

    try {
      // 1. Vérifier si la table existe
      const tableCheck = await client.queryObject`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'candidate_qualification_results'
        ) as table_exists
      `

      if (!tableCheck.rows[0]?.table_exists) {
        console.log('❌ La table n\'existe pas, création...')

        // Créer la table avec la structure correcte
        await client.queryArray`
          CREATE TABLE public.candidate_qualification_results (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
              test_type VARCHAR(50) NOT NULL DEFAULT 'qualification',
              score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
              total_questions INTEGER NOT NULL DEFAULT 0,
              correct_answers INTEGER NOT NULL DEFAULT 0,
              questions JSONB DEFAULT '[]'::jsonb,
              answers JSONB DEFAULT '[]'::jsonb,
              test_duration INTEGER,
              completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `

        // Créer les index
        await client.queryArray`
          CREATE INDEX idx_qualification_candidate ON public.candidate_qualification_results(candidate_id);
          CREATE INDEX idx_qualification_created ON public.candidate_qualification_results(created_at DESC);
        `

        console.log('✅ Table créée avec succès')
      } else {
        console.log('✅ La table existe déjà')
      }

      // 2. Vérifier le statut de RLS
      const rlsCheck = await client.queryObject`
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = 'candidate_qualification_results'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `

      console.log('Statut RLS actuel:', rlsCheck.rows[0]?.relrowsecurity ? 'Activé' : 'Désactivé')

      // 3. Vérifier les politiques existantes
      const existingPolicies = await client.queryObject`
        SELECT policyname, cmd, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'candidate_qualification_results'
      `

      console.log(`Politiques existantes: ${existingPolicies.rows.length}`)
      for (const policy of existingPolicies.rows) {
        console.log(`  - ${policy.policyname} (${policy.cmd})`)
      }

      // 4. Recréer les politiques proprement
      console.log('🔧 Recréation des politiques RLS...')

      // Désactiver RLS temporairement
      await client.queryArray`ALTER TABLE public.candidate_qualification_results DISABLE ROW LEVEL SECURITY`

      // Supprimer toutes les anciennes politiques
      const policiesToDrop = [
        'candidates_view_own_results',
        'candidates_insert_own_results',
        'candidates_update_own_results',
        'admins_full_access',
        'clients_view_assigned_candidates',
        'authenticated_full_access',
        'authenticated_read_policy',
        'anon_read_policy'
      ]

      for (const policyName of policiesToDrop) {
        await client.queryArray`DROP POLICY IF EXISTS ${policyName} ON public.candidate_qualification_results`
      }

      // Créer les nouvelles politiques correctes
      console.log('Création de la politique pour les candidats...')
      await client.queryArray`
        CREATE POLICY candidates_own_results ON public.candidate_qualification_results
        FOR ALL
        TO authenticated
        USING (candidate_id = auth.uid())
        WITH CHECK (candidate_id = auth.uid())
      `

      console.log('Création de la politique pour les admins...')
      await client.queryArray`
        CREATE POLICY admins_all_access ON public.candidate_qualification_results
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

      console.log('Création de la politique pour les clients (lecture seule)...')
      await client.queryArray`
        CREATE POLICY clients_view_their_candidates ON public.candidate_qualification_results
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

      // Réactiver RLS
      await client.queryArray`ALTER TABLE public.candidate_qualification_results ENABLE ROW LEVEL SECURITY`
      console.log('✅ RLS réactivé avec les nouvelles politiques')

      // 5. Accorder les permissions nécessaires
      await client.queryArray`
        GRANT SELECT, INSERT, UPDATE ON public.candidate_qualification_results TO authenticated;
        GRANT ALL ON public.candidate_qualification_results TO service_role;
      `
      console.log('✅ Permissions accordées')

      // 6. Test final - vérifier que les politiques fonctionnent
      const finalCheck = await client.queryObject`
        SELECT COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'candidate_qualification_results'
      `

      console.log(`✅ ${finalCheck.rows[0]?.policy_count} politiques actives`)

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Politiques RLS corrigées avec succès',
          policies_count: finalCheck.rows[0]?.policy_count || 0,
          rls_enabled: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } catch (error) {
      await client.end()
      throw error
    }
  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})