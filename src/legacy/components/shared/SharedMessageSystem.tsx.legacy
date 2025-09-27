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
  Send, 
  Paperclip,
  Upload,
  Download,
  User,
  MessageSquare,
  Bold,
  Italic,
  FileText,
  Image,
  File,
  Eye
} from 'lucide-react';
import { useMessages, MessageThread, Message } from '@/hooks/useMessages';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { initializeProjectMessaging, sendMessage } from '@/utils/messageSetup';
import { uploadMultipleFiles, UploadedFile } from '@/utils/fileUpload';
import { supabase } from '@/integrations/supabase/client';

interface SharedMessageSystemProps {
  projectId: string;
  userType?: 'client' | 'candidate' | 'admin'; // For logging purposes
}

export const SharedMessageSystem = ({ projectId, userType = 'user' }: SharedMessageSystemProps) => {
  const { user } = useAuth();
  const { threads, messages, loading, refreshThreads, refreshMessages, selectedThread: selectedThreadId, setSelectedThread: setSelectedThreadId, setMessages, setThreads } = useMessages(projectId);
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);

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
  
  // Stable callback functions to avoid recreating subscriptions  
  const onNewMessage = useCallback((newMessage: any) => {
    console.log(`🔔 ${userType.toUpperCase()}: New message received via realtime!`, newMessage);
    console.log(`🔔 ${userType.toUpperCase()}: Current user email:`, user?.email);
    console.log(`🔔 ${userType.toUpperCase()}: Message sender email:`, newMessage.sender_email);
    
    // Show notification if message is not from current user
    if (newMessage.sender_email !== user?.email) {
      console.log(`🔔 ${userType.toUpperCase()}: Showing notification for message from:`, newMessage.sender_name);
      toast.success(`💬 Nouveau message de ${newMessage.sender_name}`);
    } else {
      console.log(`🔔 ${userType.toUpperCase()}: Message is from current user, no notification`);
    }
    
    // Add to messages list
    setMessages(prev => [...prev, newMessage]);
  }, [user?.email, userType, setMessages]);

  const onNewThread = useCallback((newThread: any) => {
    console.log(`🔔 ${userType.toUpperCase()}: New thread received via realtime!`, newThread);
    setThreads(prev => [...prev, newThread]);
    refreshThreads();
  }, [userType, setThreads, refreshThreads]);

  const onThreadUpdate = useCallback((updatedThread: any) => {
    console.log(`🔔 ${userType.toUpperCase()}: Thread updated via realtime!`, updatedThread);
    refreshThreads();
  }, [userType, refreshThreads]);

  // Subscribe to realtime updates - pass thread ID not object
  const { sendMessageRealtime } = useRealtimeMessages({
    projectId,
    selectedThread: (selectedThread && selectedThread.project_id === projectId) ? selectedThread.id : null,
    onNewMessage,
    onMessageUpdate: (updatedMessage: any) => {
      console.log(`🔔 ${userType.toUpperCase()}: Message updated via realtime!`, updatedMessage);
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
        // Auto-select first thread if none selected and it belongs to current project
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
          // After refresh, select the thread ID
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
      // Use the sendMessage from utils with proper parameters - need to pass the ID
      await sendMessage(
        selectedThread.id, 
        newMessageContent,
        uploadedFiles.map(file => ({
          name: file.name,
          url: '', // URL will be set by storage
          path: file.path,
          size: file.size,
          type: file.type
        }))
      );
      
      setNewMessageContent('');
      setUploadedFiles([]);
      
      // Sync files to Drive if any
      if (uploadedFiles.length > 0) {
        try {
          // Upload to Drive's Messagerie folder
          for (const file of uploadedFiles) {
            const drivePath = `project/${projectId}/Messagerie/${file.name}`;
            await supabase.storage
              .from('project-files')
              .upload(drivePath, file.blob || file, { upsert: true });
          }
          console.log(`✅ ${userType.toUpperCase()}: Files synced to Drive/Messagerie folder`);
        } catch (error) {
          console.error('Error syncing to Drive:', error);
        }
      }
      
      // Refresh messages after sending
      setTimeout(() => {
        refreshMessages();
      }, 500);
      
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
      
      // Upload files to the messages bucket
      const uploaded: UploadedFile[] = [];
      for (const file of fileArray) {
        const path = `messages/${projectId}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('project-files')
          .upload(path, file);
        
        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from('project-files')
            .getPublicUrl(path);
          
          uploaded.push({
            name: file.name,
            path: path,
            size: file.size,
            type: file.type,
            url: urlData?.publicUrl || '',
            blob: file
          } as UploadedFile);
        }
      }
      
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

  if (loading) {
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

  return (
    <div className="flex h-[600px] gap-4">
      {/* Threads Sidebar */}
      <div className="w-80 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl border border-purple-200/50 overflow-hidden">
        <div className="p-4 border-b border-purple-200/30">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-900">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            Discussions
          </h3>
        </div>
        <div className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-1 p-3">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedThread?.id === thread.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'hover:bg-white/50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {thread.title || 'Discussion générale'}
                      </p>
                      <p className="text-xs opacity-70 truncate">
                        {thread.description || 'Messages du projet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {threads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune discussion</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl border border-purple-200/50 overflow-hidden flex flex-col">
        {selectedThread ? (
          <>
            <div className="p-4 border-b border-purple-200/30 bg-white/50">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">
                    {selectedThread.title || 'Discussion générale'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedThread.description || 'Messages du projet'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback>
                          {message.sender_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {message.sender_name || 'Utilisateur'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(message.created_at)}
                          </span>
                          {message.sender_email === user?.email && (
                            <Badge variant="secondary" className="text-xs">
                              Vous
                            </Badge>
                          )}
                        </div>
                        
                        {message.content && (
                          <div className="text-sm whitespace-pre-wrap bg-white/70 rounded-lg p-3 shadow-sm">
                            {message.content}
                          </div>
                        )}
                        
                        {message.message_attachments && message.message_attachments.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {message.message_attachments.map((file: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-white/50 rounded-lg shadow-sm">
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
                    </div>
                  ))}
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

              {/* Message Input */}
              <div className="border-t border-purple-200/30 p-4 bg-white/50">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      placeholder="Tapez votre message..."
                      className="min-h-[60px] resize-none border-purple-200/50 focus:border-purple-400/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="border-purple-200 hover:bg-purple-50">
                      <Paperclip className="w-4 h-4 text-purple-600" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!newMessageContent.trim() && uploadedFiles.length === 0}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
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
              <p>Sélectionnez une discussion pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};