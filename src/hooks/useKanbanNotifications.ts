import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notifications';

export const useKanbanNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Get current user's email from headers or JWT
      const { data: authData } = await supabase.auth.getUser();
      const userEmail = authData.user?.email;
      
      if (!userEmail) {
        console.log('No user email found');
        setNotifications([]);
        return;
      }

      // First get the candidate profile
      const { data: candidateProfile, error: profileError } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (profileError || !candidateProfile) {
        console.log('No candidate profile found for email:', userEmail);
        setNotifications([]);
        return;
      }

      // Get Kanban notifications
      const { data: kanbanNotifications, error: kanbanError } = await supabase
        .from('kanban_notifications')
        .select(`
          id,
          notification_type,
          title,
          description,
          status,
          metadata,
          created_at,
          project_id,
          kanban_board_id,
          card_id
        `)
        .eq('candidate_id', candidateProfile.id)
        .order('created_at', { ascending: false });

      if (kanbanError) {
        console.error('Error fetching Kanban notifications:', kanbanError);
        return;
      }

      // Transform to Notification format
      const transformedNotifications: Notification[] = (kanbanNotifications || []).map(notification => ({
        id: notification.id,
        type: notification.notification_type as any,
        priority: 'medium' as const,
        status: notification.status as any,
        title: notification.title,
        message: notification.description || '',
        metadata: {
          projectId: notification.project_id,
          kanbanBoardId: notification.kanban_board_id,
          cardId: notification.card_id,
          ...(notification.metadata as Record<string, any> || {})
        },
        createdAt: notification.created_at
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error loading Kanban notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription for Kanban notifications
    const subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'read' as const }
            : notif
        )
      );
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userEmail = authData.user?.email;
      
      if (!userEmail) return;

      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (!candidateProfile) return;

      const { error } = await supabase
        .from('kanban_notifications')
        .update({ status: 'read' })
        .eq('candidate_id', candidateProfile.id)
        .eq('status', 'unread');

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, status: 'read' as const }))
      );
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_notifications')
        .update({ status: 'archived' })
        .eq('id', notificationId);

      if (error) {
        console.error('Error archiving notification:', error);
        return;
      }

      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Error in archiveNotification:', error);
    }
  };

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    refetch: loadNotifications
  };
};