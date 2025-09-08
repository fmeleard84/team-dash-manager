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
  X
} from 'lucide-react';
import { useMessages, MessageThread, Message } from '@/hooks/useMessages';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectMembersForMessaging, ProjectMember } from '@/hooks/useProjectMembersForMessaging';
import { useMessageGroups, MessageGroup } from '@/hooks/useMessageGroups';
import { useUserPresence } from '@/hooks/useUserPresence';
import { toast } from 'sonner';
import { initializeProjectMessaging, sendMessage } from '@/utils/messageSetup';
import { uploadMultipleFiles, syncMessageFilesToDrive, UploadedFile } from '@/utils/fileUpload';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface EnhancedMessageSystemProps {
  projectId: string;
  userType?: 'client' | 'candidate' | 'admin';
}

type ConversationType = 'all' | 'user' | 'group';

interface SelectedConversation {
  type: ConversationType;
  id?: string; // user id or group id
  name: string;
  members?: string[]; // for groups
}

export const EnhancedMessageSystem = ({ projectId, userType = 'user' }: EnhancedMessageSystemProps) => {
  const { user } = useAuth();
  const { members: projectMembers, loading: membersLoading } = useProjectMembersForMessaging(projectId);
  const { groups, createGroup, deleteGroup } = useMessageGroups(projectId);
  const { threads, messages, loading, refreshThreads, refreshMessages, selectedThread: selectedThreadId, setSelectedThread: setSelectedThreadId, setMessages, setThreads } = useMessages(projectId);
  const { isUserOnline } = useUserPresence();
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation>({
    type: 'all',
    name: 'Équipe complète'
  });
  
  // Group creation dialog state
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembersForGroup, setSelectedMembersForGroup] = useState<string[]>([]);

  // Filter messages based on selected conversation
  const filteredMessages = useCallback(() => {
    if (selectedConversation.type === 'all') {
      return messages;
    } else if (selectedConversation.type === 'user' && selectedConversation.id) {
      // Filter messages from/to specific user
      return messages.filter(msg => 
        msg.sender_id === selectedConversation.id || 
        msg.recipient_id === selectedConversation.id
      );
    } else if (selectedConversation.type === 'group' && selectedConversation.members) {
      // Filter messages from group members
      return messages.filter(msg => 
        selectedConversation.members?.includes(msg.sender_id || '')
      );
    }
    return messages;
  }, [messages, selectedConversation]);

  // Sync selectedThread when ID changes or project changes
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
  
  // Stable callback functions
  const onNewMessage = useCallback((newMessage: any) => {
    console.log(`🔔 ${userType.toUpperCase()}: New message received!`, newMessage);
    
    if (newMessage.sender_email !== user?.email) {
      toast.success(`💬 Nouveau message de ${newMessage.sender_name}`);
    }
    
    // Check if message already exists to avoid duplicates
    setMessages(prev => {
      const exists = prev.some(msg => msg.id === newMessage.id);
      if (exists) {
        console.log('Message already exists, skipping duplicate');
        return prev;
      }
      return [...prev, newMessage];
    });
  }, [user?.email, userType, setMessages]);

  const onNewThread = useCallback((newThread: any) => {
    console.log(`🔔 ${userType.toUpperCase()}: New thread received!`, newThread);
    setThreads(prev => [...prev, newThread]);
    refreshThreads();
  }, [userType, setThreads, refreshThreads]);

  const onThreadUpdate = useCallback((updatedThread: any) => {
    console.log(`🔔 ${userType.toUpperCase()}: Thread updated!`, updatedThread);
    refreshThreads();
  }, [userType, refreshThreads]);

  // Subscribe to realtime updates
  const { sendMessageRealtime } = useRealtimeMessages({
    projectId,
    selectedThread: (selectedThread && selectedThread.project_id === projectId) ? selectedThread.id : null,
    onNewMessage,
    onMessageUpdate: (updatedMessage: any) => {
      console.log(`🔔 ${userType.toUpperCase()}: Message updated!`, updatedMessage);
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

  const [newMessageContent, setNewMessageContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset messages when project changes
  useEffect(() => {
    setNewMessageContent('');
    setUploadedFiles([]);
    setSelectedConversation({ type: 'all', name: 'Équipe complète' });
  }, [projectId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        console.log(`🔄 ${userType.toUpperCase()}: Initializing messaging for project:`, projectId);
        
        const threadId = await initializeProjectMessaging(projectId);
        
        if (threadId) {
          console.log(`✅ ${userType.toUpperCase()}: Messaging initialized with thread:`, threadId);
          await refreshThreads();
          setSelectedThreadId(threadId);
        }
      } catch (error) {
        console.error(`❌ ${userType.toUpperCase()}: Error initializing messaging:`, error);
        toast.error('Impossible d\'initialiser la messagerie');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeMessaging();
  }, [projectId, threads, loading, isInitializing, userType, refreshThreads, setSelectedThreadId, selectedThreadId]);

  const handleSendMessage = async () => {
    if (!newMessageContent.trim() && uploadedFiles.length === 0) return;
    if (!selectedThread) return;

    try {
      // Add recipient info if private message
      const messageData: any = {
        content: newMessageContent,
        files: uploadedFiles.map(file => ({
          name: file.name,
          url: '',
          path: file.path,
          size: file.size,
          type: file.type
        }))
      };

      // Add metadata for conversation type
      if (selectedConversation.type === 'user' && selectedConversation.id) {
        messageData.recipient_id = selectedConversation.id;
        messageData.is_private = true;
      } else if (selectedConversation.type === 'group' && selectedConversation.members) {
        messageData.group_members = selectedConversation.members;
        messageData.group_name = selectedConversation.name;
      }

      const sentMessage = await sendMessage(selectedThread.id, newMessageContent, messageData.files);
      
      // Add the message immediately to the local state
      // This ensures the sender sees their message right away
      if (sentMessage) {
        setMessages(prev => {
          // Check if message already exists (from realtime)
          const exists = prev.some(msg => msg.id === sentMessage.id);
          if (!exists) {
            return [...prev, sentMessage];
          }
          return prev;
        });
      }
      
      setNewMessageContent('');
      setUploadedFiles([]);
      
      // Sync files to Drive if any using the sync function
      if (uploadedFiles.length > 0) {
        try {
          await syncMessageFilesToDrive(uploadedFiles, projectId);
          console.log(`✅ ${userType.toUpperCase()}: Files synced to Drive/Messagerie folder`);
        } catch (error) {
          console.error('Error syncing to Drive:', error);
          // Don't block message send if sync fails
        }
      }
      
      // Don't refresh - realtime will handle it
      // This prevents duplicate messages
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

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
      
      console.log(`📎 ${userType.toUpperCase()}: Uploaded files:`, uploaded);
      setUploadedFiles(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} fichier(s) uploadé(s) avec succès`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Erreur lors du téléchargement des fichiers');
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedMembersForGroup.length === 0) {
      toast.error('Veuillez entrer un nom et sélectionner des membres');
      return;
    }

    const newGroup = createGroup(newGroupName, selectedMembersForGroup);
    toast.success(`Groupe "${newGroupName}" créé avec succès`);
    
    // Reset dialog state
    setNewGroupName('');
    setSelectedMembersForGroup([]);
    setIsCreatingGroup(false);
    
    // Select the new group
    setSelectedConversation({
      type: 'group',
      id: newGroup.id,
      name: newGroup.name,
      members: newGroup.memberIds
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || membersLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageSquare className="w-8 h-8 animate-pulse mx-auto mb-2" />
            <p>Chargement des messages...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayMessages = filteredMessages();

  return (
    <div className="flex h-[600px] gap-4">
      {/* Left Sidebar - Users and Groups */}
      <div className="w-80 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl border border-purple-200/50 overflow-hidden">
        <div className="p-4 border-b border-purple-200/30">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-900">
            <Users className="w-5 h-5 text-purple-600" />
            Conversations
          </h3>
        </div>
        
        <ScrollArea className="h-[520px]">
          <div className="p-3 space-y-4">
            {/* All Team */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                CANAL GÉNÉRAL
              </h4>
              <div
                onClick={() => setSelectedConversation({ type: 'all', name: 'Équipe complète' })}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3",
                  selectedConversation.type === 'all' && !selectedConversation.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'hover:bg-white/50 hover:shadow-md'
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  selectedConversation.type === 'all' && !selectedConversation.id
                    ? "bg-white/20"
                    : "bg-purple-200"
                )}>
                  <Users className={cn(
                    "w-4 h-4",
                    selectedConversation.type === 'all' && !selectedConversation.id
                      ? "text-white"
                      : "text-purple-600"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Équipe complète</p>
                  <p className="text-xs opacity-70">
                    {projectMembers.length} membre{projectMembers.length > 1 ? 's' : ''} 
                    {(() => {
                      const onlineCount = projectMembers.filter(m => isUserOnline(m.userId)).length;
                      return onlineCount > 0 ? ` • ${onlineCount} en ligne` : '';
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Groups */}
            {groups.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    GROUPES
                  </span>
                </h4>
                <div className="space-y-1">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => setSelectedConversation({ 
                        type: 'group', 
                        id: group.id, 
                        name: group.name, 
                        members: group.memberIds 
                      })}
                      className={cn(
                        "p-2 rounded-lg cursor-pointer transition-all flex items-center gap-3 group",
                        selectedConversation.type === 'group' && selectedConversation.id === group.id
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'hover:bg-white/50 hover:shadow-md'
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        selectedConversation.type === 'group' && selectedConversation.id === group.id
                          ? "bg-white/20"
                          : ""
                      )}
                        style={{ 
                          backgroundColor: selectedConversation.type === 'group' && selectedConversation.id === group.id 
                            ? undefined 
                            : group.color + '30' 
                        }}
                      >
                        <Users className={cn(
                          "w-4 h-4",
                          selectedConversation.type === 'group' && selectedConversation.id === group.id
                            ? "text-white"
                            : ""
                        )} 
                        style={{ 
                          color: selectedConversation.type === 'group' && selectedConversation.id === group.id 
                            ? undefined 
                            : group.color 
                        }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs opacity-70">{group.memberIds.length} membres</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGroup(group.id);
                          toast.success('Groupe supprimé');
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Group Button */}
            <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-purple-200 hover:bg-purple-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un groupe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau groupe</DialogTitle>
                  <DialogDescription>
                    Sélectionnez les membres pour créer un groupe de discussion privé
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Nom du groupe</label>
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Ex: Équipe Design"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Membres</label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {projectMembers.map((member) => (
                        <div key={member.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={member.id}
                            checked={selectedMembersForGroup.includes(member.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMembersForGroup([...selectedMembersForGroup, member.id]);
                              } else {
                                setSelectedMembersForGroup(selectedMembersForGroup.filter(id => id !== member.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={member.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {member.name}
                            <Badge variant="outline" className="text-xs scale-90">
                              {member.role === 'client' ? 'Client' : 'Candidat'}
                            </Badge>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateGroup}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Créer le groupe
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Separator className="my-2" />

            {/* Individual Users */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <User className="w-3 h-3" />
                MESSAGES DIRECTS
              </h4>
              <div className="space-y-1">
                {projectMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedConversation({ 
                      type: 'user', 
                      id: member.id, 
                      name: member.firstName || member.name 
                    })}
                    className={cn(
                      "p-2 rounded-lg cursor-pointer transition-all flex items-center gap-3",
                      selectedConversation.type === 'user' && selectedConversation.id === member.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'hover:bg-white/50 hover:shadow-md'
                    )}
                  >
                    <Avatar className={cn(
                      "w-8 h-8",
                      selectedConversation.type === 'user' && selectedConversation.id === member.id
                        ? "border-2 border-white/50"
                        : ""
                    )}>
                      <AvatarFallback className={cn(
                        selectedConversation.type === 'user' && selectedConversation.id === member.id
                          ? "bg-white/20 text-white"
                          : ""
                      )}>
                        {(member.firstName || member.name).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{member.firstName || member.name}</p>
                      <div className="flex items-center gap-2">
                        <Circle 
                          className={cn(
                            "w-2 h-2 fill-current",
                            isUserOnline(member.userId) ? "text-green-500" : "text-gray-400"
                          )} 
                        />
                        <p className="text-xs opacity-70">
                          {member.jobTitle || (member.role === 'client' ? 'Client' : 'Candidat')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl border border-purple-200/50 overflow-hidden flex flex-col">
        {selectedThread ? (
          <>
            <div className="p-4 border-b border-purple-200/30 bg-white/50">
              <div className="flex items-center gap-3">
                {selectedConversation.type === 'all' ? (
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                ) : selectedConversation.type === 'group' ? (
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                ) : (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {selectedConversation.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">
                    {selectedConversation.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.type === 'all' ? 'Tous les membres du projet' :
                     selectedConversation.type === 'group' ? `Groupe privé - ${selectedConversation.members?.length} membres` :
                     'Message direct'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {displayMessages.map((message) => {
                    const isMyMessage = message.sender_email === user?.email;
                    return (
                      <div 
                        key={message.id} 
                        className={cn(
                          "flex gap-3",
                          isMyMessage ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isMyMessage && (
                          <Avatar className="w-8 h-8 mt-1">
                            <AvatarFallback>
                              {message.sender_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={cn(
                          "max-w-[70%] space-y-1",
                          isMyMessage ? "items-end" : "items-start"
                        )}>
                          <div className={cn(
                            "flex items-center gap-2",
                            isMyMessage ? "justify-end" : "justify-start"
                          )}>
                            {!isMyMessage && (
                              <span className="font-medium text-sm">
                                {(() => {
                                  // Parse name and job from sender_name if it contains parentheses
                                  const senderName = message.sender_name || 'Utilisateur';
                                  const match = senderName.match(/^(.+?)\s*\((.+?)\)$/);
                                  
                                  if (match) {
                                    // Format: "Name (Job)"
                                    return (
                                      <>
                                        {match[1]}
                                        <span className="font-normal text-xs text-muted-foreground ml-1">
                                          • {match[2]}
                                        </span>
                                      </>
                                    );
                                  } else if (message.sender_job_title) {
                                    // New format with separate job_title column
                                    return (
                                      <>
                                        {senderName}
                                        <span className="font-normal text-xs text-muted-foreground ml-1">
                                          • {message.sender_job_title}
                                        </span>
                                      </>
                                    );
                                  } else {
                                    // Just the name
                                    return senderName;
                                  }
                                })()}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                          
                          {message.content && (
                            <div className={cn(
                              "text-sm whitespace-pre-wrap rounded-lg p-3 shadow-sm",
                              isMyMessage 
                                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white ml-auto"
                                : "bg-white/70"
                            )}>
                              {message.content}
                            </div>
                          )}
                          
                          {message.message_attachments && message.message_attachments.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {message.message_attachments.map((file: any, index: number) => (
                                <div 
                                  key={index} 
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg shadow-sm",
                                    isMyMessage
                                      ? "bg-purple-100/50 ml-auto"
                                      : "bg-white/50"
                                  )}
                                >
                                  {getFileIcon(file.file_type || '')}
                                  <span className="text-sm flex-1">{file.file_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {file.file_size ? formatFileSize(file.file_size) : ''}
                                  </span>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {isMyMessage && (
                          <Avatar className="w-8 h-8 mt-1">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              {user?.email?.charAt(0)?.toUpperCase() || 'M'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* File Uploads Preview */}
              {uploadedFiles.length > 0 && (
                <div className="border-t border-purple-200/30 bg-gradient-to-r from-purple-50 to-pink-50 p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-purple-700">
                      {uploadedFiles.length} fichier{uploadedFiles.length > 1 ? 's' : ''} prêt{uploadedFiles.length > 1 ? 's' : ''} à envoyer:
                    </p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white/80 border border-purple-200 rounded-lg">
                        {getFileIcon(file.type)}
                        <span className="text-sm flex-1 font-medium">{file.name}</span>
                        <span className="text-xs text-purple-600">
                          {formatFileSize(file.size)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeUploadedFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input - Fixed alignment */}
              <div className="border-t border-purple-200/30 p-4 bg-white/50">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Textarea
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      placeholder={
                        selectedConversation.type === 'all' ? "Message à toute l'équipe..." :
                        selectedConversation.type === 'group' ? `Message au groupe ${selectedConversation.name}...` :
                        `Message privé à ${selectedConversation.name}...`
                      }
                      className="min-h-[60px] max-h-[120px] resize-none border-purple-200/50 focus:border-purple-400/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="h-10 w-10 border-purple-200 hover:bg-purple-50"
                    >
                      <Paperclip className="w-4 h-4 text-purple-600" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!newMessageContent.trim() && uploadedFiles.length === 0}
                      className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionnez une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};