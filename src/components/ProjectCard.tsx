import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Trash2, Eye, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  title: string;
  description: string;
  price_per_minute: number;
  project_date: string;
  status: 'play' | 'pause';
}

interface ProjectCardProps {
  project: Project;
  onStatusToggle: (id: string, currentStatus: 'play' | 'pause') => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

interface PlankaProject {
  planka_url: string;
}

export const ProjectCard = ({ project, onStatusToggle, onDelete, onView }: ProjectCardProps) => {
  const [plankaProject, setPlankaProject] = useState<PlankaProject | null>(null);
  const [isPlankaSyncing, setIsPlankaSyncing] = useState(false);
  const [plankaChecked, setPlankaChecked] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Check if project exists in Planka when status changes to 'play'
  const checkPlankaProject = async () => {
    if (plankaChecked) return;
    
    try {
      const { data, error } = await supabase
        .from('planka_projects')
        .select('planka_url')
        .eq('project_id', project.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking Planka project:', error);
        return;
      }

      if (data) {
        setPlankaProject({ planka_url: data.planka_url });
      }
      
      setPlankaChecked(true);
    } catch (error) {
      console.error('Error checking Planka project:', error);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: 'play' | 'pause') => {
    // First toggle the status
    onStatusToggle(id, currentStatus);
    
    // If changing to 'play', check for Planka project
    if (currentStatus === 'pause') {
      await checkPlankaProject();
    }
  };

  const syncWithPlanka = async () => {
    setIsPlankaSyncing(true);
    
    try {
      // Get admin user from localStorage for authentication
      const adminUser = localStorage.getItem('admin_user');
      console.log('Admin user from localStorage:', adminUser);
      
      const user = adminUser ? JSON.parse(adminUser) : null;
      console.log('Parsed user:', user);
      
      if (!user || !user.id) {
        console.error('No valid admin user found in localStorage');
        throw new Error('Utilisateur non authentifié - Veuillez vous reconnecter');
      }

      const { data, error } = await supabase.functions.invoke('planka-integration', {
        body: {
          action: 'sync-project',
          projectId: project.id,
          adminUserId: user.id,
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        if (data.exists) {
          toast.success('Projet Planka déjà existant !');
        } else {
          toast.success('Projet créé avec succès dans Planka !');
        }
        
        setPlankaProject({ planka_url: data.plankaUrl });
      } else {
        throw new Error('Échec de la synchronisation');
      }
    } catch (error) {
      console.error('Error syncing with Planka:', error);
      toast.error('Erreur lors de la synchronisation avec Planka');
    } finally {
      setIsPlankaSyncing(false);
    }
  };

  const openPlanka = () => {
    if (plankaProject?.planka_url) {
      window.open(plankaProject.planka_url, '_blank');
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{project.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatDate(project.project_date)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {project.description || 'Aucune description'}
          </p>
           <p className="font-medium">
             {project.price_per_minute.toFixed(2)} €/mn
           </p>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={project.status === 'play' ? 'default' : 'secondary'}
              onClick={() => handleStatusToggle(project.id, project.status)}
              className={project.status === 'play' ? 'bg-success hover:bg-success/80' : ''}
            >
              {project.status === 'play' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(project.id)}
            >
              <Eye className="w-4 h-4" />
            </Button>

            {/* Planka Integration Buttons */}
            {project.status === 'play' && (
              <>
                {plankaProject ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openPlanka}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={syncWithPlanka}
                    disabled={isPlankaSyncing}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                  >
                    {isPlankaSyncing ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-green-300 border-t-green-600" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(project.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};