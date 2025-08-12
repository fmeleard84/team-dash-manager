import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { 
  FolderOpen, 
  Receipt, 
  Settings, 
  LogOut,
  Kanban,
  CalendarClock,
  Cloud
} from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import PlanningView from "@/components/client/PlanningView";
import DriveView from "@/components/client/DriveView";

const ClientDashboard = () => {
  const [activeSection, setActiveSection] = useState('projects');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'projects', label: 'Mes projets', icon: FolderOpen },
    { id: 'planning', label: 'Planning', icon: CalendarClock },
    { id: 'drive', label: 'Drive', icon: Cloud },
    { id: 'kanban', label: 'Tableau Kanban', icon: Kanban },
    { id: 'invoices', label: 'Mes factures', icon: Receipt },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'projects':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes projets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Refonte site web</CardTitle>
                  <Badge variant="default">En cours</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Modernisation complète du site corporate avec nouvelle identité visuelle
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Budget</span>
                      <span className="font-semibold">15 000€</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Candidat</span>
                      <span>Jean Martin</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application mobile</CardTitle>
                  <Badge variant="secondary">En attente</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Développement d'une app iOS/Android pour la gestion client
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Budget</span>
                      <span className="font-semibold">25 000€</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Candidat</span>
                      <span className="text-muted-foreground">À assigner</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6">
              <Button>
                Créer un nouveau projet
              </Button>
            </div>
          </div>
        );
        
      case 'invoices':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes factures</h2>
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Facture #2024-INV-001</CardTitle>
                  <Badge variant="default">Payée</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Projet:</span>
                      <span>Refonte site web</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Montant:</span>
                      <span className="font-semibold">7 500€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Date:</span>
                      <span className="text-sm">15/01/2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Facture #2024-INV-002</CardTitle>
                  <Badge variant="outline">En attente</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Projet:</span>
                      <span>Application mobile</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Montant:</span>
                      <span className="font-semibold">12 500€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Date:</span>
                      <span className="text-sm">01/02/2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'kanban':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Tableau Kanban</h2>
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gestion de projet Kanban</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Organisez vos tâches et suivez l'avancement de vos projets avec notre tableau Kanban interactif.
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>✓ Drag & drop intuitif</span>
                      <span>✓ Colonnes personnalisables</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>✓ Gestion d'équipe</span>
                      <span>✓ Commentaires et fichiers</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>✓ Priorités et labels</span>
                      <span>✓ Suivi des échéances</span>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/kanban')} className="w-full">
                    Ouvrir le tableau Kanban
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Boards récents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Projet de développement web</span>
                      <Badge variant="secondary">3 colonnes • 8 cartes</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Sprint Planning Q1</span>
                      <Badge variant="secondary">4 colonnes • 12 cartes</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        
      case 'settings':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Paramètres</h2>
            <Card>
              <CardHeader>
                <CardTitle>Informations de l'entreprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nom complet</label>
                  <p className="text-muted-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                {user?.companyName && (
                  <div>
                    <label className="text-sm font-medium">Entreprise</label>
                    <p className="text-muted-foreground">{user.companyName}</p>
                  </div>
                )}
                {user?.phone && (
                  <div>
                    <label className="text-sm font-medium">Téléphone</label>
                    <p className="text-muted-foreground">{user.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="w-64">
          <SidebarContent>
            <div className="p-4">
              <h3 className="font-semibold text-lg">Espace Client</h3>
              <p className="text-sm text-muted-foreground">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        className={activeSection === item.id ? 'bg-muted' : ''}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4 space-y-2">
              <SidebarMenuButton
                onClick={() => setActiveSection('settings')}
                className={activeSection === 'settings' ? 'bg-muted' : ''}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Paramètres</span>
              </SidebarMenuButton>
              
              <SidebarMenuButton onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1">
          <header className="h-16 border-b flex items-center justify-between px-6">
            <div className="flex items-center">
              <SidebarTrigger />
              <div className="ml-4">
                <h1 className="text-xl font-semibold">Tableau de bord client</h1>
                <p className="text-sm text-muted-foreground">
                  Bienvenue {user?.firstName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline">Client</Badge>
            </div>
          </header>
          
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ClientDashboard;