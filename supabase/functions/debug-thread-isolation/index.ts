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

    console.log('🔍 Analyse du problème d\'isolation...')

    const threadId = '5eda2b3a-0aed-482e-909a-86c84f03249d'
    const projectId = '5ec653f5-5de9-4291-a2d9-e301425adbad'

    // 1. Récupérer le thread problématique
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('*')
      .eq('id', threadId)
      .single()

    if (threadError) {
      throw new Error(`Thread non trouvé: ${threadError.message}`)
    }

    // 2. Récupérer tous les threads du projet
    const { data: allThreads } = await supabase
      .from('message_threads')
      .select('id, title, metadata, created_by')
      .eq('project_id', projectId)

    // 3. Analyser les threads privés
    const privateThreads = allThreads?.filter(t => t.metadata?.type === 'private') || []

    // 4. Récupérer des messages récents
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, sender_id, sender_name, content, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(5)

    // 5. Identifier le problème
    const analysis = {
      problemThread: {
        id: thread.id,
        title: thread.title,
        type: thread.metadata?.type || 'NON DÉFINI',
        participants: thread.metadata?.participants,
        threadKey: thread.metadata?.thread_key,
        isAiConversation: thread.metadata?.is_ai_conversation,
        createdBy: thread.created_by
      },
      projectThreadsCount: allThreads?.length || 0,
      privateThreadsCount: privateThreads.length,
      privateThreadsDetails: privateThreads.map(t => ({
        id: t.id,
        title: t.title,
        participants: t.metadata?.participants?.map((p: any) => ({
          id: p.id,
          name: p.name,
          isAI: p.isAI
        })),
        threadKey: t.metadata?.thread_key
      })),
      recentMessages: recentMessages?.map(m => ({
        sender: m.sender_name,
        preview: m.content.substring(0, 50)
      })),
      diagnosis: determineIssue(thread, privateThreads)
    }

    function determineIssue(thread: any, privateThreads: any[]) {
      // Le problème principal : le thread utilisé n'est pas un thread privé
      if (!thread.metadata?.type || thread.metadata.type !== 'private') {
        return '❌ PROBLÈME: Ce thread n\'est PAS marqué comme privé! Le client et le candidat utilisent probablement le thread principal.'
      }

      // Vérifier si les participants sont correctement définis
      if (!thread.metadata?.participants || thread.metadata.participants.length !== 2) {
        return '❌ PROBLÈME: Les participants du thread ne sont pas correctement définis.'
      }

      // Vérifier s'il y a plusieurs threads privés pour la même IA
      const aiThreads = privateThreads.filter(t =>
        t.metadata?.participants?.some((p: any) => p.isAI)
      )

      if (aiThreads.length < 2) {
        return '❌ PROBLÈME: Il manque des threads privés séparés pour chaque utilisateur avec l\'IA.'
      }

      return '✅ Les threads semblent correctement configurés, le problème pourrait être dans la sélection du thread.'
    }

    return new Response(
      JSON.stringify(analysis, null, 2),
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