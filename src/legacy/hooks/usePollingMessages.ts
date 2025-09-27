import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePollingMessagesOptions {
  projectId: string;
  selectedThread: string | null;
  onNewMessage: (message: any) => void;
  setMessages?: (updater: (prev: any[]) => any[]) => void;
  enabled?: boolean;
  interval?: number; // milliseconds
}

export const usePollingMessages = ({
  projectId,
  selectedThread,
  onNewMessage,
  setMessages,
  enabled = true,
  interval = 2000 // Poll every 2 seconds
}: UsePollingMessagesOptions) => {
  const lastMessageIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !projectId || !selectedThread || !setMessages) {
      return;
    }

    console.log('🔄 POLLING: Starting message polling for thread:', selectedThread);

    const pollMessages = async () => {
      try {
        // Fetch latest messages
        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            *,
            message_attachments (*)
          `)
          .eq('thread_id', selectedThread)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('❌ POLLING: Error fetching messages:', error);
          return;
        }

        if (!messages || messages.length === 0) return;

        // Check for new messages
        const latestMessage = messages[0];
        if (lastMessageIdRef.current && latestMessage.id !== lastMessageIdRef.current) {
          console.log('📨 POLLING: New message detected!', latestMessage);
          
          // Add new messages to state
          setMessages(prev => {
            const newMessages = messages.filter(
              msg => !prev.some(existingMsg => existingMsg.id === msg.id)
            );
            
            if (newMessages.length > 0) {
              console.log('📨 POLLING: Adding', newMessages.length, 'new messages');
              newMessages.forEach(msg => onNewMessage(msg));
              return [...prev, ...newMessages].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }
            
            return prev;
          });
        }

        lastMessageIdRef.current = latestMessage.id;
      } catch (error) {
        console.error('❌ POLLING: Error in poll cycle:', error);
      }
    };

    // Initial poll
    pollMessages();

    // Set up interval
    intervalRef.current = setInterval(pollMessages, interval);

    return () => {
      console.log('🛑 POLLING: Stopping message polling');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, projectId, selectedThread, setMessages, onNewMessage, interval]);

  return {
    isPolling: enabled
  };
};