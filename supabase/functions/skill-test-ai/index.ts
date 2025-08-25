import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration OpenAI
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface CandidateInfo {
  firstName: string;
  lastName: string;
  jobTitle: string;
  seniority: string;
  expertises: string[];
  languages: string[];
  category: string;
}

interface RequestBody {
  action: 'start' | 'question' | 'answer' | 'evaluate' | 'tts' | 'transcribe' | 'direct_audio';
  candidateInfo?: CandidateInfo;
  questionNumber?: number;
  userAnswer?: string;
  previousQA?: Array<{question: string; answer: string}>;
  allAnswers?: string[];
  text?: string; // Pour TTS
  audio?: string; // Pour Whisper ou direct (base64)
  context?: string; // Contexte pour l'audio direct
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData = await req.json() as RequestBody;
    const { action, candidateInfo, questionNumber = 1, userAnswer, previousQA = [], allAnswers = [] } = requestData;

    // Gérer l'audio direct (transcription + traitement + TTS en une fois)
    if (action === 'direct_audio') {
      try {
        const { audio: audioData, context, candidateInfo, questionNumber, previousQA } = requestData;
        
        if (!audioData) {
          throw new Error('Audio requis pour le traitement direct');
        }

        console.log('🎵 Audio direct, contexte:', context, 'Question:', questionNumber);

        // Étape 1: Transcrire l'audio avec Whisper
        const audioBlob = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
        const formData = new FormData();
        formData.append('file', new Blob([audioBlob], { type: 'audio/webm' }), 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'fr');

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (!whisperResponse.ok) {
          console.error('Erreur Whisper:', whisperResponse.status);
          throw new Error(`Erreur transcription: ${whisperResponse.status}`);
        }

        const transcriptionData = await whisperResponse.json();
        const userText = transcriptionData.text || "";
        console.log('📝 Transcription:', userText);

        // Étape 2: Déterminer l'action basée sur le contexte et la transcription
        let systemPrompt = '';
        let userPrompt = '';
        let shouldStartTest = false;
        let nextQuestion = questionNumber || 0;

        // Vérifier si on doit démarrer le test
        if (context === 'start' && !questionNumber) {
          const startKeywords = ['oui', 'prêt', 'ok', 'vas-y', 'aller', 'parti', 'commence', 'd\'accord'];
          shouldStartTest = startKeywords.some(keyword => userText.toLowerCase().includes(keyword));
          
          if (shouldStartTest) {
            nextQuestion = 1;
            systemPrompt = `Tu es un évaluateur pour Ialla. Tu dois poser une question professionnelle 
                           à ${candidateInfo?.firstName} pour le poste de ${candidateInfo?.jobTitle}.
                           C'est la question 1/10. Sois direct et professionnel.`;
            userPrompt = `Pose la première question d'évaluation pour un ${candidateInfo?.jobTitle} niveau ${candidateInfo?.seniority}.
                         La question doit être pertinente et évaluer ses compétences.`;
          } else {
            systemPrompt = 'Tu es un assistant. Le candidat n\'est pas encore prêt.';
            userPrompt = 'Réponds de manière encourageante et redemande s\'il est prêt.';
          }
        } else if (questionNumber && questionNumber > 0) {
          // Traiter une réponse à une question
          systemPrompt = `Tu es un évaluateur. Le candidat vient de répondre à la question ${questionNumber}.
                         Donne une courte réaction positive, puis pose la question ${questionNumber + 1}/10.`;
          userPrompt = `Réponse du candidat: "${userText}".
                       Donne une réaction courte (10 mots max) puis pose une nouvelle question pertinente.`;
          nextQuestion = questionNumber + 1;
        }

        // Étape 3: Obtenir la réponse de l'IA
        const gptResponse = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 200,
          }),
        });

        if (!gptResponse.ok) {
          console.error('Erreur GPT:', gptResponse.status);
          throw new Error(`Erreur IA: ${gptResponse.status}`);
        }

        const gptData = await gptResponse.json();
        const aiResponse = gptData.choices[0].message.content;

        // Étape 4: Convertir la réponse en audio
        const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: aiResponse,
            voice: 'nova',
            response_format: 'mp3'
          }),
        });

        if (!ttsResponse.ok) {
          throw new Error(`Erreur TTS: ${ttsResponse.status}`);
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        const uint8Array = new Uint8Array(audioBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);

        return new Response(
          JSON.stringify({ 
            success: true, 
            audio: base64Audio,
            text: aiResponse,
            transcription: userText,
            format: 'mp3',
            testStarted: shouldStartTest,
            nextQuestion: nextQuestion
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Erreur audio direct:', error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error.message
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Gérer les actions audio séparément
    if (action === 'tts' || action === 'transcribe') {
      try {
        if (action === 'tts') {
          const { text } = requestData;
          
          if (!text) {
            throw new Error('Texte requis pour la synthèse vocale');
          }

          console.log('TTS request for text length:', text.length);
          console.log('Using OpenAI API Key:', OPENAI_API_KEY ? `Present (starts with: ${OPENAI_API_KEY.substring(0, 7)})` : 'Key missing');

          if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
            console.error('No OpenAI API key configured');
            throw new Error('OpenAI API key not configured');
          }

          const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'tts-1',
              input: text,
              voice: 'nova', // Options: alloy, echo, fable, onyx, nova, shimmer
              response_format: 'mp3'
            }),
          });

          if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error('TTS API error:', ttsResponse.status, errorText);
            throw new Error(`Erreur TTS: ${ttsResponse.status} - ${errorText}`);
          }

          const audioBuffer = await ttsResponse.arrayBuffer();
          console.log('Audio buffer size:', audioBuffer.byteLength);
          
          // Convertir en base64 de manière plus robuste
          const uint8Array = new Uint8Array(audioBuffer);
          let binary = '';
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64Audio = btoa(binary);

          return new Response(
            JSON.stringify({ 
              success: true, 
              audio: base64Audio,
              format: 'mp3'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (action === 'transcribe') {
          const { audio: audioData } = requestData;
          
          if (!audioData) {
            throw new Error('Audio requis pour la transcription');
          }

          console.log('Transcribe request, audio data length:', audioData.length);

          // Convertir base64 en blob
          const audioBlob = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
          
          const formData = new FormData();
          formData.append('file', new Blob([audioBlob], { type: 'audio/webm' }), 'audio.webm');
          formData.append('model', 'whisper-1');
          formData.append('language', 'fr');

          const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: formData,
          });

          if (!whisperResponse.ok) {
            const errorText = await whisperResponse.text();
            console.error('Whisper API error:', whisperResponse.status, errorText);
            throw new Error(`Erreur transcription: ${whisperResponse.status} - ${errorText}`);
          }

          const transcriptionData = await whisperResponse.json();

          return new Response(
            JSON.stringify({ 
              success: true, 
              text: transcriptionData.text
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (audioError) {
        console.error('Audio processing error:', audioError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: audioError.message,
            message: 'Erreur lors du traitement audio. Le test continue en mode texte.'
          }),
          { 
            status: 200, // On retourne 200 pour éviter l'erreur côté client
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Gérer les actions de chat
    let systemPrompt = '';
    let userPrompt = '';
    let temperature = 0.7;
    let maxTokens = 500;

    switch (action) {
      case 'start':
        // Message de bienvenue personnalisé
        systemPrompt = `Tu es un évaluateur sympa et jovial pour Ialla. 
        Tu dois accueillir chaleureusement le candidat avec enthousiasme.
        Utilise son prénom, sois décontracté mais professionnel. Tutoie le candidat.`;
        
        userPrompt = `Le candidat s'appelle ${candidateInfo?.firstName}.
        C'est un(e) ${candidateInfo?.jobTitle}.
        
        Génère un message de bienvenue court et dynamique qui :
        1. L'accueille par son prénom avec enthousiasme
        2. Dit qu'on va discuter ensemble pendant 10 questions
        3. Le rassure : c'est une conversation sympa, pas un examen
        4. Lui demande s'il est prêt(e) à démarrer
        5. Utilise des emojis avec parcimonie (1-2 max)`;
        break;

      case 'question':
        // Génération de question personnalisée
        systemPrompt = `Tu es un évaluateur sympa et curieux. Tu poses des questions variées.
        50% de questions techniques sur les compétences/expertises.
        50% de questions sur les soft skills, le travail en équipe, la gestion du stress, l'organisation, etc.
        
        Sois direct, évite les répétitions. Utilise le prénom du candidat occasionnellement.
        Tutoie le candidat. Sois décontracté mais professionnel.`;
        
        userPrompt = `Candidat : ${candidateInfo?.firstName}
        Expertises : ${candidateInfo?.expertises?.join(', ')}
        
        C'est la question ${questionNumber}/10.
        
        ${previousQA.length > 0 ? `Déjà posé: ${previousQA.map(qa => qa.question.substring(0, 50)).join('...')}` : ''}
        
        Génère UNE question courte et directe.
        Si ${questionNumber} est pair : question sur les soft skills/humain
        Si ${questionNumber} est impair : question technique sur les expertises
        
        Commence simplement par "Question ${questionNumber}/10 :"
        Maximum 2 lignes. Pas de formules de politesse.`;
        break;

      case 'answer':
        // Réaction à la réponse du candidat
        systemPrompt = `Tu es un évaluateur sympa et professionnel.
        Tu dois réagir BRIÈVEMENT et DE MANIÈRE PERTINENTE à la réponse du candidat.
        Montre que tu as écouté et compris sa réponse.`;
        
        userPrompt = `Le candidat vient de répondre : "${userAnswer}"
        
        Donne une courte réaction (10-15 mots max) qui :
        1. Montre que tu as compris sa réponse
        2. Est encourageante et professionnelle
        3. Fait référence à un élément de sa réponse si possible
        
        Exemples selon le contexte :
        - Si bonne stratégie : "Excellente approche avec l'inbound marketing !"
        - Si expérience pertinente : "Cette expérience chez SFR est très intéressante !"
        - Si soft skill : "J'apprécie cette capacité d'adaptation !"
        - Si réponse courte : "D'accord, merci pour cette précision !"
        
        ${questionNumber < 10 ? 'Ne mentionne PAS la question suivante.' : 'C\'était la dernière question !'}`;
        maxTokens = 100;
        break;

      case 'evaluate':
        // Évaluation finale INTERNE (ne sera pas montrée au candidat)
        systemPrompt = `Tu es un évaluateur expert. Analyse les réponses et donne UNIQUEMENT une note.
        
        Barème :
        - 8-10/10 : Validé
        - 5-7/10 : En attente 
        - 0-4/10 : Non validé`;
        
        userPrompt = `Évalue les réponses du candidat.
        
        Réponses : ${allAnswers.slice(0, 3).join('...')}
        
        Réponds UNIQUEMENT avec :
        Note: X/10
        
        Rien d'autre. Juste la note.`;
        maxTokens = 50;
        temperature = 0.3;
        break;

      default:
        throw new Error('Action non reconnue');
    }

    // Appel à OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      // Si OpenAI n'est pas disponible, utiliser des réponses par défaut
      console.error('OpenAI API error:', response.status);
      
      // Réponses de fallback
      let fallbackResponse = '';
      switch (action) {
        case 'start':
          fallbackResponse = `Bonjour ${candidateInfo?.firstName} ! 👋

Je suis ravi de vous accueillir pour cette évaluation de vos compétences en tant que ${candidateInfo?.jobTitle} de niveau ${candidateInfo?.seniority}.

Je vais vous poser 10 questions personnalisées qui nous permettront d'évaluer vos connaissances et votre expérience. N'ayez aucune inquiétude, il s'agit d'une conversation professionnelle, pas d'un interrogatoire !

Prenez votre temps pour répondre. Un chronomètre va démarrer pour référence, mais rappelez-vous : la qualité de vos réponses est bien plus importante que la vitesse.

Êtes-vous prêt(e) à commencer ? Répondez simplement "oui" ou "je suis prêt(e)" quand vous voulez démarrer.`;
          break;
          
        case 'question':
          const questions = [
            `Question ${questionNumber}/10 : Pouvez-vous me décrire votre expérience la plus significative en tant que ${candidateInfo?.jobTitle} et ce que vous en avez appris ?`,
            `Question ${questionNumber}/10 : Comment gérez-vous les priorités lorsque plusieurs projets urgents arrivent simultanément ?`,
            `Question ${questionNumber}/10 : Quelle est votre approche pour rester à jour avec les évolutions dans votre domaine ?`,
            `Question ${questionNumber}/10 : Décrivez une situation où vous avez dû résoudre un problème technique complexe. Quelle a été votre méthodologie ?`,
            `Question ${questionNumber}/10 : Comment collaborez-vous avec des équipes ayant des niveaux techniques différents ?`,
            `Question ${questionNumber}/10 : Quel projet récent vous a le plus challengé et pourquoi ?`,
            `Question ${questionNumber}/10 : Comment assurez-vous la qualité de votre travail sous pression ?`,
            `Question ${questionNumber}/10 : Quelle est votre vision des bonnes pratiques dans votre métier ?`,
            `Question ${questionNumber}/10 : Comment abordez-vous l'apprentissage de nouvelles technologies ou méthodologies ?`,
            `Question ${questionNumber}/10 : Si vous deviez former un junior sur votre métier, par quoi commenceriez-vous ?`
          ];
          fallbackResponse = questions[Math.min(questionNumber - 1, questions.length - 1)];
          break;
          
        case 'answer':
          if (questionNumber < 10) {
            fallbackResponse = "Merci pour votre réponse détaillée ! Passons à la question suivante.";
          } else {
            fallbackResponse = "Excellent ! Vous avez terminé toutes les questions. Je vais maintenant analyser vos réponses...";
          }
          break;
          
        case 'evaluate':
          fallbackResponse = `**Évaluation de ${candidateInfo?.firstName} ${candidateInfo?.lastName}**

**Note : 7/10**
**Statut : En attente - Validation après entretien approfondi**

**Points forts identifiés :**
• Bonne compréhension générale du métier de ${candidateInfo?.jobTitle}
• Capacité à structurer ses réponses
• Expérience pratique démontrée
• Motivation et engagement évidents

**Axes d'amélioration :**
• Approfondir certains aspects techniques spécifiques
• Développer davantage les exemples concrets

**Recommandation :**
Profil prometteur qui mérite un entretien technique approfondi pour valider complètement les compétences. La motivation et les bases sont solides.`;
          break;
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: fallbackResponse,
          isSimulated: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Pour l'évaluation, extraire la note
    let score = null;
    let status = null;
    if (action === 'evaluate') {
      const scoreMatch = aiResponse.match(/Note\s*:\s*(\d+)\/10/i);
      if (scoreMatch) {
        score = parseInt(scoreMatch[1]);
        status = score >= 8 ? 'validated' : score >= 5 ? 'pending' : 'rejected';
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: aiResponse,
        score,
        status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});