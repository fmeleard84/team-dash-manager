import { useEffect, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Mic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCandidateProfile } from '@/hooks/useCandidateProfile';
import { generateQuestionsForProfile, createAgentPrompt, GeneratedQuestion } from '@/services/questionGenerator';

// Configuration ElevenLabs
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';

interface VoiceChatSDKProps {
  isEnabled: boolean;
  onToggle: () => void;
  onUserMessage?: (text: string) => void;
  onAgentMessage?: (text: string) => void;
  testQuestions?: string[]; // Liste des questions du test
  onQuestionAnswered?: (questionIndex: number, answer: string) => void;
}

export function VoiceChatSDK({ 
  isEnabled, 
  onToggle,
  onUserMessage,
  onAgentMessage,
  testQuestions,
  onQuestionAnswered
}: VoiceChatSDKProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [personalizedQuestions, setPersonalizedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  // Récupérer le profil du candidat
  const { profile, loading: profileLoading } = useCandidateProfile();
  
  // Utiliser le hook officiel ElevenLabs
  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Conversation connectée');
      toast.success('Connexion établie');
      
      // Envoyer un message initial avec les variables après connexion
      // Le SDK devrait permettre d'envoyer un message personnalisé
      setTimeout(() => {
        if (conversation && typeof (conversation as any).send === 'function') {
          const initData = {
            user_name: 'Candidat',
            agent_name: 'Assistant IA',
            greeting: 'Bonjour ! Je suis votre assistant pour le test de compétences.'
          };
          (conversation as any).send(JSON.stringify(initData));
          console.log('📤 Variables envoyées');
        }
      }, 100);
    },
    onDisconnect: () => {
      console.log('🔌 Conversation déconnectée');
      setConversationId(null);
      setHasStarted(false);
    },
    onMessage: (message) => {
      console.log('📨 Message:', message);
      
      // Gérer les messages selon le type
      if (message.source === 'user' && message.message) {
        console.log('🎤 Vous:', message.message);
        if (onUserMessage) onUserMessage(message.message);
        
        // Enregistrer la réponse à la question actuelle
        if (onQuestionAnswered && currentQuestionIndex < personalizedQuestions.length) {
          onQuestionAnswered(currentQuestionIndex, message.message);
          
          // Après chaque réponse, envoyer un signal pour passer à la question suivante
          setTimeout(() => {
            if (currentQuestionIndex < personalizedQuestions.length - 1) {
              const nextIndex = currentQuestionIndex + 1;
              setCurrentQuestionIndex(nextIndex);
              
              // Envoyer un message système pour forcer le passage
              const nextQuestion = personalizedQuestions[nextIndex];
              const systemMessage = `[INSTRUCTION SYSTÈME] Merci pour cette réponse. Passons maintenant à la question ${nextIndex + 1} sur ${personalizedQuestions.length} : ${nextQuestion.question}`;
              
              // Essayer d'envoyer ce message à l'agent
              if (conversation && conversation.status === 'connected') {
                console.log('📤 Forçage question suivante:', nextIndex + 1);
                // Note: Le SDK ElevenLabs ne permet pas d'envoyer des messages système directement
                // On va plutôt utiliser une approche différente
              }
            }
          }, 2000); // Attendre 2 secondes après la réponse
        }
      } else if (message.source === 'ai' && message.message) {
        console.log('🤖 Agent:', message.message);
        if (onAgentMessage) onAgentMessage(message.message);
        
        // Détecter si l'agent passe à la question suivante
        const lowerMessage = message.message.toLowerCase();
        if (lowerMessage.includes('question suivante') || 
            lowerMessage.includes('passons à') || 
            lowerMessage.includes('question') && lowerMessage.includes('/10')) {
          // L'agent a progressé
          console.log('✅ Agent a progressé à la question suivante');
        }
      }
    },
    onError: (error) => {
      console.error('❌ Erreur:', error);
      // Ne pas afficher de toast pour les erreurs de variables dynamiques
      if (!error?.message?.includes('dynamic variables')) {
        toast.error('Erreur de conversation');
      }
    }
  });

  // Générer les questions personnalisées quand le profil est chargé
  useEffect(() => {
    async function loadPersonalizedQuestions() {
      if (profile && !personalizedQuestions.length) {
        setIsLoadingQuestions(true);
        try {
          const questions = await generateQuestionsForProfile(profile);
          setPersonalizedQuestions(questions);
          console.log(`✅ ${questions.length} questions générées pour ${profile.job_title}`);
        } catch (error) {
          console.error('Erreur génération questions:', error);
        } finally {
          setIsLoadingQuestions(false);
        }
      }
    }
    
    loadPersonalizedQuestions();
  }, [profile, personalizedQuestions.length]);

  useEffect(() => {
    const startConversation = async () => {
      if (hasStarted || !profile || !personalizedQuestions.length) return;
      
      try {
        setHasStarted(true);
        
        // Demander l'accès au microphone
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        console.log('🔐 Démarrage conversation personnalisée pour:', profile.job_title);
        
        // Créer le prompt personnalisé
        const agentPrompt = createAgentPrompt(profile, personalizedQuestions);
        const firstQuestion = personalizedQuestions[0]?.question || "Parlez-nous de votre expérience.";
        
        // Démarrer avec le contexte personnalisé
        const id = await conversation.startSession({
          agentId: AGENT_ID,
          connectionType: 'websocket',
          overrides: {
            agent: {
              // Message personnalisé selon le profil
              firstMessage: `Bonjour ! Je suis votre recruteur virtuel. 
                Je vais évaluer vos compétences pour le poste de ${profile.job_title || 'Candidat'}.
                Nous allons parcourir 10 questions adaptées à votre profil et vos spécialités.
                Prenez votre temps pour répondre, je suis là pour vous guider.
                
                Commençons par la première question : ${firstQuestion}`,
              variables: {
                user_name: 'Candidat',
                agent_name: 'Recruteur IA',
                greeting: `Bienvenue au test de compétences pour ${profile.job_title}`,
                // Contexte personnalisé
                job_title: profile.job_title || '',
                seniority: profile.seniority_level || '',
                skills: profile.technical_skills?.join(', ') || '',
                test_context: agentPrompt
              }
            }
          }
        } as any);
        
        console.log('✅ Conversation personnalisée démarrée:', id);
        setConversationId(id);
      } catch (error) {
        console.error('❌ Erreur démarrage:', error);
        setHasStarted(false);
        toast.error('Impossible de démarrer la conversation');
      }
    };

    if (isEnabled && !hasStarted && profile && personalizedQuestions.length > 0) {
      startConversation();
    } else if (!isEnabled && conversation.status === 'connected') {
      conversation.endSession();
      setHasStarted(false);
    }

    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession();
      }
    };
  }, [isEnabled, hasStarted, profile, personalizedQuestions]);

  // Utiliser les questions personnalisées ou les questions passées en props
  const questionsToUse = personalizedQuestions.length > 0 
    ? personalizedQuestions.map(q => q.question)
    : (testQuestions || []);

  return (
    <div className="flex flex-col gap-3">
      {/* Afficher le profil détecté */}
      {profile && (
        <div className="text-xs text-gray-600 mb-2">
          Test personnalisé pour : <span className="font-semibold">{profile.job_title}</span>
          {profile.seniority_level && <span className="ml-2">• {profile.seniority_level}</span>}
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <Button
          onClick={onToggle}
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          className={isEnabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
          disabled={profileLoading || isLoadingQuestions}
        >
          {profileLoading || isLoadingQuestions ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Préparation...
            </>
          ) : isEnabled ? (
            <>
              <Volume2 className="w-4 h-4 mr-2" />
              Conversation Active
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 mr-2" />
              Activer Conversation
            </>
          )}
        </Button>
        
        {isEnabled && (
          <div className="flex items-center gap-2">
            {conversation.status === 'connected' ? (
              <Badge variant="secondary" className="bg-green-500 text-white animate-pulse">
                <Mic className="w-3 h-3 mr-1" />
                {conversation.isSpeaking ? 'Agent parle...' : 'À vous de parler'}
              </Badge>
            ) : isLoadingQuestions ? (
              <Badge variant="secondary" className="bg-blue-500 text-white">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Génération questions...
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-500 text-white">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Connexion...
              </Badge>
            )}
            
            {conversationId && (
              <Badge variant="outline" className="text-xs">
                Question {currentQuestionIndex + 1}/{questionsToUse.length}
              </Badge>
            )}
          </div>
        )}
      </div>
      
      {/* Barre de progression */}
      {isEnabled && conversationId && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentQuestionIndex + 1) / questionsToUse.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}