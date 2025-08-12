import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CandidateProjects from "@/components/candidate/CandidateProjects";
import { CandidateSettings } from "@/components/candidate/CandidateSettings";
import { CandidateNotes } from "@/components/candidate/CandidateNotes";
import CandidateMessages from "@/components/candidate/CandidateMessages";
import { StarRating } from "@/components/ui/star-rating";
import { useKeycloakAuth } from "@/contexts/KeycloakAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  LogOut,
  Star
} from "lucide-react";

const CandidateDashboard = () => {
  const [activeSection, setActiveSection] = useState('projects');
  const { user, logout, isLoading, login } = useKeycloakAuth();

  // Auto-redirect to Keycloak if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      login();
    }
  }, [isLoading, user, login]);

  // Fetch candidate profile for status
  const { data: candidateProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['candidate-profile-status', user?.profile?.sub],
    queryFn: async () => {
      if (!user?.profile?.email) return null;
      
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('status, first_name, last_name, id, rating')
        .eq('email', user.profile.email)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.profile?.email
  });

  const menuItems = [
    { id: 'projects', label: 'Mes projets', icon: FolderOpen },
    { id: 'messages', label: 'Mes messages', icon: MessageSquare },
    { id: 'appointments', label: 'Mes rendez-vous', icon: Calendar },
    { id: 'deliverables', label: 'Mes livrables', icon: FileText },
    { id: 'notes', label: 'Mes notes', icon: Star },
    { id: 'invoices', label: 'Mes factures', icon: Receipt },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!candidateProfile?.id) return;
      
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ status: newStatus })
        .eq('id', candidateProfile.id);

      if (error) throw error;

      refetchProfile();
      toast.success('Statut mis à jour');
    } catch (error: any) {
      toast.error('Erreur lors de la modification: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'bg-green-500 text-white';
      case 'en_pause':
        return 'bg-gray-500 text-white';
      case 'en_mission':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'Disponible';
      case 'en_pause':
        return 'En pause';
      case 'en_mission':
        return 'En mission';
      default:
        return status;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="p-6 text-center">
          <p className="text-destructive mb-4">Non authentifié</p>
          <Button onClick={login}>
            Se connecter
          </Button>
        </div>
      );
    }

    switch (activeSection) {
      case 'projects':
        return <CandidateProjects />;
      case 'messages':
return candidateProfile?.id ? <CandidateMessages candidateId={candidateProfile.id} /> : null;
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
      case 'notes':
        return candidateProfile?.id ? <CandidateNotes currentCandidateId={candidateProfile.id} /> : null;
      case 'invoices':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes factures</h2>
            <p className="text-muted-foreground">Vos factures apparaîtront ici.</p>
          </div>
        );
      case 'settings':
        return candidateProfile?.id ? <CandidateSettings currentCandidateId={candidateProfile.id} /> : null;
       
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
              {candidateProfile && candidateProfile.rating > 0 && (
                <div className="mt-2">
                  <StarRating rating={candidateProfile.rating} size={14} />
                </div>
              )}
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
          <header className="h-16 border-b flex items-center justify-between px-6">
            <div className="flex items-center">
              <SidebarTrigger />
              <div className="ml-4">
                <h1 className="text-xl font-semibold">Tableau de bord candidat</h1>
                {candidateProfile && (
                  <p className="text-sm text-muted-foreground">
                    {candidateProfile.first_name} {candidateProfile.last_name}
                  </p>
                )}
              </div>
            </div>
            
            {candidateProfile && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Statut :</span>
                <Badge className={getStatusColor(candidateProfile.status)}>
                  {getStatusLabel(candidateProfile.status)}
                </Badge>
                <Select
                  value={candidateProfile.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="en_pause">En pause</SelectItem>
                    <SelectItem value="en_mission">En mission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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