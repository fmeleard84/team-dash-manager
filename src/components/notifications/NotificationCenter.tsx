import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell,
  MessageSquare,
  Star,
  FileText,
  Briefcase,
  Users,
  AlertTriangle,
  Play,
  Archive,
  Eye,
  ExternalLink,
  Calendar,
  MapPin,
  Video
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/types/notifications';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const getNotificationIcon = (type: string) => {
  const iconProps = { className: "w-4 h-4" };
  
  switch (type) {
    case 'task_rating':
      return <Star {...iconProps} className="text-yellow-500" />;
    case 'new_message':
      return <MessageSquare {...iconProps} className="text-blue-500" />;
    case 'card_assigned':
      return <FileText {...iconProps} className="text-purple-500" />;
    case 'new_project':
    case 'project_started':
      return <Briefcase {...iconProps} className="text-green-500" />;
    case 'event_invitation':
      return <Calendar {...iconProps} className="text-orange-500" />;
    case 'team_complete':
    case 'team_incomplete':
      return <Users {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'task_rating':
      return 'Note reçue';
    case 'new_message':
      return 'Nouveau message';
    case 'card_assigned':
      return 'Tâche assignée';
    case 'new_project':
      return 'Nouveau projet';
    case 'project_started':
      return 'Projet démarré';
    case 'event_invitation':
      return 'Invitation événement';
    case 'mission_request':
      return 'Demande de mission';
    case 'mission_accepted':
      return 'Mission acceptée';
    case 'mission_declined':
      return 'Mission refusée';
    case 'team_complete':
      return 'Équipe complète';
    case 'team_incomplete':
      return 'Équipe incomplète';
    default:
      return 'Notification';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
  if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
  return `Il y a ${Math.floor(diffInMinutes / 1440)} jour${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''}`;
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
  onAcceptEvent?: (id: string) => void;
  onDeclineEvent?: (id: string) => void;
}

const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onArchive,
  onAcceptEvent,
  onDeclineEvent
}: NotificationItemProps) => {
  const metadata = notification.metadata || {};

  return (
    <Card className={`${notification.status === 'unread' ? 'border-l-4 border-l-primary bg-accent/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(notification.priority)}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getNotificationIcon(notification.type)}
              <h4 className={`text-sm font-medium truncate ${
                notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {notification.title}
              </h4>
              <Badge variant="outline" className="text-xs">
                {getTypeLabel(notification.type)}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {formatTimeAgo(notification.createdAt)}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {notification.message}
            </p>

            {/* Metadata spécifique selon le type */}
            {metadata && (
              <div className="text-xs text-muted-foreground mb-3 space-y-1">
                {metadata.project_name && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span className="font-medium">Projet:</span>
                    {metadata.project_name}
                  </div>
                )}
                
                {metadata.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span className="font-medium">Note:</span>
                    {metadata.rating}/5 étoiles
                  </div>
                )}

                {metadata.sender_name && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span className="font-medium">De:</span>
                    {metadata.sender_name}
                  </div>
                )}

                {metadata.card_title && (
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span className="font-medium">Tâche:</span>
                    {metadata.card_title}
                  </div>
                )}

                {notification.type === 'event_invitation' && (
                  <>
                    {metadata.eventDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="font-medium">Date:</span>
                        {format(new Date(metadata.eventDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </div>
                    )}
                    {metadata.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="font-medium">Lieu:</span>
                        {metadata.location}
                      </div>
                    )}
                    {metadata.videoUrl && (
                      <div className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        <span className="font-medium">Visio disponible</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Actions selon le type de notification */}
            <div className="flex items-center gap-2">
              {notification.type === 'event_invitation' && notification.status === 'unread' && onAcceptEvent && onDeclineEvent && (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => onAcceptEvent(notification.id)}
                    className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                  >
                    Accepter
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDeclineEvent(notification.id)}
                    className="h-6 px-2 text-xs"
                  >
                    Décliner
                  </Button>
                </>
              )}

              {notification.status === 'unread' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-6 px-2 text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Marquer lu
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onArchive(notification.id)}
                className="h-6 px-2 text-xs text-muted-foreground"
              >
                <Archive className="w-3 h-3 mr-1" />
                Archiver
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const NotificationCenter = () => {
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    archiveNotification,
    acceptEvent,
    declineEvent
  } = useNotifications();

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Centre de notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </h3>
        
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Tout marquer lu
          </Button>
        )}
      </div>

      <Separator />

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Aucune notification</p>
          <p className="text-xs mt-2">Les nouvelles notifications apparaîtront ici</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onArchive={archiveNotification}
                onAcceptEvent={acceptEvent}
                onDeclineEvent={declineEvent}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};