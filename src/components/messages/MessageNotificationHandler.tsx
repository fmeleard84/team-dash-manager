import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/hooks/useMessages';

interface MessageNotificationHandlerProps {
  projectId: string;
}

interface MessageNotification {
  id: string;
  type: 'new_message' | 'file_shared' | 'video_call_started';
  title: string;
  message: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  threadId: string;
  projectId: string;
  metadata?: {
    messageId?: string;
    attachmentCount?: number;
    callRoomName?: string;
  };
  createdAt: string;
}

export const MessageNotificationHandler = ({ projectId }: MessageNotificationHandlerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !projectId) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages-notifications-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Don't notify for own messages
          if (newMessage.sender_email === user.email) return;

          // Get thread info
          const { data: thread } = await supabase
            .from('message_threads')
            .select('title, project_id')
            .eq('id', newMessage.thread_id)
            .single();

          if (!thread || thread.project_id !== projectId) return;

          // Determine notification type
          let notificationType: 'new_message' | 'file_shared' | 'video_call_started' = 'new_message';
          let notificationTitle = `Nouveau message de ${newMessage.sender_name}`;
          let notificationMessage = newMessage.content;

          if (newMessage.content.includes('📎')) {
            notificationType = 'file_shared';
            notificationTitle = `${newMessage.sender_name} a partagé des fichiers`;
            notificationMessage = 'Des fichiers ont été partagés dans la conversation';
          } else if (newMessage.content.includes('📹')) {
            notificationType = 'video_call_started';
            notificationTitle = `${newMessage.sender_name} a démarré un appel vidéo`;
            notificationMessage = 'Rejoignez l\'appel vidéo en cours';
          }

          // Show browser notification
          showBrowserNotification(notificationTitle, notificationMessage, newMessage.sender_name);

          // Show toast notification
          toast({
            title: notificationTitle,
            description: `${thread.title}: ${notificationMessage.substring(0, 100)}${notificationMessage.length > 100 ? '...' : ''}`,
            duration: 5000,
            action: (
              <button
                onClick={() => {
                  // Focus on the message thread
                  const messageEvent = new CustomEvent('focusMessageThread', {
                    detail: { threadId: newMessage.thread_id }
                  });
                  window.dispatchEvent(messageEvent);
                }}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                Voir
              </button>
            ),
          });

          // Create notification record for notification center
          await createNotificationRecord({
            id: `msg-${newMessage.id}`,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            sender: {
              id: newMessage.sender_id,
              name: newMessage.sender_name,
              email: newMessage.sender_email
            },
            threadId: newMessage.thread_id,
            projectId,
            metadata: {
              messageId: newMessage.id,
              attachmentCount: newMessage.attachments?.length || 0
            },
            createdAt: newMessage.created_at
          });
        }
      )
      .subscribe();

    // Subscribe to message attachments (for file notifications)
    const attachmentsChannel = supabase
      .channel(`message-attachments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments'
        },
        async (payload) => {
          const attachment = payload.new as any;
          
          // Get message info
          const { data: message } = await supabase
            .from('messages')
            .select('sender_email, sender_name, thread_id')
            .eq('id', attachment.message_id)
            .single();

          if (!message || message.sender_email === user.email) return;

          // Get thread info
          const { data: thread } = await supabase
            .from('message_threads')
            .select('title, project_id')
            .eq('id', message.thread_id)
            .single();

          if (!thread || thread.project_id !== projectId) return;

          const notificationTitle = `${message.sender_name} a partagé un fichier`;
          const notificationMessage = `📎 ${attachment.file_name}`;

          // Show toast notification
          toast({
            title: notificationTitle,
            description: `${thread.title}: ${notificationMessage}`,
            duration: 4000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(attachmentsChannel);
    };
  }, [user, projectId, toast]);

  const showBrowserNotification = (title: string, body: string, senderName: string) => {
    // Check if browser supports notifications
    if (!('Notification' in window)) return;

    // Check permission
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `message-${Date.now()}`,
        requireInteraction: false,
        silent: false,
        data: {
          sender: senderName,
          timestamp: new Date().toISOString()
        }
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else if (Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          showBrowserNotification(title, body, senderName);
        }
      });
    }
  };

  const createNotificationRecord = async (notification: MessageNotification) => {
    try {
      // Insert into candidate_notifications table for notification center
      await supabase
        .from('candidate_notifications')
        .insert({
          id: notification.id,
          candidate_email: user?.email,
          type: 'message_received',
          title: notification.title,
          message: notification.message,
          project_id: notification.projectId,
          status: 'unread',
          priority: notification.type === 'video_call_started' ? 'urgent' : 'medium',
          metadata: {
            ...notification.metadata,
            sender: notification.sender,
            threadId: notification.threadId
          }
        });
    } catch (error) {
      console.error('Error creating notification record:', error);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Could not play notification sound:', e));
    } catch (e) {
      console.log('Could not play notification sound:', e);
    }
  };

  // Listen for focus events to manage notifications
  useEffect(() => {
    let isWindowFocused = true;

    const handleFocus = () => {
      isWindowFocused = true;
    };

    const handleBlur = () => {
      isWindowFocused = false;
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return null; // This is an invisible component that handles notifications
};