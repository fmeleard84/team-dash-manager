import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration OpenAI
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action = 'process', batchSize = 10 } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    if (action === 'process') {
      // Récupérer les éléments en attente de traitement
      const { data: queueItems, error: queueError } = await supabaseClient
        .from('project_embedding_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(batchSize)

      if (queueError) {
        console.error('❌ Erreur récupération queue:', queueError)
        throw queueError
      }

      if (!queueItems || queueItems.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Aucun élément à traiter',
          processed: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`🔄 Traitement de ${queueItems.length} éléments`)

      let processedCount = 0
      let errorCount = 0

      for (const item of queueItems) {
        try {
          // Marquer comme en cours de traitement
          await supabaseClient
            .from('project_embedding_queue')
            .update({ status: 'processing' })
            .eq('id', item.id)

          // Enrichir le contenu avec le contexte du projet
          const enrichedContent = await enrichContentWithContext(
            supabaseClient,
            item
          )

          // Générer l'embedding via OpenAI
          const embedding = await generateEmbedding(enrichedContent)

          if (embedding) {
            // Vérifier si un embedding existe déjà pour ce contenu
            const { data: existing } = await supabaseClient
              .from('project_embeddings')
              .select('id')
              .eq('project_id', item.project_id)
              .eq('content_type', item.content_type)
              .eq('metadata->source_id', item.source_id)
              .single()

            if (existing) {
              // Mettre à jour l'embedding existant
              await supabaseClient
                .from('project_embeddings')
                .update({
                  content: item.content,
                  embedding,
                  metadata: item.metadata,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
            } else {
              // Créer un nouvel embedding
              await supabaseClient
                .from('project_embeddings')
                .insert({
                  project_id: item.project_id,
                  content: item.content,
                  content_type: item.content_type,
                  embedding,
                  metadata: {
                    ...item.metadata,
                    source_table: item.source_table,
                    source_id: item.source_id
                  },
                  created_by: item.metadata?.created_by || null
                })
            }

            // Marquer comme traité
            await supabaseClient
              .from('project_embedding_queue')
              .update({
                status: 'completed',
                processed_at: new Date().toISOString()
              })
              .eq('id', item.id)

            processedCount++
          }
        } catch (error) {
          console.error(`❌ Erreur traitement élément ${item.id}:`, error)

          // Marquer comme échoué avec message d'erreur
          await supabaseClient
            .from('project_embedding_queue')
            .update({
              status: 'failed',
              retry_count: (item.retry_count || 0) + 1,
              error_message: error.message
            })
            .eq('id', item.id)

          errorCount++
        }
      }

      return new Response(JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: queueItems.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'retry-failed') {
      // Réessayer les éléments échoués
      const { data: updated } = await supabaseClient
        .from('project_embedding_queue')
        .update({ status: 'pending' })
        .eq('status', 'failed')
        .lt('retry_count', 3) // Maximum 3 tentatives
        .select()

      return new Response(JSON.stringify({
        success: true,
        retried: updated?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'clean-old') {
      // Nettoyer les anciens éléments traités
      const { error } = await supabaseClient
        .from('project_embedding_queue')
        .delete()
        .eq('status', 'completed')
        .lt('processed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        message: 'Nettoyage effectué'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('❌ Erreur fonction:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * Enrichit le contenu avec le contexte du projet
 */
async function enrichContentWithContext(
  supabaseClient: any,
  item: any
): Promise<string> {
  try {
    // Récupérer les informations du projet
    const { data: project } = await supabaseClient
      .from('projects')
      .select('title, description, status')
      .eq('id', item.project_id)
      .single()

    // Récupérer l'auteur si disponible
    let authorInfo = ''
    if (item.metadata?.created_by || item.metadata?.sender_id) {
      const authorId = item.metadata.created_by || item.metadata.sender_id
      const { data: author } = await supabaseClient
        .from('candidate_profiles')
        .select('first_name, last_name')
        .eq('id', authorId)
        .single()

      if (author) {
        authorInfo = `Auteur: ${author.first_name} ${author.last_name || ''}. `
      }
    }

    // Construire le contenu enrichi
    const enrichedContent = `
Projet: ${project?.title || 'Non spécifié'}
Description projet: ${project?.description || 'Non disponible'}
Status projet: ${project?.status || 'inconnu'}
Type de contenu: ${item.content_type}
${authorInfo}
Date: ${item.created_at}

Contenu:
${item.content}

${item.content_type === 'message' ? `Thread ID: ${item.metadata?.thread_id}` : ''}
${item.content_type === 'document' ? `Fichier: ${item.metadata?.filename}, Type: ${item.metadata?.file_type}` : ''}
${item.content_type === 'kanban_card' ? `Tâche: ${item.metadata?.title}, Status: ${item.metadata?.status}, Priorité: ${item.metadata?.priority || 'normale'}` : ''}
`.trim()

    return enrichedContent
  } catch (error) {
    console.error('Erreur enrichissement contexte:', error)
    // En cas d'erreur, retourner le contenu brut
    return item.content
  }
}

/**
 * Génère un embedding via l'API OpenAI
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) {
    console.error('❌ Clé API OpenAI non configurée')
    return null
  }

  try {
    // Limiter la taille du texte (max ~8000 tokens pour text-embedding-3-small)
    const truncatedText = text.substring(0, 30000)

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedText,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Erreur OpenAI:', errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.data && data.data[0] && data.data[0].embedding) {
      return data.data[0].embedding
    }

    console.error('❌ Format de réponse OpenAI invalide:', data)
    return null

  } catch (error) {
    console.error('❌ Erreur génération embedding:', error)
    return null
  }
}