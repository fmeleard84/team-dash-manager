/**
 * Assistant vocal amélioré avec l'architecture complète
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, X, Volume2, Loader2, Send, Settings, 
  Bot, Sparkles, Info, ChevronRight, MessageSquare,
  Wand2, Users, Calendar, CheckSquare, Map, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { FullScreenModal, ModalActions } from '@/components/ui/fullscreen-modal';
import { useRealtimeAssistant } from '@/ai-assistant/hooks/useRealtimeAssistant';
import { KNOWLEDGE_CATEGORIES } from '@/ai-assistant/config/knowledge-base';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { saveTeamComposition, parseTeamFromAI } from '@/ai-assistant/tools/reactflow-generator';
import { motion, AnimatePresence } from 'framer-motion';
import { TextChatInterface } from './TextChatInterface';

interface EnhancedVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCall?: {
    name: string;
    result: any;
  };
}

export function EnhancedVoiceAssistant({ 
  isOpen, 
  onClose, 
  context = 'general' 
}: EnhancedVoiceAssistantProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'voice' | 'text' | 'help'>('voice');
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedContext, setSelectedContext] = useState(context);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [createdProject, setCreatedProject] = useState<{ id: string; name: string; url: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    state,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
    executeFunction,
    clearTranscript,
    isSupported
  } = useRealtimeAssistant({
    context: selectedContext,
    enableTools: true,
    autoConnect: false
  });

  // Debug: Log l'état en temps réel
  useEffect(() => {
    console.log('📊 État actuel:', {
      isConnected: state.isConnected,
      isConnecting: isConnecting,
      isListening: state.isListening,
      isSpeaking: state.isSpeaking,
      isProcessing: state.isProcessing,
      createdProject: !!createdProject,
      showAllo: (state.isConnected || isConnecting) && !createdProject,
      error: state.error
    });
  }, [state, isConnecting, createdProject]);

  // Contextes disponibles
  const contexts = [
    { id: 'general', label: 'Général', icon: Bot },
    { id: 'team-composition', label: 'Composition d\'Team', icon: Users },
    { id: 'project-management', label: 'Gestion de Project', icon: Map },
    { id: 'meeting', label: 'Réunions', icon: Calendar },
    { id: 'task-management', label: 'Tâches', icon: CheckSquare }
  ];

  // Suggestions d'actions rapides
  const quickActions = [
    { label: 'Composer une équipe', action: 'compose_team', icon: Users },
    { label: 'Créer une réunion', action: 'create_meeting', icon: Calendar },
    { label: 'Ajouter une tâche', action: 'add_task', icon: CheckSquare },
    { label: 'Statut du projet', action: 'get_project_status', icon: Map }
  ];

  // Auto-scroll des messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ajouter les messages de l'assistant
  useEffect(() => {
    if (state.transcript && state.transcript !== messages[messages.length - 1]?.content) {
      console.log('📝 Nouveau transcript:', state.transcript);
      addMessage('user', state.transcript);
      // Détecter si l'utilisateur demande de créer une équipe
      if (state.transcript.toLowerCase().includes('équipe') || 
          state.transcript.toLowerCase().includes('team') ||
          state.transcript.toLowerCase().includes('compose')) {
        console.log('🎯 Détection création équipe dans le transcript');
        setIsCreatingTeam(true);
      }
    }
  }, [state.transcript, messages]);

  useEffect(() => {
    console.log('📊 State update:', { 
      hasResponse: !!state.response,
      lastToolCall: state.lastToolCall,
      isCreatingTeam
    });
    
    if (state.response && state.response !== messages[messages.length - 1]?.content) {
      console.log('🤖 Nouvelle réponse:', state.response);
      addMessage('assistant', state.response, state.lastToolCall);
    }
  }, [state.response, messages]);

  // Effet séparé pour gérer les tool calls
  useEffect(() => {
    if (state.lastToolCall) {
      console.log('🔧 Tool call détecté:', state.lastToolCall);
      
      // Vérifier si l'équipe ou le projet a été créé
      if ((state.lastToolCall.name === 'create_team' || state.lastToolCall.name === 'create_project') && state.lastToolCall.result) {
        console.log('🚀 Project/Team creation result:', state.lastToolCall.result);
        
        // Si le projet a été créé avec succès
        if (state.lastToolCall.result.success && (state.lastToolCall.result.data?.project_id || state.lastToolCall.result.data?.id)) {
          console.log('✅ Projet créé avec succès');
          const projectId = state.lastToolCall.result.data.project_id || state.lastToolCall.result.data.id;
          const projectName = state.lastToolCall.result.data.project_name || state.lastToolCall.result.data.name || 'Nouveau projet';
          const projectUrl = state.lastToolCall.result.data.project_url || `/project/${projectId}`;
          console.log('🆔 ID du projet créé:', projectId);
          console.log('🔗 URL du projet:', projectUrl);
          
          // Sauvegarder les infos du projet créé
          setCreatedProject({
            id: projectId,
            name: projectName,
            url: projectUrl
          });
          
          // Déconnecter l'assistant
          disconnect();
          
          // Arrêter l'animation de création
          setIsCreatingTeam(false);
          
          // Afficher un message de succès
          toast({
            title: 'Projet créé avec succès !',
            description: state.lastToolCall.result.message,
          });
        } else if (!state.lastToolCall.result.success) {
          console.error('❌ Erreur création projet:', state.lastToolCall.result.error);
          toast({
            title: 'Erreur',
            description: state.lastToolCall.result.error || 'Impossible de créer le projet',
            variant: 'destructive'
          });
          setIsCreatingTeam(false);
        }
      }
    }
  }, [state.lastToolCall, navigate, onClose, disconnect]);

  useEffect(() => {
    if (state.error) {
      addMessage('system', `Erreur: ${state.error}`);
      setIsCreatingTeam(false);
    }
  }, [state.error]);

  const addMessage = (role: Message['role'], content: string, toolCall?: any) => {
    const message: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      toolCall
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSendText = () => {
    if (!textInput.trim() || !state.isConnected) return;
    
    const message = textInput.trim();
    setTextInput('');
    sendMessage(message);
  };

  const handleQuickAction = (action: string) => {
    let prompt = '';
    switch (action) {
      case 'compose_team':
        prompt = 'J\'ai besoin de composer une Team pour un Project web complexe avec un Budget de 150k€ sur 6 mois';
        break;
      case 'create_meeting':
        prompt = 'Crée une réunion de kickoff pour Tomorrow à 10h avec toute l\'équipe';
        break;
      case 'add_task':
        prompt = 'Ajoute une tâche "Configurer l\'environnement de développement" avec priorité haute';
        break;
      case 'get_project_status':
        prompt = 'Quel est le Status actuel de mon Project principal ?';
        break;
    }
    
    if (prompt) {
      sendMessage(prompt);
    }
  };

  const handleStopAndReturn = () => {
    // Arrêter l'écoute et la conversation
    if (state.isListening) {
      stopListening();
    }
    // Déconnecter l'assistant
    if (state.isConnected) {
      disconnect();
    }
    // Fermer le popup
    onClose();
  };

  const handleConnect = async () => {
    console.log('🔌 Tentative de connexion...');
    setIsConnecting(true); // Afficher le cercle allo immédiatement
    
    // La clé API est gérée côté serveur via Supabase, pas besoin de la demander
    await connect();
    setIsConnecting(false); // La connexion est établie
    console.log('✅ Connexion lancée, état actuel:', state);
  };

  // Utiliser FullScreenModal si createdProject existe
  if (createdProject) {
    return (
      <FullScreenModal
        isOpen={isOpen}
        onClose={onClose}
        title="Assistant IA - Projet créé avec succès"
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-lg">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-2">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              Projet créé avec succès !
            </h3>
            <p className="text-gray-600 text-center">
              {createdProject.name}
            </p>
            <div className="flex gap-4 mt-4">
              <Button
                onClick={() => {
                  onClose();
                  // Naviguer vers la page des projets
                  window.location.href = '/';
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Voir le projet
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  // Naviguer vers l'équipe du projet (ReactFlow)
                  navigate(createdProject.url);
                }}
                className="bg-brand hover:bg-brand/90 text-white flex items-center gap-2"
              >
                <Users className="w-5 h-5" />
                Voir l'équipe
              </Button>
            </div>
          </div>
        </div>
      </FullScreenModal>
    );
  }

  if (!isOpen) return null;

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Assistant IA Intelligent"
      actions={
        <div className="flex items-center gap-2">
          {state.isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
            >
              <X className="w-4 h-4 mr-2" />
              Déconnecter
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopAndReturn}
            title="Arrêter et fermer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      {/* Container principal */}
      <div className="flex flex-col h-full relative">
        
        {/* Indicateur "Allo" pour conversation active - centré dans le container */}
        <AnimatePresence>
          {(state.isConnected || isConnecting) && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          >
            <div className="relative">
              {/* Cercle principal avec animation de pulsation très douce */}
              <motion.div
                animate={{ 
                  scale: [1, 1.02, 1],
                  opacity: [0.4, 0.6, 0.4]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-64 h-64 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 dark:from-purple-500/15 dark:to-pink-500/15 backdrop-blur-xl shadow-2xl flex items-center justify-center"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: [0.5, 0.7, 0.5]
                  }}
                  transition={{ 
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                  }}
                  className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-500/15 to-pink-500/15 dark:from-purple-600/20 dark:to-pink-600/20 backdrop-blur-md flex items-center justify-center"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.08, 1],
                      opacity: [0.6, 0.8, 0.6]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.4
                    }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 dark:from-purple-700/25 dark:to-pink-700/25 backdrop-blur-sm shadow-inner flex items-center justify-center"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-12 h-12 text-white drop-shadow-lg animate-spin" />
                    ) : state.isListening ? (
                      <Mic className="w-12 h-12 text-white drop-shadow-lg animate-pulse" />
                    ) : state.isSpeaking ? (
                      <Volume2 className="w-12 h-12 text-white drop-shadow-lg animate-pulse" />
                    ) : state.isProcessing ? (
                      <Loader2 className="w-12 h-12 text-white drop-shadow-lg animate-spin" />
                    ) : (
                      <span className="text-white text-2xl font-bold drop-shadow-lg">Allo</span>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
              
              {/* Ondes sonores animées plus douces */}
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1.6],
                  opacity: [0.3, 0.15, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute inset-0 rounded-full border-2 border-purple-300/50 dark:border-purple-400/50"
              />
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1.6],
                  opacity: [0.3, 0.15, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.75
                }}
                className="absolute inset-0 rounded-full border-2 border-pink-300/50 dark:border-pink-400/50"
              />
              
            </div>
          </motion.div>
        )}
        
        {/* Indicateur de création d'équipe */}
        {isCreatingTeam && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ zIndex: 61 }}
          >
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 flex flex-col items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4"
              >
                <Users className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Création de l'équipe en cours
              </h3>
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-purple-500 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  className="w-2 h-2 bg-purple-500 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                  className="w-2 h-2 bg-purple-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
        {/* Status bar */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              state.isConnected ? 'bg-green-500 animate-pulse' : 
              state.isProcessing ? 'bg-yellow-500 animate-pulse' : 
              'bg-gray-400'
            }`} />
            <span className="text-sm text-muted-foreground">
              {state.isConnected ? 'En ligne' : 
               state.isProcessing ? 'Traitement...' : 
               'Hors ligne'}
            </span>
            {state.isListening && (
              <Badge variant="secondary" className="animate-pulse">
                <Mic className="w-3 h-3 mr-1" />
                Écoute...
              </Badge>
            )}
            {state.isSpeaking && (
              <Badge variant="secondary">
                <Volume2 className="w-3 h-3 mr-1" />
                En conversation
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Contexte de l'assistant</label>
                <div className="flex gap-2 flex-wrap">
                  {contexts.map(ctx => (
                    <Button
                      key={ctx.id}
                      variant={selectedContext === ctx.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedContext(ctx.id)}
                      disabled={state.isConnected}
                    >
                      <ctx.icon className="w-4 h-4 mr-2" />
                      {ctx.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="voice">
              <Mic className="w-4 h-4 mr-2" />
              Voix
            </TabsTrigger>
            <TabsTrigger value="text">
              <MessageSquare className="w-4 h-4 mr-2" />
              Texte
            </TabsTrigger>
            <TabsTrigger value="help">
              <Info className="w-4 h-4 mr-2" />
              Aide
            </TabsTrigger>
          </TabsList>

          {/* Voice Tab */}
          <TabsContent value="voice" className="flex-1 flex flex-col p-4">
            {!state.isConnected ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-brand/20 to-brand/10 rounded-full flex items-center justify-center">
                    <Mic className="w-12 h-12 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Mode Vocal (Démo)</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Version de démonstration. Pour une intégration complète avec l'API OpenAI Realtime, configurez un serveur backend pour générer des clés éphémères.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleConnect}
                    disabled={state.isProcessing || !isSupported}
                  >
                    {state.isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Login...
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
                        Démarrer la conversation
                      </>
                    )}
                  </Button>
                  {!isSupported && (
                    <Alert>
                      <AlertDescription>
                        Votre navigateur ne supporte pas l'API audio nécessaire.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Afficher les boutons uniquement si le cercle Allo n'est pas visible */}
                {!((state.isConnected || isConnecting) && !createdProject) && (
                  <div className="mb-4 flex justify-center gap-4">
                    <Button
                      size="lg"
                      variant={state.isListening ? 'destructive' : 'default'}
                      onClick={state.isListening ? stopListening : startListening}
                      disabled={state.isProcessing}
                    >
                      {state.isListening ? (
                        <>
                          <MicOff className="w-5 h-5 mr-2" />
                          Arrêter
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5 mr-2" />
                          Parler
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                <ScrollArea className="flex-1">
                  <MessagesList messages={messages} isConnected={state.isConnected} />
                  {/* Afficher la transcription en temps réel */}
                  {state.isProcessing && state.transcript && (
                    <div className="px-4 py-2">
                      <div className="flex justify-end">
                        <div className="max-w-[70%] rounded-xl px-4 py-2 bg-brand/20 border border-brand">
                          <p className="text-sm italic">En cours de traitement...</p>
                          <p className="text-sm">{state.transcript}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Afficher la réponse en cours de génération */}
                  {state.isSpeaking && state.response && (
                    <div className="px-4 py-2">
                      <div className="flex justify-start">
                        <div className="max-w-[70%] rounded-xl px-4 py-2 bg-card border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <Volume2 className="w-3 h-3 text-brand animate-pulse" />
                            <span className="text-xs text-muted-foreground">En train de parler...</span>
                          </div>
                          <p className="text-sm">{state.response}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text" className="flex-1 flex flex-col p-0">
            <TextChatInterface 
              context={selectedContext}
              onToolCall={(toolName, args) => {
                console.log('Tool called from text chat:', toolName, args);
                // Gérer les appels de fonction depuis le chat textuel
                if (toolName === 'create_project_with_team') {
                  setIsCreatingTeam(true);
                  // Implémenter la logique de création de projet
                }
              }}
            />
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help" className="flex-1 p-4 overflow-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Capacités de l'assistant</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Wand2 className="w-5 h-5 text-brand mt-0.5" />
                    <div>
                      <p className="font-medium">Expliquer les fonctionnalités</p>
                      <p className="text-sm text-muted-foreground">
                        "Explique-moi comment fonctionne ReactFlow"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Users className="w-5 h-5 text-brand mt-0.5" />
                    <div>
                      <p className="font-medium">Composer des Teams</p>
                      <p className="text-sm text-muted-foreground">
                        "Compose une Team pour un Project SaaS de 200k€"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Calendar className="w-5 h-5 text-brand mt-0.5" />
                    <div>
                      <p className="font-medium">Créer des réunions</p>
                      <p className="text-sm text-muted-foreground">
                        "Planifie un daily Tomorrow à 9h30"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <CheckSquare className="w-5 h-5 text-brand mt-0.5" />
                    <div>
                      <p className="font-medium">Gérer les tâches</p>
                      <p className="text-sm text-muted-foreground">
                        "Ajoute une tâche urgente pour corriger le bug de login"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Fonctionnalités Availables</h3>
                <div className="flex flex-wrap gap-2">
                  {KNOWLEDGE_CATEGORIES.map(category => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FullScreenModal>
  );
}

// Composant pour afficher les messages
function MessagesList({ messages, isConnected }: { messages: Message[], isConnected?: boolean }) {
  return (
    <div className="space-y-3 p-2">
      {messages.length === 0 ? (
        isConnected ? (
          <div className="h-full" />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>Aucun message pour le moment</p>
            <p className="text-sm mt-2">Commencez une conversation avec l'assistant</p>
          </div>
        )
      ) : (
        messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-brand text-white'
                  : message.role === 'system'
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200'
                  : 'bg-card border border-border'
              }`}
            >
              {message.toolCall && (
                <div className="mb-2 pb-2 border-b border-white/20">
                  <Badge variant="secondary" className="text-xs">
                    <Wand2 className="w-3 h-3 mr-1" />
                    {message.toolCall.name}
                  </Badge>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}