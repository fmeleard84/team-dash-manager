import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { projectId } = await req.json()
    
    console.log(`🔧 Correction du statut de booking pour le projet: ${projectId}`)
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Récupérer toutes les ressources du projet
    const { data: resources, error: resourcesError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId)
    
    if (resourcesError) {
      throw new Error(`Erreur récupération ressources: ${resourcesError.message}`)
    }
    
    console.log(`📊 ${resources?.length || 0} ressource(s) trouvée(s)`)
    
    if (!resources || resources.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Aucune ressource trouvée pour ce projet'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // 2. Analyser les ressources
    const analysis = {
      total: resources.length,
      draft: resources.filter(r => r.booking_status === 'draft').length,
      recherche: resources.filter(r => r.booking_status === 'recherche').length,
      accepted: resources.filter(r => r.booking_status === 'accepted').length,
      declined: resources.filter(r => r.booking_status === 'declined').length
    }
    
    console.log('Analyse des statuts:', analysis)
    
    // 3. Mettre à jour les ressources en draft vers recherche
    const resourcesToUpdate = resources.filter(r => 
      r.booking_status === 'draft' && !r.candidate_id
    )
    
    let updated = 0
    for (const resource of resourcesToUpdate) {
      console.log(`Mise à jour ressource ${resource.id}: draft -> recherche`)
      
      const { error: updateError } = await supabaseAdmin
        .from('hr_resource_assignments')
        .update({ 
          booking_status: 'recherche',
          updated_at: new Date().toISOString()
        })
        .eq('id', resource.id)
      
      if (!updateError) {
        updated++
      } else {
        console.error(`Erreur mise à jour: ${updateError.message}`)
      }
    }
    
    // 4. Vérifier le matching pour le candidat CDP
    const candidateProfileId = '86591b70-f8ba-4d3d-8ff0-8e92ddfd2f3e' // CDP
    const candidateEmail = 'fmeleard+ressource_27_08_cdp@gmail.com'
    
    // Récupérer le profil du candidat
    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('email', candidateEmail)
      .single()
    
    let matchingInfo = {
      candidateFound: !!candidateProfile,
      candidateId: candidateProfile?.id,
      candidateProfileId: candidateProfile?.profile_id,
      candidateSeniority: candidateProfile?.seniority,
      candidateStatus: candidateProfile?.status,
      matchingResources: 0,
      reasons: [] as string[]
    }
    
    if (candidateProfile) {
      // Vérifier quelles ressources correspondent
      const matchingResources = resources.filter(r => {
        const profileMatch = r.profile_id === candidateProfile.profile_id
        const seniorityMatch = r.seniority === candidateProfile.seniority
        const isSearching = r.booking_status === 'recherche'
        const notAssigned = !r.candidate_id || r.candidate_id === candidateProfile.id
        
        if (!profileMatch) {
          matchingInfo.reasons.push(`Profile mismatch: ${r.profile_id} != ${candidateProfile.profile_id}`)
        }
        if (!seniorityMatch) {
          matchingInfo.reasons.push(`Seniority mismatch: ${r.seniority} != ${candidateProfile.seniority}`)
        }
        if (!isSearching) {
          matchingInfo.reasons.push(`Not searching: ${r.booking_status}`)
        }
        if (!notAssigned) {
          matchingInfo.reasons.push(`Already assigned to: ${r.candidate_id}`)
        }
        
        return profileMatch && seniorityMatch && isSearching && notAssigned
      })
      
      matchingInfo.matchingResources = matchingResources.length
    }
    
    // 5. Résultat
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${updated} ressource(s) mise(s) à jour`,
        analysis,
        updated,
        matchingInfo,
        candidateProfileDetails: candidateProfile ? {
          id: candidateProfile.id,
          email: candidateProfile.email,
          profile_id: candidateProfile.profile_id,
          seniority: candidateProfile.seniority,
          status: candidateProfile.status
        } : null
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