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

    console.log('🔧 Correction de la jointure hr_resource_assignments -> candidate_profiles...')

    // 1. Vérifier la structure actuelle
    const { data: assignments, error: checkError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select('*')
      .limit(1)

    if (checkError) {
      throw new Error(`Erreur vérification: ${checkError.message}`)
    }

    console.log('Structure actuelle:', assignments?.[0] ? Object.keys(assignments[0]) : 'Table vide')

    // 2. Vérifier si on peut faire la jointure directement
    const { data: testJoin, error: joinError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        candidate_id,
        booking_status,
        candidate_profiles!candidate_id (
          first_name,
          last_name,
          daily_rate
        )
      `)
      .limit(1)

    if (joinError) {
      console.log('❌ Jointure échoue:', joinError.message)
      
      // Essayer une jointure alternative
      const { data: altJoin, error: altError } = await supabaseAdmin
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          candidate_id,
          booking_status
        `)
        .limit(1)
      
      if (!altError) {
        console.log('✅ Requête sans jointure fonctionne')
        console.log('Données:', altJoin)
      }
    } else {
      console.log('✅ Jointure réussie:', testJoin)
    }

    // 3. Vérifier les politiques RLS
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id, first_name, last_name')
      .limit(1)

    if (profilesError) {
      console.log('❌ Erreur accès candidate_profiles:', profilesError.message)
    } else {
      console.log('✅ Accès candidate_profiles OK')
    }

    // 4. Récupérer toutes les ressources en recherche
    const { data: searchingResources, error: searchError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select('*')
      .eq('booking_status', 'recherche')

    console.log(`📊 Ressources en recherche: ${searchingResources?.length || 0}`)
    if (searchingResources && searchingResources.length > 0) {
      console.log('Exemple:', {
        id: searchingResources[0].id,
        profile_id: searchingResources[0].profile_id,
        candidate_id: searchingResources[0].candidate_id,
        booking_status: searchingResources[0].booking_status
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Analyse terminée',
        structure: assignments?.[0] ? Object.keys(assignments[0]) : [],
        joinWorks: !joinError,
        resourcesInSearch: searchingResources?.length || 0,
        sampleResource: searchingResources?.[0] || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})