import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  message_attachments?: MessageAttachment[];
  message_read_status?: MessageReadStatus[];
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
  is_active: boolean;
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
}

export interface MessageReadStatus {
  id: string;
  message_id: string;
  user_email: string;
  read_at: string;
}

export const useMessages = (projectId?: string) => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Fetch threads for a project
  const fetchThreads = async () => {
    if (!projectId) return;

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

      // Calculate unread count for each thread
        // Calculate unread count for each thread manually
        const threadsWithUnreadCount = await Promise.all(
          (threadsData || []).map(async (thread: any) => {
            // Get current user email
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) return { ...thread, unread_count: 0, participants: thread.message_participants || [] };

            // Get messages in this thread that are not from current user
            const { data: allMessages } = await supabase
              .from('messages')
              .select('id')
              .eq('thread_id', thread.id)
              .not('sender_email', 'eq', user.email);

            // Get read status for current user
            const { data: readStatuses } = await supabase
              .from('message_read_status')
              .select('message_id')
              .eq('user_email', user.email);

            // Calculate unread count
            const readMessageIds = new Set(readStatuses?.map(rs => rs.message_id) || []);
            const unreadCount = allMessages?.filter(msg => !readMessageIds.has(msg.id)).length || 0;

            return {
              ...thread,
              unread_count: unreadCount || 0,
              participants: thread.message_participants || []
            };
          })
        );

      setThreads(threadsWithUnreadCount);
    } catch (error: any) {
      console.error('Error fetching threads:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les conversations."
      });
    }
  };

  // Fetch messages for a thread
  const fetchMessages = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          message_attachments (*),
          message_read_status (*)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les messages."
      });
    }
  };

  // Send a message
  const sendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedThread || !content.trim()) return;

    setSending(true);
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
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

      // Insert message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: selectedThread,
          sender_id: user.id,
          sender_name: senderName,
          sender_email: user.email || '',
          content: content.trim()
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Handle attachments if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          // Upload file to storage
          const filePath = `messages/${selectedThread}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue;
          }

          // Save attachment metadata
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

      // Don't manually refresh - realtime will handle it
      // await fetchMessages(selectedThread);
      // await fetchThreads();

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
  };

  // Mark messages as read
  const markAsRead = async (threadId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Get unread messages in this thread
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('thread_id', threadId)
        .not('sender_email', 'eq', user.email);

      if (!unreadMessages?.length) return;

      // Mark all as read
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

      // Update participant's last_read_at
      await supabase
        .from('message_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('id', user.id);

    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  // DISABLED: Set up real-time subscriptions (using useRealtimeMessages instead)
  useEffect(() => {
    // Realtime subscriptions temporarily disabled
    return;
    
    /* Commented out to avoid unreachable code warning
    if (!projectId) return;

    console.log('🔄 Setting up realtime subscriptions for project:', projectId);

    // Subscribe to new messages with improved filtering
    const messagesChannel = supabase
      .channel(`messages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('📨 New message received via realtime:', payload.new);
          
          // If this message belongs to the currently selected thread, add it immediately
          if (payload.new.thread_id === selectedThread) {
            // Fetch the complete message with attachments
            const { data: fullMessage, error } = await supabase
              .from('messages')
              .select(`
                *,
                message_attachments (*),
                message_read_status (*)
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && fullMessage) {
              console.log('✅ Adding new message to current thread:', fullMessage);
              setMessages(prev => {
                // Avoid duplicates
                const exists = prev.some(msg => msg.id === fullMessage.id);
                if (exists) return prev;
                return [...prev, fullMessage];
              });
            }
          }
          
          // Always refresh threads to update unread counts
          fetchThreads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('📝 Message updated via realtime:', payload.new);
          
          if (payload.new.thread_id === selectedThread) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages channel status:', status);
      });

    // Subscribe to message attachments
    const attachmentsChannel = supabase
      .channel(`attachments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments'
        },
        async (payload) => {
          console.log('📎 New attachment via realtime:', payload.new);
          
          // Find the message this attachment belongs to and refresh it
          const messageId = payload.new.message_id;
          const message = messages.find(m => m.id === messageId);
          
          if (message && message.thread_id === selectedThread) {
            // Refresh the specific message to get the new attachment
            fetchMessages(selectedThread);
          }
        }
      )
      .subscribe((status) => {
        console.log('📎 Attachments channel status:', status);
      });

    // Subscribe to thread changes
    const threadsChannel = supabase
      .channel(`threads-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('💬 Thread changed via realtime:', payload);
          fetchThreads();
        }
      )
      .subscribe((status) => {
        console.log('💬 Threads channel status:', status);
      });

    return () => {
      console.log('🛑 Cleaning up realtime subscriptions');
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(attachmentsChannel);
      supabase.removeChannel(threadsChannel);
    };
    */
  }, [projectId, selectedThread, messages]);

  // Initial load and reset when project changes
  useEffect(() => {
    // Reset all state when project changes
    setThreads([]);
    setSelectedThread(null);
    setMessages([]);
    setLoading(true);
    
    if (projectId) {
      fetchThreads().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [projectId]);

  // Load messages when thread changes
  useEffect(() => {
    if (selectedThread && projectId) {
      // Clear messages first to avoid showing old ones
      setMessages([]);
      fetchMessages(selectedThread);
      markAsRead(selectedThread);
    } else {
      setMessages([]);
    }
  }, [selectedThread, projectId]);

  return {
    threads,
    selectedThread,
    setSelectedThread,
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
    refreshThreads: fetchThreads,
    refreshMessages: () => selectedThread && fetchMessages(selectedThread),
    // Expose setters for realtime updates
    setMessages,
    setThreads
  };
};