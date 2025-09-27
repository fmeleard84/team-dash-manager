/**
 * Service API IA QUALIFICATION - Couche d'abstraction pour tous les appels
 *
 * Service centralisé pour :
 * - Génération de questions adaptées via IA
 * - Gestion des sessions de test en temps réel
 * - Scoring automatique et analyse des réponses
 * - Intégration OpenAI Realtime API
 * - Persistance des résultats en base Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  QualificationTest,
  Question,
  Answer,
  CandidateProfile,
  TestConfig,
  TestSession,
  AIAnalysis,
  Recommendation,
  QualificationAPIResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  StartSessionRequest,
  StartSessionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  QuestionCategory,
  QuestionDifficulty,
  QualificationLevel
} from '../types';

export class QualificationAPI {
  private static readonly API_BASE = 'https://api.openai.com/v1';
  private static readonly REALTIME_URL = 'wss://api.openai.com/v1/realtime';

  // ==========================================
  // GESTION DES TESTS
  // ==========================================

  /**
   * Crée un nouveau test de qualification
   */
  static async createTest(
    candidateProfile: CandidateProfile,
    config: Partial<TestConfig> = {}
  ): Promise<QualificationAPIResponse<QualificationTest>> {
    try {
      // Configuration par défaut
      const defaultConfig: TestConfig = {
        maxQuestions: 10,
        timePerQuestion: 120,
        adaptiveMode: true,
        categories: ['technical', 'behavioral', 'problem_solving'],
        difficulties: ['medium'],
        profession: candidateProfile.profession,
        seniority: candidateProfile.seniority,
        audioConfig: {
          sampleRate: 24000,
          channels: 1,
          enableNoiseReduction: true,
          enableEchoCancellation: true
        },
        passingScore: 60,
        scoringWeights: {
          technical: 0.4,
          communication: 0.2,
          problemSolving: 0.3,
          experience: 0.1
        }
      };

      const finalConfig = { ...defaultConfig, ...config };

      // Créer le test en base
      const { data: testData, error: testError } = await supabase
        .from('qualification_tests')
        .insert({
          candidate_id: candidateProfile.id,
          candidate_profile: candidateProfile,
          test_config: finalConfig,
          status: 'initialized',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (testError) throw testError;

      // Générer les questions initiales
      const questionsResponse = await this.generateQuestions({
        candidateProfile,
        testConfig: finalConfig
      });

      if (!questionsResponse.success) {
        throw new Error(questionsResponse.error || 'Erreur lors de la génération des questions');
      }

      const questions = questionsResponse.data?.questions || [];

      // Mettre à jour le test avec les questions
      const { data: updatedTest, error: updateError } = await supabase
        .from('qualification_tests')
        .update({
          questions,
          updated_at: new Date().toISOString()
        })
        .eq('id', testData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const qualificationTest: QualificationTest = {
        id: updatedTest.id,
        candidateId: candidateProfile.id,
        candidateProfile,
        testConfig: finalConfig,
        questions,
        answers: [],
        overallScore: 0,
        status: 'initialized',
        qualificationLevel: 'needs_review',
        startedAt: updatedTest.started_at,
        aiAnalysis: {
          technicalSkills: 0,
          communicationSkills: 0,
          problemSolvingSkills: 0,
          experienceLevel: 0,
          strengths: [],
          weaknesses: [],
          improvementAreas: [],
          overallConfidence: 0,
          reliabilityScore: 0,
          peerComparison: {
            percentile: 0,
            averageScore: 0,
            sampleSize: 0
          },
          modelVersion: 'gpt-4o-realtime',
          analysisTimestamp: new Date().toISOString(),
          processingTimeMs: 0
        },
        recommendations: []
      };

      return {
        success: true,
        data: qualificationTest,
        message: 'Test créé avec succès'
      };

    } catch (error) {
      console.error('Error creating qualification test:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la création du test'
      };
    }
  }

  /**
   * Génère des questions adaptées au profil du candidat
   */
  static async generateQuestions(
    request: GenerateQuestionsRequest
  ): Promise<QualificationAPIResponse<GenerateQuestionsResponse>> {
    try {
      const { candidateProfile, testConfig, excludeQuestions = [] } = request;

      // Prompt pour génération de questions
      const systemPrompt = `
Tu es un expert en recrutement qui génère des questions de qualification technique et comportementale.

Profil candidat :
- Métier : ${candidateProfile.profession || 'Non spécifié'}
- Séniorité : ${candidateProfile.seniority || 'Non spécifiée'}
- Expertises : ${candidateProfile.expertises.join(', ') || 'Aucune'}
- Expérience : ${candidateProfile.yearsOfExperience || 'Non spécifiée'} ans

Configuration du test :
- Nombre de questions : ${testConfig.maxQuestions}
- Catégories : ${testConfig.categories.join(', ')}
- Difficultés : ${testConfig.difficulties.join(', ')}
- Mode adaptatif : ${testConfig.adaptiveMode ? 'Activé' : 'Désactivé'}

Génère ${testConfig.maxQuestions} questions variées qui testent :
1. Compétences techniques spécifiques au métier
2. Capacité de résolution de problèmes
3. Communication et soft skills
4. Expérience pratique

Format de réponse attendu : JSON avec un array "questions", chaque question ayant :
{
  "id": "unique_id",
  "question": "La question complète",
  "category": "technical|behavioral|situational|problem_solving|communication|experience",
  "difficulty": "easy|medium|hard|expert",
  "expectedKeywords": ["mot-clé1", "mot-clé2"],
  "metadata": {
    "profession": "${candidateProfile.profession}",
    "seniority": "${candidateProfile.seniority}",
    "estimatedDuration": 120
  }
}`;

      // Appel à OpenAI pour générer les questions
      const response = await fetch(`${this.API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Génère les questions de qualification maintenant.' }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const generatedContent = JSON.parse(aiResponse.choices[0].message.content);

      // Filtrer les questions exclues
      const questions: Question[] = generatedContent.questions
        .filter((q: Question) => !excludeQuestions.includes(q.id))
        .map((q: any) => ({
          ...q,
          id: q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));

      // Calculer la durée estimée
      const estimatedDuration = questions.reduce((total, q) => {
        return total + (q.metadata?.estimatedDuration || testConfig.timePerQuestion);
      }, 0);

      return {
        success: true,
        data: {
          questions,
          estimatedDuration,
          adaptiveParams: {
            startingDifficulty: this.determineStartingDifficulty(candidateProfile),
            adjustmentStrategy: testConfig.adaptiveMode ? 'balanced' : 'conservative'
          }
        }
      };

    } catch (error) {
      console.error('Error generating questions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la génération des questions'
      };
    }
  }

  /**
   * Démarre une session de test en temps réel
   */
  static async startSession(
    request: StartSessionRequest
  ): Promise<QualificationAPIResponse<StartSessionResponse>> {
    try {
      const { testId, candidateId, audioConfig } = request;

      // Récupérer le test
      const { data: test, error: testError } = await supabase
        .from('qualification_tests')
        .select('*')
        .eq('id', testId)
        .eq('candidate_id', candidateId)
        .single();

      if (testError || !test) {
        throw new Error('Test non trouvé ou accès refusé');
      }

      // Générer une clé éphémère pour OpenAI Realtime
      const ephemeralKey = await this.generateEphemeralKey();

      // Créer la session
      const { data: session, error: sessionError } = await supabase
        .from('qualification_sessions')
        .insert({
          test_id: testId,
          candidate_id: candidateId,
          ephemeral_key: ephemeralKey,
          status: 'active',
          audio_config: audioConfig,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Mettre à jour le statut du test
      await supabase
        .from('qualification_tests')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', testId);

      const firstQuestion = test.questions[0];

      return {
        success: true,
        data: {
          sessionId: session.id,
          connectionParams: {
            ephemeralKey,
            serverUrl: this.REALTIME_URL,
            turnServers: [
              {
                urls: 'stun:stun.l.google.com:19302'
              }
            ]
          },
          firstQuestion
        }
      };

    } catch (error) {
      console.error('Error starting session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du démarrage de la session'
      };
    }
  }

  /**
   * Soumet une réponse et obtient le score
   */
  static async submitAnswer(
    request: SubmitAnswerRequest
  ): Promise<QualificationAPIResponse<SubmitAnswerResponse>> {
    try {
      const { sessionId, questionId, answer } = request;

      // Récupérer la session et le test
      const { data: session, error: sessionError } = await supabase
        .from('qualification_sessions')
        .select(`
          *,
          qualification_tests (*)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session non trouvée');
      }

      const test = session.qualification_tests;
      const question = test.questions.find((q: Question) => q.id === questionId);

      if (!question) {
        throw new Error('Question non trouvée');
      }

      // Analyser la réponse avec l'IA
      const analysisResult = await this.analyzeAnswer(question, answer.userAnswer);

      if (!analysisResult.success) {
        throw new Error('Erreur lors de l\'analyse de la réponse');
      }

      const { score, feedback, keywords } = analysisResult.data!;

      // Créer l'objet Answer complet
      const completeAnswer: Answer = {
        ...answer,
        score,
        feedback,
        keywords
      };

      // Sauvegarder la réponse
      const { error: answerError } = await supabase
        .from('qualification_answers')
        .insert({
          session_id: sessionId,
          question_id: questionId,
          answer_data: completeAnswer,
          score,
          created_at: new Date().toISOString()
        });

      if (answerError) throw answerError;

      // Déterminer la prochaine question
      const currentQuestionIndex = test.questions.findIndex((q: Question) => q.id === questionId);
      const nextQuestion = test.questions[currentQuestionIndex + 1];

      // Calculer le score actuel
      const { data: allAnswers } = await supabase
        .from('qualification_answers')
        .select('score')
        .eq('session_id', sessionId);

      const scores = allAnswers?.map(a => a.score) || [];
      const currentScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;

      return {
        success: true,
        data: {
          score,
          feedback,
          keywords,
          nextQuestion,
          shouldContinue: !!nextQuestion,
          currentProgress: {
            questionsAnswered: scores.length,
            totalQuestions: test.questions.length,
            currentScore
          }
        }
      };

    } catch (error) {
      console.error('Error submitting answer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la soumission de la réponse'
      };
    }
  }

  /**
   * Finalise le test et génère l'analyse complète
   */
  static async finalizeTest(testId: string): Promise<QualificationAPIResponse<QualificationTest>> {
    try {
      // Récupérer toutes les données du test
      const { data: test, error: testError } = await supabase
        .from('qualification_tests')
        .select(`
          *,
          qualification_answers (*)
        `)
        .eq('id', testId)
        .single();

      if (testError || !test) {
        throw new Error('Test non trouvé');
      }

      const answers = test.qualification_answers.map((a: any) => a.answer_data);

      // Calculer le score global
      const scores = answers.map((a: Answer) => a.score);
      const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Déterminer le niveau de qualification
      const qualificationLevel: QualificationLevel =
        overallScore >= 80 ? 'validated' :
        overallScore >= 60 ? 'stand_by' :
        'rejected';

      // Générer l'analyse IA complète
      const aiAnalysis = await this.generateCompleteAnalysis(test, answers, overallScore);

      // Générer les recommandations
      const recommendations = await this.generateRecommendations(test.candidate_profile, aiAnalysis, qualificationLevel);

      // Mettre à jour le test
      const { data: updatedTest, error: updateError } = await supabase
        .from('qualification_tests')
        .update({
          answers,
          overall_score: overallScore,
          qualification_level: qualificationLevel,
          ai_analysis: aiAnalysis,
          recommendations,
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration: Math.floor((Date.now() - new Date(test.started_at).getTime()) / 1000)
        })
        .eq('id', testId)
        .select()
        .single();

      if (updateError) throw updateError;

      const finalTest: QualificationTest = {
        id: updatedTest.id,
        candidateId: updatedTest.candidate_id,
        candidateProfile: updatedTest.candidate_profile,
        testConfig: updatedTest.test_config,
        questions: updatedTest.questions,
        answers,
        overallScore,
        status: 'completed',
        qualificationLevel,
        startedAt: updatedTest.started_at,
        completedAt: updatedTest.completed_at,
        duration: updatedTest.duration,
        aiAnalysis,
        recommendations
      };

      return {
        success: true,
        data: finalTest
      };

    } catch (error) {
      console.error('Error finalizing test:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la finalisation du test'
      };
    }
  }

  // ==========================================
  // MÉTHODES PRIVÉES
  // ==========================================

  /**
   * Analyse une réponse avec l'IA
   */
  private static async analyzeAnswer(
    question: Question,
    userAnswer: string
  ): Promise<QualificationAPIResponse<{
    score: number;
    feedback: string;
    keywords: Answer['keywords'];
  }>> {
    try {
      const prompt = `
Analyse cette réponse à une question de qualification professionnelle.

QUESTION (${question.category} - ${question.difficulty}) :
${question.question}

Mots-clés attendus : ${question.expectedKeywords?.join(', ') || 'Aucun'}

RÉPONSE DU CANDIDAT :
${userAnswer}

Évalue la réponse sur 100 points en considérant :
1. Pertinence technique (40%)
2. Clarté de communication (20%)
3. Profondeur de l'analyse (25%)
4. Expérience pratique démontrée (15%)

Réponds en JSON avec :
{
  "score": number (0-100),
  "feedback": "Feedback constructif en français",
  "keywords": {
    "expected": ["mots-clés attendus"],
    "found": ["mots-clés trouvés dans la réponse"],
    "missing": ["mots-clés importants manquants"]
  }
}`;

      const response = await fetch(`${this.API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Tu es un expert en évaluation de candidats. Analyse objectivement.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const analysis = JSON.parse(aiResponse.choices[0].message.content);

      return {
        success: true,
        data: analysis
      };

    } catch (error) {
      console.error('Error analyzing answer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'analyse de la réponse'
      };
    }
  }

  /**
   * Génère une clé éphémère pour OpenAI Realtime
   */
  private static async generateEphemeralKey(): Promise<string> {
    // Dans un environnement réel, cette clé serait générée côté serveur
    // Pour la démonstration, on utilise une clé simulée
    return `ek_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Détermine la difficulté de départ selon le profil
   */
  private static determineStartingDifficulty(profile: CandidateProfile): QuestionDifficulty {
    const seniority = profile.seniority?.toLowerCase();
    const experience = profile.yearsOfExperience || 0;

    if (seniority === 'expert' || experience > 10) return 'hard';
    if (seniority === 'senior' || experience > 5) return 'medium';
    if (seniority === 'confirmé' || experience > 2) return 'medium';
    return 'easy';
  }

  /**
   * Génère l'analyse IA complète
   */
  private static async generateCompleteAnalysis(
    test: any,
    answers: Answer[],
    overallScore: number
  ): Promise<AIAnalysis> {
    // Simulation d'une analyse IA complète
    // Dans un environnement réel, ceci ferait appel à un modèle d'analyse plus sophistiqué

    return {
      technicalSkills: Math.round(overallScore * (0.9 + Math.random() * 0.2)),
      communicationSkills: Math.round(overallScore * (0.8 + Math.random() * 0.3)),
      problemSolvingSkills: Math.round(overallScore * (0.85 + Math.random() * 0.25)),
      experienceLevel: Math.round(overallScore * (0.75 + Math.random() * 0.4)),

      strengths: [
        'Communication claire et structurée',
        'Bonne maîtrise des concepts techniques',
        'Approche méthodique dans la résolution de problèmes'
      ],
      weaknesses: [
        'Manque de détails dans certaines explications',
        'Pourrait développer davantage les aspects pratiques'
      ],
      improvementAreas: [
        'Approfondissement des connaissances avancées',
        'Amélioration de la communication technique',
        'Développement de l\'expérience pratique'
      ],

      overallConfidence: 0.85,
      reliabilityScore: 0.92,

      peerComparison: {
        percentile: Math.round(overallScore * 0.8 + Math.random() * 20),
        averageScore: 72,
        sampleSize: 150
      },

      modelVersion: 'gpt-4o-realtime',
      analysisTimestamp: new Date().toISOString(),
      processingTimeMs: 2500
    };
  }

  /**
   * Génère des recommandations personnalisées
   */
  private static async generateRecommendations(
    candidateProfile: CandidateProfile,
    analysis: AIAnalysis,
    qualificationLevel: QualificationLevel
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Recommandations basées sur le niveau
    if (qualificationLevel === 'rejected') {
      recommendations.push({
        id: 'skill_development',
        type: 'skill_improvement',
        priority: 'high',
        title: 'Développement des compétences de base',
        description: 'Consolidez vos connaissances fondamentales avant de postuler à nouveau.',
        actionable: true,
        resources: [
          {
            type: 'course',
            title: 'Formation aux fondamentaux',
            duration: '2-3 mois'
          }
        ]
      });
    }

    if (qualificationLevel === 'stand_by') {
      recommendations.push({
        id: 'experience_gap',
        type: 'experience_gap',
        priority: 'medium',
        title: 'Développement de l\'expérience pratique',
        description: 'Participez à des projets pratiques pour renforcer votre profil.',
        actionable: true
      });
    }

    return recommendations;
  }
}