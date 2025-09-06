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

    console.log('🔧 Restauration des langues et expertises des candidats...')
    
    const restored = {
      languages: 0,
      expertises: 0,
      candidates: []
    }
    
    // 1. Récupérer tous les candidats
    const { data: candidates, error: candidatesError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
    
    if (candidatesError) {
      throw new Error(`Erreur récupération candidats: ${candidatesError.message}`)
    }
    
    console.log(`📊 ${candidates?.length || 0} candidats trouvés`)
    
    // 2. Pour chaque candidat, vérifier et restaurer les données
    for (const candidate of candidates || []) {
      const candidateInfo = {
        id: candidate.id,
        email: candidate.email,
        languages: [],
        expertises: []
      }
      
      // Vérifier les langues existantes
      const { data: existingLangs } = await supabaseAdmin
        .from('candidate_languages')
        .select('*, hr_languages(*)')
        .eq('candidate_id', candidate.id)
      
      if (!existingLangs || existingLangs.length === 0) {
        // Ajouter Français par défaut
        const { error: langError } = await supabaseAdmin
          .from('candidate_languages')
          .insert({
            candidate_id: candidate.id,
            language_id: 1 // Français
          })
        
        if (!langError) {
          restored.languages++
          candidateInfo.languages.push('Français')
          console.log(`✅ Langue ajoutée pour ${candidate.email}`)
        }
      } else {
        candidateInfo.languages = existingLangs.map(l => l.hr_languages?.name)
      }
      
      // Vérifier les expertises existantes
      const { data: existingExps } = await supabaseAdmin
        .from('candidate_expertises')
        .select('*, hr_expertises(*)')
        .eq('candidate_id', candidate.id)
      
      if (!existingExps || existingExps.length === 0) {
        // Déterminer l'expertise par défaut basée sur le profil
        let defaultExpertiseId = 1 // Par défaut
        
        if (candidate.profile_id) {
          const { data: profile } = await supabaseAdmin
            .from('hr_profiles')
            .select('name')
            .eq('id', candidate.profile_id)
            .single()
          
          if (profile) {
            // Mapper le profil à une expertise
            if (profile.name?.includes('CDP') || profile.name?.includes('Chef')) {
              const { data: exp } = await supabaseAdmin
                .from('hr_expertises')
                .select('id')
                .eq('name', 'Google Ads')
                .single()
              if (exp) defaultExpertiseId = exp.id
            } else if (profile.name?.includes('Dev')) {
              const { data: exp } = await supabaseAdmin
                .from('hr_expertises')
                .select('id')
                .eq('name', 'JavaScript')
                .single()
              if (exp) defaultExpertiseId = exp.id
            } else if (profile.name?.includes('Design')) {
              const { data: exp } = await supabaseAdmin
                .from('hr_expertises')
                .select('id')
                .eq('name', 'Figma')
                .single()
              if (exp) defaultExpertiseId = exp.id
            }
          }
        }
        
        // Ajouter l'expertise
        const { error: expError } = await supabaseAdmin
          .from('candidate_expertises')
          .insert({
            candidate_id: candidate.id,
            expertise_id: defaultExpertiseId
          })
        
        if (!expError) {
          restored.expertises++
          const { data: expName } = await supabaseAdmin
            .from('hr_expertises')
            .select('name')
            .eq('id', defaultExpertiseId)
            .single()
          candidateInfo.expertises.push(expName?.name || 'Expertise')
          console.log(`✅ Expertise ajoutée pour ${candidate.email}`)
        }
      } else {
        candidateInfo.expertises = existingExps.map(e => e.hr_expertises?.name)
      }
      
      restored.candidates.push(candidateInfo)
    }
    
    // 3. Vérifier spécifiquement notre candidat test
    const testCandidate = 'fmeleard+ressource_27_08_cdp@gmail.com'
    const { data: finalCandidate } = await supabaseAdmin
      .from('candidate_profiles')
      .select(`
        *,
        candidate_languages(*, hr_languages(*)),
        candidate_expertises(*, hr_expertises(*))
      `)
      .eq('email', testCandidate)
      .single()
    
    let matchingInfo = null
    if (finalCandidate) {
      // Vérifier le matching avec les ressources
      const { data: matchingResources } = await supabaseAdmin
        .from('hr_resource_assignments')
        .select('*, projects(*)')
        .eq('profile_id', finalCandidate.profile_id)
        .eq('booking_status', 'recherche')
      
      const candidateLanguages = finalCandidate.candidate_languages?.map(cl => cl.hr_languages?.name) || []
      const candidateExpertises = finalCandidate.candidate_expertises?.map(ce => ce.hr_expertises?.name) || []
      
      const matching = (matchingResources || []).filter(r => {
        const langMatch = !r.languages?.length || 
          r.languages.every(lang => candidateLanguages.includes(lang))
        const expMatch = !r.expertises?.length || 
          r.expertises.every(exp => candidateExpertises.includes(exp))
        const seniorityMatch = r.seniority === finalCandidate.seniority
        
        return langMatch && expMatch && seniorityMatch
      })
      
      matchingInfo = {
        totalResources: matchingResources?.length || 0,
        matchingResources: matching.length,
        candidateLanguages,
        candidateExpertises,
        candidateSeniority: finalCandidate.seniority
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Langues et expertises restaurées',
        restored,
        testCandidate: finalCandidate ? {
          id: finalCandidate.id,
          email: finalCandidate.email,
          languages: finalCandidate.candidate_languages?.length || 0,
          expertises: finalCandidate.candidate_expertises?.length || 0
        } : null,
        matchingInfo
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