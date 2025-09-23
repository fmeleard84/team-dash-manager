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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
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

    // 2. Récupérer le contexte enrichi du projet si disponible
    let projectContext = ''
    let vectorSearchResults = []

    if (projectId) {
      try {
        // Récupérer le contexte structuré du projet
        const { data: contextData, error: contextError } = await supabaseClient
          .rpc('get_project_context_for_ai', {
            p_project_id: projectId,
            p_limit: 10
          })

        if (contextData && !contextError) {
          // Construire un résumé du contexte projet
          const ctx = contextData
          projectContext = `\n\nCONTEXTE DU PROJET:
`

          if (ctx.project_info) {
            projectContext += `Projet: ${ctx.project_info.title}\n`
            projectContext += `Description: ${ctx.project_info.description || 'Non spécifiée'}\n`
            projectContext += `Statut: ${ctx.project_info.status}\n`
          }

          if (ctx.team_members && ctx.team_members.length > 0) {
            projectContext += `\nÉquipe: ${ctx.team_members.map(m =>
              m.is_ai ? `${m.profile_name} (IA)` : m.candidate_name
            ).join(', ')}\n`
          }

          if (ctx.active_tasks && ctx.active_tasks.length > 0) {
            projectContext += `\nTâches actives: ${ctx.active_tasks.length}\n`
            ctx.active_tasks.slice(0, 3).forEach(task => {
              projectContext += `- ${task.title} (${task.status})\n`
            })
          }

          if (ctx.recent_documents && ctx.recent_documents.length > 0) {
            projectContext += `\nDocuments récents: ${ctx.recent_documents.length} fichiers\n`
          }
        }

        // Si OpenAI est configuré, faire une recherche vectorielle
        if (Deno.env.get('OPENAI_API_KEY') && userMessage.length > 10) {
          // Générer l'embedding de la question
          const queryEmbedding = await generateQueryEmbedding(userMessage)

          if (queryEmbedding) {
            // Rechercher dans les embeddings du projet
            const { data: searchResults, error: searchError } = await supabaseClient
              .rpc('search_project_embeddings', {
                p_project_id: projectId,
                p_query_embedding: queryEmbedding,
                p_match_threshold: 0.7,
                p_match_count: 5
              })

            if (searchResults && searchResults.length > 0 && !searchError) {
              vectorSearchResults = searchResults
              projectContext += `\n\nCONTENU PERTINENT DU PROJET:\n`
              searchResults.forEach((result, idx) => {
                projectContext += `\n[${idx + 1}] ${result.content_type}: ${result.content.substring(0, 200)}...\n`
                projectContext += `(Pertinence: ${(result.similarity * 100).toFixed(1)}%)\n`
              })
            }
          }
        }
      } catch (error) {
        console.error('⚠️ Erreur récupération contexte projet:', error)
        // Continuer sans le contexte projet
      }
    }

    // 3. Construire le contexte de conversation avec mémoire complète
    const historyText = conversationHistory
      ?.slice(0, 8) // Utiliser jusqu'à 8 messages pour plus de contexte
      ?.map(msg => {
        const senderName = msg.sender_name || msg.sender_email?.split('@')[0] || 'Utilisateur'
        return `${senderName}: ${msg.content}`
      })
      ?.join('\n') || ''

    // 4. Construire le prompt complet avec mémoire de conversation et contexte projet
    const systemPrompt = `${prompt.prompt}${projectContext}

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
- Adoptez un ton sympathique et décontracté, comme un collègue bienveillant
- Utilisez le prénom de l'utilisateur naturellement (sans trop insister)
- Ajoutez des expressions naturelles et chaleureuses
- Évitez les formulations trop formelles ("Monsieur/Madame")
- Soyez enthousiaste et positif tout en restant professionnel

IMPORTANT - Gestion des livrables:
Si l'utilisateur demande un livrable (article, planning, guide, rapport, documentation, etc.):
1. Produisez le contenu demandé de manière complète et structurée
2. À la fin, demandez TOUJOURS : "📁 Souhaitez-vous que je sauvegarde ce document dans votre Drive projet (dossier IA) au format Word (.docx) ?"
3. Si l'utilisateur répond oui/ok/d'accord/bien sûr/absolument/avec plaisir, votre réponse doit TOUJOURS terminer par:
   [SAVE_TO_DRIVE: nom_du_fichier.docx]
   où nom_du_fichier est un nom descriptif basé sur le contenu (ex: article_marketing_digital.docx, planning_projet_2025.docx)

IMPORTANT: Quand l'utilisateur confirme qu'il veut sauvegarder (avec oui, ok, d'accord, etc.), vous DEVEZ obligatoirement ajouter le tag [SAVE_TO_DRIVE: nom_fichier.docx] à la FIN de votre message, après tout le contenu.`

    // 5. Appel à OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openaiApiKey) {
      console.warn('⚠️ Clé OpenAI non configurée, utilisation d\'une réponse simulée')

      // Réponse simulée pour le développement avec contexte projet
      const simulatedResponse = generateSimulatedResponse(userMessage, prompt.name, historyText, projectContext)

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
      throw new Error('OpenAI API error: ' + openaiResponse.statusText)
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

// Fonction pour générer l'embedding d'une requête
async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

  if (!openaiApiKey) {
    return null
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limiter la taille
      }),
    })

    if (!response.ok) {
      console.error('❌ Erreur génération embedding requête')
      return null
    }

    const data = await response.json()
    return data.data?.[0]?.embedding || null
  } catch (error) {
    console.error('❌ Erreur embedding:', error)
    return null
  }
}

// Fonction pour générer une réponse simulée pendant le développement
function generateSimulatedResponse(userMessage: string, promptName: string, historyText: string, projectContext: string = ''): string {
  console.log('🔍 [generateSimulatedResponse] Analyse:', {
    userMessage: userMessage.slice(0, 100),
    hasAskedAboutSaving: historyText.includes('Souhaitez-vous que je sauvegarde'),
    historyLength: historyText.length
  });

  // Vérifier si l'utilisateur confirme la sauvegarde
  const confirmWords = ['oui', 'ok', "d'accord", 'bien sûr', 'absolument', 'avec plaisir', 'parfait', 'super', 'yes', 'allez-y', 'go', 'allons-y', 'enregistre'];
  const isConfirmation = confirmWords.some(word => userMessage.toLowerCase().includes(word));
  const hasAskedAboutSaving = historyText.includes('Souhaitez-vous que je sauvegarde') ||
                               historyText.includes('sauvegarde ce document') ||
                               historyText.includes('sauvegarde cet article') ||
                               historyText.includes('enregistrerai sous le nom') ||
                               userMessage.toLowerCase().includes('enregistrer');

  console.log('✅ [generateSimulatedResponse] Détection confirmation:', {
    isConfirmation,
    hasAskedAboutSaving,
    matchedWords: confirmWords.filter(word => userMessage.toLowerCase().includes(word))
  });

  // Si c'est une confirmation de sauvegarde
  if (isConfirmation && hasAskedAboutSaving) {
    const timestamp = Date.now();
    // Générer un nom de fichier plus descriptif basé sur le contexte
    let fileName = 'document_ia_' + timestamp + '.docx';

    // Essayer de deviner le type de document depuis l'historique
    if (historyText.includes('article') || historyText.includes('blog')) {
      fileName = 'article_' + timestamp + '.docx';
    } else if (historyText.includes('planning') || historyText.includes('calendrier')) {
      fileName = 'planning_' + timestamp + '.xlsx'; // Excel pour les plannings
    } else if (historyText.includes('guide') || historyText.includes('manuel')) {
      fileName = 'guide_' + timestamp + '.pdf'; // PDF pour les guides
    } else if (historyText.includes('rapport') || historyText.includes('analyse')) {
      fileName = 'rapport_' + timestamp + '.pdf'; // PDF pour les rapports
    } else if (historyText.includes('tableau') || historyText.includes('données') || historyText.includes('statistiques')) {
      fileName = 'donnees_' + timestamp + '.csv'; // CSV pour les données
    } else if (historyText.includes('présentation') || historyText.includes('slides')) {
      fileName = 'presentation_' + timestamp + '.docx'; // Word pour les présentations
    }

    console.log('💾 [generateSimulatedResponse] Génération avec SAVE_TO_DRIVE:', fileName);

    // IMPORTANT: Le tag SAVE_TO_DRIVE doit être à la FIN du message
    const responseMessage = 'Super ! 🎉 Je m\'occupe de sauvegarder ça pour vous !\n\n' +
                          '📁 Le fichier "' + fileName + '" est maintenant disponible dans le dossier IA de votre Drive.\n\n' +
                          'Vous pouvez le télécharger, le modifier ou le partager avec l\'équipe.\n\n' +
                          '✅ Document sauvegardé avec succès !\n\n' +
                          '[SAVE_TO_DRIVE: ' + fileName + ']';

    console.log('🔍 [generateSimulatedResponse] Réponse avec tag:', responseMessage.includes('[SAVE_TO_DRIVE:'));
    return responseMessage;
  }
  // Vérifier si la demande concerne un livrable (article, guide, etc.)
  const isDeliverableRequest = userMessage.toLowerCase().includes('article') ||
                               userMessage.toLowerCase().includes('guide') ||
                               userMessage.toLowerCase().includes('rapport') ||
                               userMessage.toLowerCase().includes('document') ||
                               userMessage.toLowerCase().includes('planning') ||
                               userMessage.toLowerCase().includes('présentation') ||
                               userMessage.toLowerCase().includes('rédige') ||
                               userMessage.toLowerCase().includes('écris') ||
                               userMessage.toLowerCase().includes('crée');

  const responses = {
    'Concepteur rédacteur IA': [
      'Ah, un article sur "' + userMessage.slice(0, 50) + '" ? Avec plaisir ! 😊\n\n# ' + userMessage + '\n\n## Introduction\nAlors, parlons de ça ! ' + userMessage + ', c\'est un sujet vraiment intéressant qui mérite qu\'on s\'y attarde.' + (projectContext ? '\n\nDans le contexte de votre projet, j\'ai noté quelques éléments pertinents que je vais intégrer.' : '') + '\n\n## Les points clés\n- 🎯 D\'abord, analysons le contexte\n- 💡 Ensuite, explorons les solutions possibles\n- 🚀 Et enfin, passons à l\'action !\n\n## Pour conclure\nJ\'espère que cet article vous aide ! N\'hésitez pas si vous voulez que j\'approfondisse certains points.\n\n*Rédigé avec enthousiasme le ' + new Date().toLocaleDateString('fr-FR') + '* 🎆\n\n' + (isDeliverableRequest ? '📁 Ça vous dit que je sauvegarde ce document dans votre Drive ? (dossier IA, format Word)' : 'Autre chose ?'),

      'OK, let\'s go ! 🚀\n\n# ' + userMessage + '\n\n## Alors, qu\'est-ce qu\'on a là ?\n\n' + userMessage + '... Intéressant ! Laissez-moi vous proposer quelque chose de sympa.\n\n### Voici mon plan d\'attaque :\n1. **D\'abord** : On clarifie l\'objectif 🎯\n2. **Ensuite** : On explore les options 🔍\n3. **Enfin** : On passe à l\'action ! 💪\n\n### En résumé\nJ\'ai hâte de voir ce que ça va donner ! Vous me dites si ça vous convient ?\n\n' + (isDeliverableRequest ? '📁 Je peux sauvegarder tout ça dans votre Drive si vous voulez (format Word, dans le dossier IA) ?' : 'Besoin d\'autre chose ? Je suis là ! 🙂'),

      '📝 **Document rédactionnel généré**\n\n# ' + userMessage + '\n\n## Contenu structuré\n\nJe vais créer un contenu professionnel répondant à votre demande :\n\n### Section 1 : Présentation\n- Contexte : ' + userMessage.slice(0, 100) + '\n- Objectifs définis\n- Approche méthodologique\n\n### Section 2 : Développement\n- Analyse approfondie du sujet\n- Solutions pratiques\n- Recommandations d\'experts\n\n### Section 3 : Conclusion\n- Synthèse des points clés\n- Actions recommandées\n- Perspectives d\'évolution\n\n*Document généré par l\'IA rédactrice le ' + new Date().toLocaleDateString('fr-FR') + '*\n\n📁 Souhaitez-vous que je sauvegarde ce document dans votre Drive projet (dossier IA) ?\n' +
      (userMessage.toLowerCase().includes('planning') || userMessage.toLowerCase().includes('calendrier') ? '\nFormat suggéré: Excel (.xlsx) pour les données structurées' :
       userMessage.toLowerCase().includes('rapport') || userMessage.toLowerCase().includes('analyse') ? '\nFormat suggéré: PDF (.pdf) pour les rapports formels' :
       userMessage.toLowerCase().includes('tableau') || userMessage.toLowerCase().includes('données') ? '\nFormat suggéré: CSV (.csv) pour les données' :
       '\nFormat suggéré: Word (.docx) pour les documents texte')
    ]
  }

  const promptResponses = responses[promptName] || responses['Concepteur rédacteur IA']
  const randomResponse = promptResponses[Math.floor(Math.random() * promptResponses.length)]

  return randomResponse
}