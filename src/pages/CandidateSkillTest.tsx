import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { IallaLogo } from "@/components/IallaLogo";
import { 
  Send, 
  Bot, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Sparkles, 
  Shield, 
  Award, 
  Timer, 
  Loader2,
  Brain,
  Target,
  Zap,
  MessageSquare,
  TrendingUp,
  BookOpen,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { VoiceChatSDK } from "@/components/candidate/VoiceChatSDK";
import { ProfileDebugger } from "@/components/candidate/ProfileDebugger";

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface TestResult {
  score: number;
  status: 'validated' | 'pending' | 'rejected';
  feedback: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
}

// Générateur d'ID unique pour éviter les doublons
let messageIdCounter = 0;
const generateUniqueId = () => {
  messageIdCounter++;
  return `msg_${Date.now()}_${messageIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
};

export default function CandidateSkillTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionsAnswers, setQuestionsAnswers] = useState<QuestionAnswer[]>([]);
  
  // Chronomètre
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mode vocal simplifié avec ElevenLabs SDK
  const [voiceMode, setVoiceMode] = useState(false);
  const isGeneratingQuestionRef = useRef(false); // Éviter la génération multiple de questions
  const lastQuestionTimeRef = useRef<number>(0); // Track last question generation time
  
  // Gérer le mode vocal ElevenLabs
  const toggleVoiceMode = () => {
    setVoiceMode(!voiceMode);
  };

  // Charger le profil du candidat avec toutes les données nécessaires
  useEffect(() => {
    const loadCandidateProfile = async () => {
      if (!user?.id) return;

      try {
        // Récupérer le profil du candidat
        const { data: candidateData, error: candidateError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (candidateError) throw candidateError;
        
        // Si le candidat a un profile_id, récupérer les infos du profil HR
        let hrProfile = null;
        if (candidateData.profile_id) {
          const { data: profileData } = await supabase
            .from('hr_profiles')
            .select(`
              name,
              hr_categories (
                name
              )
            `)
            .eq('id', candidateData.profile_id)
            .single();
          
          hrProfile = profileData;
        }

        // Récupérer les expertises
        const { data: expertisesData } = await supabase
          .from('candidate_expertises')
          .select(`
            hr_expertises (
              name
            )
          `)
          .eq('candidate_id', candidateData.id);

        // Récupérer les langues
        const { data: languagesData } = await supabase
          .from('candidate_languages')
          .select(`
            hr_languages (
              name
            )
          `)
          .eq('candidate_id', candidateData.id);

        const fullProfile = {
          ...candidateData,
          hr_profiles: hrProfile,
          expertises: expertisesData?.map(e => e.hr_expertises?.name).filter(Boolean) || [],
          languages: languagesData?.map(l => l.hr_languages?.name).filter(Boolean) || []
        };

        setCandidateProfile(fullProfile);
        
        // Générer le message de bienvenue via l'IA avec le profil chargé
        await generateWelcomeMessageWithProfile(fullProfile);
      } catch (error) {
        console.error('Error loading candidate profile:', error);
        toast.error("Erreur lors du chargement de votre profil");
      }
    };

    loadCandidateProfile();
  }, [user]);

  // Gérer le chronomètre
  useEffect(() => {
    if (testStarted && !testCompleted) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testStarted, testCompleted]);

  // Auto-scroll vers le bas amélioré
  useEffect(() => {
    // Attendre un petit délai pour que le DOM soit mis à jour
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const callAIFunction = async (action: string, additionalData = {}) => {
    try {
      // Vérifier que le profil existe avant de l'utiliser
      if (!candidateProfile) {
        console.warn('Profile not loaded yet');
        return null;
      }
      
      const candidateInfo = {
        firstName: candidateProfile.first_name || 'Candidat',
        lastName: candidateProfile.last_name || '',
        jobTitle: candidateProfile.hr_profiles?.name || 'Non défini',
        seniority: candidateProfile.seniority || 'junior',
        expertises: candidateProfile.expertises || [],
        languages: candidateProfile.languages || [],
        category: candidateProfile.hr_profiles?.hr_categories?.name || 'Général'
      };

      const response = await supabase.functions.invoke('skill-test-ai', {
        body: {
          action,
          candidateInfo,
          ...additionalData
        }
      });

      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('AI Function error:', error);
      // Retourner une réponse par défaut en cas d'erreur
      return null;
    }
  };

  const generateWelcomeMessageWithProfile = async (profile: any) => {
    setIsLoading(true);
    
    // Stocker temporairement le profil pour l'utiliser dans callAIFunction
    const tempProfile = candidateProfile;
    setCandidateProfile(profile);
    
    const aiResponse = await callAIFunctionWithProfile(profile, 'start');
    
    const welcomeMessage: Message = {
      id: '1',
      role: 'assistant',
      content: aiResponse?.message || `Bonjour ${profile.first_name} ! 👋

Je suis ravi de vous accueillir pour cette évaluation de vos compétences en tant que **${profile.hr_profiles?.name}** de niveau **${profile.seniority}**.

Je vais vous poser 10 questions personnalisées qui nous permettront d'évaluer vos connaissances et votre expérience dans les domaines suivants : ${profile.expertises.join(', ')}.

N'ayez aucune inquiétude, il s'agit d'une conversation professionnelle, pas d'un interrogatoire ! Prenez votre temps pour répondre de manière détaillée. Un chronomètre va démarrer pour référence, mais rappelez-vous : **la qualité de vos réponses est bien plus importante que la vitesse**.

Êtes-vous prêt(e) à commencer ? Répondez simplement "oui" ou "je suis prêt(e)" quand vous voulez démarrer. 🚀`,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    setIsLoading(false);
  };
  
  const callAIFunctionWithProfile = async (profile: any, action: string, additionalData = {}) => {
    try {
      const candidateInfo = {
        firstName: profile.first_name || 'Candidat',
        lastName: profile.last_name || '',
        jobTitle: profile.hr_profiles?.name || 'Non défini',
        seniority: profile.seniority || 'junior',
        expertises: profile.expertises || [],
        languages: profile.languages || [],
        category: profile.hr_profiles?.hr_categories?.name || 'Général'
      };

      const response = await supabase.functions.invoke('skill-test-ai', {
        body: {
          action,
          candidateInfo,
          ...additionalData
        }
      });

      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('AI Function error:', error);
      return null;
    }
  };

  const generateNextQuestion = async () => {
    console.log('🎯 generateNextQuestion appelée');
    console.log('🎯 currentQuestion:', currentQuestion);
    console.log('🎯 candidateProfile existe?', !!candidateProfile);
    console.log('🎯 isGeneratingQuestionRef.current:', isGeneratingQuestionRef.current);
    
    if (!candidateProfile) {
      console.log('❌ Pas de profil candidat, abandon');
      return;
    }
    
    // Éviter la génération multiple de questions
    const now = Date.now();
    if (isGeneratingQuestionRef.current) {
      console.log('⚠️ Génération de question déjà en cours, ignorée');
      return;
    }
    
    // Vérifier si on a déjà généré une question pour ce numéro
    if (currentQuestion > 10) {
      console.log('⚠️ Test terminé, pas de nouvelle question');
      return;
    }
    
    isGeneratingQuestionRef.current = true;
    lastQuestionTimeRef.current = now;
    setIsLoading(true);
    
    // Utiliser la valeur actuelle de currentQuestion
    const questionNum = currentQuestion || 1;
    console.log(`🔄 Génération de la question ${questionNum}/10 en cours...`);
    
    const aiResponse = await callAIFunction('question', {
      questionNumber: questionNum,
      previousQA: questionsAnswers
    });

    console.log('🤖 Réponse IA reçue:', aiResponse);
    
    if (aiResponse?.message) {
      console.log('✅ Message de question reçu:', aiResponse.message.substring(0, 100));
      const botMessage: Message = {
        id: generateUniqueId(),
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Sauvegarder la question pour l'historique
      setQuestionsAnswers(prev => [...prev, { question: aiResponse.message, answer: '' }]);
    }
    
    setIsLoading(false);
    isGeneratingQuestionRef.current = false;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || testCompleted) return;

    // Ajouter le message de l'utilisateur
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputMessage;
    setInputMessage("");
    
    // Si le mode vocal est activé, le message sera géré par l'agent ElevenLabs
    // Plus besoin d'envoyer manuellement maintenant

    // Démarrer le test si c'est la première interaction
    if (!testStarted && (userInput.toLowerCase().includes('oui') || userInput.toLowerCase().includes('prêt'))) {
      setTestStarted(true);
      setStartTime(new Date());
      setCurrentQuestion(1);
      
      // Générer la première question
      setTimeout(() => generateNextQuestion(), 500); // Réduit pour démarrage plus rapide
      return;
    }

    // Si le test est en cours, traiter la réponse
    if (testStarted && currentQuestion > 0) {
      // Sauvegarder la réponse
      setAnswers(prev => [...prev, userInput]);
      
      // Mettre à jour la dernière question avec sa réponse
      setQuestionsAnswers(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].answer = userInput;
        }
        return updated;
      });

      setIsLoading(true);

      // Générer une réaction à la réponse
      const reactionResponse = await callAIFunction('answer', {
        questionNumber: currentQuestion,
        userAnswer: userInput
      });

      if (reactionResponse?.message) {
        const reactionMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: reactionResponse.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, reactionMessage]);
      }

      // Passer à la question suivante ou terminer le test
      if (currentQuestion < 10) {
        const nextQuestionNum = currentQuestion + 1;
        setCurrentQuestion(nextQuestionNum);
        setTimeout(() => generateNextQuestion(), 400); // Réduit pour transition plus fluide
      } else {
        // Test terminé, évaluer les réponses
        await evaluateTest();
      }

      setIsLoading(false);
    }
  };

  const evaluateTest = async () => {
    setTestCompleted(true);
    setIsLoading(true);

    // Message de transition
    const transitionMessage: Message = {
      id: 'transition',
      role: 'assistant',
      content: "🎯 Excellent travail ! Vous avez répondu à toutes les questions. Je vais maintenant analyser vos réponses...",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, transitionMessage]);

    // Appeler l'IA pour l'évaluation finale
    const evaluationResponse = await callAIFunction('evaluate', {
      allAnswers: answers
    });

    if (evaluationResponse) {
      const result: TestResult = {
        score: evaluationResponse.score || 7,
        status: evaluationResponse.status || 'pending',
        feedback: evaluationResponse.message
      };

      setTestResult(result);

      // Sauvegarder le résultat en base de données
      await saveTestResult(result);

      // Message final simplifié selon le statut
      let finalMessage = '';
      if (result.status === 'validated') {
        finalMessage = `Merci ${candidateProfile.first_name} ! 🎉

Super, c'est tout bon ! Tu as validé le test avec brio.

On va pouvoir démarrer ensemble très rapidement. Tu vas recevoir un email de confirmation dans les prochaines minutes.

À très vite !`;
      } else if (result.status === 'pending') {
        finalMessage = `Merci ${candidateProfile.first_name} pour tes réponses !

C'était intéressant d'échanger avec toi. On va analyser tout ça en interne et on revient vers toi très vite.

Tu recevras un email dans les prochains jours.

À bientôt !`;
      } else {
        finalMessage = `Merci ${candidateProfile.first_name} d'avoir pris le temps de répondre.

Malheureusement, ton profil ne correspond pas tout à fait à ce qu'on recherche actuellement.

On garde tes coordonnées et on te recontactera si une opportunité plus adaptée se présente.

Bonne continuation !`;
      }
      
      const resultMessage: Message = {
        id: 'result',
        role: 'assistant',
        content: finalMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, resultMessage]);
    }

    setIsLoading(false);
  };

  const saveTestResult = async (result: TestResult) => {
    if (!candidateProfile?.id) return;

    try {
      // Mettre à jour le statut de qualification
      const newStatus = result.status === 'validated' ? 'qualified' : 
                       result.status === 'pending' ? 'pending' : 'rejected';
      
      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update({ 
          qualification_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', candidateProfile.id);

      if (updateError) throw updateError;

      // Sauvegarder les résultats détaillés (sans feedback car la colonne n'existe pas)
      const { error: resultError } = await supabase
        .from('candidate_qualification_results')
        .upsert({
          candidate_id: candidateProfile.id,
          test_answers: { questions: questionsAnswers, answers, feedback: result.feedback },
          score: result.score,
          qualification_status: newStatus,
          updated_at: new Date().toISOString()
        });

      if (resultError) throw resultError;

      toast.success("Résultats sauvegardés avec succès !");
    } catch (error) {
      console.error('Error saving test result:', error);
      toast.error("Erreur lors de la sauvegarde des résultats");
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/candidate');
  };

  // Gérer les réponses du bot depuis ElevenLabs
  const handleBotResponse = (text: string) => {
    console.log('🤖 Réponse bot ElevenLabs:', text);
    // Les réponses du bot sont gérées automatiquement par l'agent ElevenLabs
    // Cette fonction peut être utilisée pour logger ou traiter les réponses si nécessaire
  };

  // Gérer la transcription vocale depuis la reconnaissance native
  const handleVoiceRecognition = async (text: string) => {
    if (!text.trim() || isLoading || testCompleted) return;
    
    console.log('🎤 Reconnaissance vocale reçue:', text);
    
    // Ajouter directement le message sans passer par le textarea
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Traiter le message comme si c'était un envoi normal
    if (!testStarted && (text.toLowerCase().includes('oui') || text.toLowerCase().includes('prêt'))) {
      setTestStarted(true);
      setStartTime(new Date());
      setCurrentQuestion(1);
      
      // Générer la première question
      setTimeout(() => generateNextQuestion(), 500);
      return;
    }

    // Si le test est en cours, traiter la réponse
    if (testStarted && currentQuestion > 0) {
      // Sauvegarder la réponse
      setAnswers(prev => [...prev, text]);
      
      // Mettre à jour la dernière question avec sa réponse
      setQuestionsAnswers(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].answer = text;
        }
        return updated;
      });

      setIsLoading(true);

      // Générer une réaction à la réponse
      const reactionResponse = await callAIFunction('answer', {
        questionNumber: currentQuestion,
        userAnswer: text
      });

      if (reactionResponse?.message) {
        const reactionMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: reactionResponse.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, reactionMessage]);
        setLastBotMessage(reactionResponse.message);
      }

      // Passer à la question suivante ou terminer le test
      if (currentQuestion < 10) {
        const nextQuestionNum = currentQuestion + 1;
        setCurrentQuestion(nextQuestionNum);
        setTimeout(() => generateNextQuestion(), 400);
      } else {
        await evaluateTest();
      }

      setIsLoading(false);
    }
  };

  // Gérer la transcription vocale depuis ElevenLabs
  const handleVoiceTranscription = async (text: string) => {
    if (!text.trim()) return;
    
    console.log('🎤 Transcription ElevenLabs reçue:', text);
    
    // Ne pas traiter si en cours de chargement ou test terminé
    if (isLoading || testCompleted) return;

    // Ajouter le message de l'utilisateur
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Démarrer le test si c'est la première interaction
    if (!testStarted && (text.toLowerCase().includes('oui') || text.toLowerCase().includes('prêt'))) {
      setTestStarted(true);
      setStartTime(new Date());
      setCurrentQuestion(1);
      setTimeout(() => generateNextQuestion(), 500);
      return;
    }

    // Si le test est en cours, traiter la réponse
    if (testStarted && currentQuestion > 0) {
      // Sauvegarder la réponse
      setAnswers(prev => [...prev, text]);
      setQuestionsAnswers(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].answer = text;
        }
        return updated;
      });

      setIsLoading(true);

      // Générer une réaction
      const reactionResponse = await callAIFunction('answer', {
        questionNumber: currentQuestion,
        userAnswer: text
      });

      if (reactionResponse?.message) {
        const reactionMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: reactionResponse.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, reactionMessage]);
      }

      // Passer à la question suivante ou terminer le test
      if (currentQuestion < 10) {
        const nextQuestionNum = currentQuestion + 1;
        setCurrentQuestion(nextQuestionNum);
        setTimeout(() => generateNextQuestion(), 400);
      } else {
        await evaluateTest();
      }

      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setVoiceMode(false);
    };
  }, []);

  // Nettoyer la synthèse vocale native quand on active le mode vocal
  useEffect(() => {
    if (voiceMode && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('🔇 Mode vocal ElevenLabs activé');
    }
  }, [voiceMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="container max-w-7xl mx-auto p-6">
        {/* Debug Profile - Temporaire */}
        <div className="mb-4">
          <ProfileDebugger />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <IallaLogo className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Test de Validation IA
              </h1>
              <p className="text-gray-600 mt-1">Évaluation personnalisée de vos compétences</p>
            </div>
          </div>
          
          {testStarted && !testCompleted && (
            <div className="flex items-center gap-4">
              <Card className="px-4 py-2 bg-white/80 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-purple-600" />
                  <span className="font-mono text-lg font-semibold">{formatTime(elapsedTime)}</span>
                </div>
              </Card>
              <Card className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <span className="font-semibold">Question {currentQuestion}/10</span>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {testStarted && !testCompleted && (
          <div className="mb-6">
            <Progress value={(currentQuestion / 10) * 100} className="h-3 bg-purple-100" />
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar gauche avec infos */}
          <div className="col-span-3 space-y-4">
            {/* Profil candidat */}
            {candidateProfile && (
              <Card className="bg-white/90 backdrop-blur shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-600" />
                    Votre Profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Candidat</p>
                    <p className="font-semibold">{candidateProfile.first_name} {candidateProfile.last_name}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500">Métier</p>
                    <p className="font-semibold">{candidateProfile.hr_profiles?.name}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500">Niveau</p>
                    <Badge variant="secondary" className="mt-1">
                      {candidateProfile.seniority}
                    </Badge>
                  </div>
                  {candidateProfile.expertises.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Expertises</p>
                        <div className="flex flex-wrap gap-1">
                          {candidateProfile.expertises.slice(0, 3).map((exp: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {exp}
                            </Badge>
                          ))}
                          {candidateProfile.expertises.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidateProfile.expertises.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Comment ça marche
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <p>Répondez "oui" pour démarrer le test</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <p>10 questions personnalisées selon votre profil</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <p>Prenez votre temps pour répondre</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">4</span>
                  </div>
                  <p>Recevez votre score et feedback instantanément</p>
                </div>
              </CardContent>
            </Card>

            {/* Stats en temps réel */}
            {testStarted && (
              <Card className="bg-white/90 backdrop-blur shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Progression
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Questions répondues</span>
                    <span className="font-bold text-purple-600">
                      {Math.max(0, currentQuestion - 1)}/10
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Temps écoulé</span>
                    <span className="font-mono font-semibold">{formatTime(elapsedTime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Temps moyen/question</span>
                    <span className="font-mono">
                      {currentQuestion > 1 ? formatTime(Math.floor(elapsedTime / (currentQuestion - 1))) : '--:--'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Zone de chat principale */}
          <div className="col-span-9">
            <Card className="h-[700px] shadow-2xl bg-white/95 backdrop-blur">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle>Assistant d'Évaluation IA</CardTitle>
                      <CardDescription className="text-purple-100">
                        Powered by GPT-4 • Évaluation intelligente et personnalisée
                      </CardDescription>
                    </div>
                  </div>
                  {testCompleted && testResult && (
                    <Badge 
                      variant={testResult.status === 'validated' ? 'default' : 
                              testResult.status === 'pending' ? 'secondary' : 'destructive'}
                      className="text-lg px-4 py-2"
                    >
                      <Award className="w-5 h-5 mr-2" />
                      Score: {testResult.score}/10
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-0 h-[calc(100%-80px)] flex flex-col">
                <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 animate-in fade-in-50 duration-500 ${
                          (message.role || message.type) === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {(message.role || message.type) === 'assistant' && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Bot className="w-6 h-6 text-white" />
                          </div>
                        )}
                        
                        <div
                          className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-md ${
                            (message.role || message.type) === 'user'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content.split('\n').map((line, i) => {
                              // Remplacer **texte** par du texte en gras
                              const parts = line.split(/\*\*(.*?)\*\*/g);
                              return (
                                <p key={i} className="mb-1 last:mb-0">
                                  {parts.map((part, j) => 
                                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                                  )}
                                </p>
                              );
                            })}
                          </div>
                          <div className={`text-xs mt-2 ${
                            (message.role || message.type) === 'user' ? 'text-purple-100' : 'text-gray-500'
                          }`}>
                            {message.timestamp instanceof Date ? message.timestamp.toLocaleTimeString() : new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        {(message.role || message.type) === 'user' && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 justify-start animate-in fade-in-50 duration-500">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div className="bg-gray-100 rounded-2xl px-5 py-3 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            <span className="text-sm text-gray-600">L'IA réfléchit...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                {/* Zone de saisie */}
                {!testCompleted ? (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="space-y-3">
                      {/* Contrôle vocal ElevenLabs SDK */}
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          {/* Chat vocal ElevenLabs simple */}
                          <VoiceChatSDK
                            isEnabled={voiceMode}
                            onToggle={toggleVoiceMode}
                            onUserMessage={handleVoiceRecognition}
                            onAgentMessage={(text) => console.log('Agent:', text)}
                          />
                        </div>
                        
                        {voiceMode && (
                          <div className="text-xs text-gray-500">
                            💡 Conversation vocale en temps réel avec l'IA
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        <Textarea
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder={
                            !testStarted 
                              ? "Tapez 'oui' ou 'je suis prêt(e)' pour commencer le test..."
                              : voiceMode 
                                ? "Cliquez sur 'Enregistrer' ou tapez votre réponse..."
                                : "Tapez votre réponse ici... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
                          }
                          disabled={isLoading}
                          className="flex-1 min-h-[60px] resize-none"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={isLoading || !inputMessage.trim()}
                          size="lg"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                          data-send-button
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                    <Button
                      onClick={handleReturnToDashboard}
                      size="lg"
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Retourner au tableau de bord
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}