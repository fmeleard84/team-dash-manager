import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('🔧 Correction des relations candidate_languages et candidate_expertises...')

    // 1. Vérifier la structure actuelle
    const { data: languagesCheck } = await supabaseAdmin
      .from('candidate_languages')
      .select('candidate_id')
      .limit(1)
    
    const { data: expertisesCheck } = await supabaseAdmin
      .from('candidate_expertises')
      .select('candidate_id')
      .limit(1)
    
    console.log('Structure vérifiée')

    // 2. Trouver les candidats avec des IDs non unifiés
    const { data: candidateProfiles } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id, email')
    
    if (!candidateProfiles) {
      throw new Error('Impossible de récupérer les profils candidats')
    }

    // 3. Pour chaque candidat, vérifier si ses langues/expertises sont correctement liées
    let migratedLanguages = 0
    let migratedExpertises = 0
    
    for (const profile of candidateProfiles) {
      // Vérifier les langues
      const { data: languages } = await supabaseAdmin
        .from('candidate_languages')
        .select('*')
        .eq('candidate_id', profile.id)
      
      if (!languages || languages.length === 0) {
        // Chercher avec l'ancien ID possible (basé sur l'email)
        const { data: authUser } = await supabaseAdmin.auth.admin.listUsers()
        const user = authUser?.users?.find(u => u.email === profile.email)
        
        if (user && user.id !== profile.id) {
          console.log(`Migration nécessaire pour ${profile.email}: ${profile.id} -> ${user.id}`)
          
          // Migrer les langues
          const { error: langError } = await supabaseAdmin
            .from('candidate_languages')
            .update({ candidate_id: user.id })
            .eq('candidate_id', profile.id)
          
          if (!langError) {
            migratedLanguages++
          }
          
          // Migrer les expertises
          const { error: expError } = await supabaseAdmin
            .from('candidate_expertises')
            .update({ candidate_id: user.id })
            .eq('candidate_id', profile.id)
          
          if (!expError) {
            migratedExpertises++
          }
        }
      }
    }

    // 4. Vérifier les orphelins (enregistrements sans profil correspondant)
    const { data: orphanedLanguages } = await supabaseAdmin.rpc('count_orphaned_languages')
    const { data: orphanedExpertises } = await supabaseAdmin.rpc('count_orphaned_expertises')

    // 5. Créer les fonctions RPC si elles n'existent pas
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION count_orphaned_languages()
          RETURNS bigint
          LANGUAGE sql
          SECURITY DEFINER
          AS $$
            SELECT COUNT(*)
            FROM candidate_languages cl
            LEFT JOIN candidate_profiles cp ON cp.id = cl.candidate_id
            WHERE cp.id IS NULL;
          $$;
          
          CREATE OR REPLACE FUNCTION count_orphaned_expertises()
          RETURNS bigint
          LANGUAGE sql
          SECURITY DEFINER
          AS $$
            SELECT COUNT(*)
            FROM candidate_expertises ce
            LEFT JOIN candidate_profiles cp ON cp.id = ce.candidate_id
            WHERE cp.id IS NULL;
          $$;
        `
      })
    } catch (e) {
      // Ignorer si les fonctions existent déjà
    }

    // 6. Résultat final
    const { data: finalStats } = await supabaseAdmin.rpc('get_candidate_relations_stats')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Relations corrigées',
        migratedLanguages,
        migratedExpertises,
        orphanedLanguages: orphanedLanguages || 0,
        orphanedExpertises: orphanedExpertises || 0,
        stats: finalStats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Helper function pour créer la fonction de stats
async function createStatsFunction(supabase: any) {
  try {
    await supabase.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_candidate_relations_stats()
        RETURNS json
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT json_build_object(
            'languages', (
              SELECT json_build_object(
                'total', COUNT(*),
                'unique_candidates', COUNT(DISTINCT candidate_id)
              )
              FROM candidate_languages
            ),
            'expertises', (
              SELECT json_build_object(
                'total', COUNT(*),
                'unique_candidates', COUNT(DISTINCT candidate_id)
              )
              FROM candidate_expertises
            )
          );
        $$;
      `
    })
  } catch (e) {
    // Ignorer si existe
  }
}