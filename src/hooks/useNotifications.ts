import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const lastNotificationRef = useRef<string | null>(null);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // First, try to load general notifications from the notifications table
      const { data: generalNotifications, error: generalError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (generalError) {
        // Log error but continue - table might not exist or have RLS issues
        console.warn('Could not load general notifications (this is normal if table does not exist):', generalError.message);
      }
      
      // Get candidate profile first - only for candidates, not clients
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', user.email || '')
        .maybeSingle();

      let eventNotifications = [];
      
      // Only load event notifications if we have a candidate profile
      if (candidateProfile) {
        const { data: eventData, error: eventError } = await supabase
          .from('candidate_event_notifications')
          .select(`
            id,
            title,
            description,
            event_date,
            location,
            video_url,
            status,
            created_at,
            updated_at,
            event_id,
            project_id
          `)
          .eq('candidate_id', candidateProfile.id)
          .neq('status', 'archived')  // Exclure les notifications archivées
          .order('created_at', { ascending: false });

        if (eventError) {
          console.error('Error loading event notifications:', eventError);
        } else {
          eventNotifications = eventData || [];
        }
      }

      // Convert event notifications to Notification format
      const formattedEventNotifications: Notification[] = (eventNotifications || []).map(event => ({
        id: event.id,
        type: 'event_invitation' as const,
        priority: new Date(event.event_date) < new Date(Date.now() + 24 * 60 * 60 * 1000) ? 'high' : 'medium',
        status: event.status === 'pending' ? 'unread' : 'read',
        title: event.title,
        message: event.description || 'Nouvel événement',
        metadata: {
          eventId: event.event_id,
          projectId: event.project_id,
          eventDate: event.event_date,
          location: event.location,
          videoUrl: event.video_url,
          eventStatus: event.status,
        },
        createdAt: event.created_at,
        readAt: event.status !== 'pending' ? event.updated_at : undefined,
      }));
      
      // Convert general notifications to Notification format
      const formattedGeneralNotifications: Notification[] = (generalNotifications || []).map(notif => ({
        id: notif.id,
        type: notif.type || 'system_alert',
        priority: notif.priority || 'medium',
        status: notif.read_at ? 'read' : 'unread',
        title: notif.title,
        message: notif.description || notif.message || '',
        metadata: notif.data || {},
        createdAt: notif.created_at,
        readAt: notif.read_at,
      }));

      // Combine all notifications
      const allNotifications = [
        ...formattedGeneralNotifications,
        ...formattedEventNotifications
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('candidate_event_notifications')
        .update({ status: 'read', updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } 
          : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const acceptEvent = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('candidate_event_notifications')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error accepting event:', error);
        return;
      }

      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } 
          : n
      ));
    } catch (error) {
      console.error('Error accepting event:', error);
    }
  };

  const declineEvent = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('candidate_event_notifications')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error declining event:', error);
        return;
      }

      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } 
          : n
      ));
    } catch (error) {
      console.error('Error declining event:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.email) return;

    try {
      // Get candidate profile
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (!candidateProfile) {
        // This is likely a client, not a candidate
        return;
      }

      const { error } = await supabase
        .from('candidate_event_notifications')
        .update({ status: 'read', updated_at: new Date().toISOString() })
        .eq('candidate_id', candidateProfile.id)
        .eq('status', 'unread');

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ 
        ...n, 
        status: 'read' as const, 
        readAt: new Date().toISOString() 
      })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('candidate_event_notifications')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error archiving notification:', error);
        return;
      }

      // Retirer la notification de la liste au lieu de juste changer son statut
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    loadNotifications();

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_event_notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: user ? `user_id=eq.${user.id}` : undefined
        },
        () => {
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_ratings'
        },
        async (payload) => {
          // Show notification for new ratings
          if (payload.new && payload.new.id !== lastNotificationRef.current) {
            lastNotificationRef.current = payload.new.id;
            toast.success('Nouvelle note reçue sur une tâche');
            loadNotifications();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: ['INSERT', 'UPDATE'],
          schema: 'public',
          table: 'kanban_cards'
        },
        async (payload) => {
          // Check if user is assigned to this card
          if (payload.new && payload.new.assigned_to) {
            const assignedUsers = Array.isArray(payload.new.assigned_to) 
              ? payload.new.assigned_to 
              : [payload.new.assigned_to];
            
            // Check if current user is in assigned users
            const isAssigned = assignedUsers.some((assignedUser: string) => 
              assignedUser && (assignedUser.includes(user?.email || '') || 
              assignedUser.includes(user?.user_metadata?.firstName) ||
              assignedUser.includes(user?.user_metadata?.lastName))
            );
            
            if (isAssigned && payload.eventType === 'INSERT') {
              toast.success('Nouvelle tâche vous a été assignée');
              loadNotifications();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Show notification for new messages
          if (payload.new && payload.new.sender_id !== user?.id) {
            toast.success('Nouveau message reçu');
            loadNotifications();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects'
        },
        async (payload) => {
          // Show notification when a new project is created
          if (payload.new) {
            const projectStatus = payload.new.status || 'Nouvelle demande';
            if (projectStatus === 'Nouvelle demande') {
              toast.success('Nouveau projet créé');
            }
            loadNotifications();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects'
        },
        async (payload) => {
          // Show notification when a project is started
          if (payload.new && payload.new.status === 'started' && payload.old?.status !== 'started') {
            toast.success('Un projet a été démarré');
            loadNotifications();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, user?.email]);

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    acceptEvent,
    declineEvent,
    refetch: loadNotifications
  };
};