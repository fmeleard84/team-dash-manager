import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 Début de la correction des métadonnées de messagerie')

    // 1. Récupérer tous les threads privés
    const { data: privateThreads, error: threadsError } = await supabase
      .from('message_threads')
      .select('*')
      .not('metadata->type', 'is', null)
      .eq('metadata->type', 'private')

    if (threadsError) {
      throw new Error(`Erreur lors de la récupération des threads: ${threadsError.message}`)
    }

    console.log(`📋 Threads privés trouvés: ${privateThreads?.length || 0}`)

    let messagesUpdated = 0
    let errors = []

    // 2. Pour chaque thread privé, mettre à jour les messages
    for (const thread of privateThreads || []) {
      const participants = thread.metadata?.participants || []

      if (participants.length !== 2) {
        console.warn(`⚠️  Thread ${thread.id} n'a pas exactement 2 participants`)
        continue
      }

      // Récupérer tous les messages du thread
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, metadata, sender_id')
        .eq('thread_id', thread.id)

      if (messagesError) {
        errors.push(`Erreur thread ${thread.id}: ${messagesError.message}`)
        continue
      }

      // Mettre à jour chaque message sans métadonnées correctes
      for (const message of messages || []) {
        // Si le message n'a pas de metadata ou pas de flag is_private
        if (!message.metadata || message.metadata.is_private === undefined) {
          const participantIds = participants.map(p => p.id || p)

          const newMetadata = {
            ...(message.metadata || {}),
            is_private: true,
            participants: participantIds,
            thread_type: 'private'
          }

          const { error: updateError } = await supabase
            .from('messages')
            .update({ metadata: newMetadata })
            .eq('id', message.id)

          if (updateError) {
            errors.push(`Erreur mise à jour message ${message.id}: ${updateError.message}`)
          } else {
            messagesUpdated++
          }
        }
      }
    }

    // 3. Mettre à jour les messages des threads d'équipe
    const { data: teamThreads, error: teamThreadsError } = await supabase
      .from('message_threads')
      .select('id')
      .or('metadata->type.eq.team,metadata.is.null')

    if (!teamThreadsError && teamThreads) {
      console.log(`📋 Threads d'équipe trouvés: ${teamThreads.length}`)

      for (const thread of teamThreads) {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, metadata')
          .eq('thread_id', thread.id)

        if (!messagesError && messages) {
          for (const message of messages) {
            // Si le message n'a pas de metadata ou pas de flag is_private
            if (!message.metadata || message.metadata.is_private === undefined) {
              const newMetadata = {
                ...(message.metadata || {}),
                is_private: false,
                thread_type: 'team'
              }

              const { error: updateError } = await supabase
                .from('messages')
                .update({ metadata: newMetadata })
                .eq('id', message.id)

              if (!updateError) {
                messagesUpdated++
              }
            }
          }
        }
      }
    }

    // 4. Rapport final
    const report = {
      success: true,
      messagesUpdated,
      privateThreadsProcessed: privateThreads?.length || 0,
      teamThreadsProcessed: teamThreads?.length || 0,
      errors: errors.length > 0 ? errors : null
    }

    console.log('✅ Correction terminée:', report)

    return new Response(
      JSON.stringify(report),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})
