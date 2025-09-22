import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🚀 Migration du système de messagerie')

    // Nettoyer les threads
    const { data: threads } = await supabase
      .from('message_threads')
      .select('*')

    let threadsUpdated = 0
    let messagesUpdated = 0

    for (const thread of threads || []) {
      const metadata = thread.metadata || {}
      let threadType = 'team'
      let isPrivate = false
      let participants = null

      if (metadata.type === 'private' || (thread.title && thread.title.includes('Conversation privée'))) {
        threadType = 'private'
        isPrivate = true
        if (metadata.participants) {
          participants = metadata.participants.map((p: any) => typeof p === 'string' ? p : p.id)
        }
      }

      const newMetadata = {
        type: threadType,
        is_private: isPrivate,
        participants: participants ? participants.map((id: string) => ({ id })) : null
      }

      await supabase
        .from('message_threads')
        .update({ metadata: newMetadata })
        .eq('id', thread.id)

      threadsUpdated++

      // Mettre à jour les messages
      await supabase
        .from('messages')
        .update({
          metadata: {
            is_private: isPrivate,
            participants: participants,
            thread_type: threadType
          }
        })
        .eq('thread_id', thread.id)

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id)

      messagesUpdated += count || 0
    }

    return new Response(
      JSON.stringify({
        success: true,
        threadsUpdated,
        messagesUpdated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
