import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notifications';
import { useAuth } from '@/contexts/AuthContext';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadNotifications = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      
      // Get candidate profile first
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!candidateProfile) {
        setNotifications([]);
        return;
      }

      // Load event notifications
      const { data: eventNotifications, error: eventError } = await supabase
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
        .order('created_at', { ascending: false });

      if (eventError) {
        console.error('Error loading event notifications:', eventError);
        return;
      }

      // Convert to Notification format
      const formattedNotifications: Notification[] = (eventNotifications || []).map(event => ({
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

      setNotifications(formattedNotifications);
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
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!candidateProfile) return;

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
        .update({ status: 'archived' })
        .eq('id', notificationId);

      if (error) {
        console.error('Error archiving notification:', error);
        return;
      }

      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, status: 'archived' as const } 
          : n
      ));
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications-changes')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

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