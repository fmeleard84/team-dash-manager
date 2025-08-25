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

    console.log('🔍 Investigation nouveau projet "dir marketing new"')
    
    // 1. Chercher le projet par nom
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('*')
      .ilike('title', '%dir marketing new%')
      
    console.log('📋 Projets trouvés avec "dir marketing new":', projects?.length || 0)
    if (projects && projects.length > 0) {
      projects.forEach(p => {
        console.log(`  - ${p.title} | Status: ${p.status} | ID: ${p.id} | Date: ${p.created_at}`)
      })
    }
    
    // 2. Chercher tous les projets récents (dernières 24h)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: recentProjects, error: recentError } = await supabaseClient
      .from('projects')
      .select('id, title, status, created_at, user_id')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      
    console.log('📅 Projets créés dans les dernières 24h:', recentProjects?.length || 0)
    if (recentProjects && recentProjects.length > 0) {
      recentProjects.forEach(p => {
        console.log(`  - "${p.title}" | Status: ${p.status} | ID: ${p.id} | Créé: ${p.created_at}`)
      })
    }
    
    // 3. Si on trouve le projet, vérifier s'il a des assignments
    let targetProject = null
    if (projects && projects.length > 0) {
      targetProject = projects[0]
    } else if (recentProjects && recentProjects.length > 0) {
      // Prendre le plus récent qui pourrait être "dir marketing new"
      targetProject = recentProjects.find(p => 
        p.title.toLowerCase().includes('marketing') || 
        p.title.toLowerCase().includes('dir')
      ) || recentProjects[0]
    }
    
    let assignmentInfo = null
    if (targetProject) {
      console.log(`🎯 Analyse du projet: "${targetProject.title}" (${targetProject.id})`)
      
      // Vérifier s'il y a des assignments pour ce projet
      const { data: assignments, error: assignmentsError } = await supabaseClient
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          booking_status,
          languages,
          expertises,
          seniority,
          hr_profiles(name)
        `)
        .eq('project_id', targetProject.id)
        
      console.log('📝 Assignments pour ce projet:', assignments?.length || 0)
      if (assignments && assignments.length > 0) {
        assignments.forEach(a => {
          console.log(`  - Profile: ${a.hr_profiles?.name} | Status: ${a.booking_status} | Langues: ${a.languages?.join(', ')} | Expertises: ${a.expertises?.join(', ')}`)
        })
      } else {
        console.log('❌ Aucun assignment trouvé pour ce projet')
        console.log('➡️ C\'est pourquoi il n\'apparaît pas dans le dashboard candidat')
      }
      
      assignmentInfo = {
        projectId: targetProject.id,
        assignmentsCount: assignments?.length || 0,
        assignments: assignments || []
      }
    }
    
    // 4. Vérifier le profil candidat
    const marketingProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37'
    const { data: candidateInfo, error: candidateError } = await supabaseClient
      .from('candidate_profiles')
      .select('id, email, profile_id, qualification_status')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .single()
      
    console.log('👤 Info candidat:', candidateInfo)

    return new Response(
      JSON.stringify({
        success: true,
        searchResults: projects || [],
        recentProjects: recentProjects || [],
        targetProject: targetProject,
        assignmentInfo: assignmentInfo,
        candidateInfo: candidateInfo,
        message: 'Investigation terminée'
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