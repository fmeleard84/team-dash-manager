import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { toast } from 'sonner';

interface MessageThread {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  parent_message_id?: string;
  attachments?: MessageAttachment[];
  read_status?: MessageReadStatus[];
}

interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

interface MessageReadStatus {
  id: string;
  message_id: string;
  user_email: string;
  read_at: string;
}

export const useMessagesOptimized = (projectId?: string) => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const { candidateProfile, clientProfile, isCandidate, isClient, userRole } = useUserProfile();

  // Early return if user doesn't have permission to access messages
  const userEmail = candidateProfile?.email || clientProfile?.email;
  const canAccessMessages = (isCandidate && candidateProfile) || (isClient && clientProfile);

  const fetchThreads = useCallback(async () => {
    if (!projectId || !canAccessMessages || !userEmail) {
      setThreads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: threadsData, error } = await supabase
        .from('message_threads')
        .select(`
          id,
          project_id,
          title,
          description,
          is_active,
          created_by,
          created_at,
          updated_at,
          last_message_at
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching threads:', error);
        toast.error('Erreur lors du chargement des conversations');
        return;
      }

      // Calculate unread counts for each thread
      const threadsWithUnread = await Promise.all(
        (threadsData || []).map(async (thread) => {
          try {
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .not('id', 'in', `(
                SELECT message_id 
                FROM message_read_status 
                WHERE user_email = '${userEmail}'
              )`);

            return {
              ...thread,
              unread_count: count || 0
            };
          } catch (error) {
            console.error('Error calculating unread count:', error);
            return {
              ...thread,
              unread_count: 0
            };
          }
        })
      );

      setThreads(threadsWithUnread);
    } catch (error) {
      console.error('Error in fetchThreads:', error);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [projectId, canAccessMessages, userEmail]);

  const fetchMessages = useCallback(async (threadId: string) => {
    if (!canAccessMessages) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          thread_id,
          sender_id,
          sender_name,
          sender_email,
          content,
          created_at,
          updated_at,
          is_edited,
          parent_message_id,
          message_attachments (
            id,
            message_id,
            file_name,
            file_path,
            file_type,
            file_size,
            uploaded_by,
            created_at
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Erreur lors du chargement des messages');
        return;
      }

      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
    }
  }, [canAccessMessages]);

  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!selectedThread || !canAccessMessages || !userEmail) return;

    setSending(true);
    try {
      const messageData = {
        thread_id: selectedThread.id,
        sender_id: candidateProfile?.id || clientProfile?.user_id || '',
        sender_name: `${candidateProfile?.first_name || clientProfile?.first_name} ${candidateProfile?.last_name || clientProfile?.last_name}`,
        sender_email: userEmail,
        content
      };

      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Erreur lors de l\'envoi du message');
        return;
      }

      // Handle file attachments if any
      if (attachments && attachments.length > 0) {
        // Implementation for file uploads would go here
        toast.info('Fonctionnalité de pièces jointes à venir');
      }

      // Refresh messages and threads
      await fetchMessages(selectedThread.id);
      await fetchThreads();
      
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  }, [selectedThread, canAccessMessages, userEmail, candidateProfile, clientProfile, fetchMessages, fetchThreads]);

  const markAsRead = useCallback(async (threadId: string) => {
    if (!canAccessMessages || !userEmail) return;

    try {
      // Get all unread messages in this thread
      const { data: unreadMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id')
        .eq('thread_id', threadId)
        .not('id', 'in', `(
          SELECT message_id 
          FROM message_read_status 
          WHERE user_email = '${userEmail}'
        )`);

      if (fetchError || !unreadMessages?.length) return;

      // Mark them as read
      const readStatuses = unreadMessages.map(msg => ({
        message_id: msg.id,
        user_email: userEmail
      }));

      const { error } = await supabase
        .from('message_read_status')
        .insert(readStatuses);

      if (error) {
        console.error('Error marking as read:', error);
        return;
      }

      // Refresh threads to update unread counts
      await fetchThreads();
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }, [canAccessMessages, userEmail, fetchThreads]);

  // Load threads when component mounts or projectId changes
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Load messages when selected thread changes
  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.id);
      markAsRead(selectedThread.id);
    } else {
      setMessages([]);
    }
  }, [selectedThread, fetchMessages, markAsRead]);

  // Set up real-time subscriptions for threads and messages
  useEffect(() => {
    if (!projectId || !canAccessMessages) return;

    const threadsChannel = supabase
      .channel(`threads-${projectId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'message_threads',
        filter: `project_id=eq.${projectId}`
      }, () => {
        fetchThreads();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`messages-${projectId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages'
      }, () => {
        if (selectedThread) {
          fetchMessages(selectedThread.id);
        }
        fetchThreads(); // To update last_message_at
      })
      .subscribe();

    return () => {
      supabase.removeChannel(threadsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [projectId, canAccessMessages, selectedThread, fetchThreads, fetchMessages]);

  return {
    threads,
    selectedThread,
    setSelectedThread,
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
    refetch: fetchThreads,
    canAccessMessages,
    userRole
  };
};