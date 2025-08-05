import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Play, Pause, Eye, Trash2, ExternalLink, Users } from "lucide-react";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  description?: string;
  price: number;
  date: string;
  status: string;
}

interface ResourceAssignment {
  id: string;
  profile_id: string;
  booking_status: string;
  hr_profiles: {
    name: string;
  };
}

interface ProjectCardProps {
  project: Project;
  onStatusToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

interface PlankaProject {
  planka_url: string;
}

export function ProjectCard({ project, onStatusToggle, onDelete, onView }: ProjectCardProps) {
  const [plankaProject, setPlankaProject] = useState<PlankaProject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignment[]>([]);
  const [isBookingTeam, setIsBookingTeam] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  useEffect(() => {
    checkPlankaProject();
    fetchResourceAssignments();
  }, [project.id]);

  const fetchResourceAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          booking_status,
          hr_profiles (
            name
          )
        `)
        .eq('project_id', project.id);

      if (error) {
        console.error('Error fetching resource assignments:', error);
        return;
      }

      setResourceAssignments(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkPlankaProject = async () => {
    if (isChecked) return;
    
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
      
      setIsChecked(true);
    } catch (error) {
      console.error('Error checking Planka project:', error);
    }
  };

  const handleStatusToggle = async () => {
    // Check if all resources are booked before allowing play
    const allResourcesBooked = resourceAssignments.every(assignment => assignment.booking_status === 'booké');
    
    if (project.status === 'pause' && !allResourcesBooked) {
      toast.error('Toutes les ressources doivent être bookées avant de démarrer le projet');
      return;
    }

    const newStatus = project.status === 'play' ? 'pause' : 'play';
    await onStatusToggle(project.id, newStatus);
    
    if (newStatus === 'play') {
      await checkPlankaProject();
    }
  };

  const handleBookingTeam = async () => {
    setIsBookingTeam(true);
    try {
      const { data, error } = await supabase.functions.invoke('resource-booking', {
        body: {
          projectId: project.id,
          action: 'find_candidates'
        }
      });

      if (error) throw error;

      toast.success(data.message);
      // Refresh resource assignments to update status
      await fetchResourceAssignments();
    } catch (error) {
      console.error('Error booking team:', error);
      toast.error('Erreur lors de la recherche d\'équipe');
    } finally {
      setIsBookingTeam(false);
    }
  };

  const syncWithPlanka = async () => {
    setIsSyncing(true);
    
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
      setIsSyncing(false);
    }
  };

  const openPlanka = () => {
    if (plankaProject?.planka_url) {
      window.open(plankaProject.planka_url, '_blank');
    }
  };

  const getBookingProgress = () => {
    if (resourceAssignments.length === 0) return { percentage: 0, text: 'Aucune ressource' };
    
    const bookedCount = resourceAssignments.filter(assignment => assignment.booking_status === 'booké').length;
    const percentage = (bookedCount / resourceAssignments.length) * 100;
    
    return {
      percentage,
      text: `${bookedCount}/${resourceAssignments.length} ressources bookées`
    };
  };

  const bookingProgress = getBookingProgress();
  const allResourcesBooked = resourceAssignments.every(assignment => assignment.booking_status === 'booké');

  return (
    <Card className="w-full max-w-md bg-background border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
          <Badge variant={project.status === 'play' ? 'default' : 'secondary'}>
            {project.status === 'play' ? 'En cours' : 'En pause'}
          </Badge>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2">{project.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Prix total:</span>
          <span className="font-medium text-foreground">{project.price}€</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Date:</span>
          <span className="text-foreground">{formatDate(project.date)}</span>
        </div>
        
        {/* Resource assignments section */}
        {resourceAssignments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Équipe:</span>
              <span className="text-foreground">{bookingProgress.text}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${bookingProgress.percentage}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {resourceAssignments.map((assignment) => (
                <Badge 
                  key={assignment.id} 
                  variant={assignment.booking_status === 'booké' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {assignment.hr_profiles.name}
                  {assignment.booking_status === 'booké' && ' ✓'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStatusToggle}
            className="flex-1"
            disabled={project.status === 'pause' && !allResourcesBooked}
          >
            {project.status === 'play' ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={() => onView(project.id)}>
            <Eye className="w-4 h-4" />
          </Button>

          <Button variant="destructive" size="sm" onClick={() => onDelete(project.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Booking Team button */}
        {resourceAssignments.length > 0 && !allResourcesBooked && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBookingTeam}
            disabled={isBookingTeam}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            {isBookingTeam ? 'Recherche en cours...' : 'En attente de booking'}
          </Button>
        )}

        {/* Join Team button when all resources are booked */}
        {resourceAssignments.length > 0 && allResourcesBooked && (
          <Button
            variant="default"
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              if (plankaProject?.planka_url) {
                window.open(plankaProject.planka_url, '_blank');
              } else {
                toast.info('Le projet Planka n\'est pas encore configuré');
              }
            }}
          >
            <Users className="w-4 h-4 mr-2" />
            Rejoindre l'équipe
          </Button>
        )}

        {plankaProject && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openPlanka}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir dans Planka
            </Button>
          </div>
        )}

        {!isChecked && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncWithPlanka}
              disabled={isSyncing}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {isSyncing ? 'Synchronisation...' : 'Synchroniser avec Planka'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}