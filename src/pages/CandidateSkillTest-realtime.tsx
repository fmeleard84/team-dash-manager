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
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { VoiceChat } from "@/components/VoiceChat";

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
  
  // Mode vocal avec API Realtime
  const [voiceMode, setVoiceMode] = useState(false);
  const [lastBotMessage, setLastBotMessage] = useState<string>("");

  // Charger le profil candidat
  useEffect(() => {
    const loadCandidateProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setCandidateProfile(data);
      }
    };
    
    loadCandidateProfile();
  }, [user]);

  // Timer
  useEffect(() => {
    if (startTime && !testCompleted) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime, testCompleted]);

  // Auto-scroll
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Message initial
  useEffect(() => {
    if (candidateProfile) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `Salut ${candidateProfile.first_name} ! 👋

Je suis l'assistant Ialla et je vais t'accompagner pendant ce test de compétences.

Voici comment ça va se passer :
• Je vais te poser 10 questions adaptées à ton profil ${candidateProfile.job_title}
• Prends ton temps pour répondre naturellement
• Il n'y a pas de bonne ou mauvaise réponse

Tu peux utiliser le mode texte ou le mode vocal 🎙️ (plus naturel et rapide).

Es-tu prêt(e) à commencer ?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      setLastBotMessage(welcomeMessage.content);
    }
  }, [candidateProfile]);

  // Suivre le dernier message du bot
  useEffect(() => {
    const lastAssistantMessage = messages
      .filter(m => m.role === 'assistant')
      .pop();
    
    if (lastAssistantMessage) {
      setLastBotMessage(lastAssistantMessage.content);
    }
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const callAIFunction = async (action: string, params: any) => {
    try {
      const response = await supabase.functions.invoke('skill-test-ai', {
        body: {
          action,
          ...params,
          candidateInfo: candidateProfile ? {
            firstName: candidateProfile.first_name,
            lastName: candidateProfile.last_name,
            jobTitle: candidateProfile.job_title,
            seniority: candidateProfile.seniority
          } : null
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error calling AI:', error);
      toast.error("Erreur lors de l'appel à l'IA");
      return null;
    }
  };

  const generateNextQuestion = async () => {
    const questionResponse = await callAIFunction('question', {
      questionNumber: currentQuestion,
      previousAnswers: answers
    });
    
    if (questionResponse?.message) {
      const questionMessage: Message = {
        id: generateUniqueId(),
        role: 'assistant',
        content: questionResponse.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, questionMessage]);
      setQuestionsAnswers(prev => [...prev, { question: questionResponse.message, answer: '' }]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userInput = inputMessage;
    setInputMessage('');
    
    // Ajouter le message utilisateur
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Démarrer le test si c'est la première interaction
    if (!testStarted && (userInput.toLowerCase().includes('oui') || userInput.toLowerCase().includes('prêt'))) {
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
        setTimeout(() => generateNextQuestion(), 400);
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

      // Sauvegarder les résultats détaillés
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
    navigate('/candidat-dashboard');
  };

  // Gérer la transcription vocale
  const handleVoiceTranscription = (text: string) => {
    if (!text.trim()) return;
    
    // Définir le message dans l'input
    setInputMessage(text);
    
    // Envoyer automatiquement après une courte pause
    setTimeout(() => {
      if (text.toLowerCase().includes('oui') || text.toLowerCase().includes('prêt')) {
        handleSendMessage();
      } else if (testStarted) {
        handleSendMessage();
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <IallaLogo className="w-16 h-16" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Test de Compétences Ialla
          </h1>
          <p className="text-gray-600">
            {candidateProfile ? `${candidateProfile.job_title} - Niveau ${candidateProfile.seniority}` : 'Test de qualification'}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Zone de chat principale */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="w-6 h-6 text-purple-600" />
                    <CardTitle>Assistant Ialla</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    {testStarted && !testCompleted && (
                      <Badge variant="outline" className="gap-1">
                        <Timer className="w-3 h-3" />
                        {formatTime(elapsedTime)}
                      </Badge>
                    )}
                    {currentQuestion > 0 && (
                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
                        Question {currentQuestion}/10
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <Separator />
              
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              
              <Separator />
              
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <VoiceChat
                    onTranscription={handleVoiceTranscription}
                    botResponse={lastBotMessage}
                    isEnabled={voiceMode}
                    onToggle={() => setVoiceMode(!voiceMode)}
                    testContext={{
                      currentQuestion,
                      candidateInfo: candidateProfile ? {
                        firstName: candidateProfile.first_name,
                        lastName: candidateProfile.last_name,
                        jobTitle: candidateProfile.job_title,
                        seniority: candidateProfile.seniority
                      } : undefined
                    }}
                  />
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Tapez votre réponse ici..."
                    className="flex-1 resize-none"
                    rows={2}
                    disabled={isLoading || testCompleted}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading || testCompleted}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panneau latéral */}
          <div className="space-y-6">
            {/* Progress */}
            {testStarted && (
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Progression
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={(currentQuestion / 10) * 100} className="mb-2" />
                  <p className="text-sm text-gray-600 text-center">
                    {currentQuestion}/10 questions
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Test Result */}
            {testCompleted && testResult && (
              <Card className="shadow-lg border-2 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {testResult.status === 'validated' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : testResult.status === 'pending' ? (
                      <Clock className="w-5 h-5 text-orange-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    Résultat du Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Score</span>
                      <span className="text-2xl font-bold text-purple-600">
                        {testResult.score}/10
                      </span>
                    </div>
                    <Progress value={testResult.score * 10} className="h-3" />
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{testResult.feedback}</p>
                  </div>
                  
                  <Button
                    onClick={handleReturnToDashboard}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Retour au tableau de bord
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {!testStarted && (
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">1</Badge>
                    <p className="text-sm text-gray-600">
                      Répondez naturellement aux questions
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">2</Badge>
                    <p className="text-sm text-gray-600">
                      Prenez votre temps, il n'y a pas de limite
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">3</Badge>
                    <p className="text-sm text-gray-600">
                      Soyez honnête dans vos réponses
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="mt-0.5">4</Badge>
                    <p className="text-sm text-gray-600">
                      Utilisez le mode vocal pour plus de fluidité
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}