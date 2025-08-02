import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ProjectCard } from '@/components/ProjectCard';
import { Plus, LogOut, Users } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  price_per_minute: number;
  project_date: string;
  status: 'play' | 'pause';
}

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    price_per_minute: 0,
    project_date: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/admin');
      return;
    }
    fetchProjects();
  }, [user, navigate]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
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
          user_id: user?.id
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard - {user.login}</h1>
          <Button variant="outline" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold">Mes Projets</h2>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/resources')}>
              <Users className="w-4 h-4 mr-2" />
              Gérer les ressources
            </Button>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Projet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un nouveau projet</DialogTitle>
              </DialogHeader>
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
                  {isLoading ? 'Création...' : 'Create Team'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Aucun projet trouvé. Créez votre premier projet !</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onStatusToggle={handleStatusToggle}
                onDelete={handleDeleteProject}
                onView={(id) => navigate(`/project/${id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;