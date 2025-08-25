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

    const { email } = await req.json()
    const targetEmail = email || 'fmeleard+ressource_5@gmail.com'

    console.log('🔧 Création profil candidat pour:', targetEmail)

    // 1. Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('email', targetEmail)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profil utilisateur non trouvé:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found', details: profileError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('✅ Profil utilisateur trouvé:', profile.id)

    // 2. Vérifier si le profil candidat existe déjà
    const { data: existingCandidate } = await supabaseClient
      .from('candidate_profiles')
      .select('*')
      .eq('email', targetEmail)
      .maybeSingle()

    console.log('🔍 Existing candidate check:', existingCandidate)

    if (existingCandidate && !req.url.includes('force=true')) {
      console.log('⚠️ Profil candidat existe déjà:', existingCandidate.id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Candidate profile already exists',
          candidateId: existingCandidate.id,
          candidate: existingCandidate
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Récupérer l'ID du profil "Directeur marketing"
    const { data: marketingProfile, error: profileIdError } = await supabaseClient
      .from('hr_profiles')
      .select('id')
      .eq('name', 'Directeur marketing')
      .single()

    if (profileIdError || !marketingProfile) {
      console.error('❌ Profil marketing non trouvé:', profileIdError)
      return new Response(
        JSON.stringify({ error: 'Marketing profile not found', details: profileIdError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('✅ Profil marketing trouvé:', marketingProfile.id)

    // 4. Créer le profil candidat
    const { data: newCandidate, error: createError } = await supabaseClient
      .from('candidate_profiles')
      .insert({
        email: targetEmail,
        first_name: profile.first_name || 'Meleard R',
        last_name: profile.last_name || 'Francis R',
        profile_id: marketingProfile.id,
        seniority: 'intermediate',
        qualification_status: 'qualified',
        status: 'disponible',
        password_hash: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Erreur création candidat:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create candidate profile', details: createError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('✅ Profil candidat créé:', newCandidate.id)

    // 5. Ajouter les langues (Français et Anglais)
    const { data: languages, error: languagesError } = await supabaseClient
      .from('hr_languages')
      .select('id, name')
      .in('name', ['Français', 'Anglais'])

    if (!languagesError && languages) {
      const languageInserts = languages.map(lang => ({
        candidate_id: newCandidate.id,
        language_id: lang.id
      }))

      await supabaseClient
        .from('candidate_languages')
        .insert(languageInserts)

      console.log('✅ Langues ajoutées:', languages.map(l => l.name).join(', '))
    }

    // 6. Ajouter les expertises (Google Ads et Content Marketing)
    const { data: expertises, error: expertisesError } = await supabaseClient
      .from('hr_expertises')
      .select('id, name')
      .in('name', ['Google Ads', 'Content Marketing'])

    if (!expertisesError && expertises) {
      const expertiseInserts = expertises.map(exp => ({
        candidate_id: newCandidate.id,
        expertise_id: exp.id
      }))

      await supabaseClient
        .from('candidate_expertises')
        .insert(expertiseInserts)

      console.log('✅ Expertises ajoutées:', expertises.map(e => e.name).join(', '))
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profil candidat créé avec succès',
        candidateProfile: newCandidate,
        languages: languages?.map(l => l.name) || [],
        expertises: expertises?.map(e => e.name) || []
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