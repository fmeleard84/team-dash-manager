import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useKeycloakAuth } from "@/contexts/KeycloakAuthContext";
import { useNavigate } from "react-router-dom";
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
  LogOut 
} from "lucide-react";

const ClientDashboard = () => {
  const [activeSection, setActiveSection] = useState('projects');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const { user, logout, isLoading } = useKeycloakAuth();
  const navigate = useNavigate();

  // Fetch client profile
  const { data: clientProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['client-profile', user?.profile?.sub],
    queryFn: async () => {
      if (!user?.profile?.email) return null;
      
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('email', user.profile.email)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.profile?.email
  });

  const menuItems = [
    { id: 'projects', label: 'Mes projets', icon: FolderOpen },
    { id: 'invoices', label: 'Mes factures', icon: Receipt },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleCreateProject = async () => {
    if (!user?.profile?.email) {
      toast.error('Utilisateur non connecté');
      return;
    }

    setIsCreatingProject(true);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: 'Nouveau projet',
          description: null,
          user_id: user.profile.email,
          status: 'pause',
          project_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Projet créé avec succès');
      navigate(`/project/${data.id}`);
    } catch (error: any) {
      toast.error('Erreur lors de la création: ' + error.message);
    } finally {
      setIsCreatingProject(false);
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
          <Button onClick={() => window.location.href = '/register'}>
            Se connecter
          </Button>
        </div>
      );
    }

    switch (activeSection) {
      case 'projects':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes projets</h2>
            <p className="text-muted-foreground">Gérez vos projets et suivez leur avancement.</p>
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  Aucun projet pour le moment. Créez votre premier projet !
                </p>
                <div className="flex justify-center mt-4">
                  <Button 
                    onClick={handleCreateProject}
                    disabled={isCreatingProject}
                  >
                    {isCreatingProject ? 'Création...' : 'Créer un projet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'invoices':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes factures</h2>
            <p className="text-muted-foreground">Consultez et téléchargez vos factures.</p>
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  Aucune facture disponible.
                </p>
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
                <CardTitle>Informations du profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {clientProfile && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Nom complet</label>
                      <p className="text-muted-foreground">
                        {clientProfile.first_name} {clientProfile.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-muted-foreground">{clientProfile.email}</p>
                    </div>
                    {clientProfile.company_name && (
                      <div>
                        <label className="text-sm font-medium">Entreprise</label>
                        <p className="text-muted-foreground">{clientProfile.company_name}</p>
                      </div>
                    )}
                    {clientProfile.phone && (
                      <div>
                        <label className="text-sm font-medium">Téléphone</label>
                        <p className="text-muted-foreground">{clientProfile.phone}</p>
                      </div>
                    )}
                  </>
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
                <h1 className="text-xl font-semibold">Tableau de bord client</h1>
                {clientProfile && (
                  <p className="text-sm text-muted-foreground">
                    {clientProfile.first_name} {clientProfile.last_name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="default">Client</Badge>
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