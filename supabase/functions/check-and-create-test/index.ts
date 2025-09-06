import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🔍 Vérification et création du projet TEST...')
    
    // 1. Vérifier si le projet TEST existe déjà
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('*')
      .eq('title', '*** TEST ***')
    
    if (checkError) {
      console.error('Erreur vérification:', checkError)
      throw checkError
    }
    
    console.log(`Projets TEST existants: ${existingProjects?.length || 0}`)
    
    let project = existingProjects?.[0]
    
    // 2. Si pas de projet, le créer
    if (!project) {
      console.log('Création du projet TEST...')
      
      // Récupérer un client
      const { data: clients } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .limit(1)
      
      if (!clients?.length) {
        throw new Error('Aucun client trouvé')
      }
      
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          title: '*** TEST ***',
          description: 'Projet de test pour vérifier le matching candidat',
          status: 'pause',
          project_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          owner_id: clients[0].id,
          client_budget: 50000
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Erreur création projet:', createError)
        throw createError
      }
      
      project = newProject
      console.log(`✅ Projet créé: ${project.id}`)
    }
    
    // 3. Vérifier les ressources du projet
    const { data: resources } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', project.id)
    
    console.log(`Ressources existantes: ${resources?.length || 0}`)
    
    // 4. Si pas de ressource, la créer
    if (!resources || resources.length === 0) {
      console.log('Création de la ressource Chef de projet...')
      
      const { data: newResource, error: resourceError } = await supabase
        .from('hr_resource_assignments')
        .insert({
          project_id: project.id,
          profile_id: '86591b70-f8ba-4d3d-8ff0-8e92ddfd2f3e', // Chef de projet
          booking_status: 'recherche',
          seniority: 'intermediate',
          languages: ['Anglais'],
          expertises: ['Agile'],
          calculated_price: 500
        })
        .select()
        .single()
      
      if (resourceError) {
        console.error('Erreur création ressource:', resourceError)
        throw resourceError
      }
      
      console.log(`✅ Ressource créée: ${newResource.id}`)
    }
    
    // 5. Récupérer toutes les données pour le rapport final
    const { data: finalProject } = await supabase
      .from('projects')
      .select('*, hr_resource_assignments(*)')
      .eq('id', project.id)
      .single()
    
    // 6. Vérifier le candidat
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select(`
        *,
        candidate_languages(*, hr_languages(*)),
        candidate_expertises(*, hr_expertises(*))
      `)
      .eq('email', 'fmeleard+ressource_27_08_cdp@gmail.com')
      .single()
    
    const candidateLanguages = candidate?.candidate_languages?.map(l => l.hr_languages?.name) || []
    const candidateExpertises = candidate?.candidate_expertises?.map(e => e.hr_expertises?.name) || []
    
    // 7. Analyser le matching
    const resource = finalProject?.hr_resource_assignments?.[0]
    const matching = {
      profile: resource?.profile_id === candidate?.profile_id,
      seniority: resource?.seniority === candidate?.seniority,
      status: candidate?.status === 'disponible',
      booking: resource?.booking_status === 'recherche',
      hasLanguages: candidateLanguages.length > 0,
      hasExpertises: candidateExpertises.length > 0,
      languageMatch: resource?.languages?.some(l => candidateLanguages.includes(l)),
      expertiseMatch: resource?.expertises?.some(e => candidateExpertises.includes(e))
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        project: {
          id: finalProject.id,
          title: finalProject.title,
          status: finalProject.status,
          owner_id: finalProject.owner_id
        },
        resource: resource ? {
          id: resource.id,
          profile_id: resource.profile_id,
          booking_status: resource.booking_status,
          seniority: resource.seniority,
          languages: resource.languages,
          expertises: resource.expertises
        } : null,
        candidate: {
          id: candidate?.id,
          profile_id: candidate?.profile_id,
          seniority: candidate?.seniority,
          status: candidate?.status,
          languages: candidateLanguages,
          expertises: candidateExpertises
        },
        matching,
        shouldMatch: matching.profile && matching.seniority && matching.status && 
                    matching.booking && matching.languageMatch && matching.expertiseMatch,
        message: matching.profile && matching.seniority && matching.status && 
                 matching.booking && matching.languageMatch && matching.expertiseMatch ?
                 '✅ Le candidat DEVRAIT voir ce projet!' :
                 '❌ Le candidat ne verra PAS ce projet'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})