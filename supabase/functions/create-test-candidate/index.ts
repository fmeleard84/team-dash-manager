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

    console.log('🔧 Création du profil candidat de test...')

    // 1. Créer le profil candidat
    const { data: candidateProfile, error: candidateError } = await supabaseClient
      .from('candidate_profiles')
      .insert({
        email: 'fmeleard+ressource_5@gmail.com',
        first_name: 'Meleard R',
        last_name: 'Francis R',
        qualification_status: 'qualified',
        password_hash: ''
      })
      .select()
      .single()

    if (candidateError) {
      console.error('❌ Erreur création candidat:', candidateError)
      return new Response(
        JSON.stringify({ error: 'Failed to create candidate', details: candidateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('✅ Profil candidat créé:', candidateProfile)

    // 2. Vérifier les projets existants
    const { data: existingProjects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('*')
      .limit(5)

    let projectsToUse = existingProjects || []

    // 3. Créer des projets de test si nécessaire
    if (!existingProjects || existingProjects.length === 0) {
      console.log('🔧 Création de projets de test...')
      
      const testProjects = [
        {
          title: 'Développement Site E-commerce',
          description: 'Création d\'un site e-commerce moderne avec React et Node.js',
          status: 'play',
          project_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          client_budget: 5000
        },
        {
          title: 'Refonte Application Mobile',
          description: 'Modernisation d\'une application mobile existante',
          status: 'play',
          project_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          client_budget: 8000
        },
        {
          title: 'API REST Backend',
          description: 'Développement d\'une API REST complète pour startup',
          status: 'play',
          project_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          client_budget: 3500
        }
      ]

      const { data: createdProjects, error: createProjectsError } = await supabaseClient
        .from('projects')
        .insert(testProjects)
        .select()

      if (createProjectsError) {
        console.error('❌ Erreur création projets:', createProjectsError)
      } else {
        console.log('✅ Projets de test créés:', createdProjects)
        projectsToUse = createdProjects
      }
    }

    // 4. Créer des bookings pour le candidat
    if (projectsToUse.length > 0) {
      console.log('📋 Création de bookings...')
      
      const bookings = projectsToUse.slice(0, 3).map(project => ({
        project_id: project.id,
        candidate_id: candidateProfile.id,
        status: 'accepted'
      }))

      const { data: createdBookings, error: bookingsError } = await supabaseClient
        .from('project_bookings')
        .insert(bookings)
        .select()

      if (bookingsError) {
        console.error('❌ Erreur création bookings:', bookingsError)
      } else {
        console.log('✅ Bookings créés:', createdBookings)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidateProfile,
        message: 'Candidat et données de test créés avec succès'
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