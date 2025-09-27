import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Settings, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Notification } from "@/types/notifications";

// Mock data étendue
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "new_project",
    priority: "high",
    status: "unread",
    title: "Nouveau projet assigné",
    message: "Vous avez été assigné au projet 'Refonte site e-commerce'. Le client souhaite commencer dès que possible.",
    metadata: { projectId: "proj-123", actionUrl: "/project/proj-123" },
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    type: "message_received",
    priority: "medium",
    status: "unread",
    title: "Nouveau message de Marie Dupont",
    message: "Marie Dupont a envoyé: 'Pouvez-vous me confirmer les délais pour la phase de développement ?'",
    metadata: { userId: "user-456", actionUrl: "/messages/thread-789" },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    type: "project_deadline",
    priority: "urgent",
    status: "unread",
    title: "Échéance proche - App mobile",
    message: "Le projet 'Application mobile iOS/Android' doit être livré dans 2 jours. Assurez-vous que tous les livrables sont prêts.",
    metadata: { projectId: "proj-789", actionUrl: "/project/proj-789" },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    type: "payment_received",
    priority: "low",
    status: "read",
    title: "Paiement reçu - 1500€",
    message: "Vous avez reçu un paiement de 1500€ pour le projet 'Site vitrine restaurant'. Le montant a été crédité sur votre compte.",
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
    message: "Le projet 'Dashboard Analytics' est maintenant en cours. Le client a validé les maquettes et souhaite passer à la phase de développement.",
    metadata: { projectId: "proj-101" },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    readAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "6",
    type: "system_alert",
    priority: "medium",
    status: "unread",
    title: "Mise à jour du profil requise",
    message: "Veuillez mettre à jour votre profil avec vos dernières compétences et certifications pour améliorer votre visibilité.",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newProjects: true,
    messages: true,
    deadlines: true,
    payments: true,
  });

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    switch (activeFilter) {
      case 'unread':
        return matchesSearch && notification.status === 'unread';
      case 'urgent':
        return matchesSearch && notification.priority === 'urgent';
      case 'projects':
        return matchesSearch && ['new_project', 'project_assigned', 'project_status_change', 'project_deadline'].includes(notification.type);
      case 'messages':
        return matchesSearch && notification.type === 'message_received';
      default:
        return matchesSearch;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return 'Aujourd\'hui à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">
                {unreadCount} notification{unreadCount !== 1 ? 's' : ''} non lue{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                Tout marquer comme lu
              </Button>
            )}
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar avec filtres */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Rechercher..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  {[
                    { id: 'all', label: 'Toutes', count: notifications.length },
                    { id: 'unread', label: 'Non lues', count: unreadCount },
                    { id: 'urgent', label: 'Urgentes', count: notifications.filter(n => n.priority === 'urgent').length },
                    { id: 'projects', label: 'Projets', count: notifications.filter(n => ['new_project', 'project_assigned', 'project_status_change', 'project_deadline'].includes(n.type)).length },
                    { id: 'messages', label: 'Messages', count: notifications.filter(n => n.type === 'message_received').length },
                  ].map((filter) => (
                    <Button
                      key={filter.id}
                      variant={activeFilter === filter.id ? "default" : "ghost"}
                      className="w-full justify-between"
                      onClick={() => setActiveFilter(filter.id)}
                    >
                      <span>{filter.label}</span>
                      <Badge variant="secondary">{filter.count}</Badge>
                    </Button>
                  ))}
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-3">Préférences</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email</span>
                      <Switch 
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Push</span>
                      <Switch 
                        checked={preferences.pushNotifications}
                        onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, pushNotifications: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des notifications */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>Aucune notification trouvée</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                          notification.status === 'unread' ? 'bg-accent/20' : ''
                        }`}
                        onClick={() => notification.status === 'unread' && markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${getPriorityColor(notification.priority)}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className={`font-medium ${
                                notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.title}
                              </h3>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {notification.priority}
                                </Badge>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDate(notification.createdAt)}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {notification.message}
                            </p>
                            
                            {notification.metadata?.actionUrl && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(notification.metadata.actionUrl!);
                                }}
                              >
                                Voir le détail
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;