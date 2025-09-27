/**
 * Composant Principal - Module IA PROJETS
 *
 * Interface utilisateur complète pour l'assistant IA de projet.
 * Combine chat intelligent, suggestions automatiques et analytics.
 *
 * Fonctionnalités :
 * - Configuration et personnalisation de l'assistant IA
 * - Chat interface moderne avec effects glassmorphism
 * - Dashboard des suggestions et insights
 * - Analytics et métriques de projet
 * - Intégration complète avec les hooks spécialisés
 * - Support dark/light mode avec design system
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Badge } from '@/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/tabs';
import { Input } from '@/ui/components/input';
import { Textarea } from '@/ui/components/textarea';
import { ScrollArea } from '@/ui/components/scroll-area';
import { Separator } from '@/ui/components/separator';
import {
  Brain,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  Settings,
  Send,
  Bot,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Target,
  Users,
  BarChart3,
  PlusCircle,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Sparkles,
  Activity,
  Award,
  Calendar,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

import { useProjectAI, useProjectChat } from '../hooks';
import type {
  ModularProjectAIViewProps,
  ProjectAIAssistant,
  AIPersona,
  AISpecialization,
  ConversationType,
  AISuggestion,
  AIInsight,
  ProjectAnalytics
} from '../types';

/**
 * Composant principal pour l'IA projet
 */
export function ModularProjectAIView({
  projectId,
  onAssistantCreated,
  onConversationStart,
  showChat = true,
  showSuggestions = true,
  showInsights = true,
  showAnalytics = true,
  className = '',
  theme = 'dark',
  compact = false
}: ModularProjectAIViewProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const [showSetup, setShowSetup] = useState(false);

  // Hooks IA
  const aiHook = useProjectAI(projectId);
  const chatHook = useProjectChat(aiHook.assistant?.id);

  // État local
  const [newMessage, setNewMessage] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);

  /**
   * Vérifie si un assistant existe au chargement
   */
  useEffect(() => {
    if (projectId && !aiHook.assistant && !aiHook.isLoading) {
      setShowSetup(true);
    }
  }, [projectId, aiHook.assistant, aiHook.isLoading]);

  /**
   * Démarre une conversation par défaut quand l'assistant est créé
   */
  useEffect(() => {
    if (aiHook.assistant && !chatHook.conversation && showChat) {
      chatHook.startNewConversation('general_chat');
    }
  }, [aiHook.assistant, chatHook.conversation, showChat]);

  /**
   * Gère l'envoi d'un nouveau message
   */
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const success = await chatHook.sendMessage(newMessage);
    if (success) {
      setNewMessage('');
    }
  };

  /**
   * Gère la création d'un nouvel assistant
   */
  const handleCreateAssistant = async (
    persona: AIPersona,
    specializations: AISpecialization[]
  ) => {
    const assistant = await aiHook.createAssistant({
      projectId,
      persona,
      specializations,
      config: {
        proactivity: 7,
        verbosity: 3,
        creativity: 4
      }
    });

    if (assistant) {
      setShowSetup(false);
      onAssistantCreated?.(assistant);
    }
  };

  /**
   * Si pas d'assistant, afficher le setup
   */
  if (showSetup || (!aiHook.assistant && !aiHook.isLoading)) {
    return (
      <AIAssistantSetup
        projectId={projectId}
        onComplete={(assistant) => {
          setShowSetup(false);
          onAssistantCreated?.(assistant);
        }}
        onCancel={() => setShowSetup(false)}
        theme={theme}
      />
    );
  }

  /**
   * Affichage de chargement
   */
  if (aiHook.isLoading || !aiHook.assistant) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">
            Chargement de l'assistant IA...
          </p>
        </div>
      </div>
    );
  }

  const assistant = aiHook.assistant;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Assistant */}
      <AssistantHeader
        assistant={assistant}
        onConfigure={() => setIsConfiguring(!isConfiguring)}
        onDelete={() => aiHook.deleteAssistant()}
        theme={theme}
        compact={compact}
      />

      {/* Configuration panel (si ouvert) */}
      <AnimatePresence>
        {isConfiguring && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AssistantConfig
              assistant={assistant}
              onSave={(config) => {
                aiHook.updateConfig(config);
                setIsConfiguring(false);
              }}
              onCancel={() => setIsConfiguring(false)}
              theme={theme}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenu principal avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10">
          {showChat && (
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary-500 data-[state=active]:to-secondary-500 data-[state=active]:text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat IA
            </TabsTrigger>
          )}
          {showSuggestions && (
            <TabsTrigger
              value="suggestions"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary-500 data-[state=active]:to-secondary-500 data-[state=active]:text-white"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Suggestions
            </TabsTrigger>
          )}
          {showInsights && (
            <TabsTrigger
              value="insights"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary-500 data-[state=active]:to-secondary-500 data-[state=active]:text-white"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
          )}
          {showAnalytics && (
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary-500 data-[state=active]:to-secondary-500 data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {/* Contenu Chat */}
        {showChat && (
          <TabsContent value="chat" className="mt-6">
            <ProjectChatInterface
              conversation={chatHook.conversation}
              messages={chatHook.messages}
              isTyping={chatHook.isTyping}
              onSendMessage={handleSendMessage}
              newMessage={newMessage}
              onMessageChange={setNewMessage}
              onStartConversation={(type) => {
                chatHook.startNewConversation(type);
                onConversationStart?.(chatHook.conversation!);
              }}
              theme={theme}
              compact={compact}
            />
          </TabsContent>
        )}

        {/* Contenu Suggestions */}
        {showSuggestions && (
          <TabsContent value="suggestions" className="mt-6">
            <SuggestionsPanel
              suggestions={aiHook.suggestions}
              onRefresh={aiHook.refreshSuggestions}
              onImplement={aiHook.implementSuggestion}
              onDismiss={aiHook.dismissSuggestion}
              isLoading={aiHook.isLoading}
              theme={theme}
              compact={compact}
            />
          </TabsContent>
        )}

        {/* Contenu Insights */}
        {showInsights && (
          <TabsContent value="insights" className="mt-6">
            <InsightsPanel
              insights={aiHook.insights}
              isLoading={aiHook.isLoading}
              theme={theme}
              compact={compact}
            />
          </TabsContent>
        )}

        {/* Contenu Analytics */}
        {showAnalytics && (
          <TabsContent value="analytics" className="mt-6">
            <AnalyticsPanel
              analytics={aiHook.analytics}
              onRefresh={aiHook.refreshAnalytics}
              isLoading={aiHook.isLoading}
              theme={theme}
              compact={compact}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/**
 * Header avec informations assistant
 */
function AssistantHeader({
  assistant,
  onConfigure,
  onDelete,
  theme,
  compact
}: {
  assistant: ProjectAIAssistant;
  onConfigure: () => void;
  onDelete: () => void;
  theme: 'light' | 'dark';
  compact?: boolean;
}) {
  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-500 text-white',
      initializing: 'bg-blue-500 text-white',
      learning: 'bg-purple-500 text-white',
      idle: 'bg-gray-500 text-white',
      error: 'bg-red-500 text-white'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  return (
    <Card className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl">
      <CardHeader className={compact ? 'pb-3' : 'pb-6'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-neutral-900 dark:text-white">
                {assistant.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(assistant.status)}>
                  {assistant.status}
                </Badge>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {assistant.persona} • {assistant.specializations.join(', ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onConfigure}
              variant="outline"
              size="sm"
              className="bg-white/10 backdrop-blur border-white/20"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              onClick={onDelete}
              variant="outline"
              size="sm"
              className="bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-500">
                {assistant.totalInteractions}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Interactions
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {assistant.successfulSuggestions}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Suggestions
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {assistant.averageResponseTime}ms
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Temps Réponse
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {assistant.satisfactionScore}/5
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Satisfaction
              </div>
            </div>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

/**
 * Interface de chat avec l'IA
 */
function ProjectChatInterface({
  conversation,
  messages,
  isTyping,
  onSendMessage,
  newMessage,
  onMessageChange,
  onStartConversation,
  theme,
  compact
}: {
  conversation: any;
  messages: any[];
  isTyping: boolean;
  onSendMessage: () => void;
  newMessage: string;
  onMessageChange: (message: string) => void;
  onStartConversation: (type: ConversationType) => void;
  theme: 'light' | 'dark';
  compact?: boolean;
}) {
  if (!conversation) {
    return (
      <Card className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-700/50">
        <CardContent className="p-8 text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 text-primary-500" />
          <h3 className="text-lg font-semibold mb-2">Aucune conversation active</h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Démarrez une conversation avec votre assistant IA
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              onClick={() => onStartConversation('general_chat')}
              className="bg-gradient-to-r from-primary-500 to-secondary-500"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Général
            </Button>
            <Button
              onClick={() => onStartConversation('planning_session')}
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Session Planning
            </Button>
            <Button
              onClick={() => onStartConversation('brainstorming')}
              variant="outline"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Brainstorming
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl">
      <CardContent className="p-0">
        {/* Zone des messages */}
        <ScrollArea className={compact ? "h-96" : "h-[500px]"}>
          <div className="p-4 space-y-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                message={message}
                theme={theme}
              />
            ))}

            {/* Indicateur de frappe */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-neutral-500"
              >
                <Bot className="w-4 h-4" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm">L'assistant écrit...</span>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Zone de saisie */}
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Tapez votre message..."
              className="flex-1 bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
            />
            <Button
              onClick={onSendMessage}
              disabled={!newMessage.trim() || isTyping}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Bulle de message
 */
function MessageBubble({ message, theme }: { message: any; theme: 'light' | 'dark' }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <div
          className={`
            p-3 rounded-2xl max-w-full
            ${isUser
              ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
            }
            ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}
          `}
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {message.timestamp && (
            <div className={`text-xs mt-1 opacity-70 ${isUser ? 'text-white' : 'text-neutral-500'}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
              {message.edited && ' • modifié'}
              {message.confidence && ` • ${message.confidence}% confiance`}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Composants simplifiés pour l'exemple
function AIAssistantSetup({ projectId, onComplete, onCancel, theme }: any) {
  return (
    <Card className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80">
      <CardContent className="p-8 text-center">
        <Brain className="w-16 h-16 mx-auto mb-4 text-primary-500" />
        <h2 className="text-2xl font-bold mb-4">Créer un Assistant IA</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Configurez votre assistant IA pour ce projet
        </p>
        <Button
          onClick={() => onComplete({ name: 'Assistant IA', id: '1' })}
          className="bg-gradient-to-r from-primary-500 to-secondary-500"
        >
          Créer l'assistant
        </Button>
      </CardContent>
    </Card>
  );
}

function AssistantConfig({ assistant, onSave, onCancel, theme }: any) {
  return (
    <Card className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Configuration Assistant</h3>
        <div className="space-y-4">
          <Button onClick={() => onSave({})}>Sauvegarder</Button>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SuggestionsPanel({ suggestions, onRefresh, onImplement, onDismiss, isLoading, theme, compact }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Suggestions IA</h3>
        <Button onClick={onRefresh} disabled={isLoading} size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>
      <div className="text-center py-8 text-neutral-500">
        Aucune suggestion pour le moment
      </div>
    </div>
  );
}

function InsightsPanel({ insights, isLoading, theme, compact }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Insights Projet</h3>
      <div className="text-center py-8 text-neutral-500">
        Aucun insight généré
      </div>
    </div>
  );
}

function AnalyticsPanel({ analytics, onRefresh, isLoading, theme, compact }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Analytics Projet</h3>
        <Button onClick={onRefresh} disabled={isLoading} size="sm">
          <TrendingUp className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>
      {analytics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary-500">{analytics.completion.overall}%</div>
              <div className="text-sm text-neutral-600">Completion</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{analytics.quality.qualityScore}</div>
              <div className="text-sm text-neutral-600">Qualité</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{analytics.team.engagement}</div>
              <div className="text-sm text-neutral-600">Engagement</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-500">{analytics.velocity.tasksPerWeek}</div>
              <div className="text-sm text-neutral-600">Tâches/sem.</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500">
          Aucune donnée analytique disponible
        </div>
      )}
    </div>
  );
}

export default ModularProjectAIView;