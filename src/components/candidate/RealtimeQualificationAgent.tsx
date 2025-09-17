import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Mic, MicOff, PhoneOff, Loader2, Volume2, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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

export const RealtimeQualificationAgent = ({
  candidateProfile,
  onTestComplete,
  onQuestionGenerated,
  autoStart = false
}: RealtimeQualificationAgentProps) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const websocket = useRef<WebSocket | null>(null);

  // Configuration OpenAI Realtime
  const REALTIME_API_URL = 'wss://api.openai.com/v1/realtime';
  const MODEL = 'gpt-4o-realtime-preview-2024-12-17';


  // Auto-start si demandé
  useEffect(() => {
    if (autoStart && !isConnected && !isConnecting && !testStarted) {
      connectToRealtime();
    }
  }, [autoStart]);

  // Générer les questions basées sur le profil
  const generateQuestions = async () => {
    setIsGeneratingQuestions(true);

    try {
      const profile_id = candidateProfile.profile_name || candidateProfile.profile_id || 'Non défini';
      const { seniority, languages, expertises } = candidateProfile;

      // Appeler la Edge Function pour générer les questions
      const { data, error } = await supabase.functions.invoke('generate-qualification-questions', {
        body: {
          profile: profile_id,
          seniority,
          languages,
          expertises,
          count: 10
        }
      });

      if (error) throw error;

      const generatedQuestions = data?.questions || [];

      setQuestions(generatedQuestions);
      if (onQuestionGenerated) {
        onQuestionGenerated(generatedQuestions);
      }

      // Ajouter au transcript
      logMessage('system', `✨ 10 questions personnalisées générées pour votre profil de ${profile_id} ${seniority}`);

    } catch (error) {
      console.error('Erreur génération questions:', error);
      toast.error('Erreur lors de la génération des questions');

      // Fallback avec questions génériques
      setQuestions(getDefaultQuestions());
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Questions par défaut en cas d'erreur
  const getDefaultQuestions = (): Question[] => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `q${i + 1}`,
      question: `Question ${i + 1}: Décrivez votre expérience dans votre domaine.`,
      category: i < 4 ? 'technical' : i < 7 ? 'behavioral' : 'situational',
      difficulty: i < 3 ? 'easy' : i < 7 ? 'medium' : 'hard'
    }));
  };

  // Ajouter une entrée au transcript
  // Logger les messages (remplace logMessage)
  const logMessage = (role: string, content: string, questionNumber?: number) => {
    console.log(`[${role}] ${questionNumber ? `Q${questionNumber}: ` : ''}${content}`);
  };

  // Obtenir la clé éphémère OpenAI via Edge Function
  const getEphemeralToken = async (): Promise<string> => {
    try {
      // Utiliser la Edge Function qui a accès à la clé API OpenAI
      const { data, error } = await supabase.functions.invoke('get-realtime-token', {
        body: {
          instructions: getSystemInstructions()
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.token) {
        throw new Error('Token non reçu');
      }

      return data.token;
    } catch (error) {
      console.error('Erreur récupération token:', error);
      throw new Error('Impossible d\'obtenir le token OpenAI. Vérifiez la configuration.');
    }
  };

  // Instructions système pour l'agent
  const getSystemInstructions = () => {
    return `Tu es un évaluateur expert pour des tests de qualification professionnelle.
    Tu dois évaluer un candidat ${candidateProfile.profile_name || candidateProfile.profile_id || 'Non défini'} ${candidateProfile.seniority}.

    RÈGLES IMPORTANTES:
    1. Pose les questions une par une et attends la réponse complète
    2. Sois bienveillant mais rigoureux dans ton évaluation
    3. Évalue la pertinence, la clarté et la profondeur des réponses
    4. Note mentalement chaque réponse sur 10 points
    5. Parle toujours en français
    6. Donne un feedback constructif après chaque réponse
    7. À la fin, calcule le score total sur 100

    Questions à poser: ${questions.map((q, i) => `${i+1}. ${q.question}`).join('\n')}`;
  };

  // Connexion à OpenAI Realtime
  const connectToRealtime = async () => {
    try {
      setIsConnecting(true);

      // 1. Obtenir le token éphémère
      const token = await getEphemeralToken();

      // 2. Créer la connexion WebSocket
      websocket.current = new WebSocket(`${REALTIME_API_URL}?model=${MODEL}`, [
        'realtime',
        `openai-insecure-api-key.${token}`,
        'openai-beta.realtime-v1'
      ]);

      websocket.current.onopen = () => {
        console.log('✅ Connecté à OpenAI Realtime');
        setIsConnected(true);
        setIsConnecting(false);

        // Initialiser la session
        sendEvent({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: getSystemInstructions(),
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        });

        // Démarrer le test
        startTest();
        toast.success('Connexion établie avec l\'assistant IA');
      };

      websocket.current.onmessage = handleRealtimeMessage;

      websocket.current.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        toast.error('Erreur de connexion');
      };

      websocket.current.onclose = () => {
        setIsConnected(false);
        console.log('🔌 Connexion fermée');
      };

      // 3. Configurer l'audio
      await setupAudio();

    } catch (error) {
      console.error('Erreur connexion:', error);
      toast.error('Impossible de se connecter');
      setIsConnecting(false);
    }
  };

  // Gérer les messages Realtime
  const handleRealtimeMessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'response.audio_transcript.delta':
        // Transcription de l'assistant
        console.log('[Assistant]:', message.delta);
        break;

      case 'input_audio_buffer.speech_started':
        // L'utilisateur commence à parler
        logMessage('system', '🎤 Écoute...');
        break;

      case 'input_audio_buffer.speech_stopped':
        // L'utilisateur a fini de parler
        break;

      case 'conversation.item.created':
        if (message.item.role === 'user') {
          // Réponse de l'utilisateur
          handleUserAnswer(message.item.content?.[0]?.transcript || '');
        }
        break;

      case 'response.done':
        // Réponse complète de l'assistant
        checkIfTestComplete();
        break;

      case 'error':
        console.error('Erreur Realtime:', message.error);
        toast.error(`Erreur: ${message.error.message}`);
        break;
    }
  };


  // Configuration audio
  const setupAudio = async () => {
    try {
      // Vérifier que nous sommes dans un navigateur avec support audio
      if (typeof window === 'undefined' || !window.navigator?.mediaDevices?.getUserMedia) {
        console.info('🎤 Mode conversation textuelle (audio non disponible)');
        // Le test peut continuer sans audio, l'API Realtime supporte le mode texte
        return;
      }

      // Vérifier si nous sommes en HTTPS (requis pour getUserMedia)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.info('🔒 Audio nécessite HTTPS. Mode texte activé.');
        return;
      }

      audioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext({ sampleRate: 24000 });

      // Créer un processeur audio pour capturer et envoyer
      const source = audioContext.current.createMediaStreamSource(audioStream.current);
      const processor = audioContext.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!isMuted && websocket.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = convertFloat32ToPCM16(inputData);

          sendEvent({
            type: 'input_audio_buffer.append',
            audio: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)))
          });
        }
      };

      source.connect(processor);
      processor.connect(audioContext.current.destination);

      console.log('✅ Microphone activé avec succès');
    } catch (error: any) {
      // Gestion gracieuse des erreurs audio
      if (error.name === 'NotAllowedError') {
        console.info('🎤 Permission microphone refusée. Mode texte activé.');
      } else if (error.name === 'NotFoundError') {
        console.info('🎤 Aucun microphone trouvé. Mode texte activé.');
      } else if (error.name === 'NotReadableError') {
        console.info('🎤 Microphone occupé. Mode texte activé.');
      } else {
        console.info('🎤 Audio non disponible. Mode texte activé.', error.message);
      }
      // Le test continue en mode texte sans bloquer
    }
  };

  // Convertir Float32 en PCM16
  const convertFloat32ToPCM16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  // Envoyer un événement au serveur
  const sendEvent = (event: any) => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      websocket.current.send(JSON.stringify(event));
    }
  };

  // Démarrer le test
  const startTest = async () => {
    if (questions.length === 0) {
      await generateQuestions();
    }

    setTestStarted(true);
    logMessage('assistant',
      `Bonjour ! Je suis votre évaluateur IA. Nous allons commencer votre test de qualification avec 10 questions adaptées à votre profil. Êtes-vous prêt ?`
    );

    // Attendre un peu puis poser la première question
    setTimeout(() => askNextQuestion(), 3000);
  };

  // Poser la question suivante
  const askNextQuestion = () => {
    if (currentQuestionIndex >= questions.length) {
      completeTest();
      return;
    }

    const question = questions[currentQuestionIndex];
    logMessage('assistant',
      `Question ${currentQuestionIndex + 1} sur 10 (${question.category}): ${question.question}`,
      currentQuestionIndex + 1
    );

    // Envoyer à l'assistant
    sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'input_text',
          text: `Question ${currentQuestionIndex + 1}: ${question.question}`
        }]
      }
    });
  };

  // Gérer la réponse de l'utilisateur
  const handleUserAnswer = (answer: string) => {
    if (!testStarted || testCompleted) return;

    const question = questions[currentQuestionIndex];
    if (!question) return;

    // Calculer le score (simplifié - à améliorer avec une vraie évaluation)
    const score = calculateAnswerScore(answer, question);

    // Enregistrer la réponse
    const newAnswer: Answer = {
      questionId: question.id,
      userAnswer: answer,
      score,
      timestamp: new Date()
    };

    setAnswers(prev => [...prev, newAnswer]);
    logMessage('user', answer, currentQuestionIndex + 1);

    // Feedback
    const feedback = score >= 8 ? 'Excellente réponse !' :
                    score >= 6 ? 'Bonne réponse.' :
                    'Réponse à améliorer.';

    logMessage('assistant', `${feedback} (Score: ${score}/10)`);

    // Question suivante
    setCurrentQuestionIndex(prev => prev + 1);
    setTimeout(() => askNextQuestion(), 2000);
  };

  // Calculer le score d'une réponse
  const calculateAnswerScore = (answer: string, question: Question): number => {
    // Logique simplifiée - à améliorer avec une vraie évaluation IA
    const answerLength = answer.trim().split(' ').length;

    // Score basé sur la longueur et la complexité
    let score = 5; // Score de base

    if (answerLength > 20) score += 2;
    if (answerLength > 50) score += 1;

    // Vérifier les mots-clés attendus
    if (question.expectedKeywords) {
      const matchedKeywords = question.expectedKeywords.filter(keyword =>
        answer.toLowerCase().includes(keyword.toLowerCase())
      );
      score += Math.min(2, matchedKeywords.length * 0.5);
    }

    return Math.min(10, Math.max(0, Math.round(score)));
  };

  // Vérifier si le test est terminé
  const checkIfTestComplete = () => {
    if (answers.length >= questions.length && !testCompleted) {
      completeTest();
    }
  };

  // Terminer le test
  const completeTest = () => {
    setTestCompleted(true);

    // Calculer le score total
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const percentage = (totalScore / (questions.length * 10)) * 100;

    // Déterminer le statut
    let status: 'validated' | 'stand_by' | 'rejected';
    if (percentage >= 90) {
      status = 'validated';
      logMessage('system', `✅ Félicitations ! Votre évaluation est terminée avec succès. Votre profil est validé !`);
    } else if (percentage >= 60) {
      status = 'stand_by';
      logMessage('system', `⏳ Merci pour votre participation ! Notre équipe examinera vos réponses et vous contactera prochainement.`);
    } else {
      status = 'rejected';
      logMessage('system', `💡 Merci d'avoir participé ! Continuez à développer vos compétences pour votre prochaine opportunité.`);
    }

    // Notifier le parent
    onTestComplete(percentage, status, answers);

    // Déconnecter
    setTimeout(() => disconnect(), 5000);
  };

  // Déconnexion
  const disconnect = () => {
    if (websocket.current) {
      websocket.current.close();
      websocket.current = null;
    }

    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
      audioStream.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    setIsConnected(false);
    toast.info('Test terminé');
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? 'Microphone activé' : 'Microphone désactivé');
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-8">
      {/* État de connexion/chargement */}
      {(isConnecting || isGeneratingQuestions) && (
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-primary-500/20 to-secondary-500/20 animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-12 w-12 text-primary-500 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
            {isGeneratingQuestions ? 'Préparation de vos questions...' : 'Connexion en cours...'}
          </h3>
          <p className="text-sm text-neutral-500">
            Cela peut prendre quelques secondes
          </p>
        </div>
      )}

      {/* Interface audio principale */}
      {isConnected && !isConnecting && !isGeneratingQuestions && (
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
                testCompleted && "from-green-500 to-emerald-500"
              )}>
                {testCompleted ? (
                  <Sparkles className="h-10 w-10 text-white" />
                ) : (
                  <Volume2 className="h-10 w-10 text-white animate-pulse" />
                )}
              </div>
            </div>

            {/* État actuel */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                {testCompleted ? 'Test terminé !' :
                 testStarted ? `Question ${currentQuestionIndex + 1} sur 10` :
                 'En attente...'}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                {testCompleted ? 'Merci pour votre participation' :
                 testStarted ? 'Écoutez attentivement et répondez naturellement' :
                 'Préparation de votre évaluation...'}
              </p>
            </div>

            {/* Barre de progression */}
            {testStarted && !testCompleted && (
              <div className="w-full max-w-md mx-auto">
                <Progress
                  value={(currentQuestionIndex / questions.length) * 100}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-2">
                  <span>Début</span>
                  <span>{Math.round((currentQuestionIndex / questions.length) * 100)}%</span>
                  <span>Fin</span>
                </div>
              </div>
            )}
          </div>

          {/* Contrôles audio */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={toggleMute}
              variant={isMuted ? "destructive" : "outline"}
              size="lg"
              className="rounded-full px-6"
            >
              {isMuted ? (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Microphone désactivé
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Microphone activé
                </>
              )}
            </Button>

            {testCompleted && (
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
        </div>
      )}
    </div>
  );
};