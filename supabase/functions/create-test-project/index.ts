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
    
    console.log('🚀 Création du projet TEST avec ressources...')
    
    // 1. Récupérer un client
    const { data: clients, error: clientError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .limit(1)
    
    if (clientError || !clients?.length) {
      throw new Error('Aucun client trouvé')
    }
    
    const clientId = clients[0].id
    console.log(`✅ Client trouvé: ${clientId}`)
    
    // 2. Créer le projet TEST
    const projectData = {
      title: '*** TEST ***',
      description: 'Projet de test pour vérifier le matching candidat',
      status: 'pause',
      project_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner_id: clientId,
      client_budget: 50000
    }
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()
    
    if (projectError) {
      console.error('❌ Erreur création projet:', projectError)
      throw projectError
    }
    
    console.log(`✅ Projet créé: ${project.id}`)
    
    // 3. Créer une ressource Chef de projet
    const resourceData = {
      project_id: project.id,
      profile_id: '86591b70-f8ba-4d3d-8ff0-8e92ddfd2f3e', // Chef de projet
      booking_status: 'recherche',
      seniority: 'intermediate',
      languages: ['Anglais'],
      expertises: ['Agile'],
      calculated_price: 500
    }
    
    const { data: resource, error: resourceError } = await supabase
      .from('hr_resource_assignments')
      .insert(resourceData)
      .select()
      .single()
    
    if (resourceError) {
      console.error('❌ Erreur création ressource:', resourceError)
      throw resourceError
    }
    
    console.log(`✅ Ressource créée: ${resource.id}`)
    
    // 4. Vérifier le candidat
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*, candidate_languages(*, hr_languages(*)), candidate_expertises(*, hr_expertises(*))')
      .eq('email', 'fmeleard+ressource_27_08_cdp@gmail.com')
      .single()
    
    const candidateLanguages = candidate?.candidate_languages?.map(l => l.hr_languages?.name) || []
    const candidateExpertises = candidate?.candidate_expertises?.map(e => e.hr_expertises?.name) || []
    
    // 5. Vérifier le matching
    const matches = {
      profile: resource.profile_id === candidate?.profile_id,
      seniority: resource.seniority === candidate?.seniority,
      language: resource.languages.some(l => candidateLanguages.includes(l)),
      expertise: resource.expertises.some(e => candidateExpertises.includes(e)),
      status: candidate?.status === 'disponible'
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        project: {
          id: project.id,
          title: project.title,
          status: project.status
        },
        resource: {
          id: resource.id,
          profile_id: resource.profile_id,
          booking_status: resource.booking_status,
          seniority: resource.seniority,
          languages: resource.languages,
          expertises: resource.expertises
        },
        candidate: {
          id: candidate?.id,
          profile_id: candidate?.profile_id,
          seniority: candidate?.seniority,
          languages: candidateLanguages,
          expertises: candidateExpertises,
          status: candidate?.status
        },
        matching: matches,
        shouldMatch: Object.values(matches).every(v => v)
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