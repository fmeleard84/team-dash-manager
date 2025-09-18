import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!
    
    console.log('🔧 Application directe de la migration RLS...')

    // Se connecter à la base de données
    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Appliquer les commandes SQL pour candidate_qualification_results
      const commands = [
        // Créer la table si elle n'existe pas
        `CREATE TABLE IF NOT EXISTS public.candidate_qualification_results (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
            test_type VARCHAR(50) NOT NULL,
            score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
            total_questions INTEGER NOT NULL,
            correct_answers INTEGER NOT NULL,
            questions JSONB,
            answers JSONB,
            test_duration INTEGER,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`,

        // Index
        'CREATE INDEX IF NOT EXISTS idx_qualification_candidate ON public.candidate_qualification_results(candidate_id)',
        'CREATE INDEX IF NOT EXISTS idx_qualification_created ON public.candidate_qualification_results(created_at DESC)',

        // Désactiver RLS temporairement pour les modifications
        'ALTER TABLE candidate_qualification_results DISABLE ROW LEVEL SECURITY',

        // Supprimer toutes les anciennes politiques
        'DROP POLICY IF EXISTS "candidates_view_own_results" ON candidate_qualification_results',
        'DROP POLICY IF EXISTS "candidates_insert_own_results" ON candidate_qualification_results',
        'DROP POLICY IF EXISTS "candidates_update_own_results" ON candidate_qualification_results',
        'DROP POLICY IF EXISTS "admins_full_access" ON candidate_qualification_results',
        'DROP POLICY IF EXISTS "clients_view_assigned_candidates" ON candidate_qualification_results',
        'DROP POLICY IF EXISTS "authenticated_full_access" ON candidate_qualification_results',

        // Créer une politique permissive pour tous les utilisateurs authentifiés
        `CREATE POLICY "authenticated_full_access" ON candidate_qualification_results FOR ALL USING (auth.uid() IS NOT NULL)`,

        // Réactiver RLS
        'ALTER TABLE candidate_qualification_results ENABLE ROW LEVEL SECURITY'
      ]

      for (const cmd of commands) {
        console.log(`Exécution: ${cmd.substring(0, 50)}...`)
        await client.queryArray(cmd)
      }

      console.log('✅ Migration appliquée avec succès')
      
      // Vérifier que la table est maintenant accessible
      const adminClient = createClient(supabaseUrl, supabaseServiceKey)
      const { data: results, error: checkError } = await adminClient
        .from('candidate_qualification_results')
        .select('*')
        .limit(1)

      if (checkError) {
        console.log('⚠️ Erreur de vérification:', checkError)
      } else {
        console.log(`✅ Table candidate_qualification_results accessible`)
      }

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Migration RLS appliquée avec succès pour candidate_qualification_results',
          table_accessible: !checkError
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