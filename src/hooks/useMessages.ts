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
  attachments?: MessageAttachment[];
  read_by?: MessageReadStatus[];
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

            // Count unread messages
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .not('sender_email', 'eq', user.email)
              .not('id', 'in', `(
                SELECT message_id 
                FROM message_read_status 
                WHERE user_email = '${user.email}'
              )`);

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

      // Refresh messages
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
  };

  // Mark messages as read
  const markAsRead = async (threadId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

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
        .eq('email', user.email);

    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!projectId) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (payload.new.thread_id === selectedThread) {
            fetchMessages(selectedThread);
          }
          fetchThreads();
        }
      )
      .subscribe();

    // Subscribe to thread changes
    const threadsChannel = supabase
      .channel('threads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(threadsChannel);
    };
  }, [projectId, selectedThread]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchThreads().finally(() => setLoading(false));
  }, [projectId]);

  // Load messages when thread changes
  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread);
      markAsRead(selectedThread);
    } else {
      setMessages([]);
    }
  }, [selectedThread]);

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
    refreshMessages: () => selectedThread && fetchMessages(selectedThread)
  };
};