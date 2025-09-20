import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Recherche du projet "IA book" et de ses ressources IA...')

    // 1. Rechercher le projet IA book
    const { data: projects, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, title, status')
      .or('title.ilike.%IA book%, title.ilike.%ia book%')

    if (projectError) {
      console.error('❌ Erreur lors de la recherche de projets:', projectError)
      throw projectError
    }

    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Aucun projet "IA book" trouvé',
        projects: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    console.log(`✅ Trouvé ${projects.length} projet(s) IA book:`, projects)

    // 2. Pour chaque projet, récupérer les ressources et leurs assignations
    const projectDetails = []

    for (const project of projects) {
      console.log(`🔍 Analyse du projet: ${project.title} (${project.id})`)

      // Récupérer les assignations de ressources pour ce projet
      const { data: assignments, error: assignmentError } = await supabaseClient
        .from('hr_resource_assignments')
        .select(`
          id,
          booking_status,
          candidate_id,
          profile_id,
          hr_profiles!inner (
            id,
            name,
            is_ai,
            prompt_id
          )
        `)
        .eq('project_id', project.id)

      if (assignmentError) {
        console.error('❌ Erreur lors de la récupération des assignations:', assignmentError)
        continue
      }

      // Récupérer les profils candidats pour les ressources humaines
      const candidateProfiles = []
      if (assignments) {
        for (const assignment of assignments) {
          if (assignment.candidate_id && !assignment.hr_profiles.is_ai) {
            const { data: candidateProfile } = await supabaseClient
              .from('candidate_profiles')
              .select('id, first_name, last_name, email')
              .eq('id', assignment.candidate_id)
              .single()

            if (candidateProfile) {
              candidateProfiles.push({
                assignmentId: assignment.id,
                candidate: candidateProfile
              })
            }
          }
        }
      }

      projectDetails.push({
        project: project,
        assignments: assignments || [],
        candidateProfiles: candidateProfiles,
        aiResources: assignments?.filter(a => a.hr_profiles.is_ai) || [],
        humanResources: assignments?.filter(a => !a.hr_profiles.is_ai) || []
      })
    }

    // 3. Vérifier la configuration des prompts IA
    const { data: prompts, error: promptError } = await supabaseClient
      .from('prompts_ia')
      .select('id, name, context, active')
      .eq('active', true)

    if (promptError) {
      console.warn('⚠️ Erreur lors de la récupération des prompts IA:', promptError)
    }

    const result = {
      success: true,
      message: `Infrastructure IA analysée pour ${projects.length} projet(s)`,
      data: {
        projects: projectDetails,
        availablePrompts: prompts || [],
        summary: {
          totalProjects: projects.length,
          totalAIResources: projectDetails.reduce((sum, p) => sum + p.aiResources.length, 0),
          totalHumanResources: projectDetails.reduce((sum, p) => sum + p.humanResources.length, 0),
          activePrompts: prompts?.length || 0
        }
      }
    }

    console.log('📊 Résumé de l\'infrastructure IA:', result.data.summary)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erreur générale:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})