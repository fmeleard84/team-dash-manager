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
import { useMessagesSimplified } from '@/hooks/useMessagesSimplified';
import { MessageService } from '@/services/MessageService';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectMembersForMessaging } from '@/hooks/useProjectMembersForMessaging';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useToast } from '@/hooks/use-toast';
import { uploadMultipleFiles, UploadedFile } from '@/utils/fileUpload';
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
  const {
    threads,
    messages,
    selectedThreadId,
    loading,
    sending: isSending,
    setSelectedThreadId,
    sendMessage: sendMessageToThread,
    getOrCreatePrivateThread,
    setMessages
  } = useMessagesSimplified(projectId);
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
  
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation>({
    type: 'all',
    name: 'Équipe complète'
  });
  
  const [newMessage, setNewMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState<string | null>(null); // ID de l'IA qui génère
  const [aiGenerationStartTime, setAIGenerationStartTime] = useState<number | null>(null); // Timestamp du début de génération
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Les messages sont déjà filtrés par thread via le hook
  const filteredMessages = useCallback(() => messages, [messages]);

  // Notification pour les nouveaux messages (géré par le hook)

  // Initialisation automatique gérée par le hook

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Détecter quand l'IA a répondu pour arrêter le loader
  useEffect(() => {
    if (isAIGenerating && messages.length > 0) {
      // Chercher si un message récent vient de l'IA
      const lastMessages = messages.slice(-3); // Les 3 derniers messages
      const aiResponse = lastMessages.find(msg => {
        const sender = projectMembers.find(m => m.email === msg.sender_email);
        // Vérifier que c'est bien l'IA qui génère actuellement
        return sender?.isAI === true &&
               sender.id.replace('ia_', '') === isAIGenerating &&
               // Le message doit être récent (moins de 30 secondes)
               new Date(msg.created_at).getTime() > Date.now() - 30000;
      });

      if (aiResponse) {
        // Vérifier si le message contient le tag de sauvegarde ou si c'est une réponse complète
        const isComplete = aiResponse.content.includes('[SAVE_TO_DRIVE:') ||
                          aiResponse.content.length > 100 ||
                          (aiGenerationStartTime && Date.now() - aiGenerationStartTime > 3000);

        if (isComplete) {
          // L'IA a terminé, arrêter le loader avec un délai pour fluidité
          setTimeout(() => {
            setIsAIGenerating(null);
            setAIGenerationStartTime(null);
          }, 1000); // Délai plus long pour être sûr que l'IA a fini
        }
      }
    }
  }, [messages, isAIGenerating, projectMembers]);

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

  // Handle send message - SIMPLIFIÉ
  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;
    if (!selectedThreadId) {
      toast({
        title: "Erreur",
        description: "Aucune conversation sélectionnée",
        variant: "destructive",
      });
      return;
    }

    try {
      // Vérifier si on envoie à une IA dans un thread privé
      const currentThread = threads.find(t => t.id === selectedThreadId);
      const isPrivateWithAI = currentThread?.metadata?.type === 'private' &&
                              currentThread?.metadata?.participants?.some((p: any) => p.isAI === true);

      if (isPrivateWithAI) {
        const aiParticipant = currentThread?.metadata?.participants?.find((p: any) => p.isAI === true);
        if (aiParticipant) {
          console.log('🔴 [UI] Début génération IA:', aiParticipant.id);
          setIsAIGenerating(aiParticipant.id);
          setAIGenerationStartTime(Date.now());
        }
      }

      // Envoyer le message via le hook simplifié
      await sendMessageToThread(newMessage, uploadedFiles);

      // Réinitialiser le formulaire
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
                onClick={async () => {
                  // Pour l'équipe complète, utiliser le thread public
                  const publicThread = threads.find(t =>
                    t.metadata?.type === 'team' || !t.metadata?.type
                  );

                  if (publicThread) {
                    setSelectedThreadId(publicThread.id);
                  } else {
                    // Créer un thread public (passer null pour participants = public)
                    const threadId = await getOrCreatePrivateThread(null);
                    if (threadId) {
                      setSelectedThreadId(threadId);
                    }
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
                      // Créer/récupérer un thread privé simplifié
                      if (user?.id) {
                        // Préparer les participants
                        // Pour l'IA, utiliser l'ID sans le préfixe ia_
                        const aiRealId = member.isAI && member.id.startsWith('ia_')
                          ? member.id.replace('ia_', '')
                          : member.id;

                        const participants = [
                          {
                            id: user.id,
                            name: user.email?.split('@')[0] || 'Moi',
                            email: user.email || '',
                            isAI: false
                          },
                          {
                            id: aiRealId,
                            name: member.name,
                            email: member.email || `${member.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
                            isAI: member.isAI === true, // S'assurer que c'est un booléen
                            promptId: member.isAI ? aiRealId : undefined  // Utiliser l'ID réel pour le promptId
                          }
                        ];

                        console.log('🚀 Création thread privé avec participants:', participants);

                        // Créer ou récupérer le thread privé
                        const privateThreadId = await getOrCreatePrivateThread(participants);

                        if (privateThreadId) {
                          console.log('🔐 Thread privé:', privateThreadId);
                          setMessages([]); // Vider les messages du thread précédent
                          setSelectedThreadId(privateThreadId);
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
                          ? "bg-gradient-to-r from-blue-500/30 to-blue-600/30 border border-blue-400/50 shadow-lg shadow-blue-500/20"
                          : "bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 shadow-lg shadow-purple-500/20"
                        : member.isAI
                          ? "bg-blue-500/10 hover:bg-blue-500/20 border border-transparent hover:border-blue-400/30"
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
                        {/* Pas d'effet sur l'avatar, seulement sur le badge */}
                      </div>

                      {/* Badge IA - Bleu par défaut, Rouge clignotant quand travaille */}
                      {member.isAI && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full shadow-lg border transition-all duration-300",
                            isAIGenerating === member.id.replace('ia_', '')
                              ? "bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/50 border-red-400"
                              : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/30 border-blue-400"
                          )}
                        >
                          {isAIGenerating === member.id.replace('ia_', '') ? (
                            <>
                              <motion.div
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                              >
                                <Zap className="h-3 w-3 text-white" />
                              </motion.div>
                              <motion.span
                                className="text-xs font-medium text-white"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                              >
                                Génère...
                              </motion.span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 text-white" />
                              <span className="text-xs font-medium text-white">IA</span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Groupes supprimés - Simplification */}
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
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    {selectedConversation.name}
                    {threads.find(t => t.id === selectedThreadId)?.metadata?.type === 'private' && (
                      <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-400/30">
                        🔒 Privé
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {selectedConversation.type === 'all'
                      ? `${projectMembers.length} participants - Canal général`
                      : '🔐 Conversation privée - Seuls vous deux pouvez voir ces messages'
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
                              ? "shadow-red-500/30 ring-2 ring-red-400/50"
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
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-red-600 rounded-full">
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
                                ? "bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/40 shadow-lg shadow-red-500/20"
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