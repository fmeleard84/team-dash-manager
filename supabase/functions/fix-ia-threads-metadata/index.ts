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

    console.log('🔍 Recherche des threads privés avec IA...')

    // 1. Récupérer tous les threads privés
    const { data: threads, error: threadsError } = await supabaseClient
      .from('message_threads')
      .select('*')
      .eq('metadata->>type', 'private')

    if (threadsError) throw threadsError

    console.log(`📊 ${threads?.length || 0} threads privés trouvés`)

    let fixed = 0
    const results = []

    for (const thread of threads || []) {
      const participants = thread.metadata?.participants || []
      let needsFix = false

      // Vérifier si des participants ont des IDs d'IA
      const updatedParticipants = []
      for (const p of participants) {
        // Si l'ID ressemble à une IA ou si c'est dans hr_profiles avec is_ai=true
        if (p.id && !p.isAI) {
          // Vérifier dans hr_profiles
          const { data: hrProfile } = await supabaseClient
            .from('hr_profiles')
            .select('id, name, is_ai')
            .eq('id', p.id)
            .single()

          if (hrProfile?.is_ai) {
            console.log(`✅ Participant IA trouvé: ${hrProfile.name} (${p.id})`)
            needsFix = true
            updatedParticipants.push({
              ...p,
              isAI: true,
              name: hrProfile.name
            })
          } else {
            updatedParticipants.push(p)
          }
        } else {
          updatedParticipants.push(p)
        }
      }

      if (needsFix) {
        // Mettre à jour le thread
        const { error: updateError } = await supabaseClient
          .from('message_threads')
          .update({
            metadata: {
              ...thread.metadata,
              participants: updatedParticipants
            }
          })
          .eq('id', thread.id)

        if (updateError) {
          console.error(`❌ Erreur mise à jour thread ${thread.id}:`, updateError)
          results.push({
            threadId: thread.id,
            status: 'error',
            error: updateError.message
          })
        } else {
          fixed++
          results.push({
            threadId: thread.id,
            status: 'fixed',
            participants: updatedParticipants
          })
        }
      } else {
        results.push({
          threadId: thread.id,
          status: 'ok',
          participants
        })
      }
    }

    console.log(`✅ Réparation terminée: ${fixed} threads corrigés`)

    return new Response(JSON.stringify({
      success: true,
      threadsChecked: threads?.length || 0,
      threadsFixed: fixed,
      results
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