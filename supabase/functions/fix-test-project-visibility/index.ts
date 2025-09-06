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
    
    console.log('🔧 Correction de la visibilité du projet TEST...')
    
    // 1. Récupérer le projet TEST
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('title', '*** TEST ***')
    
    if (projectError || !projects?.length) {
      throw new Error('Projet TEST non trouvé')
    }
    
    const project = projects[0]
    console.log(`✅ Projet trouvé: ${project.id}`)
    
    // 2. Récupérer les ressources du projet
    const { data: resources, error: resourceError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', project.id)
    
    console.log(`📊 Ressources trouvées: ${resources?.length || 0}`)
    
    // 3. Récupérer le candidat CDP avec ses langues et expertises
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_27_08_cdp@gmail.com')
      .single()
    
    if (!candidate) {
      throw new Error('Candidat non trouvé')
    }
    
    console.log(`✅ Candidat trouvé: ${candidate.id}`)
    
    // 4. Récupérer les langues du candidat
    const { data: candidateLangs } = await supabase
      .from('candidate_languages')
      .select('*, hr_languages(*)')
      .eq('candidate_id', candidate.id)
    
    const languages = candidateLangs?.map(l => l.hr_languages?.name) || []
    console.log(`📚 Langues du candidat: ${JSON.stringify(languages)}`)
    
    // 5. Récupérer les expertises du candidat
    const { data: candidateExps } = await supabase
      .from('candidate_expertises')
      .select('*, hr_expertises(*)')
      .eq('candidate_id', candidate.id)
    
    const expertises = candidateExps?.map(e => e.hr_expertises?.name) || []
    console.log(`🎯 Expertises du candidat: ${JSON.stringify(expertises)}`)
    
    // 6. Analyser le matching pour chaque ressource
    const matchingResults = []
    
    for (const resource of resources || []) {
      const matching = {
        resource_id: resource.id,
        profile: resource.profile_id === candidate.profile_id,
        seniority: resource.seniority === candidate.seniority,
        status: candidate.status === 'disponible',
        booking: resource.booking_status === 'recherche',
        languages: !resource.languages?.length || 
                  resource.languages.every(l => languages.includes(l)),
        expertises: !resource.expertises?.length || 
                   resource.expertises.every(e => expertises.includes(e))
      }
      
      const shouldMatch = matching.profile && matching.seniority && 
                         matching.status && matching.booking && 
                         matching.languages && matching.expertises
      
      matchingResults.push({
        resource,
        matching,
        shouldMatch
      })
      
      console.log(`\n📋 Ressource ${resource.id}:`)
      console.log(`   - Profile: ${matching.profile ? '✅' : '❌'}`)
      console.log(`   - Seniority: ${matching.seniority ? '✅' : '❌'}`)
      console.log(`   - Status: ${matching.status ? '✅' : '❌'}`)
      console.log(`   - Booking: ${matching.booking ? '✅' : '❌'}`)
      console.log(`   - Languages: ${matching.languages ? '✅' : '❌'}`)
      console.log(`   - Expertises: ${matching.expertises ? '✅' : '❌'}`)
      console.log(`   => ${shouldMatch ? '✅ MATCH!' : '❌ PAS DE MATCH'}`)
    }
    
    // 7. Vérifier pourquoi le projet n'est pas visible
    // Test avec ANON key pour simuler la vue candidat
    const anonClient = createClient(
      supabaseUrl,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
    )
    
    const { data: visibleProjects, error: visibilityError } = await anonClient
      .from('projects')
      .select('*')
      .eq('title', '*** TEST ***')
    
    const { data: visibleResources, error: resourceVisError } = await anonClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('booking_status', 'recherche')
    
    return new Response(
      JSON.stringify({
        success: true,
        project: {
          id: project.id,
          title: project.title,
          status: project.status,
          owner_id: project.owner_id,
          visible_with_anon: visibleProjects?.length > 0
        },
        resources: {
          total: resources?.length || 0,
          visible_with_anon: visibleResources?.length || 0,
          details: resources
        },
        candidate: {
          id: candidate.id,
          profile_id: candidate.profile_id,
          seniority: candidate.seniority,
          status: candidate.status,
          languages,
          expertises
        },
        matching: matchingResults,
        visibility_issues: {
          project_not_visible: !visibleProjects?.length,
          resources_not_visible: !visibleResources?.length,
          project_error: visibilityError?.message,
          resource_error: resourceVisError?.message
        },
        recommendation: visibleProjects?.length === 0 || visibleResources?.length === 0 ?
          "⚠️ Le projet ou les ressources ne sont pas visibles avec ANON key. Problème RLS!" :
          "✅ Le projet et les ressources sont visibles"
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