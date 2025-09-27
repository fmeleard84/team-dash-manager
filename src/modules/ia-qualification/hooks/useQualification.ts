/**
 * Hook Principal - Module IA QUALIFICATION
 *
 * Gère l'état et les opérations du système de qualification IA :
 * - Gestion des tests de qualification
 * - Navigation entre questions
 * - Soumission des réponses
 * - Calcul des scores et résultats
 * - Synchronisation avec la base de données
 * - Gestion des erreurs et états de chargement
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';

import { QualificationAPI } from '../services';
import type {
  QualificationTest,
  TestSession,
  Question,
  Answer,
  CandidateProfile,
  TestConfig,
  UseQualificationTestReturn,
  StartSessionRequest,
  SubmitAnswerRequest
} from '../types';

/**
 * Hook principal pour la gestion des tests de qualification IA
 */
export function useQualification(): UseQualificationTestReturn {
  const { user } = useAuth();

  // État principal
  const [test, setTest] = useState<QualificationTest | null>(null);
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation et progression
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Timer et contrôles
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  /**
   * Démarre un nouveau test de qualification
   */
  const startTest = useCallback(async (
    candidateProfile: CandidateProfile,
    customConfig?: Partial<TestConfig>
  ): Promise<string | null> => {
    if (!user?.id) {
      toast.error('Utilisateur non authentifié');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Créer le test
      const createResponse = await QualificationAPI.createTest(candidateProfile, customConfig);

      if (!createResponse.success || !createResponse.data) {
        throw new Error(createResponse.error || 'Erreur création du test');
      }

      const newTest = createResponse.data;
      setTest(newTest);

      // 2. Démarrer la session
      const sessionRequest: StartSessionRequest = {
        testId: newTest.id,
        candidateId: candidateProfile.id,
        audioConfig: customConfig?.audioConfig
      };

      const sessionResponse = await QualificationAPI.startSession(sessionRequest);

      if (!sessionResponse.success || !sessionResponse.data) {
        throw new Error(sessionResponse.error || 'Erreur démarrage de session');
      }

      const sessionData = sessionResponse.data;

      // 3. Créer l'objet session
      const newSession: TestSession = {
        id: sessionData.sessionId,
        testId: newTest.id,
        currentQuestionIndex: 0,
        isActive: true,
        isPaused: false,
        isConnected: true,
        isRecording: false,
        isMuted: false,
        audioLevel: 0,
        volume: 1,
        currentTranscript: '',
        assistantMessage: '',
        error: null,
        retryCount: 0,
        connectionQuality: 'good'
      };

      setSession(newSession);
      setCurrentQuestionIndex(0);
      setAnswers([]);

      // 4. Démarrer le timer si configuré
      if (newTest.testConfig.timePerQuestion > 0) {
        startQuestionTimer(newTest.testConfig.timePerQuestion);
      }

      toast.success('Test de qualification démarré');
      return newTest.id;

    } catch (error) {
      console.error('[useQualification] Erreur startTest:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;

    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Soumet une réponse à une question
   */
  const submitAnswer = useCallback(async (
    answerData: Omit<Answer, 'score' | 'feedback' | 'keywords'>
  ): Promise<boolean> => {
    if (!session || !test) {
      toast.error('Aucune session active');
      return false;
    }

    setLoading(true);

    try {
      const submitRequest: SubmitAnswerRequest = {
        sessionId: session.id,
        questionId: answerData.questionId,
        answer: answerData
      };

      const response = await QualificationAPI.submitAnswer(submitRequest);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur soumission réponse');
      }

      const result = response.data;

      // Créer la réponse complète avec le score et feedback
      const completeAnswer: Answer = {
        ...answerData,
        score: result.score,
        feedback: result.feedback,
        keywords: result.keywords
      };

      // Ajouter la réponse à la liste
      setAnswers(prev => [...prev, completeAnswer]);

      // Arrêter le timer de question
      stopQuestionTimer();

      // Vérifier si on continue ou si le test est terminé
      if (result.shouldContinue && result.nextQuestion) {
        // Passer à la question suivante
        const updatedTest = {
          ...test,
          questions: [...test.questions, result.nextQuestion],
          answers: [...test.answers, completeAnswer]
        };
        setTest(updatedTest);
        setCurrentQuestionIndex(prev => prev + 1);

        // Redémarrer le timer pour la nouvelle question
        if (test.testConfig.timePerQuestion > 0) {
          startQuestionTimer(test.testConfig.timePerQuestion);
        }

      } else {
        // Test terminé
        await finalizeTest();
      }

      toast.success(`Score: ${result.score}/100`);
      return true;

    } catch (error) {
      console.error('[useQualification] Erreur submitAnswer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur soumission';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setLoading(false);
    }
  }, [session, test]);

  /**
   * Finalise le test et récupère les résultats
   */
  const finalizeTest = useCallback(async (): Promise<void> => {
    if (!test || !session) return;

    try {
      const results = await QualificationAPI.finalizeTest(test.id);

      if (results.success && results.data) {
        setTest(results.data);
        setSession(prev => prev ? { ...prev, isActive: false } : null);
        stopQuestionTimer();
        toast.success('Test terminé avec succès');
      }

    } catch (error) {
      console.error('[useQualification] Erreur finalizeTest:', error);
      setError('Erreur finalisation du test');
    }
  }, [test, session]);

  /**
   * Met en pause le test
   */
  const pauseTest = useCallback(() => {
    if (!session) return;

    setSession(prev => prev ? { ...prev, isPaused: true } : null);
    setIsPaused(true);
    stopQuestionTimer();

    toast.info('Test mis en pause');
  }, [session]);

  /**
   * Reprend le test
   */
  const resumeTest = useCallback(() => {
    if (!session) return;

    setSession(prev => prev ? { ...prev, isPaused: false } : null);
    setIsPaused(false);

    // Reprendre le timer s'il y en avait un
    if (test?.testConfig.timePerQuestion && timeRemaining && timeRemaining > 0) {
      startQuestionTimer(timeRemaining);
    }

    toast.info('Test repris');
  }, [session, test, timeRemaining]);

  /**
   * Annule le test
   */
  const cancelTest = useCallback(() => {
    if (!test || !session) return;

    setSession(prev => prev ? { ...prev, isActive: false } : null);
    setTest(null);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    stopQuestionTimer();

    toast.info('Test annulé');
  }, [test, session]);

  /**
   * Navigue vers la question suivante
   */
  const goToNextQuestion = useCallback(() => {
    if (!test || currentQuestionIndex >= test.questions.length - 1) return;

    setCurrentQuestionIndex(prev => prev + 1);
    stopQuestionTimer();

    if (test.testConfig.timePerQuestion > 0) {
      startQuestionTimer(test.testConfig.timePerQuestion);
    }
  }, [test, currentQuestionIndex]);

  /**
   * Navigue vers la question précédente
   */
  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex <= 0) return;

    setCurrentQuestionIndex(prev => prev - 1);
    stopQuestionTimer();

    if (test?.testConfig.timePerQuestion && test.testConfig.timePerQuestion > 0) {
      startQuestionTimer(test.testConfig.timePerQuestion);
    }
  }, [currentQuestionIndex, test]);

  /**
   * Démarre le timer de question
   */
  const startQuestionTimer = useCallback((duration: number) => {
    stopQuestionTimer(); // S'assurer qu'il n'y a pas d'autre timer

    let remaining = duration;
    setTimeRemaining(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        stopQuestionTimer();
        // Auto-soumettre une réponse vide si temps écoulé
        if (test && test.questions[currentQuestionIndex]) {
          const emptyAnswer: Omit<Answer, 'score' | 'feedback' | 'keywords'> = {
            questionId: test.questions[currentQuestionIndex].id,
            userAnswer: '',
            transcript: 'Temps écoulé - Aucune réponse',
            timestamp: new Date(),
            duration: 0,
            confidence: 0,
            keywords: { expected: [], found: [], missing: [] }
          };
          submitAnswer(emptyAnswer);
        }
      }
    }, 1000);
  }, [test, currentQuestionIndex, submitAnswer]);

  /**
   * Arrête le timer de question
   */
  const stopQuestionTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  /**
   * Récupère les résultats du test
   */
  const getResults = useCallback(async (): Promise<QualificationTest | null> => {
    if (!test) return null;

    try {
      const response = await QualificationAPI.getTestResults(test.id);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('[useQualification] Erreur getResults:', error);
      return null;
    }
  }, [test]);

  // Nettoyage à la déconnexion du composant
  useEffect(() => {
    return () => {
      stopQuestionTimer();
    };
  }, [stopQuestionTimer]);

  // Calculer les valeurs dérivées
  const currentQuestion = test?.questions[currentQuestionIndex] || null;
  const progress = test ? {
    current: currentQuestionIndex + 1,
    total: test.questions.length,
    percentage: test.questions.length > 0 ? ((currentQuestionIndex + 1) / test.questions.length) * 100 : 0
  } : { current: 0, total: 0, percentage: 0 };

  const isTestComplete = !session?.isActive || (test?.status === 'completed');
  const canProceed = !loading && !isPaused && session?.isActive;

  return {
    // État du test
    test,
    session,
    loading,
    error,

    // Actions principales
    startTest,
    submitAnswer,
    pauseTest,
    resumeTest,
    cancelTest,

    // Navigation
    currentQuestion,
    goToNextQuestion,
    goToPreviousQuestion,

    // Progression
    progress,

    // Résultats
    getResults,

    // Utilitaires
    isTestComplete,
    canProceed,
    timeRemaining
  };
}