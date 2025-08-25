import { useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeMessagesOptions {
  projectId: string;
  selectedThread: string | null;
  onNewMessage: (message: any) => void;
  onMessageUpdate: (message: any) => void;
  onThreadUpdate: () => void;
  setMessages?: (updater: (prev: any[]) => any[]) => void;
  setThreads?: (updater: (prev: any[]) => any[]) => void;
}

export const useRealtimeMessages = ({
  projectId,
  selectedThread,
  onNewMessage,
  onMessageUpdate,
  onThreadUpdate,
  setMessages,
  setThreads
}: UseRealtimeMessagesOptions) => {
  const channelsRef = useRef<any[]>([]);
  
  // Use refs to avoid stale closures
  const setMessagesRef = useRef(setMessages);
  const setThreadsRef = useRef(setThreads);
  const selectedThreadRef = useRef(selectedThread);
  
  // Update refs when values change
  setMessagesRef.current = setMessages;
  setThreadsRef.current = setThreads;
  selectedThreadRef.current = selectedThread;

  useEffect(() => {
    if (!projectId) {
      console.log('❌ REALTIME: No projectId provided');
      return;
    }

    console.log('🔄 Setting up ENHANCED realtime for project:', projectId);
    console.log('🔄 Selected thread:', selectedThread);

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Channel for new messages
    const messagesChannel = supabase
      .channel(`realtime-messages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('🚨 📨 REALTIME EVENT TRIGGERED! 🚨', payload);
          console.log('🚨 📨 FULL PAYLOAD:', JSON.stringify(payload, null, 2));
          console.log('📨 REALTIME: Message data:', payload.new);
          console.log('📨 REALTIME: Current selectedThread:', selectedThreadRef.current);
          console.log('📨 REALTIME: Message thread_id:', payload.new.thread_id);
          console.log('🚨 📨 THREADS MATCH?', payload.new.thread_id === selectedThreadRef.current);
          
          // If message belongs to current thread, add it immediately
          if (payload.new.thread_id === selectedThreadRef.current && setMessagesRef.current) {
            // Fetch complete message with relationships
            try {
              const { data: fullMessage, error } = await supabase
                .from('messages')
                .select(`
                  *,
                  message_attachments (*)
                `)
                .eq('id', payload.new.id)
                .single();

              if (!error && fullMessage) {
                console.log('✅ REALTIME: Got full message from DB', fullMessage);
                
                // Call the onNewMessage callback instead of directly setting state
                // This way we have a single source of truth for adding messages
                console.log('✅ REALTIME: Calling onNewMessage callback');
                onNewMessage(fullMessage);
              }
            } catch (error) {
              console.error('❌ REALTIME: Error fetching complete message:', error);
              // Fallback to callback
              onNewMessage(payload.new);
            }
          } else {
            // Not current thread, just call callback
            onNewMessage(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages channel:', status);
      });

    // Channel for message updates
    const messageUpdatesChannel = supabase
      .channel(`realtime-message-updates-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('📝 REALTIME: Message updated!', payload.new);
          onMessageUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('📝 Message updates channel:', status);
      });

    // Channel for new attachments
    const attachmentsChannel = supabase
      .channel(`realtime-attachments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments'
        },
        (payload) => {
          console.log('📎 REALTIME: New attachment!', payload.new);
          // Trigger thread update to refresh message with attachment
          onThreadUpdate();
        }
      )
      .subscribe((status) => {
        console.log('📎 Attachments channel:', status);
      });

    // Channel for thread changes
    const threadsChannel = supabase
      .channel(`realtime-threads-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('💬 REALTIME: Thread changed!', payload);
          onThreadUpdate();
        }
      )
      .subscribe((status) => {
        console.log('💬 Threads channel:', status);
      });

    // Store channels for cleanup
    channelsRef.current = [
      messagesChannel,
      messageUpdatesChannel,
      attachmentsChannel,
      threadsChannel
    ];

    return () => {
      console.log('🛑 REALTIME: Cleaning up channels');
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [projectId, onNewMessage, onMessageUpdate, onThreadUpdate]); // Removed selectedThread from deps to avoid recreating channels

  return {
    // Utility function to send a message and let realtime handle the updates
    sendMessageRealtime: async (threadId: string, content: string, attachments?: any[]) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const senderName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
          : user.email || 'Utilisateur';

        // Insert message - realtime will handle the UI update
        const { data: messageData, error } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            sender_id: user.id,
            sender_name: senderName,
            sender_email: user.email || '',
            content: content.trim()
          })
          .select()
          .single();

        if (error) throw error;

        // Handle attachments if any
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            await supabase
              .from('message_attachments')
              .insert({
                message_id: messageData.id,
                file_name: attachment.name,
                file_path: attachment.path,
                file_type: attachment.type,
                file_size: attachment.size,
                uploaded_by: user.id
              });
          }
        }

        // Update thread's last_message_at
        await supabase
          .from('message_threads')
          .update({ 
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', threadId);

        console.log('✅ REALTIME: Message sent, realtime will update UI');
        return messageData;
      } catch (error) {
        console.error('❌ REALTIME: Error sending message:', error);
        throw error;
      }
    }
  };
};