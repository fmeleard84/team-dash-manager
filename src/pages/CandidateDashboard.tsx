import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  MessageSquare, 
  Calendar, 
  FileText, 
  Receipt, 
  Settings, 
  LogOut 
} from "lucide-react";

const CandidateDashboard = () => {
  const [activeSection, setActiveSection] = useState('projects');

  const menuItems = [
    { id: 'projects', label: 'Mes projets', icon: FolderOpen },
    { id: 'messages', label: 'Mes messages', icon: MessageSquare },
    { id: 'appointments', label: 'Mes rendez-vous', icon: Calendar },
    { id: 'deliverables', label: 'Mes livrables', icon: FileText },
    { id: 'invoices', label: 'Mes factures', icon: Receipt },
  ];

  const handleLogout = () => {
    // Clear any stored auth data and redirect
    localStorage.removeItem('candidate-auth');
    window.location.href = '/team';
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'projects':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes projets</h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Aucun projet en cours</p>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'messages':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes messages</h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Intégration Zulip à venir</p>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'appointments':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes rendez-vous</h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Intégration Cal.com à venir</p>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'deliverables':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes livrables</h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Intégration Seafile à venir</p>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'invoices':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes factures</h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Module de facturation à développer</p>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Paramètres</h2>
            <Card>
              <CardHeader>
                <CardTitle>Profil candidat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Tarification</h4>
                  <p className="text-sm text-muted-foreground">Modifiez votre tarif journalier</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Modifier le tarif
                  </Button>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Compétences</h4>
                  <p className="text-sm text-muted-foreground">Gérez vos compétences et expertises</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Modifier les compétences
                  </Button>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Langues</h4>
                  <p className="text-sm text-muted-foreground">Modifiez vos langues parlées</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Modifier les langues
                  </Button>
                </div>
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
              <h3 className="font-semibold text-lg">Espace Candidat</h3>
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
              
              <SidebarMenuButton onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1">
          <header className="h-16 border-b flex items-center px-6">
            <SidebarTrigger />
            <div className="ml-4">
              <h1 className="text-xl font-semibold">Tableau de bord candidat</h1>
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

export default CandidateDashboard;