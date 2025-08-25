import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface BookingNotification {
  id: string;
  project_id: string;
  project_title?: string;
  notification_type: 'mission_request' | 'mission_accepted' | 'mission_declined' | 'mission_expired' | 'team_incomplete' | 'team_complete' | 'project_ready' | 'resource_search' | 'booking_reminder';
  title: string;
  message: string;
  data: Record<string, any>;
  status: 'unread' | 'read' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  expires_at?: string;
}

export const useBookingNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      // Récupérer les notifications via la fonction SQL
      const { data, error } = await supabase.rpc('get_booking_notifications', {
        user_email_param: user.email,
        limit_param: 50,
        offset_param: 0
      });

      if (error) throw error;

      setNotifications(data || []);
      
      // Compter les non lues
      const unread = (data || []).filter((n: BookingNotification) => n.status === 'unread').length;
      setUnreadCount(unread);

    } catch (error: any) {
      console.error('Error fetching booking notifications:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les notifications de booking."
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('booking_notifications')
        .update({ 
          status: 'read',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('recipient_email', user?.email);

      if (error) throw error;

      // Mettre à jour l'état local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, status: 'read' as const } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de marquer la notification comme lue."
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('booking_notifications')
        .update({ 
          status: 'read',
          updated_at: new Date().toISOString()
        })
        .eq('recipient_email', user?.email)
        .eq('status', 'unread');

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, status: 'read' as const }))
      );
      setUnreadCount(0);

      toast({
        title: "Notifications marquées",
        description: "Toutes les notifications ont été marquées comme lues."
      });

    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de marquer toutes les notifications comme lues."
      });
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('booking_notifications')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('recipient_email', user?.email);

      if (error) throw error;

      // Retirer de l'état local
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Décrémenter le compteur si c'était non lu
      const notification = notifications.find(n => n.id === notificationId);
      if (notification?.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      toast({
        title: "Notification archivée",
        description: "La notification a été archivée."
      });

    } catch (error: any) {
      console.error('Error archiving notification:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'archiver la notification."
      });
    }
  };

  // Actions spécifiques selon le type de notification
  const handleNotificationAction = async (notification: BookingNotification, action: string) => {
    switch (notification.notification_type) {
      case 'mission_request':
        if (action === 'accept') {
          // Rediriger vers l'interface d'acceptation de mission
          window.location.href = '/candidate-dashboard#missions';
        } else if (action === 'decline') {
          // Marquer comme archivée
          await archiveNotification(notification.id);
        }
        break;

      case 'project_ready':
        if (action === 'start_project') {
          // Rediriger vers le projet pour le démarrer
          window.location.href = `/project/${notification.project_id}`;
        }
        break;

      case 'team_complete':
      case 'team_incomplete':
        if (action === 'view_project') {
          window.location.href = `/project/${notification.project_id}`;
        }
        break;

      default:
        // Action générique : marquer comme lu
        await markAsRead(notification.id);
    }
  };

  // Subscription temps réel aux nouvelles notifications
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel('booking-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_notifications',
          filter: `recipient_email=eq.${user.email}`
        },
        (payload) => {
          console.log('Booking notification change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as BookingNotification;
            
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Afficher une notification toast pour les notifications importantes
            if (newNotification.priority === 'urgent' || newNotification.priority === 'high') {
              toast({
                title: newNotification.title,
                description: newNotification.message,
                duration: 5000,
                action: newNotification.notification_type === 'mission_request' ? (
                  <button
                    onClick={() => handleNotificationAction(newNotification, 'accept')}
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    Voir
                  </button>
                ) : undefined,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as BookingNotification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => 
              prev.filter(n => n.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, toast]);

  // Chargement initial
  useEffect(() => {
    fetchNotifications();
  }, [user?.email]);

  // Nettoyer les notifications expirées périodiquement
  useEffect(() => {
    const cleanupExpired = () => {
      const now = new Date();
      setNotifications(prev => 
        prev.filter(n => !n.expires_at || new Date(n.expires_at) > now)
      );
    };

    const interval = setInterval(cleanupExpired, 60000); // Chaque minute
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    handleNotificationAction,
    refreshNotifications: fetchNotifications
  };
};