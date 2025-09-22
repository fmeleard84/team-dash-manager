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

    console.log('🧹 Nettoyage simple des messages...')

    // 1. Déplacer le message spécifique de Francis
    const { data: vinMessage } = await supabase
      .from('messages')
      .select('*')
      .eq('content', 'peux tu me rediger 4 lignes sur le vin')
      .single()

    let moved = 0

    if (vinMessage) {
      // Déplacer vers le thread privé de Francis avec l'IA
      const { error: moveError } = await supabase
        .from('messages')
        .update({ thread_id: 'd79ed4fa-08c3-4b29-bbec-e92636591ae1' })
        .eq('id', vinMessage.id)

      if (!moveError) {
        console.log('✅ Message "vin" déplacé vers le thread privé')
        moved++
      } else {
        console.error('❌ Erreur déplacement:', moveError)
      }
    }

    // 2. S'assurer que toutes les réponses de l'IA sont dans le bon thread
    const { data: iaMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', '5eda2b3a-0aed-482e-909a-86c84f03249d') // Thread principal
      .like('sender_name', '%IA%')

    for (const msg of iaMessages || []) {
      // Si c'est une réponse de l'IA dans le thread principal, la déplacer
      if (msg.content.includes('vin') || msg.content.includes('produit noble')) {
        // C'est probablement une réponse au message de Francis
        const { error } = await supabase
          .from('messages')
          .update({ thread_id: 'd79ed4fa-08c3-4b29-bbec-e92636591ae1' })
          .eq('id', msg.id)

        if (!error) {
          moved++
          console.log(`✅ Message IA déplacé: ${msg.content.substring(0, 30)}...`)
        }
      }
    }

    console.log(`✅ ${moved} messages déplacés`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${moved} messages nettoyés`,
        movedCount: moved
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