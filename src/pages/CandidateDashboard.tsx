import { useState } from "react";
import { MessageSystem } from "@/components/messages/MessageSystem";
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
  MessageSquare, 
  Calendar, 
  Folder, 
  Receipt, 
  Settings, 
  LogOut,
  Star,
  Trello
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CandidateProjects from "@/components/candidate/CandidateProjects";
import CandidatePlanningView from "@/components/candidate/CandidatePlanningView";
import CandidateDriveView from "@/components/candidate/CandidateDriveView";
import CandidateKanbanView from "@/components/candidate/CandidateKanbanView";
import { CandidateNotes } from "@/components/candidate/CandidateNotes";
import { CandidateSettings } from "@/components/candidate/CandidateSettings";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useCandidateProjects } from "@/hooks/useCandidateProjects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CandidateMessages from "@/components/candidate/CandidateMessages";
import CandidateEventNotifications from "@/components/candidate/CandidateEventNotifications";

const CandidateDashboard = () => {
  const [activeSection, setActiveSection] = useState('projects');
  const [candidateStatus, setCandidateStatus] = useState('disponible');
  const { user, logout } = useAuth();
  const { candidateId } = useCandidateProjects();
  const { toast } = useToast();

  const menuItems = [
    { id: 'projects', label: 'Mes projets', icon: FolderOpen },
    { id: 'planning', label: 'Planning', icon: Calendar },
    { id: 'drive', label: 'Drive', icon: Folder },
    { id: 'kanban', label: 'Kanban', icon: Trello },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notes', label: 'Mes notes', icon: Star },
    { id: 'invoices', label: 'Mes factures', icon: Receipt },
  ];

  const handleStatusChange = async (newStatus: string) => {
    if (!candidateId) return;
    
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ status: newStatus })
        .eq('id', candidateId);

      if (error) throw error;

      setCandidateStatus(newStatus);
      toast({
        title: "Statut mis à jour",
        description: "Votre statut a été modifié avec succès."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive"
      });
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'projects':
        return <CandidateProjects />;
        
      case 'planning':
        return <CandidatePlanningView />;
        
      case 'drive':
        return <CandidateDriveView />;
        
      case 'kanban':
        return <CandidateKanbanView />;
        
      case 'messages':
        return candidateId ? (
          <div className="space-y-6">
            <MessageSystem />
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-4">Notifications de missions</h3>
                <CandidateMessages candidateId={candidateId} />
              </div>
              <div>
                <CandidateEventNotifications candidateId={candidateId} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-center text-muted-foreground">
              Aucun profil candidat trouvé.
            </p>
          </div>
        );
        
      case 'notes':
        return candidateId ? <CandidateNotes currentCandidateId={candidateId} /> : (
          <div className="p-6">
            <p className="text-center text-muted-foreground">
              Aucun profil candidat trouvé.
            </p>
          </div>
        );
        
      case 'invoices':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes factures</h2>
            <div className="grid gap-4">
              {/* Placeholder for invoices - to be implemented */}
              <div className="text-center py-8">
                <p className="text-muted-foreground">Fonctionnalité à venir</p>
              </div>
            </div>
          </div>
        );
        
      case 'settings':
        return candidateId ? <CandidateSettings currentCandidateId={candidateId} /> : (
          <div className="p-6">
            <p className="text-center text-muted-foreground">
              Aucun profil candidat trouvé.
            </p>
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
                <h1 className="text-xl font-semibold">Tableau de bord candidat</h1>
                <p className="text-sm text-muted-foreground">
                  Bienvenue {user?.firstName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <Badge variant="outline">Candidat</Badge>
              <Select value={candidateStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="en_pause">En pause</SelectItem>
                  <SelectItem value="indisponible">Indisponible</SelectItem>
                </SelectContent>
              </Select>
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