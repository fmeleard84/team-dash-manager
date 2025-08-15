import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  BellDot, 
  Check, 
  X, 
  Archive,
  Settings,
  MessageSquare,
  FolderOpen,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  Calendar,
  Video,
  MapPin,
  ExternalLink
} from "lucide-react";
import { Notification, NotificationType } from "@/types/notifications";
import { useNotifications } from "@/hooks/useNotifications";
import { useKanbanNotifications } from "@/hooks/useKanbanNotifications";
import { generateGoogleCalendarUrl } from "@/utils/googleCalendar";


const NotificationIcon = ({ type }: { type: NotificationType }) => {
  const iconProps = { className: "w-4 h-4" };
  
  switch (type) {
    case 'new_project':
    case 'project_assigned':
      return <FolderOpen {...iconProps} />;
    case 'message_received':
      return <MessageSquare {...iconProps} />;
    case 'project_deadline':
    case 'system_alert':
      return <AlertTriangle {...iconProps} />;
    case 'payment_received':
      return <DollarSign {...iconProps} />;
    case 'profile_updated':
      return <User {...iconProps} />;
    case 'event_invitation':
      return <Calendar {...iconProps} />;
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

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
  if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
  return `Il y a ${Math.floor(diffInMinutes / 1440)} jour${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''}`;
};

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllAsRead, archiveNotification, acceptEvent, declineEvent } = useNotifications();
  const {
    notifications: kanbanNotifications,
    loading: kanbanLoading,
    markAsRead: markKanbanAsRead,
    markAllAsRead: markAllKanbanAsRead,
    archiveNotification: archiveKanbanNotification
  } = useKanbanNotifications();
  const [activeTab, setActiveTab] = useState('all');
  
  // Combine all notifications
  const allNotifications = [...notifications, ...kanbanNotifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const unreadCount = allNotifications.filter(n => n.status === 'unread').length;
  
  const filteredNotifications = allNotifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return notification.status === 'unread';
      case 'projects':
        return ['new_project', 'project_assigned', 'project_status_change', 'project_deadline'].includes(notification.type);
      case 'messages':
        return notification.type === 'message_received';
      case 'events':
        return notification.type === 'event_invitation';
      case 'kanban':
        return notification.type?.startsWith('kanban_');
      default:
        return true;
    }
  });


  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <BellDot className="w-5 h-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      markAllAsRead();
                      markAllKanbanAsRead();
                    }}
                    className="text-xs"
                  >
                    Tout marquer lu
                  </Button>
                )}
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 rounded-none border-b">
                <TabsTrigger value="all" className="text-xs">
                  Toutes ({allNotifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">
                  Non lues ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="events" className="text-xs">
                  Événements
                </TabsTrigger>
                <TabsTrigger value="kanban" className="text-xs">
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-xs">
                  Messages
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                <ScrollArea className="h-80">
                  <div className="space-y-1">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Aucune notification dans cette catégorie
                      </div>
                    ) : (
                      filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 hover:bg-accent/50 cursor-pointer border-l-4 ${
                            notification.status === 'unread' 
                              ? 'bg-accent/20 border-l-primary' 
                              : 'border-l-transparent'
                          }`}
                          onClick={() => {
                            if (notification.status === 'unread') {
                              if (notification.type?.startsWith('kanban_')) {
                                markKanbanAsRead(notification.id);
                              } else {
                                markAsRead(notification.id);
                              }
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(notification.priority)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <NotificationIcon type={notification.type} />
                                <h4 className={`text-sm font-medium truncate ${
                                  notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {notification.title}
                                </h4>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              
                              {/* Event specific metadata */}
                              {notification.type === 'event_invitation' && notification.metadata && (
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {notification.metadata.eventDate && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(notification.metadata.eventDate).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  )}
                                  {notification.metadata.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {notification.metadata.location}
                                    </div>
                                  )}
                                  {notification.metadata.videoUrl && (
                                    <div className="flex items-center gap-1">
                                      <Video className="w-3 h-3" />
                                      Visio
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {notification.status === 'unread' && notification.metadata?.eventStatus === 'pending' && (
                                <div className="flex items-center gap-1 mt-2">
                                  {notification.type === 'event_invitation' ? (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          acceptEvent(notification.id);
                                        }}
                                        className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                                      >
                                        <Check className="w-3 h-3 mr-1" />
                                        Accepter
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          declineEvent(notification.id);
                                        }}
                                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                      >
                                        <X className="w-3 h-3 mr-1" />
                                        Refuser
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                       <Button 
                                         variant="ghost" 
                                         size="sm"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           if (notification.type?.startsWith('kanban_')) {
                                             markKanbanAsRead(notification.id);
                                           } else {
                                             markAsRead(notification.id);
                                           }
                                         }}
                                         className="h-6 px-2 text-xs"
                                       >
                                         <Check className="w-3 h-3 mr-1" />
                                         Marquer lu
                                       </Button>
                                       <Button 
                                         variant="ghost" 
                                         size="sm"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           if (notification.type?.startsWith('kanban_')) {
                                             archiveKanbanNotification(notification.id);
                                           } else {
                                             archiveNotification(notification.id);
                                           }
                                         }}
                                         className="h-6 px-2 text-xs"
                                       >
                                         <Archive className="w-3 h-3 mr-1" />
                                         Archiver
                                       </Button>
                                    </>
                                  )}
                                </div>
                              )}
                              
                               {notification.type === 'event_invitation' && notification.metadata?.eventDate && (
                                 <div className="flex items-center gap-1 mt-2">
                                   <Button 
                                     variant="ghost" 
                                     size="sm"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       const eventData = {
                                         title: notification.title,
                                         description: notification.message,
                                         start_at: notification.metadata.eventDate,
                                         end_at: null,
                                         location: notification.metadata.location,
                                         video_url: notification.metadata.videoUrl
                                       };
                                       window.open(generateGoogleCalendarUrl(eventData), '_blank');
                                     }}
                                     className="h-6 px-2 text-xs"
                                   >
                                     <ExternalLink className="w-3 h-3 mr-1" />
                                     Google Calendar
                                   </Button>
                                 </div>
                               )}

                               {/* Kanban specific actions */}
                               {notification.type?.startsWith('kanban_') && notification.metadata?.projectId && (
                                 <div className="flex items-center gap-1 mt-2">
                                   <Button 
                                     variant="ghost" 
                                     size="sm"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       window.open(`/kanban?project_id=${notification.metadata.projectId}`, '_blank');
                                     }}
                                     className="h-6 px-2 text-xs"
                                   >
                                     <ExternalLink className="w-3 h-3 mr-1" />
                                     Voir Kanban
                                   </Button>
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <Separator />
          
          <div className="p-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/notifications')}
            >
              Voir toutes les notifications
            </Button>
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
};