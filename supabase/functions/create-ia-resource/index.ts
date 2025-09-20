import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    console.log('🤖 Création ressource IA Rédacteur...')

    // 1. Trouver ou créer la catégorie Marketing
    let category
    const { data: existingCategory } = await supabase
      .from('hr_categories')
      .select('*')
      .ilike('name', '%marketing%')
      .single()

    if (existingCategory) {
      category = existingCategory
    } else {
      const { data: newCategory, error: catError } = await supabase
        .from('hr_categories')
        .insert({ name: 'Marketing & Communication' })
        .select()
        .single()

      if (catError) throw catError
      category = newCategory
    }

    // 2. Créer ou vérifier le prompt IA
    const { data: existingPrompt } = await supabase
      .from('prompts_ia')
      .select('*')
      .eq('id', 'redacteur_contenu')
      .single()

    if (!existingPrompt) {
      const { error: promptError } = await supabase
        .from('prompts_ia')
        .insert({
          id: 'redacteur_contenu',
          name: 'IA Rédacteur de Contenu',
          context: 'content-creation',
          prompt: `Tu es un rédacteur professionnel spécialisé dans la création de contenu marketing et éditorial.
Tu maîtrises parfaitement le français et tu adaptes ton style selon les besoins du projet.
Tes compétences incluent :
- Rédaction d'articles de blog et de pages web
- Création de contenus SEO optimisés
- Rédaction de newsletters et emails marketing
- Conception de supports de communication
- Storytelling et copywriting

Tu fournis toujours un contenu structuré, engageant et adapté à la cible visée.`,
          active: true,
          priority: 1
        })

      if (promptError && !promptError.message.includes('duplicate')) {
        throw promptError
      }
    }

    // 3. Créer le profil hr_profiles pour l'IA
    const iaProfileId = crypto.randomUUID()

    const { data: hrProfile, error: hrError } = await supabase
      .from('hr_profiles')
      .insert({
        id: iaProfileId,
        name: 'IA Rédacteur',
        category_id: category.id,
        is_ai: true,
        prompt_id: 'redacteur_contenu',
        base_price: 350
      })
      .select()
      .single()

    if (hrError) throw hrError

    // 4. Créer le profil candidat associé (même ID)
    const { error: candidateError } = await supabase
      .from('candidate_profiles')
      .insert({
        id: iaProfileId,
        first_name: 'IA',
        last_name: 'Rédacteur',
        email: 'ia_redacteur@ia.team',
        phone: '+33000000000',
        status: 'disponible',
        qualification_status: 'qualified',
        daily_rate: 350,
        technical_skills: ['Rédaction', 'SEO', 'Marketing', 'Storytelling'],
        soft_skills: ['Créativité', 'Adaptation', 'Synthèse'],
        languages: ['Français', 'Anglais'],
        seniority: 'expert'
      })

    if (candidateError) {
      // Nettoyer hr_profile créé
      await supabase.from('hr_profiles').delete().eq('id', iaProfileId)
      throw candidateError
    }

    // 5. Créer aussi un profil utilisateur (profiles)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: iaProfileId,
        email: 'ia_redacteur@ia.team',
        first_name: 'IA Rédacteur',
        role: 'candidate'
      })

    if (profileError && !profileError.message.includes('duplicate')) {
      console.log('⚠️ Profil utilisateur non créé (peut déjà exister):', profileError.message)
    }

    // 6. Trouver le projet "Projet New key"
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .ilike('title', '%new%key%')
      .single()

    let assignment = null
    if (project) {
      // 7. Assigner l'IA au projet
      const { data: assignmentData, error: assignError } = await supabase
        .from('hr_resource_assignments')
        .insert({
          project_id: project.id,
          profile_id: iaProfileId,
          candidate_id: iaProfileId,
          booking_status: 'accepted',
          seniority: 'expert',
          languages: ['Français', 'Anglais'],
          expertises: ['Rédaction', 'Marketing']
        })
        .select()
        .single()

      if (!assignError) {
        assignment = assignmentData
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          iaProfile: hrProfile,
          projectAssigned: !!assignment,
          projectTitle: project?.title,
          iaProfileId
        },
        message: `✅ IA Rédacteur créée avec succès! ID: ${iaProfileId}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})