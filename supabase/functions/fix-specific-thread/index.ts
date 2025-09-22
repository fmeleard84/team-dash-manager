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

    const threadId = 'd79ed4fa-08c3-4b29-bbec-e92636591ae1'
    console.log('🔍 Réparation du thread:', threadId)

    // Récupérer le thread
    const { data: thread, error: threadError } = await supabaseClient
      .from('message_threads')
      .select('*')
      .eq('id', threadId)
      .single()

    if (threadError) throw threadError

    console.log('📋 Thread trouvé:', {
      title: thread.title,
      type: thread.metadata?.type,
      participants: thread.metadata?.participants
    })

    // IDs des participants
    const participantIds = thread.metadata?.participants?.map(p => p.id) || []
    console.log('🔍 IDs des participants:', participantIds)

    // Récupérer les infos complètes des participants
    const fixedParticipants = []

    for (const pId of participantIds) {
      // D'abord vérifier dans hr_profiles
      const { data: hrProfile } = await supabaseClient
        .from('hr_profiles')
        .select('id, name, is_ai, prompt_id')
        .eq('id', pId)
        .maybeSingle()

      if (hrProfile?.is_ai) {
        console.log('✅ IA trouvée:', hrProfile.name)
        fixedParticipants.push({
          id: pId,
          name: hrProfile.name,
          email: `${hrProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
          isAI: true,
          promptId: hrProfile.prompt_id
        })
      } else {
        // Sinon c'est un utilisateur, chercher dans candidate_profiles
        const { data: candidateProfile } = await supabaseClient
          .from('candidate_profiles')
          .select('id, first_name, last_name, email')
          .eq('id', pId)
          .maybeSingle()

        if (candidateProfile) {
          const name = `${candidateProfile.first_name} ${candidateProfile.last_name}`.trim()
          console.log('👤 Candidat trouvé:', name)
          fixedParticipants.push({
            id: pId,
            name: name || candidateProfile.email?.split('@')[0] || 'Utilisateur',
            email: candidateProfile.email,
            isAI: false
          })
        } else {
          // Fallback sur profiles
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', pId)
            .maybeSingle()

          if (profile) {
            const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            console.log('👤 Profil trouvé:', name || profile.email)
            fixedParticipants.push({
              id: pId,
              name: name || profile.email?.split('@')[0] || 'Utilisateur',
              email: profile.email,
              isAI: false
            })
          }
        }
      }
    }

    console.log('✅ Participants corrigés:', fixedParticipants)

    // Mettre à jour le thread
    const { error: updateError } = await supabaseClient
      .from('message_threads')
      .update({
        metadata: {
          ...thread.metadata,
          participants: fixedParticipants
        }
      })
      .eq('id', threadId)

    if (updateError) throw updateError

    console.log('✅ Thread réparé avec succès !')

    return new Response(JSON.stringify({
      success: true,
      threadId,
      originalParticipants: thread.metadata?.participants,
      fixedParticipants
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})