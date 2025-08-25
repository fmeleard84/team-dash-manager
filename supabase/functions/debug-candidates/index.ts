import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Debug candidats avec service role...')

    // 1. Lister tous les candidats
    const { data: allCandidates, error: candidatesError } = await supabaseClient
      .from('candidate_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (candidatesError) {
      console.error('❌ Erreur candidats:', candidatesError)
    } else {
      console.log('📊 Tous les candidats:', allCandidates)
    }

    // 2. Chercher le candidat spécifique
    const { data: specificCandidate, error: specificError } = await supabaseClient
      .from('candidate_profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .maybeSingle()

    if (specificError) {
      console.error('❌ Erreur candidat spécifique:', specificError)
    } else {
      console.log('👤 Candidat spécifique:', specificCandidate)
    }

    // 3. Vérifier les projets
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('*')
      .limit(5)

    if (projectsError) {
      console.error('❌ Erreur projets:', projectsError)
    } else {
      console.log('📁 Projets:', projects)
    }

    // 4. Vérifier les bookings si candidat trouvé
    if (specificCandidate) {
      const { data: bookings, error: bookingsError } = await supabaseClient
        .from('project_bookings')
        .select(`
          *,
          projects (*)
        `)
        .eq('candidate_id', specificCandidate.id)

      if (bookingsError) {
        console.error('❌ Erreur bookings:', bookingsError)
      } else {
        console.log('📋 Bookings:', bookings)
      }

      // 5. Vérifier les assignments disponibles pour ce candidat
      const { data: assignments, error: assignmentsError } = await supabaseClient
        .from('hr_resource_assignments')
        .select(`
          *,
          projects (*),
          hr_profiles (name)
        `)
        .eq('profile_id', specificCandidate.profile_id)
        .is('candidate_id', null)
        .eq('booking_status', 'pending')

      if (assignmentsError) {
        console.error('❌ Erreur assignments candidat:', assignmentsError)
      } else {
        console.log('📊 Assignments disponibles pour ce candidat:', assignments)
      }
    }

    return new Response(
      JSON.stringify({
        allCandidates,
        specificCandidate,
        projects,
        message: 'Debug terminé'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})