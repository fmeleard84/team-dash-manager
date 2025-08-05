import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import CandidateProjects from "@/components/candidate/CandidateProjects";
import { CandidateSettings } from "@/components/candidate/CandidateSettings";
import { useCandidateAuth } from "@/hooks/useCandidateAuth";
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
  const { currentCandidateId, isLoading, error } = useCandidateAuth();

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
    if (isLoading) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      );
    }

    if (error || !currentCandidateId) {
      return (
        <div className="p-6 text-center">
          <p className="text-destructive mb-4">{error || 'Erreur d\'authentification'}</p>
          <Button onClick={() => window.location.href = '/team'}>
            Se connecter
          </Button>
        </div>
      );
    }

    switch (activeSection) {
      case 'projects':
        return <CandidateProjects />;
      case 'messages':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes messages</h2>
            <p className="text-muted-foreground">Vos messages apparaîtront ici.</p>
          </div>
        );
      case 'appointments':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes rendez-vous</h2>
            <p className="text-muted-foreground">Vos rendez-vous apparaîtront ici.</p>
          </div>
        );
      case 'deliverables':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes livrables</h2>
            <p className="text-muted-foreground">Vos livrables apparaîtront ici.</p>
          </div>
        );
      case 'invoices':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes factures</h2>
            <p className="text-muted-foreground">Vos factures apparaîtront ici.</p>
          </div>
        );
      case 'settings':
        return <CandidateSettings currentCandidateId={currentCandidateId} />;
       
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