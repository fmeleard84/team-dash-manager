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
  User
} from "lucide-react";
import { Notification, NotificationType } from "@/types/notifications";

// Mock data pour la démo
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "new_project",
    priority: "high",
    status: "unread",
    title: "Nouveau projet assigné",
    message: "Vous avez été assigné au projet 'Refonte site e-commerce'",
    metadata: { projectId: "proj-123", actionUrl: "/project/proj-123" },
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    type: "message_received",
    priority: "medium",
    status: "unread",
    title: "Nouveau message",
    message: "Marie Dupont: 'Pouvez-vous me confirmer les délais ?'",
    metadata: { userId: "user-456", actionUrl: "/messages/thread-789" },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    type: "project_deadline",
    priority: "urgent",
    status: "unread",
    title: "Échéance proche",
    message: "Le projet 'App mobile' doit être livré dans 2 jours",
    metadata: { projectId: "proj-789", actionUrl: "/project/proj-789" },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    type: "payment_received",
    priority: "low",
    status: "read",
    title: "Paiement reçu",
    message: "Vous avez reçu un paiement de 1500€ pour le projet 'Site vitrine'",
    metadata: { projectId: "proj-456" },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    readAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    type: "project_status_change",
    priority: "medium",
    status: "read",
    title: "Statut projet modifié",
    message: "Le projet 'Dashboard Analytics' est maintenant en cours",
    metadata: { projectId: "proj-101" },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    readAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  }
];

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
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activeTab, setActiveTab] = useState('all');
  
  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  
  const filteredNotifications = notifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return notification.status === 'unread';
      case 'projects':
        return ['new_project', 'project_assigned', 'project_status_change', 'project_deadline'].includes(notification.type);
      case 'messages':
        return notification.type === 'message_received';
      default:
        return true;
    }
  });

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ 
      ...n, 
      status: 'read' as const, 
      readAt: new Date().toISOString() 
    })));
  };

  const archiveNotification = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'archived' as const } : n
    ));
  };

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
                    onClick={markAllAsRead}
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
              <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
                <TabsTrigger value="all" className="text-xs">
                  Toutes ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">
                  Non lues ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="projects" className="text-xs">
                  Projets
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
                          onClick={() => notification.status === 'unread' && markAsRead(notification.id)}
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
                              
                              {notification.status === 'unread' && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
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
                                      archiveNotification(notification.id);
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Archive className="w-3 h-3 mr-1" />
                                    Archiver
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