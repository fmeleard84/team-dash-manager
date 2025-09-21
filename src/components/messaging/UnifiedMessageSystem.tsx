import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Send,
  Paperclip,
  Upload,
  Download,
  User,
  Users,
  MessageSquare,
  Bold,
  Italic,
  FileText,
  Image,
  File,
  Eye,
  Plus,
  Hash,
  Circle,
  UserPlus,
  X,
  Sparkles,
  Zap,
  Bot,
  ChevronRight,
  Search
} from 'lucide-react';
import { useMessages, MessageThread, Message } from '@/hooks/useMessages';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectMembersForMessaging, ProjectMember } from '@/hooks/useProjectMembersForMessaging';
import { useMessageGroups, MessageGroup } from '@/hooks/useMessageGroups';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useToast } from '@/hooks/use-toast';
import { initializeProjectMessaging, sendMessage } from '@/utils/messageSetup';
import { uploadMultipleFiles, syncMessageFilesToDrive, UploadedFile } from '@/utils/fileUpload';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatarNeon } from '@/components/ui/user-avatar-neon';

// Types de configuration pour le composant unifié
export interface UnifiedMessageSystemConfig {
  // Fonctionnalités activées/désactivées
  features?: {
    groups?: boolean;          // Permettre la création de groupes
    fileUpload?: boolean;      // Permettre l'upload de fichiers
    presence?: boolean;        // Afficher le statut en ligne
    search?: boolean;          // Barre de recherche
    formatting?: boolean;      // Options de formatage (gras, italique)
    aiAssistant?: boolean;     // Intégration IA
    threads?: boolean;         // Support des threads/conversations
  };

  // Style et apparence
  appearance?: {
    theme?: 'neon' | 'minimal' | 'classic';
    layout?: 'sidebar' | 'fullwidth' | 'compact';
    showAvatars?: boolean;
    showTimestamps?: boolean;
    messageGrouping?: boolean; // Grouper les messages du même utilisateur
  };

  // Comportement
  behavior?: {
    autoScroll?: boolean;
    soundNotifications?: boolean;
    desktopNotifications?: boolean;
    messageDelay?: number;     // Délai avant envoi (pour annulation)
    maxFileSize?: number;      // En MB
    maxFiles?: number;         // Nombre max de fichiers par message
  };

  // Callbacks personnalisés
  callbacks?: {
    onMessageSent?: (message: Message) => void;
    onFileUploaded?: (file: UploadedFile) => void;
    onMemberClick?: (member: ProjectMember) => void;
    onGroupCreated?: (group: MessageGroup) => void;
  };
}

interface UnifiedMessageSystemProps {
  projectId: string;
  userType?: 'client' | 'candidate' | 'admin' | 'user';
  config?: UnifiedMessageSystemConfig;
  className?: string;
}

type ConversationType = 'all' | 'user' | 'group' | 'thread';

interface SelectedConversation {
  type: ConversationType;
  id?: string;
  name: string;
  members?: string[];
  icon?: React.ReactNode;
}

// Configuration par défaut
const defaultConfig: UnifiedMessageSystemConfig = {
  features: {
    groups: true,
    fileUpload: true,
    presence: true,
    search: true,
    formatting: true,
    aiAssistant: false,
    threads: true,
  },
  appearance: {
    theme: 'neon',
    layout: 'sidebar',
    showAvatars: true,
    showTimestamps: true,
    messageGrouping: true,
  },
  behavior: {
    autoScroll: true,
    soundNotifications: false,
    desktopNotifications: false,
    messageDelay: 0,
    maxFileSize: 10,
    maxFiles: 5,
  },
};

export const UnifiedMessageSystem = ({
  projectId,
  userType = 'user',
  config = {},
  className
}: UnifiedMessageSystemProps) => {
  // Fusion de la config avec les valeurs par défaut
  const finalConfig = {
    features: { ...defaultConfig.features, ...config.features },
    appearance: { ...defaultConfig.appearance, ...config.appearance },
    behavior: { ...defaultConfig.behavior, ...config.behavior },
    callbacks: config.callbacks || {},
  };

  // Hooks existants
  const { user } = useAuth();
  const { toast } = useToast();
  const { members: projectMembers, loading: membersLoading } = useProjectMembersForMessaging(projectId);
  const { groups, createGroup, deleteGroup } = useMessageGroups(projectId);
  const { threads, messages, loading, refreshThreads, refreshMessages, selectedThread: selectedThreadId, setSelectedThread: setSelectedThreadId, setMessages, setThreads } = useMessages(projectId);
  const { isUserOnline } = useUserPresence();

  // État local
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation>({
    type: 'all',
    name: 'Équipe complète',
    icon: <Users className="w-4 h-4" />
  });

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembersForGroup, setSelectedMembersForGroup] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Realtime subscriptions
  useRealtimeMessages(
    projectId,
    selectedThreadId || undefined,
    (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      if (finalConfig.behavior.autoScroll) {
        scrollToBottom();
      }
      if (finalConfig.behavior.soundNotifications && newMessage.sender_id !== user?.id) {
        playNotificationSound();
      }
    },
    (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
      );
    },
    (deletedMessage) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessage.id));
    }
  );

  // Filtrage des messages selon la conversation sélectionnée
  const filteredMessages = useCallback(() => {
    let filtered = messages;

    // Filtrage par type de conversation
    if (selectedConversation.type === 'user' && selectedConversation.id) {
      filtered = messages.filter(msg =>
        msg.sender_id === selectedConversation.id ||
        msg.recipient_id === selectedConversation.id
      );
    } else if (selectedConversation.type === 'group' && selectedConversation.members) {
      filtered = messages.filter(msg =>
        selectedConversation.members?.includes(msg.sender_id)
      );
    }

    // Filtrage par recherche
    if (searchQuery && finalConfig.features.search) {
      filtered = filtered.filter(msg =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [messages, selectedConversation, searchQuery, finalConfig.features.search]);

  // Gestion de l'envoi de message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && uploadedFiles.length === 0) || isSending) return;

    setIsSending(true);
    try {
      const messageData = {
        content: newMessage.trim(),
        sender_id: user?.id,
        sender_name: user?.email?.split('@')[0] || 'Utilisateur',
        project_id: projectId,
        thread_id: selectedThreadId,
        recipient_id: selectedConversation.type === 'user' ? selectedConversation.id : null,
        attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      };

      // Appeler sendMessage avec les paramètres adaptés
      const sentMessage = await sendMessage(
        messageData.thread_id || selectedThreadId || '',
        messageData.content,
        messageData.attachments || [],
        messageData.recipient_id,
        projectId
      );

      // Callbacks
      if (finalConfig.callbacks.onMessageSent) {
        finalConfig.callbacks.onMessageSent(sentMessage);
      }

      // Reset
      setNewMessage('');
      setAttachedFiles([]);
      setUploadedFiles([]);

      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Upload de fichiers
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!finalConfig.features.fileUpload) return;

    const files = Array.from(event.target.files || []);
    const maxFiles = finalConfig.behavior.maxFiles || 5;
    const maxSize = (finalConfig.behavior.maxFileSize || 10) * 1024 * 1024;

    // Validation
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse la taille maximale autorisée`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    }).slice(0, maxFiles);

    if (validFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploaded = await uploadMultipleFiles(
          validFiles,
          projectId,
          user?.id || '',
          (progress) => {
            // Gestion de la progression si nécessaire
          }
        );

        setUploadedFiles(prev => [...prev, ...uploaded]);

        // Callback
        uploaded.forEach(file => {
          if (finalConfig.callbacks.onFileUploaded) {
            finalConfig.callbacks.onFileUploaded(file);
          }
        });

        toast({
          title: "Upload réussi",
          description: `${uploaded.length} fichier(s) uploadé(s)`,
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Erreur d'upload",
          description: "Impossible d'uploader les fichiers",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Scroll automatique
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (finalConfig.behavior.autoScroll) {
      scrollToBottom();
    }
  }, [messages, finalConfig.behavior.autoScroll]);

  // Jouer un son de notification
  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Could not play notification sound'));
  };

  // Gestion des raccourcis clavier
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Styles selon le thème
  const getThemeClasses = () => {
    switch (finalConfig.appearance.theme) {
      case 'neon':
        return {
          container: 'bg-gradient-to-br from-neutral-900 via-primary-900/20 to-neutral-900',
          card: 'backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10',
          button: 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]',
          message: 'bg-gradient-to-r from-primary-500/10 to-secondary-500/10 backdrop-blur-sm',
          input: 'bg-neutral-900/50 border-primary-500/30 focus:border-primary-500 focus:shadow-[0_0_10px_rgba(168,85,247,0.3)]'
        };
      case 'minimal':
        return {
          container: 'bg-neutral-50 dark:bg-neutral-900',
          card: 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
          button: 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900',
          message: 'bg-neutral-100 dark:bg-neutral-800',
          input: 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700'
        };
      default:
        return {
          container: 'bg-white dark:bg-neutral-900',
          card: 'bg-white dark:bg-neutral-800 shadow-lg',
          button: 'bg-primary-500 hover:bg-primary-600',
          message: 'bg-primary-50 dark:bg-primary-900/20',
          input: 'bg-white dark:bg-neutral-800'
        };
    }
  };

  const themeClasses = getThemeClasses();

  // Rendu selon le layout
  const renderLayout = () => {
    if (finalConfig.appearance.layout === 'compact') {
      return renderCompactLayout();
    } else if (finalConfig.appearance.layout === 'fullwidth') {
      return renderFullwidthLayout();
    } else {
      return renderSidebarLayout();
    }
  };

  // Layout avec sidebar
  const renderSidebarLayout = () => (
    <div className={cn("flex h-full gap-4", className)}>
      {/* Sidebar gauche - Liste des conversations */}
      <div className="w-80 space-y-4">
        {/* Recherche */}
        {finalConfig.features.search && (
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("pl-10", themeClasses.input)}
            />
          </div>
        )}

        {/* Liste des conversations */}
        <Card className={themeClasses.card}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {/* Conversation globale */}
            <Button
              variant={selectedConversation.type === 'all' ? 'default' : 'ghost'}
              className={cn(
                "w-full justify-start",
                selectedConversation.type === 'all' && themeClasses.button
              )}
              onClick={() => setSelectedConversation({
                type: 'all',
                name: 'Équipe complète',
                icon: <Users className="w-4 h-4" />
              })}
            >
              <Users className="w-4 h-4 mr-2" />
              Équipe complète
            </Button>

            {/* Membres de l'équipe */}
            {projectMembers.map((member) => (
              <Button
                key={member.id}
                variant={selectedConversation.id === member.id ? 'default' : 'ghost'}
                className={cn(
                  "w-full justify-start",
                  selectedConversation.id === member.id && themeClasses.button
                )}
                onClick={() => {
                  setSelectedConversation({
                    type: 'user',
                    id: member.id,
                    name: member.name,
                    icon: <User className="w-4 h-4" />
                  });
                  if (finalConfig.callbacks.onMemberClick) {
                    finalConfig.callbacks.onMemberClick(member);
                  }
                }}
              >
                <div className="flex items-center w-full">
                  <UserAvatarNeon
                    user={{
                      email: member.email,
                      full_name: member.name
                    }}
                    size="sm"
                    className="mr-2"
                  />
                  <span className="truncate">{member.name}</span>
                  {finalConfig.features.presence && isUserOnline(member.id) && (
                    <Circle className="w-2 h-2 fill-green-500 text-green-500 ml-auto" />
                  )}
                </div>
              </Button>
            ))}

            {/* Groupes */}
            {finalConfig.features.groups && groups.length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="text-xs text-neutral-500 px-2">Groupes</div>
                {groups.map((group) => (
                  <Button
                    key={group.id}
                    variant={selectedConversation.id === group.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedConversation({
                      type: 'group',
                      id: group.id,
                      name: group.name,
                      members: group.members,
                      icon: <Hash className="w-4 h-4" />
                    })}
                  >
                    <Hash className="w-4 h-4 mr-2" />
                    {group.name}
                  </Button>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Bouton créer un groupe */}
        {finalConfig.features.groups && (
          <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Créer un groupe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un groupe de discussion</DialogTitle>
                <DialogDescription>
                  Sélectionnez les membres et donnez un nom au groupe
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nom du groupe"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <div className="space-y-2">
                  {projectMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        checked={selectedMembersForGroup.includes(member.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMembersForGroup([...selectedMembersForGroup, member.id]);
                          } else {
                            setSelectedMembersForGroup(
                              selectedMembersForGroup.filter((id) => id !== member.id)
                            );
                          }
                        }}
                      />
                      <span>{member.name}</span>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={async () => {
                    if (newGroupName && selectedMembersForGroup.length > 0) {
                      const group = await createGroup(newGroupName, selectedMembersForGroup);
                      if (group && finalConfig.callbacks.onGroupCreated) {
                        finalConfig.callbacks.onGroupCreated(group);
                      }
                      setIsCreatingGroup(false);
                      setNewGroupName('');
                      setSelectedMembersForGroup([]);
                    }
                  }}
                  className={themeClasses.button}
                >
                  Créer le groupe
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Zone principale - Messages */}
      <Card className={cn("flex-1 flex flex-col", themeClasses.card)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedConversation.icon}
              <CardTitle>{selectedConversation.name}</CardTitle>
            </div>
            {finalConfig.features.aiAssistant && (
              <Button variant="ghost" size="sm">
                <Bot className="w-4 h-4 mr-2" />
                Assistant IA
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4">
          {/* Zone des messages */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <AnimatePresence>
                {filteredMessages().map((message, index) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const showAvatar = finalConfig.appearance.showAvatars &&
                    (!finalConfig.appearance.messageGrouping ||
                     index === 0 ||
                     filteredMessages()[index - 1]?.sender_id !== message.sender_id);

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "flex gap-3",
                        isOwnMessage ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {showAvatar && (
                        <UserAvatarNeon
                          user={{
                            email: projectMembers.find(m => m.id === message.sender_id)?.email,
                            full_name: message.sender_name
                          }}
                          size="sm"
                        />
                      )}
                      {!showAvatar && finalConfig.appearance.showAvatars && (
                        <div className="w-8" />
                      )}

                      <div className={cn(
                        "max-w-[70%] rounded-xl px-4 py-2",
                        isOwnMessage ? themeClasses.message : "bg-neutral-100 dark:bg-neutral-800"
                      )}>
                        {showAvatar && (
                          <div className="text-xs font-medium mb-1">
                            {message.sender_name}
                          </div>
                        )}
                        <div className="text-sm">{message.content}</div>

                        {/* Fichiers attachés */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                download={file.name}
                                className="flex items-center gap-2 text-xs hover:underline"
                              >
                                <FileText className="w-3 h-3" />
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}

                        {finalConfig.appearance.showTimestamps && (
                          <div className="text-xs text-neutral-400 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Zone de saisie */}
          <div className="mt-4 space-y-2">
            {/* Fichiers attachés */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-neutral-700 rounded"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">{file.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {/* Bouton upload */}
              {finalConfig.features.fileUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="*/*"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </>
              )}

              {/* Options de formatage */}
              {finalConfig.features.formatting && (
                <>
                  <Button variant="outline" size="icon">
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Italic className="w-4 h-4" />
                  </Button>
                </>
              )}

              {/* Champ de saisie */}
              <Textarea
                ref={messageInputRef}
                placeholder="Tapez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className={cn("flex-1 min-h-[80px] resize-none", themeClasses.input)}
                disabled={isSending}
              />

              {/* Bouton envoyer */}
              <Button
                onClick={handleSendMessage}
                disabled={isSending || (!newMessage.trim() && uploadedFiles.length === 0)}
                className={cn("self-end", themeClasses.button)}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Layout compact (pour mobile ou espaces restreints)
  const renderCompactLayout = () => (
    <div className={cn("flex flex-col h-full", className, themeClasses.container)}>
      {/* Header avec sélection de conversation */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <select
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-800"
          value={selectedConversation.id || 'all'}
          onChange={(e) => {
            if (e.target.value === 'all') {
              setSelectedConversation({
                type: 'all',
                name: 'Équipe complète',
                icon: <Users className="w-4 h-4" />
              });
            } else {
              const member = projectMembers.find(m => m.id === e.target.value);
              if (member) {
                setSelectedConversation({
                  type: 'user',
                  id: member.id,
                  name: member.name,
                  icon: <User className="w-4 h-4" />
                });
              }
            }
          }}
        >
          <option value="all">Équipe complète</option>
          {projectMembers.map(member => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {filteredMessages().map(message => (
            <div
              key={message.id}
              className={cn(
                "p-3 rounded-lg",
                message.sender_id === user?.id ? themeClasses.message : "bg-neutral-100 dark:bg-neutral-800"
              )}
            >
              <div className="font-medium text-xs mb-1">{message.sender_name}</div>
              <div className="text-sm">{message.content}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex gap-2">
          <Input
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isSending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Layout pleine largeur (sans sidebar)
  const renderFullwidthLayout = () => (
    <Card className={cn("h-full flex flex-col", className, themeClasses.card)}>
      <CardHeader>
        <CardTitle>Messages - {selectedConversation.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {renderSidebarLayout()}
      </CardContent>
    </Card>
  );

  return renderLayout();
};

// Export des configurations prédéfinies
export const messageSystemPresets = {
  // Configuration pour client
  client: {
    features: {
      groups: true,
      fileUpload: true,
      presence: true,
      search: true,
      formatting: true,
      aiAssistant: true,
      threads: true,
    },
    appearance: {
      theme: 'neon' as const,
      layout: 'sidebar' as const,
    },
  },

  // Configuration pour candidat
  candidate: {
    features: {
      groups: false,
      fileUpload: true,
      presence: true,
      search: false,
      formatting: false,
      aiAssistant: false,
      threads: true,
    },
    appearance: {
      theme: 'minimal' as const,
      layout: 'compact' as const,
    },
  },

  // Configuration pour admin
  admin: {
    features: {
      groups: true,
      fileUpload: true,
      presence: true,
      search: true,
      formatting: true,
      aiAssistant: true,
      threads: true,
    },
    appearance: {
      theme: 'neon' as const,
      layout: 'fullwidth' as const,
    },
  },

  // Configuration minimale (pour démo ou tests)
  minimal: {
    features: {
      groups: false,
      fileUpload: false,
      presence: false,
      search: false,
      formatting: false,
      aiAssistant: false,
      threads: false,
    },
    appearance: {
      theme: 'minimal' as const,
      layout: 'compact' as const,
    },
  },
};

export default UnifiedMessageSystem;