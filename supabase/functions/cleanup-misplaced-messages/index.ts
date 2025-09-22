import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🧹 Nettoyage des messages mal placés...')

    // 1. Identifier les messages IA dans les threads principaux
    const { data: mainThreads, error: threadsError } = await supabase
      .from('message_threads')
      .select('id, title, metadata')
      .or('metadata->type.eq.team,metadata.is.null')

    if (threadsError) throw threadsError

    console.log(`📊 ${mainThreads?.length || 0} threads principaux trouvés`)

    let movedMessages = 0
    let deletedMessages = 0

    for (const thread of mainThreads || []) {
      // Récupérer les messages qui semblent être destinés à l'IA
      const { data: iaMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', thread.id)
        .or('sender_name.ilike.%IA%,content.ilike.%@IA%,content.ilike.%bonjour ia%,content.ilike.%salut ia%')

      if (messagesError) {
        console.error(`❌ Erreur récupération messages thread ${thread.id}:`, messagesError)
        continue
      }

      console.log(`📬 ${iaMessages?.length || 0} messages potentiellement mal placés dans ${thread.title}`)

      for (const message of iaMessages || []) {
        // Déterminer si c'est un message VERS l'IA ou DE l'IA
        const isFromIA = message.sender_name?.includes('IA')
        const isToIA = !isFromIA && (
          message.content.toLowerCase().includes('@ia') ||
          message.content.toLowerCase().includes('bonjour ia') ||
          message.content.toLowerCase().includes('salut ia') ||
          message.content.toLowerCase().includes('peux tu') ||
          message.content.toLowerCase().includes('pourrais-tu')
        )

        if (isToIA || isFromIA) {
          // Trouver le thread privé correspondant
          const userId = message.sender_id

          // Chercher le thread privé entre cet utilisateur et l'IA
          const { data: privateThreads } = await supabase
            .from('message_threads')
            .select('*')
            .eq('metadata->type', 'private')
            .contains('metadata->participants', [{ id: userId }])

          // Trouver le thread avec l'IA
          const iaThread = privateThreads?.find(t =>
            t.metadata?.participants?.some((p: any) => p.isAI === true)
          )

          if (iaThread) {
            // Déplacer le message vers le thread privé
            const { error: updateError } = await supabase
              .from('messages')
              .update({ thread_id: iaThread.id })
              .eq('id', message.id)

            if (!updateError) {
              console.log(`✅ Message déplacé vers thread privé: ${message.content.substring(0, 30)}...`)
              movedMessages++
            } else {
              console.error(`❌ Erreur déplacement message:`, updateError)
            }
          } else {
            // Si pas de thread privé trouvé et que c'est un doublon, on peut le supprimer
            // Vérifier si ce message existe déjà ailleurs
            const { data: duplicates } = await supabase
              .from('messages')
              .select('id')
              .eq('content', message.content)
              .eq('sender_id', message.sender_id)
              .neq('id', message.id)

            if (duplicates && duplicates.length > 0) {
              // C'est un doublon, on peut le supprimer
              const { error: deleteError } = await supabase
                .from('messages')
                .delete()
                .eq('id', message.id)

              if (!deleteError) {
                console.log(`🗑️ Message doublon supprimé: ${message.content.substring(0, 30)}...`)
                deletedMessages++
              }
            }
          }
        }
      }
    }

    // 2. Cas spécifique : le message "peux tu me rediger 4 lignes sur le vin"
    const { data: specificMessage } = await supabase
      .from('messages')
      .select('*')
      .eq('content', 'peux tu me rediger 4 lignes sur le vin')
      .single()

    if (specificMessage) {
      // Trouver le thread privé de Francis avec l'IA
      const privateThreadId = 'd79ed4fa-08c3-4b29-bbec-e92636591ae1'

      const { error: moveError } = await supabase
        .from('messages')
        .update({ thread_id: privateThreadId })
        .eq('id', specificMessage.id)

      if (!moveError) {
        console.log('✅ Message "vin" de Francis déplacé vers son thread privé')
        movedMessages++
      }
    }

    console.log(`
🎯 Nettoyage terminé :
- ${movedMessages} messages déplacés vers les threads privés
- ${deletedMessages} messages doublons supprimés
`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nettoyage effectué',
        stats: {
          movedMessages,
          deletedMessages
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})