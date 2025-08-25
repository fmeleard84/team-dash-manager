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

    console.log('🔧 Création d\'assignments pour les projets existants...')

    // 1. Récupérer les projets actifs
    const { data: activeProjects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('status', 'play')

    if (projectsError) {
      console.error('❌ Erreur projets:', projectsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch projects', details: projectsError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('📊 Projets actifs trouvés:', activeProjects?.length)

    // 2. Récupérer les profils métiers disponibles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('hr_profiles')
      .select('*')

    if (profilesError) {
      console.error('❌ Erreur profils:', profilesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles', details: profilesError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('👔 Profils métiers trouvés:', profiles?.length)

    // 3. Créer des assignments logiques
    const assignmentsToCreate = []

    for (const project of activeProjects || []) {
      // Pour chaque projet, créer des assignments selon le type
      
      if (project.title.toLowerCase().includes('marketing') || 
          project.title.toLowerCase().includes('mkt') ||
          project.description?.toLowerCase().includes('marketing')) {
        
        // Projet marketing -> besoin directeur marketing
        const marketingProfile = profiles?.find(p => p.name.toLowerCase().includes('marketing'))
        if (marketingProfile) {
          assignmentsToCreate.push({
            project_id: project.id,
            profile_id: marketingProfile.id,
            booking_status: 'pending'
          })
          console.log(`📋 Assignment marketing créé pour "${project.title}"`)
        }
      }
      
      if (project.title.toLowerCase().includes('site') || 
          project.title.toLowerCase().includes('web') ||
          project.title.toLowerCase().includes('dev')) {
        
        // Projet développement -> besoin développeur
        const devProfile = profiles?.find(p => p.name.toLowerCase().includes('développeur') || p.name.toLowerCase().includes('full'))
        if (devProfile) {
          assignmentsToCreate.push({
            project_id: project.id,
            profile_id: devProfile.id,
            booking_status: 'pending'
          })
          console.log(`📋 Assignment développeur créé pour "${project.title}"`)
        }
      }
      
      // Pour tous les projets, on peut aussi avoir besoin d'un chef de projet
      const pmProfile = profiles?.find(p => p.name.toLowerCase().includes('chef') || p.name.toLowerCase().includes('project'))
      if (pmProfile) {
        assignmentsToCreate.push({
          project_id: project.id,
          profile_id: pmProfile.id,
          booking_status: 'pending'
        })
        console.log(`📋 Assignment chef de projet créé pour "${project.title}"`)
      }
    }

    // 4. Insérer les assignments
    if (assignmentsToCreate.length > 0) {
      const { data: createdAssignments, error: createError } = await supabaseClient
        .from('hr_resource_assignments')
        .insert(assignmentsToCreate)
        .select()

      if (createError) {
        console.error('❌ Erreur création assignments:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create assignments', details: createError }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log('✅ Assignments créés:', createdAssignments?.length)

      return new Response(
        JSON.stringify({
          success: true,
          assignmentsCreated: createdAssignments?.length,
          assignments: createdAssignments,
          message: 'Assignments créés avec succès'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          assignmentsCreated: 0,
          message: 'Aucun assignment à créer'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('💥 Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})