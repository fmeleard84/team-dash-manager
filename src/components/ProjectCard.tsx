import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Play, Pause, Eye, Trash2, ExternalLink, Users, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { KickoffDialog } from "@/components/KickoffDialog";
import { buildFunctionHeaders } from "@/lib/functionAuth";

interface Project {
  id: string;
  title: string;
  description?: string;
  price?: number;
  date: string;
  status: string;
  clientBudget?: number | null;
  dueDate?: string | null;
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
  onStart?: (project: { id: string; title: string }) => void;
}

interface PlankaProject {
  planka_url: string;
}

export function ProjectCard({ project, onStatusToggle, onDelete, onView, onStart }: ProjectCardProps) {
  const { user } = useAuth();
  const [plankaProject, setPlankaProject] = useState<PlankaProject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignment[]>([]);
  const [isBookingTeam, setIsBookingTeam] = useState(false);
  const [showKickoff, setShowKickoff] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  useEffect(() => {
    fetchResourceAssignments();
  }, [project.id]);

  // Direct Nextcloud URL is used; no edge function call needed for clients.

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

  // Nextcloud: workspace existence check handled by backend; no client-side check needed.

  const handleStatusToggle = async () => {
    // Check if all resources are booked before allowing play
    const allResourcesBooked = resourceAssignments.every(assignment => assignment.booking_status === 'booké');
    
    if (project.status === 'pause' && !allResourcesBooked) {
      toast.error('Toutes les ressources doivent être bookées avant de démarrer le projet');
      return;
    }

    const newStatus = project.status === 'play' ? 'pause' : 'play';
    
    if (newStatus === 'play') {
      if (onStart) {
        onStart({ id: project.id, title: project.title });
      } else {
        setShowKickoff(true);
      }
    } else {
      // Simple pause
      await onStatusToggle(project.id, newStatus);
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
      toast.error("Erreur lors de la recherche d'équipe");
    } finally {
      setIsBookingTeam(false);
    }
  };

  const startProject = async (kickoffISO: string) => {
    try {
      setIsSyncing(true);
      await onStatusToggle(project.id, 'play');
      toast.success('Projet démarré.');
    } catch (error) {
      console.error('Error starting project:', error);
      toast.error('Erreur lors du démarrage du projet');
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

  const formatCurrency = (n?: number | null) => {
    if (typeof n !== 'number') return '—';
    try {
      return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    } catch {
      return `${n}€`;
    }
  };

  return (
    <>
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
            <span className="text-muted-foreground">Estimation équipe:</span>
            <span className="font-medium text-foreground">{formatCurrency(project.price)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget client:</span>
            <span className="font-medium text-foreground">{formatCurrency(project.clientBudget ?? null)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Début:</span>
            <span className="text-foreground">{formatDate(project.date)}</span>
          </div>

          {project.dueDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fin souhaitée:</span>
              <span className="text-foreground">{formatDate(project.dueDate)}</span>
            </div>
          )}
          
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

          <div className="flex flex-wrap gap-2">
            {/* Éditer l'équipe */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(project.id)}
            >
              Éditer l'équipe
            </Button>

            {/* Play/Pause */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleStatusToggle}
              className="flex-1"
              disabled={(project.status === 'pause' && !allResourcesBooked) || isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mise en place...
                </>
              ) : project.status === 'play' ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Démarrer
                </>
              )}
            </Button>


            {/* Supprimer */}
            <Button variant="destructive" size="sm" onClick={() => onDelete(project.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Booking Team button - only show when resources exist but not all are booked */}
          {resourceAssignments.length > 0 && !allResourcesBooked && project.status === 'pause' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBookingTeam}
              disabled={isBookingTeam}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              {isBookingTeam ? "Envoi des demandes..." : "Booker l'équipe"}
            </Button>
          )}

          {/* My Workspace button - show when project is active (play) */}
          {project.status === 'play' && (
            <Button
              variant="default"
              size="sm"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              onClick={() => {
                const { openNextcloud } = require('@/lib/auth');
                openNextcloud('project', project.title);
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Accéder à l'espace collaboratif
            </Button>
          )}

        </CardContent>
      </Card>

      <KickoffDialog
        open={showKickoff}
        projectTitle={project.title}
        onClose={() => setShowKickoff(false)}
        onConfirm={(iso) => startProject(iso)}
      />
    </>
  );
}