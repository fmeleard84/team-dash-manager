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
    const { promptId, projectId, userMessage, conversationHistory } = await req.json()

    console.log('🤖 Génération réponse IA:', {
      promptId,
      projectId,
      messageLength: userMessage?.length || 0
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Récupérer le prompt IA
    const { data: prompt, error: promptError } = await supabaseClient
      .from('prompts_ia')
      .select('name, context, prompt, active')
      .eq('id', promptId)
      .eq('active', true)
      .single()

    if (promptError || !prompt) {
      console.error('❌ Prompt IA non trouvé:', promptError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Prompt IA non configuré'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log('✅ Prompt IA trouvé:', prompt.name)

    // 2. Construire le contexte de conversation avec mémoire complète
    const historyText = conversationHistory
      ?.slice(0, 8) // Utiliser jusqu'à 8 messages pour plus de contexte
      ?.map(msg => {
        const senderName = msg.sender_name || msg.sender_email?.split('@')[0] || 'Utilisateur'
        return `${senderName}: ${msg.content}`
      })
      ?.join('\n') || ''

    // 3. Construire le prompt complet avec mémoire de conversation
    const systemPrompt = `${prompt.prompt}

IMPORTANT - Mémoire de conversation:
Vous avez une conversation continue avec cet utilisateur. Vous devez :
- Vous souvenir du contexte et des sujets précédemment discutés
- Faire référence aux échanges précédents quand c'est pertinent
- Maintenir la cohérence dans vos réponses
- Adapter votre ton en fonction de la relation établie

Historique de la conversation (du plus ancien au plus récent):
${historyText}

Nouveau message de l'utilisateur: ${userMessage}

Instructions:
- Répondez en français
- Tenez compte de l'historique de conversation
- Soyez cohérent avec vos réponses précédentes
- Si vous produisez un contenu long (article, document), structurez-le clairement
- Gardez un ton professionnel mais personnalisé selon le contexte

IMPORTANT - Gestion des livrables:
Si l'utilisateur demande un livrable (article, planning, guide, rapport, documentation, etc.):
1. Produisez le contenu demandé de manière complète et structurée
2. À la fin, demandez TOUJOURS : "📁 Souhaitez-vous que je sauvegarde ce document dans votre Drive projet (dossier IA) au format Word (.docx) ?"
3. Si l'utilisateur répond oui/ok/d'accord, ajoutez à la fin de votre message:
   [SAVE_TO_DRIVE: nom_du_fichier.docx]
   où nom_du_fichier est un nom descriptif basé sur le contenu (ex: article_marketing_digital.docx, planning_projet_2025.docx)`

    // 4. Appel à OpenAI (simulé pour l'instant)
    // TODO: Remplacer par un vrai appel OpenAI avec la clé API configurée
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openaiApiKey) {
      console.warn('⚠️ Clé OpenAI non configurée, utilisation d\'une réponse simulée')

      // Réponse simulée pour le développement
      const simulatedResponse = generateSimulatedResponse(userMessage, prompt.name)

      return new Response(JSON.stringify({
        success: true,
        response: simulatedResponse,
        promptUsed: prompt.name,
        simulated: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Appel réel OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices?.[0]?.message?.content

    if (!aiResponse) {
      throw new Error('Aucune réponse générée par OpenAI')
    }

    console.log('✅ Réponse IA générée:', aiResponse.length, 'caractères')

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      promptUsed: prompt.name,
      tokensUsed: openaiData.usage?.total_tokens || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erreur génération IA:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Fonction pour générer une réponse simulée pendant le développement
function generateSimulatedResponse(userMessage: string, promptName: string): string {
  const responses = {
    'Concepteur rédacteur IA': [
      `# Article de blog : ${userMessage.slice(0, 50)}

En tant que concepteur rédacteur IA, je vous propose ce contenu structuré :

## Introduction
Votre demande "${userMessage}" soulève des points intéressants que nous allons explorer en détail.

## Développement
- Point 1 : Analyse de la problématique
- Point 2 : Solutions proposées
- Point 3 : Mise en œuvre pratique

## Conclusion
Ce contenu répond à votre demande en proposant une approche méthodique et professionnelle.

*Article généré par l'IA rédactrice - ${new Date().toLocaleDateString('fr-FR')}*`,

      `Voici ma réponse en tant qu'IA spécialisée en rédaction :

${userMessage}

Je peux vous aider à développer ce sujet plus en détail si vous le souhaitez. N'hésitez pas à me demander des précisions ou des contenus spécifiques comme :
- Articles de blog
- Documentation technique
- Guides utilisateur
- Rapports d'analyse

Comment puis-je vous assister davantage ?`,

      `📝 **Contenu rédactionnel généré**

Sujet traité : ${userMessage}

Je viens de traiter votre demande. Si vous souhaitez que je produise un document plus complet (guide, article, rapport), merci de me le préciser et je créerai un contenu structuré qui sera automatiquement sauvegardé dans votre Drive.

Types de contenus que je peux créer :
- Articles de blog optimisés SEO
- Guides étape par étape
- Rapports d'analyse
- Documentation projet
- Présentations commerciales

Quelle est votre préférence ?`
    ]
  }

  const promptResponses = responses[promptName] || responses['Concepteur rédacteur IA']
  const randomResponse = promptResponses[Math.floor(Math.random() * promptResponses.length)]

  return randomResponse
}