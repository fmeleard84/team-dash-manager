import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface QuestionGenerationRequest {
  profile: string;
  seniority: string;
  languages: string[];
  expertises: string[];
  count?: number;
}

interface GeneratedQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedKeywords?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { profile, seniority, languages, expertises, count = 10 }: QuestionGenerationRequest = await req.json();

    console.log('🎯 Génération de questions pour:', { profile, seniority, languages, expertises });

    // Créer le prompt pour OpenAI
    const systemPrompt = `Tu es un expert en recrutement IT et évaluation de compétences.
    Tu dois générer ${count} questions de qualification professionnelle pour évaluer un candidat.

    Les questions doivent être:
    - Pertinentes par rapport au profil et au niveau
    - Variées (techniques, comportementales, situationnelles)
    - Progressives en difficulté
    - En français
    - Évaluables objectivement

    Format de réponse JSON attendu:
    {
      "questions": [
        {
          "id": "q1",
          "question": "La question ici",
          "category": "technical|behavioral|situational",
          "difficulty": "easy|medium|hard",
          "expectedKeywords": ["mot-clé1", "mot-clé2"]
        }
      ]
    }`;

    const userPrompt = `Génère ${count} questions pour évaluer un ${profile} ${seniority}.

    Langues requises: ${languages.join(', ')}
    Expertises à valider: ${expertises.join(', ')}

    Répartition souhaitée:
    - 4 questions techniques (sur les expertises mentionnées)
    - 3 questions comportementales (gestion de projet, travail en équipe)
    - 3 questions situationnelles (résolution de problèmes, cas pratiques)

    Pour un ${seniority}, adapte la complexité des questions.`;

    // Appel à OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erreur OpenAI:', error);
      throw new Error('Erreur lors de la génération des questions');
    }

    const data = await response.json();
    const generatedContent = JSON.parse(data.choices[0].message.content);

    console.log('✅ Questions générées:', generatedContent.questions.length);

    return new Response(
      JSON.stringify({
        success: true,
        questions: generatedContent.questions,
        metadata: {
          profile,
          seniority,
          languages,
          expertises,
          generatedAt: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in generate-qualification-questions:', error);

    // Retourner des questions par défaut en cas d'erreur
    const defaultQuestions = generateDefaultQuestions();

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        questions: defaultQuestions,
        isDefault: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // On retourne 200 même en cas d'erreur pour que le front puisse gérer
      }
    );
  }
});

// Questions par défaut en cas d'erreur
function generateDefaultQuestions(): GeneratedQuestion[] {
  return [
    {
      id: 'q1',
      question: 'Décrivez votre expérience professionnelle la plus significative dans votre domaine.',
      category: 'behavioral',
      difficulty: 'easy',
      expectedKeywords: ['expérience', 'projet', 'résultat']
    },
    {
      id: 'q2',
      question: 'Quelles sont vos principales compétences techniques et comment les avez-vous acquises ?',
      category: 'technical',
      difficulty: 'easy',
      expectedKeywords: ['compétences', 'formation', 'pratique']
    },
    {
      id: 'q3',
      question: 'Comment gérez-vous les priorités lorsque vous avez plusieurs projets en parallèle ?',
      category: 'behavioral',
      difficulty: 'medium',
      expectedKeywords: ['priorités', 'organisation', 'planification']
    },
    {
      id: 'q4',
      question: 'Décrivez une situation où vous avez dû résoudre un problème technique complexe.',
      category: 'situational',
      difficulty: 'medium',
      expectedKeywords: ['problème', 'solution', 'méthodologie']
    },
    {
      id: 'q5',
      question: 'Quelle est votre approche pour rester à jour avec les nouvelles technologies ?',
      category: 'behavioral',
      difficulty: 'easy',
      expectedKeywords: ['veille', 'formation', 'apprentissage']
    },
    {
      id: 'q6',
      question: 'Comment collaborez-vous avec une équipe distribuée ou en remote ?',
      category: 'behavioral',
      difficulty: 'medium',
      expectedKeywords: ['communication', 'collaboration', 'outils']
    },
    {
      id: 'q7',
      question: 'Expliquez un concept technique complexe de votre domaine de manière simple.',
      category: 'technical',
      difficulty: 'hard',
      expectedKeywords: ['vulgarisation', 'pédagogie', 'clarté']
    },
    {
      id: 'q8',
      question: 'Décrivez une situation où vous avez dû gérer un conflit dans une équipe.',
      category: 'situational',
      difficulty: 'hard',
      expectedKeywords: ['conflit', 'résolution', 'communication']
    },
    {
      id: 'q9',
      question: 'Quels sont vos objectifs de carrière à moyen terme ?',
      category: 'behavioral',
      difficulty: 'medium',
      expectedKeywords: ['objectifs', 'évolution', 'ambitions']
    },
    {
      id: 'q10',
      question: 'Comment évaluez-vous la qualité de votre travail ?',
      category: 'technical',
      difficulty: 'medium',
      expectedKeywords: ['qualité', 'critères', 'amélioration']
    }
  ];
}