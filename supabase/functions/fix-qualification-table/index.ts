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
    const dbUrl = 'postgresql://postgres.egdelmcijszuapcpglsy:Raymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

    console.log('🔧 Désactivation complète de RLS sur candidate_qualification_results...')

    // Se connecter directement à la base de données
    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // D'abord, vérifier si la table existe
      const checkTable = await client.queryObject`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'candidate_qualification_results'
        ) as table_exists
      `

      const tableExists = checkTable.rows[0]?.table_exists

      if (!tableExists) {
        console.log('La table n\'existe pas, création...')

        // Créer la table
        await client.queryArray`
          CREATE TABLE public.candidate_qualification_results (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
              test_type VARCHAR(50),
              score INTEGER CHECK (score >= 0 AND score <= 100),
              total_questions INTEGER,
              correct_answers INTEGER,
              questions JSONB,
              answers JSONB,
              test_duration INTEGER,
              completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `

        console.log('✅ Table créée')
      }

      // Désactiver complètement RLS
      await client.queryArray`ALTER TABLE public.candidate_qualification_results DISABLE ROW LEVEL SECURITY`
      console.log('✅ RLS désactivé')

      // Supprimer toutes les politiques existantes
      const policies = await client.queryObject`
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'candidate_qualification_results'
      `

      for (const policy of policies.rows) {
        await client.queryArray`DROP POLICY IF EXISTS ${policy.policyname} ON public.candidate_qualification_results`
        console.log(`✅ Politique supprimée: ${policy.policyname}`)
      }

      // Accorder tous les privilèges aux utilisateurs
      await client.queryArray`GRANT ALL ON public.candidate_qualification_results TO anon, authenticated, service_role`
      console.log('✅ Privilèges accordés')

      // Vérifier que la table est accessible
      const testQuery = await client.queryArray`SELECT COUNT(*) FROM public.candidate_qualification_results`
      console.log(`✅ Table accessible, ${testQuery.rows[0][0]} enregistrements`)

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'RLS complètement désactivé sur candidate_qualification_results',
          tableExists: true,
          rlsDisabled: true
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
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})