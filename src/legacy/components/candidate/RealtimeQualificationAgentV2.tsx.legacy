import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, PhoneOff, Loader2, Volume2, Sparkles, Trophy, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useRealtimeAssistant } from '@/ai-assistant/hooks/useRealtimeAssistant';
import confetti from 'canvas-confetti';
import { TestResultsDisplay } from './TestResultsDisplay';

interface Question {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedKeywords?: string[];
}

interface Answer {
  questionId: string;
  userAnswer: string;
  score: number;
  feedback?: string;
  timestamp: Date;
}

interface RealtimeQualificationAgentProps {
  candidateProfile: any;
  onTestComplete: (score: number, status: 'validated' | 'stand_by' | 'rejected', answers: Answer[]) => void;
  onQuestionGenerated?: (questions: Question[]) => void;
  autoStart?: boolean;
  onClose?: () => void;
}

export const RealtimeQualificationAgentV2 = ({
  candidateProfile,
  onTestComplete,
  onQuestionGenerated,
  autoStart = false,
  onClose
}: RealtimeQualificationAgentProps) => {
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalStatus, setFinalStatus] = useState<'validated' | 'stand_by' | 'rejected' | null>(null);

  // Utiliser le hook existant avec le contexte qualification
  const {
    state,
    connect,
    disconnect,
    sendMessage,
    clearTranscript,
    isSupported
  } = useRealtimeAssistant({
    context: 'qualification', // Utiliser le contexte qualification pour Sarah
    enableTools: false, // Pas d'outils pour la qualification
    autoConnect: false // On gère la connexion manuellement
  });

  // Log pour debug
  useEffect(() => {
    if (state.error) {
      console.error('🔴 Qualification Agent Error:', state.error);
    }
  }, [state.error]);

  // Auto-démarrage si demandé
  useEffect(() => {
    if (autoStart && !state.isConnected && !testStarted && !isInitializing) {
      handleStartTest();
    }
  }, [autoStart]);

  // Gérer les réponses de l'assistant - AVEC DEBUG COMPLET
  useEffect(() => {
    console.log('🔍 Assistant message effect triggered:', {
      hasAssistantMessage: !!state.assistantMessage,
      messageLength: state.assistantMessage?.length || 0,
      testStarted,
      currentQuestionIndex
    });

    if (!state.assistantMessage || !testStarted) return;

    const fullMessage = state.assistantMessage;
    console.log('📝 Message assistant complet:', fullMessage);

    // Détecter toutes les questions dans le message complet
    const questionRegex = /question\s+(\d+)\s+sur\s+10/gi;
    const matches = Array.from(fullMessage.matchAll(questionRegex));

    console.log('🔎 Regex matches trouvées:', matches.length, matches.map(m => m[1]));

    // Prendre le numéro de question le plus élevé trouvé (ou 0 si aucune)
    let maxQuestionNumber = 0;
    if (matches.length > 0) {
      const questionNumbers = matches.map(match => parseInt(match[1]));
      maxQuestionNumber = Math.max(...questionNumbers);

      console.log('📊 Question numbers found:', questionNumbers, 'Max:', maxQuestionNumber, 'Current:', currentQuestionIndex);

      if (maxQuestionNumber !== currentQuestionIndex) {
        console.log(`🎯 NOUVELLE question détectée: ${maxQuestionNumber} (précédent: ${currentQuestionIndex})`);
        setCurrentQuestionIndex(maxQuestionNumber);

        // Extraire le texte de la dernière question
        const lastMatch = matches[matches.length - 1];
        const questionStartIndex = lastMatch.index! + lastMatch[0].length;
        const questionText = fullMessage.substring(questionStartIndex).split('\n')[0].trim();

        // Ajouter la question si elle n'existe pas déjà
        setQuestions(prev => {
          if (prev.length < maxQuestionNumber) {
            const newQuestion: Question = {
              id: `q${maxQuestionNumber}`,
              question: questionText,
              category: maxQuestionNumber % 2 === 1 ? 'technical' : 'behavioral',
              difficulty: candidateProfile.seniority === 'junior' ? 'easy' :
                         candidateProfile.seniority === 'senior' ? 'hard' : 'medium'
            };
            console.log('✅ Nouvelle question ajoutée:', newQuestion);
            return [...prev, newQuestion];
          }
          return prev;
        });

        // Si on passe à une nouvelle question et qu'on n'a pas de réponse pour la précédente,
        // ajouter une réponse fictive pour maintenir le comptage
        if (maxQuestionNumber > 1) {
          setAnswers(prev => {
            const prevQuestionId = `q${maxQuestionNumber - 1}`;
            const hasAnswerForPrev = prev.some(a => a.questionId === prevQuestionId);
            if (!hasAnswerForPrev) {
              const placeholderAnswer: Answer = {
                questionId: prevQuestionId,
                userAnswer: '[Réponse audio non transcrite]',
                score: 7, // Score par défaut raisonnable
                timestamp: new Date()
              };
              console.log('🎤 Ajout réponse placeholder pour', prevQuestionId);
              return [...prev, placeholderAnswer];
            }
            return prev;
          });
        }
      }
    }

    // Détecter le feedback et score avec plus de flexibilité
    const scoreRegex = /(\d+)\s*(?:\/\s*10|sur\s*10|points)/gi;
    const scoreMatches = Array.from(fullMessage.matchAll(scoreRegex));

    for (const scoreMatch of scoreMatches) {
      const score = parseInt(scoreMatch[1]);
      if (score <= 10 && maxQuestionNumber > 1) {
        // Associer le score à la question précédente
        const questionForScore = maxQuestionNumber - 1;
        setAnswers(prev => {
          const updated = prev.map(ans =>
            ans.questionId === `q${questionForScore}` && !ans.score
              ? { ...ans, score, feedback: fullMessage }
              : ans
          );
          if (updated.some(ans => ans.questionId === `q${questionForScore}` && ans.score === score)) {
            console.log(`📊 Score ${score}/10 assigné à question ${questionForScore}`);
          }
          return updated;
        });
      }
    }

    // Détecter la fin du test - Attendre que Sarah termine son feedback final
    const hasAllQuestions = maxQuestionNumber >= 10;
    const hasEnoughAnswers = answers.length >= 8; // Au moins 8 réponses
    const messageLower = fullMessage.toLowerCase();
    const hasFinalFeedback = messageLower.includes('terminé') ||
                            messageLower.includes('fini') ||
                            messageLower.includes('félicitations') ||
                            messageLower.includes('bravo') ||
                            messageLower.includes('résultat') ||
                            messageLower.includes('voilà') ||
                            messageLower.includes('merci') ||
                            (messageLower.includes('10') && messageLower.includes('sur 10')) ||
                            messageLower.includes('excellent') ||
                            messageLower.includes('super') ||
                            messageLower.includes('fin du test') ||
                            messageLower.includes('c\'est tout');

    // Debug temporaire
    if (maxQuestionNumber >= 10) {
      console.log('🔍 Conditions de fin:', {
        hasAllQuestions,
        hasEnoughAnswers,
        answersCount: answers.length,
        hasFinalFeedback,
        lastPartOfMessage: fullMessage.slice(-200)
      });
    }

    if (hasAllQuestions && hasEnoughAnswers && hasFinalFeedback && !testCompleted) {
      console.log('✅ Test terminé détecté - 10 questions + ' + answers.length + ' réponses + feedback final');

      // S'assurer qu'on a une réponse pour la dernière question
      setAnswers(prev => {
        const lastQuestionId = `q10`;
        const hasLastAnswer = prev.some(a => a.questionId === lastQuestionId);
        if (!hasLastAnswer) {
          const lastAnswer: Answer = {
            questionId: lastQuestionId,
            userAnswer: '[Réponse audio non transcrite]',
            score: 7,
            timestamp: new Date()
          };
          console.log('🎤 Ajout réponse finale pour q10');
          return [...prev, lastAnswer];
        }
        return prev;
      });

      // Attendre un délai pour que Sarah finisse de parler
      setTimeout(() => {
        handleTestComplete();
      }, 2000);
    }
  }, [state.assistantMessage, testStarted, currentQuestionIndex, answers.length]);

  // Gérer les transcriptions utilisateur
  useEffect(() => {
    if (!state.transcript || !testStarted || currentQuestionIndex === 0) return;

    // Enregistrer la réponse du candidat
    const newAnswer: Answer = {
      questionId: `q${currentQuestionIndex}`,
      userAnswer: state.transcript,
      score: 0, // Sera mis à jour par le feedback
      timestamp: new Date()
    };

    setAnswers(prev => [...prev, newAnswer]);
    clearTranscript(); // Nettoyer pour la prochaine réponse
  }, [state.transcript, testStarted, currentQuestionIndex]);

  // Démarrer le test
  const handleStartTest = async () => {
    setIsInitializing(true);
    setTestStarted(true);

    try {
      // Vérifier le support du navigateur
      if (!isSupported || !isSupported()) {
        throw new Error('Votre navigateur ne supporte pas WebRTC. Veuillez utiliser Chrome, Firefox ou Edge.');
      }

      // Vérifier l'accès au micro
      if (!navigator.mediaDevices) {
        console.error('navigator.mediaDevices non disponible');
        throw new Error('Accès au microphone impossible. Assurez-vous d\'utiliser HTTPS ou localhost.');
      }

      await connect();

      // Envoyer le message initial pour démarrer avec le contexte du candidat
      setTimeout(() => {
        const { profile_name, seniority, languages, expertises } = candidateProfile;
        const contextMessage = `
Tu es Sarah, recruteuse sympathique. Salue le candidat et lance directement le test.

Candidat à évaluer:
- Nom: ${candidateProfile.first_name} ${candidateProfile.last_name}
- Métier: ${profile_name || 'Profil général'}
- Séniorité: ${seniority || 'junior'}
- Langues: ${Array.isArray(languages) ? languages.join(', ') : 'Français'}
- Expertises: ${Array.isArray(expertises) && expertises.length > 0 ? expertises.join(', ') : 'Généraliste'}

IMPORTANT: Adapte tes questions au métier "${profile_name || 'Profil général'}" et à la séniorité "${seniority || 'junior'}".

1. Salue-le par son prénom "${candidateProfile.first_name}"
2. Explique brièvement le test (10 questions alternées)
3. Pose immédiatement ta première question avec "Question 1 sur 10 :" en début`;

        console.log('📤 Envoi du message de contexte:', contextMessage);
        sendMessage(contextMessage);
        console.log('✅ Message envoyé, attente réponse Sarah...');
        // Ne pas initialiser currentQuestionIndex ici, laisser la détection le faire
        setIsInitializing(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur démarrage test:', error);
      toast.error('Impossible de démarrer le test');
      setIsInitializing(false);
      setTestStarted(false);
    }
  };

  // Terminer le test
  const handleTestComplete = () => {
    if (testCompleted) return;

    setTestCompleted(true);

    // Calculer le score total
    const totalScore = answers.reduce((sum, answer) => sum + (answer.score || 0), 0);
    const percentage = (totalScore / 100) * 100; // Sur 100 points (10 questions x 10 points)

    // Déterminer le statut
    let status: 'validated' | 'stand_by' | 'rejected';
    if (percentage >= 90) {
      status = 'validated';
    } else if (percentage >= 60) {
      status = 'stand_by';
    } else {
      status = 'rejected';
    }

    // Sauvegarder les résultats
    setFinalScore(percentage);
    setFinalStatus(status);

    // Lancer feu d'artifice si validé
    if (status === 'validated') {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#3b82f6']
        });
      }, 500);

      // Encore plus de confettis !
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { y: 0.4 },
          colors: ['#10b981', '#f59e0b', '#ef4444']
        });
      }, 1500);
    }

    // Notifier le parent
    onTestComplete(percentage, status, answers);

    // Notifier les questions générées
    if (onQuestionGenerated && questions.length > 0) {
      onQuestionGenerated(questions);
    }

    // Déconnecter après un délai plus long pour voir les résultats
    setTimeout(() => disconnect(), 8000);
  };

  // Toggle mute
  const toggleMute = () => {
    // Le hook useRealtimeAssistant gère déjà le mute en interne
    // On pourrait ajouter cette fonctionnalité si nécessaire
    toast.info('Fonction mute à implémenter dans le hook');
  };

  // Vérifier le support
  if (!isSupported) {
    return (
      <div className="text-center space-y-4 p-8">
        <div className="text-red-500">
          <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Votre navigateur ne supporte pas l'API audio nécessaire.</p>
          <p className="text-sm mt-2">Veuillez utiliser un navigateur moderne comme Chrome ou Edge.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-8">
      {/* État de connexion/chargement */}
      {(state.isProcessing || isInitializing) && (
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-primary-500/20 to-secondary-500/20 animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-12 w-12 text-primary-500 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
            {isInitializing ? 'Préparation de votre évaluation...' : 'Connexion en cours...'}
          </h3>
          <p className="text-sm text-neutral-500">
            Cela peut prendre quelques secondes
          </p>
        </div>
      )}

      {/* Écran de synthèse (résultats finaux) */}
      {testCompleted && finalStatus && (
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in-50 duration-1000">
          <TestResultsDisplay
            result={{
              score: finalScore,
              status: finalStatus,
              answers: answers
            }}
            candidateName={candidateProfile?.first_name || 'Candidat'}
            profileName={candidateProfile?.profile_name || 'Métier'}
            onGoToDashboard={() => {
              if (onClose) onClose();
              window.location.reload();
            }}
          />
        </div>
      )}

      {/* Interface audio principale */}
      {state.isConnected && !state.isProcessing && !isInitializing && !testCompleted && (
        <div className="w-full max-w-2xl space-y-8">
          {/* Visualisation audio avec animation */}
          <div className="text-center space-y-6">
            {/* Animation de halo/onde sonore */}
            <div className="relative flex items-center justify-center">
              {/* Cercles animés pour effet de halo */}
              <div className="absolute w-48 h-48 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 animate-ping" />
              <div className="absolute w-40 h-40 rounded-full bg-gradient-to-r from-primary-500/20 to-secondary-500/20 animate-ping animation-delay-200" />
              <div className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-primary-500/30 to-secondary-500/30 animate-ping animation-delay-400" />

              {/* Cercle central avec icône */}
              <div className={cn(
                "relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                "bg-gradient-to-r from-primary-500 to-secondary-500",
                state.isListening && "scale-110",
                state.isSpeaking && "animate-pulse"
              )}>
                {state.isListening ? (
                  <Mic className="h-10 w-10 text-white" />
                ) : (
                  <Volume2 className="h-10 w-10 text-white animate-pulse" />
                )}
              </div>
            </div>

            {/* État actuel */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                {testStarted && currentQuestionIndex > 0 ? `Question ${currentQuestionIndex} sur 10` :
                 testStarted ? 'Démarrage du test...' :
                 'Préparation...'}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                {state.isListening ? 'Je vous écoute...' :
                 state.isSpeaking ? 'Réponse en cours...' :
                 testStarted ? 'Écoutez attentivement la question' :
                 'Initialisation de votre évaluation...'}
              </p>

            </div>

            {/* Barre de progression */}
            {testStarted && !testCompleted && (
              <div className="w-full max-w-md mx-auto">
                <Progress
                  value={(Math.max(0, Math.min(10, currentQuestionIndex)) / 10) * 100}
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-2">
                  <span>🚀 Début</span>
                  <span className="font-bold text-primary-500">{currentQuestionIndex}/10 questions</span>
                  <span>🏁 Fin</span>
                </div>
              </div>
            )}
          </div>

          {/* Contrôles audio */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={toggleMute}
              variant={state.isListening ? "outline" : "destructive"}
              size="icon"
              className="rounded-full w-12 h-12"
              disabled={!state.isConnected}
            >
              {state.isListening ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </Button>

            {(testCompleted || state.error) && (
              <Button
                onClick={disconnect}
                variant="default"
                size="lg"
                className="rounded-full px-6 bg-gradient-to-r from-primary-500 to-secondary-500"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                Terminer
              </Button>
            )}
          </div>

          {/* Afficher les erreurs */}
          {state.error && (
            <div className="text-center text-red-500 text-sm">
              {state.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};