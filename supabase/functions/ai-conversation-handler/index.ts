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

    // 4. Appel à OpenAI (simulé pour l'instant)
    // TODO: Remplacer par un vrai appel OpenAI avec la clé API configurée
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openaiApiKey) {
      console.warn('⚠️ Clé OpenAI non configurée, utilisation d\'une réponse simulée')

      // Réponse simulée pour le développement
      const simulatedResponse = generateSimulatedResponse(userMessage, prompt.name, historyText)

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

// Fonction pour générer une réponse simulée pendant le développement
function generateSimulatedResponse(userMessage: string, promptName: string, historyText: string): string {
  console.log('🔍 [generateSimulatedResponse] Analyse:', {
    userMessage: userMessage.slice(0, 100),
    hasAskedAboutSaving: historyText.includes('Souhaitez-vous que je sauvegarde'),
    historyLength: historyText.length
  });

  // Vérifier si l'utilisateur confirme la sauvegarde
  const confirmWords = ['oui', 'ok', "d'accord", 'bien sûr', 'absolument', 'avec plaisir', 'parfait', 'super', 'yes', 'allez-y', 'go', 'allons-y'];
  const isConfirmation = confirmWords.some(word => userMessage.toLowerCase().includes(word));
  const hasAskedAboutSaving = historyText.includes('Souhaitez-vous que je sauvegarde') || historyText.includes('sauvegarde ce document');

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

    return 'Super ! 🎉 Je m\'occupe de sauvegarder ça pour vous !\n\n📁 Le fichier "' + fileName + '" sera dispo dans quelques secondes dans le dossier IA de votre Drive.\n\nVous pourrez le télécharger, le modifier ou le partager avec l\'équipe. Pratique, non ? 😊\n\n✅ Et voilà, c\'est fait !\n\n[SAVE_TO_DRIVE: ' + fileName + ']';
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
      'Ah, un article sur "' + userMessage.slice(0, 50) + '" ? Avec plaisir ! 😊\n\n# ' + userMessage + '\n\n## Introduction\nAlors, parlons de ça ! ' + userMessage + ', c\'est un sujet vraiment intéressant qui mérite qu\'on s\'y attarde.\n\n## Les points clés\n- 🎯 D\'abord, analysons le contexte\n- 💡 Ensuite, explorons les solutions possibles\n- 🚀 Et enfin, passons à l\'action !\n\n## Pour conclure\nJ\'espère que cet article vous aide ! N\'hésitez pas si vous voulez que j\'approfondisse certains points.\n\n*Rédigé avec enthousiasme le ' + new Date().toLocaleDateString('fr-FR') + '* 🎆\n\n' + (isDeliverableRequest ? '📁 Ça vous dit que je sauvegarde ce document dans votre Drive ? (dossier IA, format Word)' : 'Autre chose ?'),

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