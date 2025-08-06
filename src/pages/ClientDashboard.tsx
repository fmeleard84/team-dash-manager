import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useKeycloakAuth } from "@/contexts/KeycloakAuthContext";
import { useNavigate } from "react-router-dom";
import { ProjectCard } from "@/components/ProjectCard";
import CreateProjectModal from "@/components/CreateProjectModal";
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, logout, isLoading } = useKeycloakAuth();
  const navigate = useNavigate();
  
  // Configure Supabase auth with Keycloak tokens
  useSupabaseAuth();

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

  // Fetch user projects
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['user-projects', user?.profile?.sub],
    queryFn: async () => {
      if (!user?.profile?.sub) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('keycloak_user_id', user.profile.sub)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.profile?.sub
  });

  const menuItems = [
    { id: 'projects', label: 'Mes projets', icon: FolderOpen },
    { id: 'invoices', label: 'Mes factures', icon: Receipt },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleCreateProject = async (projectData: {
    title: string;
    description?: string;
    project_date: string;
  }) => {
    if (!user?.profile?.sub) {
      toast.error('Utilisateur non connecté');
      return;
    }

    setIsCreatingProject(true);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: projectData.title,
          description: projectData.description || null,
          user_id: user.profile.sub, // Temporarily using user_id field with keycloak sub
          keycloak_user_id: user.profile.sub,
          status: 'pause',
          project_date: projectData.project_date
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Projet créé avec succès');
      setIsModalOpen(false);
      refetchProjects();
      navigate(`/project/${data.id}`);
    } catch (error: any) {
      toast.error('Erreur lors de la création: ' + error.message);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleStatusToggle = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Projet ${newStatus === 'play' ? 'démarré' : 'mis en pause'}`);
      refetchProjects();
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour: ' + error.message);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Projet supprimé');
      refetchProjects();
    } catch (error: any) {
      toast.error('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleViewProject = (id: string) => {
    navigate(`/project/${id}`);
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
            
            {projectsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement des projets...</p>
              </div>
            ) : !projects || projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Aucun projet pour le moment. Créez votre premier projet !
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={{
                      id: project.id,
                      title: project.title,
                      description: project.description,
                      price: 0, // Will be calculated based on resources
                      date: project.project_date,
                      status: project.status
                    }}
                    onStatusToggle={handleStatusToggle}
                    onDelete={handleDeleteProject}
                    onView={handleViewProject}
                  />
                ))}
              </div>
            )}
            
            <div className="flex justify-center mt-6">
              <Button 
                onClick={() => setIsModalOpen(true)}
                disabled={isCreatingProject}
              >
                Créer un projet
              </Button>
            </div>
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
      
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateProject={handleCreateProject}
        isCreating={isCreatingProject}
      />
    </SidebarProvider>
  );
};

export default ClientDashboard;