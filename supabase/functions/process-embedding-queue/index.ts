import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration OpenAI
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small' // Moins cher et suffisant

/**
 * Génère un embedding via l'API OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY non configurée')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Limiter la taille
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Traite un batch d'items de la queue
 */
async function processBatch(supabase: any, batchSize: number = 10) {
  // Récupérer les items en attente
  const { data: queueItems, error: fetchError } = await supabase
    .from('embedding_sync_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (fetchError || !queueItems || queueItems.length === 0) {
    return { processed: 0, errors: [] }
  }

  const results = {
    processed: 0,
    errors: [] as any[]
  }

  // Traiter chaque item
  for (const item of queueItems) {
    try {
      // Marquer comme en cours de traitement
      await supabase
        .from('embedding_sync_queue')
        .update({ status: 'processing' })
        .eq('id', item.id)

      if (item.action === 'delete') {
        // Pour une suppression, pas besoin d'embedding
        await supabase
          .from('documentation_embeddings')
          .delete()
          .eq('source_table', item.source_table)
          .eq('source_id', item.source_id)

        // Marquer comme complété
        await supabase
          .from('embedding_sync_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id)

      } else {
        // Générer l'embedding pour insert/update
        const embedding = await generateEmbedding(item.content)

        // Appeler la fonction SQL pour traiter
        const { error: processError } = await supabase.rpc('process_embedding_sync', {
          p_embedding: embedding,
          p_queue_id: item.id
        })

        if (processError) {
          throw processError
        }
      }

      results.processed++

    } catch (error) {
      console.error(`Erreur traitement item ${item.id}:`, error)
      
      // Marquer comme échoué avec le message d'erreur
      await supabase
        .from('embedding_sync_queue')
        .update({ 
          status: 'failed',
          error_message: error.message,
          retry_count: item.retry_count + 1
        })
        .eq('id', item.id)

      results.errors.push({
        id: item.id,
        error: error.message
      })
    }
  }

  return results
}

/**
 * Nettoie la queue des anciens items traités
 */
async function cleanQueue(supabase: any) {
  const { data, error } = await supabase.rpc('clean_processed_sync_queue')
  
  if (error) {
    console.error('Erreur nettoyage queue:', error)
    return 0
  }
  
  return data || 0
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action = 'process', batchSize = 10, forceResync = null } = await req.json().catch(() => ({}))
    
    // Créer le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let result: any = {}

    switch (action) {
      case 'process':
        // Traiter la queue
        result = await processBatch(supabase, batchSize)
        break

      case 'clean':
        // Nettoyer les anciens items
        const cleaned = await cleanQueue(supabase)
        result = { cleaned }
        break

      case 'resync':
        // Forcer la resynchronisation
        const { data: resyncCount } = await supabase.rpc('force_resync_embeddings', {
          p_source_table: forceResync
        })
        result = { resynced: resyncCount }
        break

      case 'status':
        // Obtenir le statut de la queue
        const { data: status } = await supabase
          .from('embedding_sync_status')
          .select('*')
        result = { status }
        break

      default:
        throw new Error(`Action inconnue: ${action}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur dans process-embedding-queue:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Cette fonction peut être appelée de plusieurs façons :
 * 
 * 1. Via un CRON (Supabase pg_cron ou externe) toutes les 5 minutes :
 *    POST { "action": "process", "batchSize": 20 }
 * 
 * 2. Via un webhook après chaque modification :
 *    Trigger Database Webhook → Edge Function
 * 
 * 3. Manuellement pour forcer la resync :
 *    POST { "action": "resync", "forceResync": "faq_items" }
 * 
 * 4. Pour nettoyer la queue :
 *    POST { "action": "clean" }
 * 
 * 5. Pour voir le statut :
 *    POST { "action": "status" }
 */