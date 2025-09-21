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
  Zap
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
import { handleAIConversation } from '@/utils/aiMessageHandler';
import { PrivateThreadManager } from '@/utils/privateThreadManager';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatarNeon } from '@/components/ui/user-avatar-neon';

interface EnhancedMessageSystemProps {
  projectId: string;
  userType?: 'client' | 'candidate' | 'admin';
  userRole?: string;
  userId?: string;
}

type ConversationType = 'all' | 'user' | 'group';

interface SelectedConversation {
  type: ConversationType;
  id?: string;
  name: string;
  members?: string[];
}

export const EnhancedMessageSystemNeon = ({ projectId, userType = 'user', userRole, userId }: EnhancedMessageSystemProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { members: projectMembers, loading: membersLoading } = useProjectMembersForMessaging(projectId);
  const { groups, createGroup, deleteGroup } = useMessageGroups(projectId);
  const { threads, messages, loading, refreshThreads, refreshMessages, selectedThread: selectedThreadId, setSelectedThread: setSelectedThreadId, setMessages, setThreads } = useMessages(projectId);
  const { isUserOnline } = useUserPresence();

  // Debug: Log des membres récupérés
  useEffect(() => {
    console.log('🎯 [EnhancedMessageSystemNeon] Members received:', {
      count: projectMembers.length,
      members: projectMembers.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        isAI: m.isAI
      })),
      userRole,
      userId
    });
  }, [projectMembers, userRole, userId]);
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation>({
    type: 'all',
    name: 'Équipe complète'
  });
  
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembersForGroup, setSelectedMembersForGroup] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages based on selected conversation
  const filteredMessages = useCallback(() => {
    // Si on a un thread privé IA sélectionné, les messages sont déjà filtrés par thread_id
    // donc on affiche tous les messages du thread
    if (selectedThread && selectedConversation.type === 'user' && selectedConversation.id?.startsWith('ia_')) {
      // Pour les conversations privées avec l'IA, on affiche tous les messages du thread
      // car le thread est déjà privé entre l'utilisateur et l'IA
      return messages;
    }

    if (selectedConversation.type === 'all') {
      return messages;
    } else if (selectedConversation.type === 'user' && selectedConversation.id) {
      // Pour les conversations humain-humain
      const currentUserId = user?.id;
      const targetId = selectedConversation.id.startsWith('ia_')
        ? selectedConversation.id.replace('ia_', '')
        : selectedConversation.id;

      return messages.filter(msg => {
        const isSentByMe = msg.sender_id === currentUserId;
        const isSentByTarget = msg.sender_id === targetId;

        // Conversation normale entre humains: on voit tous les messages entre les 2
        return isSentByMe || isSentByTarget;
      });
    } else if (selectedConversation.type === 'group' && selectedConversation.members) {
      return messages.filter(msg =>
        selectedConversation.members?.includes(msg.sender_id || '')
      );
    }
    return messages;
  }, [messages, selectedConversation, user?.id, selectedThread]);

  // Callbacks for realtime updates
  const onNewMessage = useCallback((newMessage: any) => {
    console.log('🔔 New message received!', newMessage);
    
    if (newMessage.sender_email !== user?.email) {
      toast({
        title: "Nouveau message",
        description: `💬 Message de ${newMessage.sender_name}`,
      });
    }
    
    setMessages(prev => {
      const exists = prev.some(msg => msg.id === newMessage.id);
      if (exists) {
        console.log('Message already exists, skipping duplicate');
        return prev;
      }
      return [...prev, newMessage];
    });
  }, [user?.email, setMessages, toast]);

  const onThreadUpdate = useCallback((updatedThread: any) => {
    console.log('🔔 Thread updated!', updatedThread);
    refreshThreads();
  }, [refreshThreads]);

  // Subscribe to realtime updates
  useRealtimeMessages({
    projectId,
    selectedThread: selectedThread?.id || null,
    onNewMessage,
    onMessageUpdate: (updatedMessage: any) => {
      console.log('🔔 Message updated!', updatedMessage);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
        )
      );
    },
    onThreadUpdate,
    setMessages,
    setThreads
  });

  // Initialize messaging if no threads exist
  useEffect(() => {
    const initializeMessaging = async () => {
      if (!projectId || loading || isInitializing) return;
      if (threads.length > 0) {
        if (!selectedThreadId && threads.length > 0 && threads[0].project_id === projectId) {
          setSelectedThreadId(threads[0].id);
        }
        return;
      }

      try {
        setIsInitializing(true);
        console.log('🔄 Initializing messaging for project:', projectId);
        
        const threadId = await initializeProjectMessaging(projectId);
        
        if (threadId) {
          console.log('✅ Messaging initialized with thread:', threadId);
          await refreshThreads();
          setSelectedThreadId(threadId);
        }
      } catch (error) {
        console.error('❌ Error initializing messaging:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'initialiser la messagerie",
          variant: "destructive",
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeMessaging();
  }, [projectId, threads, loading, isInitializing, refreshThreads, setSelectedThreadId, selectedThreadId]);

  // Sync selectedThread when ID changes
  useEffect(() => {
    if (selectedThreadId && threads.length > 0) {
      const thread = threads.find(t => t.id === selectedThreadId);
      if (thread && thread.project_id === projectId) {
        setSelectedThread(thread);
      } else {
        setSelectedThread(null);
        setSelectedThreadId(null);
      }
    } else {
      setSelectedThread(null);
    }
  }, [selectedThreadId, threads, projectId, setSelectedThreadId]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const fileArray = Array.from(files);
      
      // Use the uploadMultipleFiles utility function with proper bucket
      const uploaded = await uploadMultipleFiles(
        fileArray, 
        'kanban-files',  // Use the correct bucket
        `messages/${projectId}`,  // Folder path
        (uploaded, total) => {
          console.log(`📤 Uploading: ${uploaded}/${total}`);
        }
      );
      
      console.log('📎 Uploaded files:', uploaded);
      setUploadedFiles(prev => [...prev, ...uploaded]);
      setAttachedFiles(prev => [...prev, ...fileArray]);
      
      toast({
        title: "Fichiers uploadés",
        description: `${uploaded.length} fichier(s) uploadé(s) avec succès`,
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement des fichiers",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;
    if (!selectedThread) {
      toast({
        title: "Erreur",
        description: "Aucune conversation sélectionnée",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Déterminer le destinataire si conversation privée
      let recipientId = undefined;
      if (selectedConversation.type === 'user' && selectedConversation.id) {
        // Pour une conversation privée, passer l'ID du destinataire
        recipientId = selectedConversation.id.startsWith('ia_')
          ? selectedConversation.id.replace('ia_', '')
          : selectedConversation.id;
      }

      // Les fichiers uploadés ont déjà toutes les infos nécessaires
      const sentMessage = await sendMessage(
        selectedThread.id,
        newMessage,
        uploadedFiles,
        recipientId,  // Passer le destinataire pour les conversations privées
        projectId     // Passer le projectId pour le contexte IA
      );

      if (sentMessage) {
        // Add the message immediately to the local state
        // Don't wait for realtime subscription, update immediately
        const messageWithAttachments = {
          ...sentMessage,
          message_attachments: uploadedFiles.map(file => ({
            file_name: file.name,
            file_path: file.path,
            file_type: file.type,
            file_size: file.size
          }))
        };

        setMessages(prev => {
          // Check if message already exists (from realtime)
          const exists = prev.some(msg => msg.id === sentMessage.id);
          if (exists) {
            // Update existing message with attachments if needed
            return prev.map(msg =>
              msg.id === sentMessage.id ? messageWithAttachments : msg
            );
          }
          // Add new message
          return [...prev, messageWithAttachments];
        });

        // 🤖 Gestion IA : Traiter de manière asynchrone si le message est envoyé à une IA
        // Ne pas attendre la réponse pour débloquer l'UI
        const isMessageToIA = selectedConversation.type === 'user' &&
          projectMembers.some(m => m.id === selectedConversation.id && m.isAI);

        if (isMessageToIA) {
          setIsAIProcessing(true);

          // Récupérer la dernière réponse IA si elle existe (pour les choix)
          const aiId = selectedConversation.id?.replace('ia_', '');
          const previousResponse = aiId ? lastAIResponse[aiId] : undefined;

          handleAIConversation(
            selectedConversation,
            newMessage,
            projectId,
            projectMembers,
            selectedThread.id,
            previousResponse,
            user?.id  // Passer l'ID de l'utilisateur pour les réponses privées
          ).then(aiResult => {
            setIsAIProcessing(false);
            if (aiResult.success) {
              console.log('✅ Réponse IA générée et envoyée');

              // Stocker la réponse IA si elle contient des choix
              if (aiResult.aiResponse && aiId) {
                // Détecter si c'est une réponse avec choix
                if (aiResult.aiResponse.includes('Comment souhaitez-vous recevoir')) {
                  // Extraire la vraie réponse (avant le menu de choix)
                  const responseMatch = aiResult.aiResponse.match(/^([\s\S]*?)(\n\n---|\n\n\*\*Comment)/);
                  const realResponse = responseMatch ? responseMatch[1] : aiResult.aiResponse;
                  setLastAIResponse(prev => ({ ...prev, [aiId]: realResponse }));
                } else {
                  // Effacer la dernière réponse si ce n'est pas un choix
                  setLastAIResponse(prev => {
                    const newState = { ...prev };
                    delete newState[aiId];
                    return newState;
                  });
                }
              }

              // Afficher notification de sauvegarde si nécessaire
              if (aiResult.saved) {
                toast({
                  title: "📄 Contenu sauvegardé",
                  description: "Le contenu généré par l'IA a été sauvegardé dans le Drive",
                  variant: "default",
                });
              }
            }
          }).catch(aiError => {
            setIsAIProcessing(false);
            console.error('⚠️ Erreur IA (non bloquante):', aiError);
            // Ne pas bloquer l'envoi du message utilisateur en cas d'erreur IA
          });
        }
      }

      setNewMessage('');
      setAttachedFiles([]);
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'envoi du message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-1">
      <div className="h-full bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-80 border-r border-purple-500/20 bg-gradient-to-b from-purple-900/20 to-transparent">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Conversations
                </h3>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg shadow-purple-500/40">
                  {projectMembers.length} membres
                </Badge>
              </div>

              {/* Conversation équipe complète */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // Pour l'équipe complète, utiliser le thread principal (non privé)
                  const mainThread = threads.find(t => !t.title?.includes('Conversation privée'));
                  if (mainThread) {
                    setSelectedThreadId(mainThread.id);
                    setSelectedThread(mainThread);
                    // Recharger les messages du thread principal
                    refreshMessages();
                  }
                  setSelectedConversation({ type: 'all', name: 'Équipe complète' });
                }}
                className={cn(
                  "p-4 rounded-xl cursor-pointer transition-all duration-200 mb-3",
                  selectedConversation.type === 'all'
                    ? "bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 shadow-lg shadow-purple-500/20"
                    : "bg-white/5 hover:bg-white/10 border border-transparent hover:border-purple-500/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">Équipe complète</p>
                    <p className="text-xs text-gray-400">Tous les membres</p>
                  </div>
                  {selectedConversation.type === 'all' && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                  )}
                </div>
              </motion.div>

              <Separator className="my-4 bg-purple-500/20" />

              {/* Membres */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Membres</p>
                {projectMembers.map((member) => (
                  <motion.div
                    key={member.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      // Créer/récupérer un thread privé pour toute conversation 1-to-1
                      if (user?.id) {
                        // Préparer les informations de l'utilisateur courant
                        const { data: currentUserProfile } = await supabase
                          .from('profiles')
                          .select('email, first_name, last_name')
                          .eq('id', user.id)
                          .single();

                        const currentUser = {
                          id: user.id,
                          name: currentUserProfile
                            ? `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() || currentUserProfile.email
                            : user.email || '',
                          email: user.email || ''
                        };

                        // Préparer les informations de l'autre participant
                        const otherParticipant = {
                          id: member.isAI ? member.id.replace('ia_', '') : member.id,
                          name: member.firstName || member.name,
                          email: member.isAI
                            ? `${(member.firstName || member.name).toLowerCase().replace(/\s+/g, '_')}@ia.team`
                            : member.email || '',
                          isAI: member.isAI || false
                        };

                        const privateThreadId = await PrivateThreadManager.getOrCreatePrivateThread(
                          projectId,
                          currentUser,
                          otherParticipant
                        );

                        if (privateThreadId) {
                          // Mettre à jour le thread sélectionné
                          setSelectedThreadId(privateThreadId);

                          // IMPORTANT: Récupérer et définir le thread complet
                          const { data: privateThread } = await supabase
                            .from('message_threads')
                            .select('*')
                            .eq('id', privateThreadId)
                            .single();

                          if (privateThread) {
                            setSelectedThread(privateThread);
                          }

                          // Récupérer les messages de ce thread privé
                          const { data: threadMessages } = await supabase
                            .from('messages')
                            .select('*')
                            .eq('thread_id', privateThreadId)
                            .order('created_at', { ascending: true });

                          if (threadMessages) {
                            setMessages(threadMessages);
                          }
                        }
                      } else {
                        // Pour les conversations humain-humain, utiliser le thread principal
                        if (threads.length > 0 && !threads[0].title?.includes('Conversation privée')) {
                          setSelectedThreadId(threads[0].id);
                          setSelectedThread(threads[0]);
                        }
                      }

                      setSelectedConversation({
                        type: 'user',
                        id: member.id,
                        name: member.name
                      });
                    }}
                    className={cn(
                      "p-3 rounded-xl cursor-pointer transition-all duration-200 relative",
                      selectedConversation.id === member.id
                        ? member.isAI
                          ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 shadow-lg shadow-cyan-500/20"
                          : "bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 shadow-lg shadow-purple-500/20"
                        : member.isAI
                          ? "bg-cyan-500/10 hover:bg-cyan-500/20 border border-transparent hover:border-cyan-400/30"
                          : "bg-white/5 hover:bg-white/10 border border-transparent hover:border-purple-500/30"
                      // Animation retirée de la carte complète
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatarNeon
                          user={{
                            id: member.id,
                            name: member.name,
                            role: member.role,
                            status: member.isAI ? 'online' : (isUserOnline(member.id) ? 'online' : 'offline')
                          }}
                          size="sm"
                          variant="list"
                          showStatus={true}
                          className="flex-1"
                        />
                        {/* Animation sur l'avatar uniquement pour l'IA en traitement */}
                        {isAIProcessing && selectedConversation.id === member.id && member.isAI && (
                          <div className="absolute inset-0 rounded-full animate-pulse bg-cyan-400/20" />
                        )}
                      </div>

                      {/* Badge IA avec indicateur de traitement */}
                      {member.isAI && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-lg shadow-cyan-500/30"
                        >
                          <Zap className="h-3 w-3 text-white" />
                          <span className="text-xs font-medium text-white">
                            {isAIProcessing && selectedConversation.id === member.id ? "..." : "IA"}
                          </span>
                        </motion.div>
                      )}
                    </div>
                    {/* Indicateur "En train d'écrire..." */}
                    {isAIProcessing && selectedConversation.id === member.id && member.isAI && (
                      <div className="text-xs text-cyan-400 mt-1 animate-pulse">
                        En train d'écrire...
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Groupes */}
              {groups.length > 0 && (
                <>
                  <Separator className="my-4 bg-purple-500/20" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Groupes</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                        onClick={() => setIsCreatingGroup(true)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {groups.map((group) => (
                      <motion.div
                        key={group.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedConversation({ 
                          type: 'group', 
                          id: group.id, 
                          name: group.name,
                          members: group.members 
                        })}
                        className={cn(
                          "p-3 rounded-xl cursor-pointer transition-all duration-200",
                          selectedConversation.id === group.id
                            ? "bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50"
                            : "bg-white/5 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                            <Hash className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{group.name}</p>
                            <p className="text-xs text-gray-400">{group.members.length} membres</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/40">
                  {selectedConversation.type === 'all' ? (
                    <Users className="h-5 w-5 text-white" />
                  ) : selectedConversation.type === 'group' ? (
                    <Hash className="h-5 w-5 text-white" />
                  ) : (
                    <User className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{selectedConversation.name}</h4>
                  <p className="text-xs text-gray-400">
                    {selectedConversation.type === 'all' 
                      ? `${projectMembers.length} participants`
                      : selectedConversation.type === 'group'
                      ? `${selectedConversation.members?.length || 0} membres`
                      : 'Conversation privée'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.div 
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 rounded-full"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Circle className="h-2 w-2 fill-green-400 text-green-400" />
                  <span className="text-xs text-green-400">En ligne</span>
                </motion.div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <AnimatePresence>
                {filteredMessages().map((message, index) => {
                  const isOwnMessage = message.sender_email === user?.email;
                  const sender = projectMembers.find(m => m.email === message.sender_email);
                  const isAIMessage = sender?.isAI || false;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={cn(
                        "flex gap-3 mb-4",
                        isOwnMessage ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {!isOwnMessage && (
                        <UserAvatarNeon
                          user={{
                            id: sender?.id || message.sender_id,
                            name: sender?.name || 'Inconnu',
                            role: sender?.role
                          }}
                          size="md"
                          variant="compact"
                          className={cn(
                            "shadow-lg",
                            isAIMessage
                              ? "shadow-cyan-500/30 ring-2 ring-cyan-400/50"
                              : "shadow-purple-500/20"
                          )}
                        />
                      )}

                      <div className={cn(
                        "max-w-[70%] space-y-1",
                        isOwnMessage ? "items-end" : "items-start"
                      )}>
                        {!isOwnMessage && (
                          <div className="flex items-center gap-2 px-3">
                            <p className="text-xs text-gray-400">{sender?.name || 'Inconnu'}</p>
                            {isAIMessage && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full">
                                <Zap className="h-2.5 w-2.5 text-white" />
                                <span className="text-xs font-medium text-white">IA</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={cn(
                            "px-4 py-3 rounded-2xl backdrop-blur-sm",
                            isOwnMessage
                              ? "bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 shadow-lg shadow-purple-500/20"
                              : isAIMessage
                                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                                : "bg-white/10 border border-white/20"
                          )}
                        >
                          <p className="text-sm text-white whitespace-pre-wrap">
                            {message.content?.replace(/^\[TO:[a-f0-9-]+\]/, '')}
                          </p>
                          
                          {message.message_attachments && message.message_attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.message_attachments.map((file: any, idx: number) => {
                                // L'URL est générée depuis le file_path stocké en base
                                const fileUrl = file.file_path 
                                  ? `https://egdelmcijszuapcpglsy.supabase.co/storage/v1/object/public/kanban-files/${file.file_path}` 
                                  : '';
                                
                                return (
                                  <a
                                    key={idx}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                                  >
                                    <FileText className="h-4 w-4 text-purple-400" />
                                    <span className="text-xs text-gray-300 truncate">{file.file_name}</span>
                                    <Download className="h-3 w-3 text-gray-400 ml-auto" />
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 px-3">
                          {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input area */}
            <div className="border-t border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm p-4">
              {uploadedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-400/50">
                      <Paperclip className="h-3 w-3 text-purple-400" />
                      <span className="text-xs text-gray-300">{file.name}</span>
                      <button
                        onClick={() => {
                          setUploadedFiles(files => files.filter((_, i) => i !== idx));
                          setAttachedFiles(files => files.filter((_, i) => i !== idx));
                        }}
                        className="ml-1 text-gray-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Paperclip className="h-5 w-5 text-gray-400" />
                </motion.button>
                
                <div className="flex-1 relative">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Tapez votre message..."
                    className="w-full resize-none bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/50 rounded-xl pr-12"
                    rows={1}
                  />
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSendMessage}
                    disabled={isSending || (!newMessage.trim() && uploadedFiles.length === 0)}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200",
                      isSending || (!newMessage.trim() && uploadedFiles.length === 0)
                        ? "bg-gray-500/20 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/40"
                    )}
                  >
                    <Send className="h-4 w-4 text-white" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};