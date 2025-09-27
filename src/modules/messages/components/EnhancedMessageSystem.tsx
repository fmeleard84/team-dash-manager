import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Send,
  Paperclip,
  Users,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Hash,
  UserPlus,
  X,
  Sparkles,
  Bot,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  useMessages,
  useMessageThreads,
  useMessageActions,
  useRealtimeMessages,
  useMessageStats
} from '../hooks';
import type {
  MessageThread,
  Message,
  SendMessageData,
  CreateThreadData,
  TypingIndicator
} from '../types';
import { UserAvatarNeon } from '@/components/ui/user-avatar-neon';

interface EnhancedMessageSystemProps {
  projectId: string;
  userType?: 'client' | 'candidate' | 'admin';
  className?: string;
}

export function EnhancedMessageSystem({
  projectId,
  userType = 'client',
  className = ''
}: EnhancedMessageSystemProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // États locaux
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Hooks du module Messages
  const { threads, loading: threadsLoading, refetch: refetchThreads } = useMessageThreads(projectId, {
    search_query: searchQuery || undefined
  });

  const { messages, loading: messagesLoading, refetch: refetchMessages } = useMessages(
    selectedThread || '',
    {}
  );

  const { stats } = useMessageStats(projectId);

  const {
    createThread,
    sendMessage,
    updateThread,
    deleteThread,
    markAsRead,
    searchMessages,
    loading: actionLoading,
    error: actionError
  } = useMessageActions();

  // Réaltime avec gestion du typing
  const { startTyping, stopTyping } = useRealtimeMessages({
    projectId,
    threadId: selectedThread || undefined,
    onNewMessage: (message) => {
      console.log('📨 [EnhancedMessageSystem] New message received:', message);
      refetchMessages();

      // Scroll vers le bas
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Notification toast
      if (message.sender_id !== user?.id) {
        toast({
          title: `Nouveau message de ${message.sender_name}`,
          description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
        });
      }
    },
    onMessageUpdated: (message) => {
      console.log('✏️ [EnhancedMessageSystem] Message updated:', message);
      refetchMessages();
    },
    onMessageDeleted: (messageId) => {
      console.log('🗑️ [EnhancedMessageSystem] Message deleted:', messageId);
      refetchMessages();
    },
    onThreadUpdated: (thread) => {
      console.log('🧵 [EnhancedMessageSystem] Thread updated:', thread);
      refetchThreads();
    },
    onUserTyping: (typing) => {
      console.log('⌨️ [EnhancedMessageSystem] User typing:', typing);
      setTypingUsers(prev => new Map(prev.set(typing.user_id, typing)));

      // Auto-remove après 5 secondes
      setTimeout(() => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(typing.user_id);
          return newMap;
        });
      }, 5000);
    },
    onUserStoppedTyping: (userId) => {
      console.log('⏹️ [EnhancedMessageSystem] User stopped typing:', userId);
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }
  });

  // Gestion du thread sélectionné
  useEffect(() => {
    if (threads.length > 0 && !selectedThread) {
      setSelectedThread(threads[0].id);
    }
  }, [threads, selectedThread]);

  // Scroll automatique vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marquer comme lu quand on sélectionne un thread
  useEffect(() => {
    if (selectedThread && user) {
      markAsRead(selectedThread, user.id);
    }
  }, [selectedThread, user, markAsRead]);

  // Gestion des actions
  const handleSendMessage = useCallback(async () => {
    if (!selectedThread || !messageContent.trim() || !user) return;

    const messageData: SendMessageData = {
      thread_id: selectedThread,
      content: messageContent.trim(),
      message_type: 'text'
    };

    const success = await sendMessage(messageData);
    if (success) {
      setMessageContent('');
      stopTyping();
      refetchMessages();
    }
  }, [selectedThread, messageContent, user, sendMessage, stopTyping, refetchMessages]);

  const handleCreateThread = useCallback(async () => {
    if (!newThreadTitle.trim() || !user) return;

    const threadData: CreateThreadData = {
      project_id: projectId,
      title: newThreadTitle.trim(),
      thread_type: 'general',
      initial_message: `Discussion "${newThreadTitle}" créée.`
    };

    const thread = await createThread(threadData);
    if (thread) {
      setNewThreadTitle('');
      setShowNewThreadDialog(false);
      setSelectedThread(thread.id);
      refetchThreads();
      toast({
        title: "Discussion créée",
        description: `La discussion "${thread.title}" a été créée avec succès.`
      });
    }
  }, [newThreadTitle, projectId, user, createThread, refetchThreads, toast]);

  const handleInputChange = useCallback((value: string) => {
    setMessageContent(value);

    // Démarrer l'indication de typing
    if (value.trim() && selectedThread) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [selectedThread, startTyping, stopTyping]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const currentThread = threads.find(t => t.id === selectedThread);
  const typingIndicators = Array.from(typingUsers.values());

  if (threadsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-[600px] bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 ${className}`}>
      {/* Sidebar - Liste des threads */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
        {/* Header sidebar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </h2>

            <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle discussion</DialogTitle>
                  <DialogDescription>
                    Créer une nouvelle discussion dans ce projet
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Titre de la discussion"
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewThreadDialog(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={handleCreateThread}
                      disabled={!newThreadTitle.trim() || actionLoading}
                    >
                      {actionLoading ? 'Création...' : 'Créer'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex gap-2 mt-3 text-xs">
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="w-3 h-3" />
                {stats.total_threads}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                {stats.active_participants}
              </Badge>
            </div>
          )}
        </div>

        {/* Liste des threads */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {threads.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune discussion</p>
              </div>
            ) : (
              threads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  isSelected={selectedThread === thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Zone de messages */}
      <div className="flex-1 flex flex-col">
        {currentThread ? (
          <>
            {/* Header du thread */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    {currentThread.title}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    {currentThread.participants.length} participant(s)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <Users className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-neutral-500 py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun message dans cette discussion</p>
                    <p className="text-xs text-neutral-400 mt-1">Soyez le premier à écrire !</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      isOwnMessage={message.sender_id === user?.id}
                    />
                  ))
                )}

                {/* Indicateurs de typing */}
                {typingIndicators.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-neutral-500 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span>
                      {typingIndicators.map(t => t.user_name).join(', ')} {typingIndicators.length > 1 ? 'écrivent' : 'écrit'}...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Zone de saisie */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    ref={messageInputRef}
                    placeholder="Tapez votre message..."
                    value={messageContent}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[60px] resize-none"
                    disabled={actionLoading}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="ghost" disabled>
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim() || actionLoading}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Sélectionner une discussion</h3>
              <p className="text-sm">Choisissez une discussion pour commencer à échanger</p>
            </div>
          </div>
        )}
      </div>

      {/* Affichage des erreurs */}
      {actionError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-lg shadow-lg">
          {actionError}
        </div>
      )}
    </div>
  );
}

// Composant pour un thread dans la sidebar
function ThreadItem({
  thread,
  isSelected,
  onClick
}: {
  thread: MessageThread;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
        isSelected
          ? 'bg-primary-100 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-neutral-900 dark:text-white line-clamp-1">
          {thread.title}
        </h4>
        {thread.unread_count > 0 && (
          <Badge variant="destructive" className="text-xs px-1 min-w-[20px] h-5">
            {thread.unread_count > 99 ? '99+' : thread.unread_count}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex -space-x-1">
          {thread.participants.slice(0, 3).map((participant) => (
            <UserAvatarNeon
              key={participant.user_id}
              name={participant.user_name}
              size="xs"
              className="ring-2 ring-white dark:ring-neutral-900"
            />
          ))}
        </div>

        <span className="text-xs text-neutral-500 flex-1 truncate">
          {thread.participants.length} participant(s)
        </span>

        {thread.last_message_at && (
          <span className="text-xs text-neutral-400">
            {new Date(thread.last_message_at).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
    </div>
  );
}

// Composant pour un message
function MessageItem({
  message,
  isOwnMessage
}: {
  message: Message;
  isOwnMessage: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <UserAvatarNeon
        name={message.sender_name}
        size="sm"
        className="flex-shrink-0"
      />

      <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-neutral-900 dark:text-white">
            {message.sender_name}
          </span>
          <span className="text-xs text-neutral-500">
            {new Date(message.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {message.is_edited && (
            <span className="text-xs text-neutral-400">(modifié)</span>
          )}
          {message.message_type === 'ai_response' && (
            <Bot className="w-3 h-3 text-purple-500" />
          )}
        </div>

        <div className={`inline-block max-w-[70%] p-3 rounded-lg ${
          isOwnMessage
            ? 'bg-primary-500 text-white'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {message.message_attachments && message.message_attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.message_attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 text-xs opacity-80">
                  <Paperclip className="w-3 h-3" />
                  <span>{attachment.file_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnhancedMessageSystem;