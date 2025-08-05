import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ProjectCard } from '@/components/ProjectCard';
import { Plus, Home, FileText, Settings, LogOut, Users } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';

interface Project {
  id: string;
  title: string;
  description: string;
  price_per_minute: number;
  project_date: string;
  status: 'play' | 'pause';
}

const EnterpriseClientDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeSection, setActiveSection] = useState<'projects' | 'invoices' | 'settings'>('projects');
  const [activeProjectTab, setActiveProjectTab] = useState<'en-cours' | 'en-attente' | 'termines'>('en-cours');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    price_per_minute: 0,
    project_date: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout, isAuthenticated, hasAdminRole } = useKeycloakAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/register?tab=login');
      return;
    }
    fetchProjects();
  }, [isAuthenticated, navigate]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.profile?.sub)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Calculate total price for each project
      const projectsWithCalculatedPrice = await Promise.all(
        (data || []).map(async (project) => {
          const { data: assignments } = await supabase
            .from('hr_resource_assignments')
            .select('calculated_price')
            .eq('project_id', project.id);
          
          const totalPrice = assignments?.reduce((sum, assignment) => sum + (assignment.calculated_price || 0), 0) || 0;
          
          return {
            ...project,
            price_per_minute: totalPrice
          };
        })
      );
      
      setProjects(projectsWithCalculatedPrice as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets.",
        variant: "destructive",
      });
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...newProject,
          user_id: user?.profile?.sub
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial flow data for the project
      await supabase
        .from('project_flows')
        .insert({
          project_id: data.id,
          flow_data: { nodes: [], edges: [] } as any
        });

      toast({
        title: "Projet créé",
        description: "Le projet a été créé avec succès.",
      });

      setIsCreateOpen(false);
      setNewProject({
        title: '',
        description: '',
        price_per_minute: 0,
        project_date: new Date().toISOString().split('T')[0]
      });
      
      navigate(`/project/${data.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusToggle = async (projectId: string, currentStatus: 'play' | 'pause') => {
    const newStatus = currentStatus === 'play' ? 'pause' : 'play';
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, status: newStatus } : p
      ));

      toast({
        title: "Statut mis à jour",
        description: `Le projet est maintenant ${newStatus === 'play' ? 'en cours' : 'en pause'}.`,
      });
    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      
      toast({
        title: "Projet supprimé",
        description: "Le projet a été supprimé avec succès.",
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getFilteredProjects = () => {
    switch (activeProjectTab) {
      case 'en-cours':
        return projects.filter(p => p.status === 'play');
      case 'en-attente':
        return projects.filter(p => p.status === 'pause');
      case 'termines':
        return []; // For now, we don't have completed projects
      default:
        return projects;
    }
  };

  const renderProjectsContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mes Projets</h2>
        <div className="flex gap-2">
          {hasAdminRole() && (
            <Button variant="outline" onClick={() => navigate('/admin/resources')}>
              <Users className="w-4 h-4 mr-2" />
              Gérer les ressources
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Projet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" aria-describedby="create-project-description">
              <DialogHeader>
                <DialogTitle>Créer un nouveau projet</DialogTitle>
              </DialogHeader>
              <div id="create-project-description" className="sr-only">
                Formulaire pour créer un nouveau projet avec titre, description et date
              </div>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={newProject.title}
                    onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                    required
                    placeholder="Nom du projet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descriptif</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    placeholder="Description du projet"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newProject.project_date}
                    onChange={(e) => setNewProject({...newProject, project_date: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Création...' : 'Créer le projet'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeProjectTab} onValueChange={(value) => setActiveProjectTab(value as any)}>
        <TabsList>
          <TabsTrigger value="en-cours">En cours</TabsTrigger>
          <TabsTrigger value="en-attente">En attente</TabsTrigger>
          <TabsTrigger value="termines">Terminés</TabsTrigger>
        </TabsList>

        <TabsContent value="en-cours" className="mt-6">
          {getFilteredProjects().length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Aucun projet en cours.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredProjects().map((project) => (
                <ProjectCard
                  key={project.id}
                  project={{
                    ...project,
                    price: project.price_per_minute,
                    date: project.project_date
                  }}
                  onStatusToggle={handleStatusToggle}
                  onDelete={handleDeleteProject}
                  onView={(id) => navigate(`/project/${id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="en-attente" className="mt-6">
          {getFilteredProjects().length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Aucun projet en attente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredProjects().map((project) => (
                <ProjectCard
                  key={project.id}
                  project={{
                    ...project,
                    price: project.price_per_minute,
                    date: project.project_date
                  }}
                  onStatusToggle={handleStatusToggle}
                  onDelete={handleDeleteProject}
                  onView={(id) => navigate(`/project/${id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="termines" className="mt-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Aucun projet terminé.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderInvoicesContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Mes Factures</h2>
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Fonctionnalité en cours de développement.</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettingsContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Mes Paramètres</h2>
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" value={user?.profile?.given_name || ''} disabled />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" value={user?.profile?.family_name || ''} disabled />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.profile?.email || ''} disabled />
          </div>
          <p className="text-sm text-muted-foreground">
            Pour modifier vos informations, contactez l'administrateur.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'projects':
        return renderProjectsContent();
      case 'invoices':
        return renderInvoicesContent();
      case 'settings':
        return renderSettingsContent();
      default:
        return renderProjectsContent();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarHeader className="p-4">
            <SidebarTrigger />
            <h2 className="text-lg font-semibold">Tableau de bord</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('projects')}
                  className={activeSection === 'projects' ? 'bg-accent' : ''}
                >
                  <Home className="w-4 h-4" />
                  <span>Mes projets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('invoices')}
                  className={activeSection === 'invoices' ? 'bg-accent' : ''}
                >
                  <FileText className="w-4 h-4" />
                  <span>Mes factures</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('settings')}
                  className={activeSection === 'settings' ? 'bg-accent' : ''}
                >
                  <Settings className="w-4 h-4" />
                  <span>Mes paramètres</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="mt-auto">
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1">
          <header className="border-b">
            <div className="container mx-auto px-6 py-4">
              <h1 className="text-xl font-semibold">
                Bienvenue, {user?.profile?.given_name || user?.profile?.email}
              </h1>
            </div>
          </header>
          
          <div className="container mx-auto px-6 py-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default EnterpriseClientDashboard;