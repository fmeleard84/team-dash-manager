/**
 * Assistant vocal amélioré avec l'architecture complète
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, X, Volume2, Loader2, Send, Settings, 
  Bot, Sparkles, Info, ChevronRight, Messagesquare,
  Wand2, Users, Calendar, CheckSquare, Map
} from 'lucide-react';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useRealtimeAssistant } from '@/ai-assistant/hooks/useRealtimeAssistant';
import { KNOWLEDGE_CATEGORIES } from '@/ai-assistant/config/knowledge-base';
import { toast } from '@/hooks/use-toast';

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
  const [activeTab, setActiveTab] = useState<'voice' | 'text' | 'help'>('voice');
  const [textInput, setTextInput] = useState('');
  const [Messages, setMessages] = useState<Message[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedContext, setSelectedContext] = useState(context);
  
  const MessagesEndRef = useRef<HTMLDivElement>(null);
  
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
    if (state.transcript) {
      addMessage('user', state.transcript);
    }
  }, [state.transcript]);

  useEffect(() => {
    if (state.response) {
      addMessage('assistant', state.response, state.lastToolCall);
    }
  }, [state.response]);

  useEffect(() => {
    if (state.error) {
      addMessage('system', `Erreur: ${state.error}`);
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

  const handleConnect = async () => {
    // Vérifier la clé API
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      const key = prompt('Veuillez entrer votre clé API OpenAI:');
      if (key) {
        localStorage.setItem('openai_api_key', key);
      } else {
        toast({
          title: 'Clé API requise',
          description: 'Une clé API OpenAI est nécessaire pour utiliser l\'assistant',
          variant: 'destructive'
        });
        return;
      }
    }
    
    await connect();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-brand/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand/80 rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                AI Assistant Intelligent
                <Sparkles className="w-4 h-4 text-brand animate-pulse" />
              </h2>
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
                    Speaking...
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
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
                    <h3 className="text-xl font-semibold mb-2">Mode Vocal</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Speakingz naturellement avec l'assistant. Il comprend vos demandes et peut effectuer des actions pour vous.
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
                        Speakingr
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={disconnect}
                  >
                    Déconnecter
                  </Button>
                </div>
                
                <ScrollArea className="flex-1">
                  <MessagesList messages={messages} />
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text" className="flex-1 flex flex-col p-4">
            {!state.isConnected ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-brand/20 to-brand/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Mode Texte</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Écrivez vos demandes à l'assistant. Il peut comprendre le contexte et effectuer des actions complexes.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleConnect}
                    disabled={state.isProcessing}
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Commencer le chat
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Quick Actions */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Actions rapides :</p>
                  <div className="flex gap-2 flex-wrap">
                    {quickActions.map(action => (
                      <Button
                        key={action.action}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action.action)}
                      >
                        <action.icon className="w-4 h-4 mr-2" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Separator className="mb-4" />
                
                <ScrollArea className="flex-1">
                  <MessagesList messages={messages} />
                </ScrollArea>
                
                <div className="mt-4 flex gap-2">
                  <Input
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                    placeholder="Tapez votre message..."
                    disabled={state.isProcessing}
                  />
                  <Button
                    onClick={handleSendText}
                    disabled={!textInput.trim() || state.isProcessing}
                  >
                    {state.isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
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
      </Card>
    </div>
  );
}

// Composant pour afficher les messages
function MessagesList({ messages }: { messages: Message[] }) {
  return (
    <div className="space-y-3 p-2">
      {messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>Aucun message pour le moment</p>
          <p className="text-sm mt-2">Commencez une conversation avec l'assistant</p>
        </div>
      ) : (
        Messages.map(message => (
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