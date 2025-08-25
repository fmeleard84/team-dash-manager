import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell,
  MessageSquare,
  Star,
  FileText,
  Briefcase,
  CheckCircle,
  Eye,
  Archive,
  Calendar,
  MapPin,
  Video
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/types/notifications';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const getNotificationIcon = (type: string) => {
  const iconProps = { className: "w-3 h-3" };
  
  switch (type) {
    case 'task_rating':
      return <Star {...iconProps} className="w-3 h-3 text-yellow-500" />;
    case 'new_message':
      return <MessageSquare {...iconProps} className="w-3 h-3 text-blue-500" />;
    case 'card_assigned':
      return <FileText {...iconProps} className="w-3 h-3 text-purple-500" />;
    case 'new_project':
    case 'project_started':
      return <Briefcase {...iconProps} className="w-3 h-3 text-green-500" />;
    case 'event_invitation':
      return <Calendar {...iconProps} className="w-3 h-3 text-orange-500" />;
    default:
      return <Bell {...iconProps} className="w-3 h-3" />;
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `${diffInMinutes}min`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  return `${Math.floor(diffInMinutes / 1440)}j`;
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
    <div className={`p-3 hover:bg-accent/50 transition-colors rounded-lg ${
      notification.status === 'unread' ? 'bg-accent/20 border-l-2 border-l-primary' : ''
    }`}>
      <div className="flex items-start gap-2">
        {getNotificationIcon(notification.type)}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={`text-sm font-medium truncate ${
                notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
              
              {/* Metadata compact */}
              {metadata && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {metadata.project_name && (
                    <span className="text-xs text-muted-foreground">
                      {metadata.project_name}
                    </span>
                  )}
                  {metadata.rating && (
                    <span className="text-xs text-yellow-600">
                      {metadata.rating}★
                    </span>
                  )}
                  {metadata.sender_name && (
                    <span className="text-xs text-muted-foreground">
                      de {metadata.sender_name}
                    </span>
                  )}
                </div>
              )}

              {/* Event specific info */}
              {notification.type === 'event_invitation' && metadata.eventDate && (
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(metadata.eventDate), 'dd MMM HH:mm', { locale: fr })}
                  </span>
                  {metadata.location && (
                    <>
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs text-muted-foreground">{metadata.location}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimeAgo(notification.createdAt)}
            </span>
          </div>

          {/* Actions compactes */}
          <div className="flex items-center gap-1 mt-2">
            {notification.type === 'event_invitation' && notification.status === 'unread' && onAcceptEvent && onDeclineEvent && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => onAcceptEvent(notification.id)}
                  className="h-6 px-2 text-xs"
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
                <Eye className="w-3 h-3" />
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onArchive(notification.id)}
              className="h-6 px-2 text-xs ml-auto"
            >
              <Archive className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationCenterWithTabs = () => {
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    archiveNotification,
    acceptEvent,
    declineEvent
  } = useNotifications();

  // Filtrer les notifications par catégorie
  const messageNotifications = notifications.filter(n => n.type === 'new_message');
  const projectNotifications = notifications.filter(n => 
    ['new_project', 'project_started', 'card_assigned', 'mission_request', 'mission_accepted', 'mission_declined', 'team_complete', 'team_incomplete', 'event_invitation'].includes(n.type)
  );
  const ratingNotifications = notifications.filter(n => n.type === 'task_rating');
  
  // Compter les non lus par catégorie
  const unreadMessages = messageNotifications.filter(n => n.status === 'unread').length;
  const unreadProjects = projectNotifications.filter(n => n.status === 'unread').length;
  const unreadRatings = ratingNotifications.filter(n => n.status === 'unread').length;
  const totalUnread = unreadMessages + unreadProjects + unreadRatings;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header compact */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notifications
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread}
            </Badge>
          )}
        </h3>
        
        {totalUnread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
            Tout marquer lu
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="all" className="text-xs">
            Tout {notifications.length > 0 && `(${notifications.length})`}
          </TabsTrigger>
          <TabsTrigger value="messages" className="text-xs relative">
            Messages
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="projects" className="text-xs relative">
            Projets
            {unreadProjects > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unreadProjects}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ratings" className="text-xs relative">
            Notes
            {unreadRatings > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unreadRatings}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Content for each tab */}
        <ScrollArea className="h-[350px]">
          <TabsContent value="all" className="mt-0 p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onArchive={archiveNotification}
                  onAcceptEvent={acceptEvent}
                  onDeclineEvent={declineEvent}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="messages" className="mt-0 p-2 space-y-1">
            {messageNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucun message</p>
              </div>
            ) : (
              messageNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onArchive={archiveNotification}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-0 p-2 space-y-1">
            {projectNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune notification de projet</p>
              </div>
            ) : (
              projectNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onArchive={archiveNotification}
                  onAcceptEvent={acceptEvent}
                  onDeclineEvent={declineEvent}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="ratings" className="mt-0 p-2 space-y-1">
            {ratingNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune note reçue</p>
              </div>
            ) : (
              ratingNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onArchive={archiveNotification}
                />
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};