import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';
import type {
  Message,
  MessageThread,
  MessageRealtimeEvent,
  TypingIndicator
} from '../types';

interface UseRealtimeMessagesOptions {
  projectId: string;
  threadId?: string;
  onNewMessage?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
  onThreadUpdated?: (thread: MessageThread) => void;
  onUserTyping?: (typing: TypingIndicator) => void;
  onUserStoppedTyping?: (userId: string) => void;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (userId: string) => void;
}

export const useRealtimeMessages = ({
  projectId,
  threadId,
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted,
  onThreadUpdated,
  onUserTyping,
  onUserStoppedTyping,
  onParticipantJoined,
  onParticipantLeft
}: UseRealtimeMessagesOptions) => {
  const { user } = useAuth();
  const channelsRef = useRef<any[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs pour éviter les stale closures
  const callbacksRef = useRef({
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onThreadUpdated,
    onUserTyping,
    onUserStoppedTyping,
    onParticipantJoined,
    onParticipantLeft
  });

  // Mettre à jour les refs
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onMessageUpdated,
      onMessageDeleted,
      onThreadUpdated,
      onUserTyping,
      onUserStoppedTyping,
      onParticipantJoined,
      onParticipantLeft
    };
  });

  // Fonction pour émettre l'état de typing
  const emitTyping = useCallback((isTyping: boolean, targetThreadId?: string) => {
    const currentThreadId = targetThreadId || threadId;
    if (!currentThreadId || !user) return;

    console.log(`📝 [Realtime] ${isTyping ? 'Started' : 'Stopped'} typing in thread:`, currentThreadId);

    const typingChannel = supabase.channel(`typing_${currentThreadId}`);
    typingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        user_name: user.user_metadata?.first_name || user.email,
        thread_id: currentThreadId,
        is_typing: isTyping,
        timestamp: new Date().toISOString()
      }
    });
  }, [threadId, user]);

  // Fonction pour démarrer l'indication de typing
  const startTyping = useCallback((targetThreadId?: string) => {
    const currentThreadId = targetThreadId || threadId;
    if (!currentThreadId) return;

    // Émettre immédiatement
    emitTyping(true, currentThreadId);

    // Nettoyer le timeout existant
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop après 3 secondes
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false, currentThreadId);
    }, 3000);
  }, [emitTyping, threadId]);

  // Fonction pour arrêter l'indication de typing
  const stopTyping = useCallback((targetThreadId?: string) => {
    const currentThreadId = targetThreadId || threadId;
    if (!currentThreadId) return;

    emitTyping(false, currentThreadId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [emitTyping, threadId]);

  useEffect(() => {
    if (!projectId || !user) return;

    console.log('🚀 [Realtime] Setting up realtime for project:', projectId, 'thread:', threadId);

    const channels: any[] = [];

    // 1. Channel pour les messages (thread spécifique ou tous les threads du projet)
    const messagesChannelName = threadId ? `messages_${threadId}` : `project_messages_${projectId}`;
    const messagesChannel = supabase
      .channel(messagesChannelName)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: threadId ? `thread_id=eq.${threadId}` : undefined
        },
        async (payload) => {
          console.log('📨 [Realtime] New message:', payload);

          // Ne pas notifier nos propres messages
          if (payload.new.sender_id === user.id) return;

          // Enrichir le message avec les données du profil
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, email, avatar')
            .eq('id', payload.new.sender_id)
            .single();

          const enrichedMessage: Message = {
            id: payload.new.id,
            thread_id: payload.new.thread_id,
            sender_id: payload.new.sender_id,
            sender_name: profile?.first_name || 'Utilisateur',
            sender_email: profile?.email || '',
            sender_avatar: profile?.avatar,
            content: payload.new.content,
            created_at: payload.new.created_at,
            updated_at: payload.new.updated_at,
            parent_message_id: payload.new.parent_message_id,
            is_edited: payload.new.is_edited || false,
            message_attachments: [],
            message_type: payload.new.message_type || 'text',
            mentions: payload.new.mentions || [],
            reactions: [],
            is_deleted: payload.new.is_deleted || false,
            metadata: payload.new.metadata
          };

          callbacksRef.current.onNewMessage?.(enrichedMessage);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: threadId ? `thread_id=eq.${threadId}` : undefined
        },
        async (payload) => {
          console.log('✏️ [Realtime] Message updated:', payload);

          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, email, avatar')
            .eq('id', payload.new.sender_id)
            .single();

          const updatedMessage: Message = {
            id: payload.new.id,
            thread_id: payload.new.thread_id,
            sender_id: payload.new.sender_id,
            sender_name: profile?.first_name || 'Utilisateur',
            sender_email: profile?.email || '',
            sender_avatar: profile?.avatar,
            content: payload.new.content,
            created_at: payload.new.created_at,
            updated_at: payload.new.updated_at,
            parent_message_id: payload.new.parent_message_id,
            is_edited: payload.new.is_edited || false,
            message_attachments: [],
            message_type: payload.new.message_type || 'text',
            mentions: payload.new.mentions || [],
            reactions: [],
            is_deleted: payload.new.is_deleted || false,
            metadata: payload.new.metadata
          };

          if (payload.new.is_deleted) {
            callbacksRef.current.onMessageDeleted?.(payload.new.id);
          } else {
            callbacksRef.current.onMessageUpdated?.(updatedMessage);
          }
        }
      );

    channels.push(messagesChannel);

    // 2. Channel pour les threads du projet
    const threadsChannel = supabase
      .channel(`project_threads_${projectId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('🧵 [Realtime] Thread change:', payload);
          callbacksRef.current.onThreadUpdated?.(payload.new as MessageThread);
        }
      );

    channels.push(threadsChannel);

    // 3. Channel pour les participants
    const participantsChannel = supabase
      .channel(`project_participants_${projectId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_participants'
        },
        async (payload) => {
          console.log('👥 [Realtime] Participant joined:', payload);

          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, email, avatar')
            .eq('id', payload.new.user_id)
            .single();

          callbacksRef.current.onParticipantJoined?.({
            ...payload.new,
            user_name: profile?.first_name || 'Utilisateur',
            user_email: profile?.email || '',
            user_avatar: profile?.avatar
          });
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_participants'
        },
        (payload) => {
          console.log('👋 [Realtime] Participant left:', payload);
          callbacksRef.current.onParticipantLeft?.(payload.old.user_id);
        }
      );

    channels.push(participantsChannel);

    // 4. Channel pour les indications de typing (si thread spécifique)
    if (threadId) {
      const typingChannel = supabase
        .channel(`typing_${threadId}`)
        .on('broadcast', { event: 'typing' }, (payload) => {
          console.log('⌨️ [Realtime] Typing event:', payload);

          // Ignorer nos propres événements
          if (payload.payload.user_id === user.id) return;

          const typingData: TypingIndicator = {
            thread_id: payload.payload.thread_id,
            user_id: payload.payload.user_id,
            user_name: payload.payload.user_name,
            is_typing: payload.payload.is_typing,
            timestamp: payload.payload.timestamp
          };

          if (typingData.is_typing) {
            callbacksRef.current.onUserTyping?.(typingData);
          } else {
            callbacksRef.current.onUserStoppedTyping?.(typingData.user_id);
          }
        });

      channels.push(typingChannel);
    }

    // Subscribe à tous les channels
    channels.forEach(channel => {
      channel.subscribe((status: string) => {
        console.log(`📡 [Realtime] Channel ${channel.topic} status:`, status);
      });
    });

    channelsRef.current = channels;

    // Cleanup
    return () => {
      console.log('🧹 [Realtime] Cleaning up channels');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [projectId, threadId, user?.id]);

  return {
    startTyping,
    stopTyping,
    emitTyping
  };
};