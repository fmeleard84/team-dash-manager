import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { candidateEmail } = await req.json()
    
    if (!candidateEmail) {
      throw new Error('Email du candidat requis')
    }
    
    console.log(`🔧 Restauration/création du profil candidat pour: ${candidateEmail}`)
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Vérifier si l'utilisateur existe dans auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email === candidateEmail)
    
    if (!authUser) {
      console.log('❌ Utilisateur non trouvé dans auth.users')
      
      // Créer l'utilisateur si nécessaire
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: candidateEmail,
        password: 'TempPassword123!', // Mot de passe temporaire
        email_confirm: true
      })
      
      if (createError) {
        throw new Error(`Impossible de créer l'utilisateur: ${createError.message}`)
      }
      
      console.log(`✅ Utilisateur créé avec ID: ${newUser.user.id}`)
      authUser = newUser.user
    } else {
      console.log(`✅ Utilisateur trouvé avec ID: ${authUser.id}`)
    }
    
    // 2. Vérifier si le profil candidat existe
    const { data: existingProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    if (existingProfile) {
      console.log('✅ Profil candidat existe déjà')
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Profil déjà existant',
          profile: existingProfile
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // 3. Créer le profil candidat
    console.log('📝 Création du profil candidat...')
    
    // Extraire le prénom et nom de l'email
    const emailParts = candidateEmail.split('@')[0].split('+')
    const nameParts = emailParts[0].split('.')
    const firstName = nameParts[0] || 'Prénom'
    const lastName = nameParts[1] || 'Nom'
    
    // Déterminer le profile_id basé sur l'email
    let profileId = '0e3e44cb-8768-43b4-963b-a1a9d240a2db' // CDP par défaut
    if (candidateEmail.includes('dev')) {
      profileId = '7f1e3c9a-5b8d-4e2f-a1b3-c4d5e6f7a8b9' // Dev
    } else if (candidateEmail.includes('design')) {
      profileId = '9a8b7c6d-5e4f-3a2b-1c9d-8e7f6a5b4c3d' // Designer
    }
    
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('candidate_profiles')
      .insert({
        id: authUser.id, // ID unifié avec auth.users
        email: candidateEmail,
        first_name: firstName,
        last_name: lastName,
        profile_id: profileId,
        status: 'disponible',
        seniority: 'intermediate',
        daily_rate: 500,
        qualification_status: 'qualified'
      })
      .select()
      .single()
    
    if (profileError) {
      throw new Error(`Erreur création profil: ${profileError.message}`)
    }
    
    console.log('✅ Profil candidat créé avec succès')
    
    // 4. Ajouter des langues et expertises par défaut
    await supabaseAdmin
      .from('candidate_languages')
      .insert({
        candidate_id: authUser.id,
        language_id: 1 // Français
      })
    
    await supabaseAdmin
      .from('candidate_expertises')
      .insert({
        candidate_id: authUser.id,
        expertise_id: 1 // Expertise par défaut
      })
    
    console.log('✅ Langues et expertises ajoutées')
    
    // 5. Vérifier les projets disponibles
    const { data: matchingProjects } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select(`
        *,
        projects!inner(*)
      `)
      .eq('profile_id', profileId)
      .eq('booking_status', 'recherche')
    
    console.log(`📊 ${matchingProjects?.length || 0} projets disponibles pour ce profil`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Profil candidat restauré/créé',
        userId: authUser.id,
        profile: newProfile,
        matchingProjects: matchingProjects?.length || 0
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