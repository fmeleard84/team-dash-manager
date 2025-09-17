import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, PhoneOff, Loader2, Volume2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useRealtimeAssistant } from '@/ai-assistant/hooks/useRealtimeAssistant';

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
}

export const RealtimeQualificationAgentV2 = ({
  candidateProfile,
  onTestComplete,
  onQuestionGenerated,
  autoStart = false
}: RealtimeQualificationAgentProps) => {
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Utiliser le hook existant EXACTEMENT comme le client
  const {
    state,
    connect,
    disconnect,
    sendMessage,
    clearTranscript,
    isSupported
  } = useRealtimeAssistant({
    context: 'general', // Tester avec 'general' comme le client
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

  // Gérer les réponses de l'assistant
  useEffect(() => {
    if (!state.response || !testStarted) return;

    // Parser la réponse pour extraire les questions et feedbacks
    const response = state.response;

    // Détecter si c'est une nouvelle question avec un regex plus flexible
    const questionRegex = /question\s+(\d+)\s+sur\s+10\s*[:：]?/gi;
    const matches = response.matchAll(questionRegex);

    for (const match of matches) {
      const questionNumber = parseInt(match[1]);

      // Mettre à jour l'index de la question actuelle
      if (questionNumber > currentQuestionIndex) {
        console.log(`🎯 Détection question ${questionNumber}`);
        setCurrentQuestionIndex(questionNumber);

        // Extraire le texte de la question
        const questionStartIndex = match.index! + match[0].length;
        const questionText = response.substring(questionStartIndex).split('\n')[0].trim();

        // Ajouter la question si elle n'existe pas déjà
        if (questions.length < questionNumber) {
          const newQuestion: Question = {
            id: `q${questionNumber}`,
            question: questionText,
            category: questionNumber % 2 === 1 ? 'technical' : 'behavioral', // Alterner hard/soft skills
            difficulty: candidateProfile.seniority === 'junior' ? 'easy' :
                       candidateProfile.seniority === 'senior' ? 'hard' : 'medium'
          };
          setQuestions(prev => [...prev, newQuestion]);
        }
      }
    }

    // Détecter le feedback et score avec plus de flexibilité
    const scoreRegex = /(\d+)\s*(?:\/\s*10|sur\s*10|points)/gi;
    const scoreMatches = response.matchAll(scoreRegex);

    for (const scoreMatch of scoreMatches) {
      const score = parseInt(scoreMatch[1]);
      if (score <= 10 && currentQuestionIndex > 0) {
        const lastAnswer = answers[answers.length - 1];
        if (lastAnswer && !lastAnswer.score) {
          console.log(`📊 Score détecté: ${score}/10 pour question ${currentQuestionIndex - 1}`);
          // Mettre à jour le score de la dernière réponse
          setAnswers(prev => prev.map((ans, idx) =>
            idx === prev.length - 1 ? { ...ans, score, feedback: state.response } : ans
          ));
        }
      }
    }

    // Détecter la fin du test
    if ((response.toLowerCase().includes('terminé') ||
         response.toLowerCase().includes('fini') ||
         response.toLowerCase().includes('félicitations') ||
         response.toLowerCase().includes('bravo') ||
         response.toLowerCase().includes('résultat final')) &&
        (currentQuestionIndex >= 10 || answers.length >= 10)) {
      console.log('✅ Test terminé détecté');
      handleTestComplete();
    }
  }, [state.response, testStarted, currentQuestionIndex]);

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
Démarre l'évaluation de qualification pour ce candidat:
- Métier: ${profile_name || 'Non défini'}
- Séniorité: ${seniority || 'junior'}
- Langues: ${Array.isArray(languages) ? languages.join(', ') : 'Français'}
- Expertises: ${Array.isArray(expertises) && expertises.length > 0 ? expertises.join(', ') : 'Généraliste'}

Pose la première question adaptée à ce profil. Rappel: tu dois poser exactement 10 questions au total.`;

        sendMessage(contextMessage);
        setCurrentQuestionIndex(1);
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

    // Notifier le parent
    onTestComplete(percentage, status, answers);

    // Notifier les questions générées
    if (onQuestionGenerated && questions.length > 0) {
      onQuestionGenerated(questions);
    }

    // Déconnecter après un délai
    setTimeout(() => disconnect(), 3000);
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

      {/* Interface audio principale */}
      {state.isConnected && !state.isProcessing && !isInitializing && (
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
                testCompleted && "from-green-500 to-emerald-500",
                state.isListening && "scale-110",
                state.isSpeaking && "animate-pulse"
              )}>
                {testCompleted ? (
                  <Sparkles className="h-10 w-10 text-white" />
                ) : state.isListening ? (
                  <Mic className="h-10 w-10 text-white" />
                ) : (
                  <Volume2 className="h-10 w-10 text-white animate-pulse" />
                )}
              </div>
            </div>

            {/* État actuel */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                {testCompleted ? 'Évaluation terminée ! 🎉' :
                 testStarted && currentQuestionIndex > 0 ? `Question ${currentQuestionIndex} sur 10` :
                 testStarted ? 'Démarrage du test...' :
                 'Préparation...'}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                {testCompleted ? 'Merci pour votre participation' :
                 state.isListening ? 'Je vous écoute...' :
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
              size="lg"
              className="rounded-full px-6"
              disabled={!state.isConnected}
            >
              {state.isListening ? (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Microphone activé
                </>
              ) : (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Microphone désactivé
                </>
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