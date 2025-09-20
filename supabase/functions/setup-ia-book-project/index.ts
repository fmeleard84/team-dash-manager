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

    console.log('🚀 Configuration automatique du projet "IA book" avec une IA rédactrice...')

    // 1. Trouver le projet "IA book"
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, title')
      .or('title.ilike.%IA book%, title.ilike.%ia book%')
      .single()

    if (projectError || !project) {
      throw new Error('Projet "IA book" non trouvé')
    }

    console.log(`✅ Projet trouvé: ${project.title} (${project.id})`)

    // 2. Vérifier/créer un profil HR pour "IA Rédactrice"
    let { data: aiProfile, error: profileError } = await supabaseClient
      .from('hr_profiles')
      .select('id, name, is_ai, prompt_id')
      .eq('name', 'IA Rédactrice')
      .eq('is_ai', true)
      .single()

    if (profileError || !aiProfile) {
      console.log('📝 Création du profil IA Rédactrice...')

      // Créer le profil IA Rédactrice
      const { data: newProfile, error: createError } = await supabaseClient
        .from('hr_profiles')
        .insert({
          name: 'IA Rédactrice',
          is_ai: true,
          prompt_id: 'ia_writer_1758268107004_1', // Utiliser le prompt IA Rédacteur existant
          base_price: 4500, // 45€/heure
          category_id: (await supabaseClient
            .from('hr_categories')
            .select('id')
            .eq('name', 'Marketing')
            .single()).data?.id
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Erreur création profil IA: ${createError.message}`)
      }

      aiProfile = newProfile
      console.log(`✅ Profil IA créé: ${aiProfile.name}`)
    } else {
      console.log(`✅ Profil IA existant: ${aiProfile.name}`)
    }

    // 3. Créer un profil candidat pour cette IA (nécessaire pour la messagerie)
    let { data: candidateProfile, error: candidateError } = await supabaseClient
      .from('candidate_profiles')
      .select('id, email')
      .eq('id', aiProfile.id)
      .single()

    if (candidateError || !candidateProfile) {
      console.log('👤 Création du profil candidat pour l\'IA...')

      const { data: newCandidate, error: createCandidateError } = await supabaseClient
        .from('candidate_profiles')
        .insert({
          id: aiProfile.id, // Même ID que le profil HR
          first_name: 'IA',
          last_name: 'Rédactrice',
          email: `ia_redactrice_${aiProfile.id}@ia.team`,
          status: 'disponible',
          daily_rate: 45000 // 450€/jour
        })
        .select()
        .single()

      if (createCandidateError) {
        throw new Error(`Erreur création candidat IA: ${createCandidateError.message}`)
      }

      candidateProfile = newCandidate
      console.log(`✅ Profil candidat IA créé: ${candidateProfile.email}`)
    } else {
      console.log(`✅ Profil candidat IA existant: ${candidateProfile.email}`)
    }

    // 4. Vérifier/créer l'assignation de ressource
    let { data: assignment, error: assignmentError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('id, booking_status')
      .eq('project_id', project.id)
      .eq('profile_id', aiProfile.id)
      .single()

    if (assignmentError || !assignment) {
      console.log('🔗 Création de l\'assignation de ressource IA...')

      const { data: newAssignment, error: createAssignmentError } = await supabaseClient
        .from('hr_resource_assignments')
        .insert({
          project_id: project.id,
          profile_id: aiProfile.id,
          candidate_id: candidateProfile.id,
          booking_status: 'accepted', // Auto-accepté pour les IA
          seniority: 'expert',
          languages: ['Français', 'Anglais'],
          expertises: ['Rédaction', 'Content Marketing', 'SEO', 'Copywriting']
        })
        .select()
        .single()

      if (createAssignmentError) {
        throw new Error(`Erreur création assignation: ${createAssignmentError.message}`)
      }

      assignment = newAssignment
      console.log(`✅ Assignation créée avec status: ${assignment.booking_status}`)
    } else {
      console.log(`✅ Assignation existante avec status: ${assignment.booking_status}`)

      // S'assurer que l'assignation est acceptée
      if (assignment.booking_status !== 'accepted') {
        const { error: updateError } = await supabaseClient
          .from('hr_resource_assignments')
          .update({
            booking_status: 'accepted',
            candidate_id: candidateProfile.id
          })
          .eq('id', assignment.id)

        if (updateError) {
          throw new Error(`Erreur mise à jour assignation: ${updateError.message}`)
        }
        console.log(`✅ Assignation mise à jour: accepted`)
      }
    }

    // 5. Vérifier que le projet a le bon statut pour la messagerie
    const { data: updatedProject, error: updateProjectError } = await supabaseClient
      .from('projects')
      .update({ status: 'play' }) // Activer les outils collaboratifs
      .eq('id', project.id)
      .select()
      .single()

    if (updateProjectError) {
      console.warn('⚠️ Erreur mise à jour statut projet:', updateProjectError)
    } else {
      console.log(`✅ Projet mis en statut: ${updatedProject.status}`)
    }

    const result = {
      success: true,
      message: 'Configuration du projet IA book terminée avec succès',
      data: {
        project: {
          id: project.id,
          title: project.title,
          status: updatedProject?.status || 'unknown'
        },
        aiProfile: {
          id: aiProfile.id,
          name: aiProfile.name,
          promptId: aiProfile.prompt_id
        },
        candidateProfile: {
          id: candidateProfile.id,
          email: candidateProfile.email
        },
        assignment: {
          id: assignment.id,
          status: assignment.booking_status
        }
      }
    }

    console.log('🎉 Configuration terminée:', result.data)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erreur de configuration:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})