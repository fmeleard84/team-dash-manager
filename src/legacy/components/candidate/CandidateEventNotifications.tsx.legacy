import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Video, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface EventNotification {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  video_url?: string;
  status: string;
  created_at: string;
}

export default function CandidateEventNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadEventNotifications = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('candidate_event_notifications')
        .select('*')
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading event notifications:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les notifications d'événements.",
          variant: "destructive"
        });
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventNotifications();
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('candidate_event_notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'read' }
            : notif
        )
      );
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const openVideoCall = (videoUrl: string) => {
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Chargement des notifications d'événements...</p>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Notifications d'événements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Aucune notification d'événement pour le moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Notifications d'événements
          {notifications.filter(n => n.status === 'unread').length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {notifications.filter(n => n.status === 'unread').length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.map((notification) => {
          const eventDateTime = formatEventDate(notification.event_date);
          const isUnread = notification.status === 'unread';

          return (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 space-y-3 ${
                isUnread ? 'bg-primary/5 border-primary/20' : 'bg-background'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${isUnread ? 'font-semibold' : ''}`}>
                      {notification.title}
                    </h4>
                    {isUnread && (
                      <Badge variant="secondary" className="text-xs">
                        Nouveau
                      </Badge>
                    )}
                  </div>
                  
                  {notification.description && (
                    <p className="text-sm text-muted-foreground">
                      {notification.description}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => markAsRead(notification.id)}
                  className="shrink-0"
                  disabled={!isUnread}
                >
                  {isUnread ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{eventDateTime.date}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{eventDateTime.time}</span>
                </div>

                {notification.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{notification.location}</span>
                  </div>
                )}
              </div>

              {notification.video_url && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openVideoCall(notification.video_url!)}
                    className="w-full"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Rejoindre la réunion
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Reçue le {new Date(notification.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}