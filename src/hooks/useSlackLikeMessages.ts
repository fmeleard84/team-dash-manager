import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface MessageThread {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_active: boolean;
  unread_count: number;
  participants: MessageParticipant[];
  is_typing: string[]; // Users currently typing
  online_users: string[]; // Currently online users
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_message_id?: string;
  is_edited: boolean;
  edit_count: number;
  attachments?: MessageAttachment[];
  read_by?: MessageReadStatus[];
  reactions?: MessageReaction[];
  mentions?: string[];
  is_system_message: boolean;
}

export interface MessageParticipant {
  id: string;
  thread_id: string;
  user_id?: string;
  email: string;
  name: string;
  role: 'client' | 'candidate';
  joined_at: string;
  last_read_at?: string;
  last_seen_at?: string;
  is_active: boolean;
  is_online: boolean;
  is_typing: boolean;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  download_count: number;
  is_image: boolean;
  thumbnail_url?: string;
}

export interface MessageReadStatus {
  id: string;
  message_id: string;
  user_email: string;
  read_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_email: string;
  emoji: string;
  created_at: string;
}

export interface TypingIndicator {
  user_email: string;
  user_name: string;
  thread_id: string;
  started_at: string;
}

export const useSlackLikeMessages = (projectId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time subscriptions
  const subscriptionsRef = useRef<any[]>([]);

  // Fetch threads for a project
  const fetchThreads = useCallback(async () => {
    if (!projectId || !user) return;

    try {
      const { data: threadsData, error } = await supabase
        .from('message_threads')
        .select(`
          *,
          message_participants (*)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Calculate unread count and online status
      const threadsWithStatus = await Promise.all(
        (threadsData || []).map(async (thread: any) => {
          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id)
            .neq('sender_email', user.email!)
            .not('id', 'in', `(
              SELECT message_id 
              FROM message_read_status 
              WHERE user_email = '${user.email}'
            )`);

          // Get typing users for this thread
          const typingInThread = typingUsers.filter(t => t.thread_id === thread.id);
          
          return {
            ...thread,
            unread_count: unreadCount || 0,
            participants: (thread.message_participants || []).map((p: any) => ({
              ...p,
              is_online: onlineUsers.includes(p.email),
              is_typing: typingInThread.some(t => t.user_email === p.email)
            })),
            is_typing: typingInThread.map(t => t.user_name),
            online_users: onlineUsers
          };
        })
      );

      setThreads(threadsWithStatus);
    } catch (error: any) {
      console.error('Error fetching threads:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les conversations."
      });
    }
  }, [projectId, user, toast, typingUsers, onlineUsers]);

  // Fetch messages for a thread
  const fetchMessages = useCallback(async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          message_attachments (*),
          message_read_status (*),
          message_reactions:message_reactions(*)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messagesWithAttachments = (data || []).map(msg => ({
        ...msg,
        attachments: (msg.message_attachments || []).map((att: any) => ({
          ...att,
          is_image: att.file_type.startsWith('image/'),
          download_count: 0 // TODO: implement download tracking
        })),
        reactions: msg.message_reactions || [],
        mentions: extractMentions(msg.content),
        is_system_message: msg.content.startsWith('📹') || msg.content.startsWith('📞') || msg.content.startsWith('🎉'),
        edit_count: 0 // TODO: implement edit tracking
      }));
      
      setMessages(messagesWithAttachments);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les messages."
      });
    }
  }, [toast]);

  // Send a message with enhanced features
  const sendMessage = useCallback(async (
    content: string, 
    attachments?: File[], 
    parentMessageId?: string,
    mentions?: string[]
  ) => {
    if (!selectedThread || (!content.trim() && !attachments?.length)) return;

    setSending(true);
    try {
      if (!user) throw new Error('User not authenticated');

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const senderName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
        : user.email || 'Utilisateur';

      // Process mentions
      const processedContent = processMentions(content, mentions);

      // Insert message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: selectedThread,
          sender_id: user.id,
          sender_name: senderName,
          sender_email: user.email || '',
          content: processedContent,
          parent_message_id: parentMessageId,
          is_edited: false,
          edit_count: 0,
          is_system_message: content.includes('📹') || content.includes('📞')
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Handle attachments
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const filePath = `messages/${selectedThread}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue;
          }

          await supabase
            .from('message_attachments')
            .insert({
              message_id: messageData.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: user.id
            });
        }
      }

      // Send notifications to mentioned users
      if (mentions && mentions.length > 0) {
        await sendMentionNotifications(mentions, messageData, senderName);
      }

      // Update thread last message timestamp
      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedThread);

      // Refresh messages and threads
      await fetchMessages(selectedThread);
      await fetchThreads();

      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès."
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer le message."
      });
    } finally {
      setSending(false);
    }
  }, [selectedThread, user, toast, fetchMessages, fetchThreads]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: newContent, 
          is_edited: true,
          edit_count: supabase.sql`edit_count + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_email', user.email);

      if (error) throw error;

      if (selectedThread) {
        await fetchMessages(selectedThread);
      }

      toast({
        title: "Message modifié",
        description: "Votre message a été modifié avec succès."
      });

    } catch (error: any) {
      console.error('Error editing message:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le message."
      });
    }
  }, [user, selectedThread, fetchMessages, toast]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      // Soft delete by replacing content
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: '_Message supprimé_',
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_email', user.email);

      if (error) throw error;

      if (selectedThread) {
        await fetchMessages(selectedThread);
      }

      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé."
      });

    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le message."
      });
    }
  }, [user, selectedThread, fetchMessages, toast]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      // Check if user already reacted with this emoji
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_email', user.email)
        .eq('emoji', emoji);

      if (existing && existing.length > 0) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_email', user.email)
          .eq('emoji', emoji);
      } else {
        // Add reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_email: user.email!,
            emoji: emoji
          });
      }

      if (selectedThread) {
        await fetchMessages(selectedThread);
      }

    } catch (error: any) {
      console.error('Error managing reaction:', error);
    }
  }, [user, selectedThread, fetchMessages]);

  // Typing indicator
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!user || !selectedThread) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      // Broadcast typing status
      const channel = supabase.channel(`typing-${selectedThread}`);
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_email: user.email,
          user_name: user.first_name + ' ' + user.last_name || user.email,
          thread_id: selectedThread,
          is_typing: true
        }
      });

      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    } else {
      // Stop typing
      const channel = supabase.channel(`typing-${selectedThread}`);
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_email: user.email,
          user_name: user.first_name + ' ' + user.last_name || user.email,
          thread_id: selectedThread,
          is_typing: false
        }
      });
    }
  }, [user, selectedThread]);

  // Mark messages as read
  const markAsRead = useCallback(async (threadId: string) => {
    if (!user?.email) return;

    try {
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('thread_id', threadId)
        .neq('sender_email', user.email);

      if (!unreadMessages?.length) return;

      const readStatuses = unreadMessages.map(msg => ({
        message_id: msg.id,
        user_email: user.email!
      }));

      await supabase
        .from('message_read_status')
        .upsert(readStatuses, { 
          onConflict: 'message_id,user_email',
          ignoreDuplicates: true 
        });

      await supabase
        .from('message_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('email', user.email);

      await fetchThreads();

    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  }, [user, fetchThreads]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!projectId || !user) return;

    // Messages subscription
    const messagesChannel = supabase
      .channel('slack-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.thread_id === selectedThread) {
            fetchMessages(selectedThread);
          }
          fetchThreads();
        }
      );

    // Typing indicators subscription
    const typingChannel = supabase
      .channel(`typing-indicators-${projectId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const typingData = payload.payload as {
          user_email: string;
          user_name: string;
          thread_id: string;
          is_typing: boolean;
        };

        if (typingData.user_email === user.email) return;

        setTypingUsers(prev => {
          const filtered = prev.filter(t => 
            !(t.user_email === typingData.user_email && t.thread_id === typingData.thread_id)
          );

          if (typingData.is_typing) {
            return [...filtered, {
              user_email: typingData.user_email,
              user_name: typingData.user_name,
              thread_id: typingData.thread_id,
              started_at: new Date().toISOString()
            }];
          }

          return filtered;
        });
      });

    // Online presence
    const presenceChannel = supabase
      .channel(`presence-${projectId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const online = Object.values(state).flat().map((user: any) => user.email);
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const emails = newPresences.map((p: any) => p.email);
        setOnlineUsers(prev => [...new Set([...prev, ...emails])]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const emails = leftPresences.map((p: any) => p.email);
        setOnlineUsers(prev => prev.filter(email => !emails.includes(email)));
      });

    // Track own presence
    presenceChannel.track({
      email: user.email,
      name: user.first_name + ' ' + user.last_name || user.email,
      online_at: new Date().toISOString()
    });

    // Subscribe to all channels
    messagesChannel.subscribe();
    typingChannel.subscribe();
    presenceChannel.subscribe();

    subscriptionsRef.current = [messagesChannel, typingChannel, presenceChannel];

    return () => {
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current = [];
    };
  }, [projectId, user, selectedThread, fetchMessages, fetchThreads]);

  // Clean up typing indicators periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => prev.filter(t => 
        Date.now() - new Date(t.started_at).getTime() < 5000
      ));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initial load
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      fetchThreads().finally(() => setLoading(false));
    }
  }, [projectId, fetchThreads]);

  // Load messages when thread changes
  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread);
      markAsRead(selectedThread);
    } else {
      setMessages([]);
    }
  }, [selectedThread, fetchMessages, markAsRead]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (heartbeatRef.current) {
        clearTimeout(heartbeatRef.current);
      }
    };
  }, []);

  return {
    threads,
    selectedThread,
    setSelectedThread,
    messages,
    loading,
    sending,
    typingUsers,
    onlineUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    setTyping,
    markAsRead,
    refreshThreads: fetchThreads,
    refreshMessages: () => selectedThread && fetchMessages(selectedThread)
  };
};

// Helper functions
const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

const processMentions = (content: string, mentions?: string[]): string => {
  if (!mentions || mentions.length === 0) return content;
  
  let processedContent = content;
  mentions.forEach(mention => {
    processedContent = processedContent.replace(
      new RegExp(`@${mention}`, 'gi'),
      `<span class="mention">@${mention}</span>`
    );
  });
  
  return processedContent;
};

const sendMentionNotifications = async (mentions: string[], message: any, senderName: string) => {
  // TODO: Implement mention notifications
  console.log('Sending mention notifications to:', mentions);
};