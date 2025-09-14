import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Trash2, AlertCircle, Users, FolderOpen, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTextChat } from '@/ai-assistant/hooks/useTextChat';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';

interface TextChatInterfaceProps {
  context?: string;
  onToolCall?: (toolName: string, args: any) => void;
}

// Fonction pour rendre le markdown basique
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return '';
  
  // Générer un ID unique pour ce rendu
  const renderUniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Diviser le texte en parties pour traiter le markdown
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Regex pour trouver **texte** ou *texte*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Ajouter le texte avant le match
    if (match.index > currentIndex) {
      const plainText = text.substring(currentIndex, match.index);
      parts.push(...renderTextWithLineBreaks(plainText, `${renderUniqueId}-before-${match.index}`));
    }

    // Traiter le texte en markdown
    const matchedText = match[0];
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      // Gras
      parts.push(
        <strong key={`${renderUniqueId}-bold-${match.index}`}>
          {matchedText.slice(2, -2)}
        </strong>
      );
    } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      // Italique
      parts.push(
        <em key={`${renderUniqueId}-italic-${match.index}`}>
          {matchedText.slice(1, -1)}
        </em>
      );
    }

    currentIndex = match.index + matchedText.length;
  }

  // Ajouter le texte restant
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    parts.push(...renderTextWithLineBreaks(remainingText, `${renderUniqueId}-end`));
  }
  
  return <>{parts}</>;
}

// Fonction pour gérer les retours à la ligne
function renderTextWithLineBreaks(text: string, uniqueId: string = ''): React.ReactNode[] {
  return text.split('\n').map((line, index, array) => (
    <React.Fragment key={`${uniqueId}-line-${index}`}>
      {line}
      {index < array.length - 1 && <br />}
    </React.Fragment>
  ));
}

export function TextChatInterface({ context, onToolCall }: TextChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [lastCreatedProject, setLastCreatedProject] = useState<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { messages, isLoading, error, sendMessage, resetChat } = useTextChat({
    context,
    onToolCall: (toolName, args, result) => {
      console.log('🔧 Appel de fonction:', toolName, args, result);

      // Détecter la création d'un projet ou d'une équipe
      if (toolName === 'createTeam' && result?.success) {
        console.log('🎆 Projet créé avec succès:', result.data);
        setLastCreatedProject(result.data);

        // Toast de succès avec icône
        toast({
          title: '✅ Projet et équipe créés avec succès !',
          description: `${result.data.project_name} - ${result.data.resources?.length || 0} membres`,
          duration: 5000,
        });

        // Forcer le refresh des projets après création
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (toolName === 'createProject' && result?.success) {
        console.log('📁 Projet créé:', result.data);
        setLastCreatedProject(result.data);

        toast({
          title: '✅ Projet créé avec succès !',
          description: result.data.title || result.data.name,
          duration: 5000,
        });
      } else {
        // Notification standard pour autres actions
        toast({
          title: `Fonction ${toolName}`,
          description: 'L\'assistant exécute une action...',
        });
      }

      // Propager l'événement
      if (onToolCall) {
        onToolCall(toolName, args, result);
      }
    }
  });

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Messages de suggestions
  const suggestions = [
    "Comment créer un nouveau projet ?",
    "Aide-moi à trouver des ressources",
    "Quel est le statut de mes projets ?",
    "Comment inviter des candidats ?",
    "Explique-moi le processus de validation"
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Zone des messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {/* Message de bienvenue si pas de messages */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-brand/20 to-brand/10 rounded-full flex items-center justify-center">
                <Bot className="w-10 h-10 text-brand" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Assistant IA Team Dash</h3>
              <p className="text-muted-foreground mb-6">
                Je suis là pour vous aider avec vos projets et ressources.
              </p>
              
              {/* Suggestions */}
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground mb-3">Suggestions :</p>
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-brand text-white'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message content */}
                <div
                  className={`flex-1 max-w-[80%] ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-brand text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {renderMarkdown(message.content)}
                      {/* Indicateur de streaming */}
                      {message.isStreaming && (
                        <span className="inline-block ml-1">
                          <span className="animate-pulse">▊</span>
                        </span>
                      )}
                    </div>
                    
                    {/* Tool calls indicator - avec détails d'erreur */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        {message.toolCalls.map((toolCall, idx) => {
                          const result = toolCall.result;
                          const isError = result && !result.success;
                          const isTeamCreation = toolCall.function?.name === 'create_team';

                          // Message spécial pour la création d'équipe
                          if (isTeamCreation && result?.success && result?.data) {
                            return (
                              <div key={idx} className="mt-2">
                                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="w-4 h-4 text-green-500" />
                                    <span className="font-semibold text-green-300">
                                      Projet "{result.data.project_name}" créé avec succès !
                                    </span>
                                  </div>
                                  <div className="text-xs text-green-200/80">
                                    C'est bon, j'ai créé le projet avec votre future équipe de {result.data.resources?.length || 0} membre(s).
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Messages standards pour les autres cas
                          return (
                            <div key={idx} className="text-xs opacity-90 mt-1">
                              {isError ? (
                                <div className="flex items-center gap-1 text-red-400">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Erreur: {result.error || 'Une erreur est survenue'}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-green-400">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Action exécutée avec succès</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* CTAs après création de projet - uniquement sur le dernier message assistant */}
                    {message.role === 'assistant' &&
                     lastCreatedProject &&
                     index === messages.length - 1 && (
                      <Card className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="font-semibold text-sm">Projet créé avec succès !</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => navigate(`/project/${lastCreatedProject.project_id}`)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            <FolderOpen className="w-4 h-4 mr-1" />
                            Voir le projet
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/project/${lastCreatedProject.project_id}?view=team`)}
                            className="border-purple-300 hover:bg-purple-50"
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Voir l'équipe
                          </Button>
                        </div>
                        {lastCreatedProject.resources && lastCreatedProject.resources.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            {lastCreatedProject.resources.length} membre{lastCreatedProject.resources.length > 1 ? 's' : ''} dans l'équipe
                          </div>
                        )}
                      </Card>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className="text-xs text-muted-foreground mt-1 px-1">
                    {format(message.timestamp, 'HH:mm', { locale: fr })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Indicateur de chargement - uniquement si pas de streaming en cours */}
          {isLoading && !messages.some(m => m.isStreaming) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">L'assistant réfléchit...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </ScrollArea>

      {/* Zone de saisie */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
          {messages.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={resetChat}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}