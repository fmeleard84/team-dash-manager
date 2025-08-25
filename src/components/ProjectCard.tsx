import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Play, Pause, Eye, Trash2, ExternalLink, Users, Loader2, MoreVertical, Edit, Clock, TrendingUp, CheckCircle2, AlertCircle, Rocket, Calendar, Euro } from "lucide-react";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { KickoffDialog } from "@/components/KickoffDialog";
import { buildFunctionHeaders } from "@/lib/functionAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditProjectModal from "@/components/EditProjectModal";

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
  hr_profiles?: {
    name: string;
    is_ai?: boolean;
  };
  candidate_profiles?: {
    first_name: string;
    last_name: string;
    profile_title?: string;
  };
}

interface ProjectCardProps {
  project: Project;
  onStatusToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onStart?: (project: { id: string; title: string; kickoffISO?: string }) => void;
  onEdit?: () => void;
  refreshTrigger?: number; // Optional prop to force refresh
}

interface PlankaProject {
  planka_url: string;
}

export function ProjectCard({ project, onStatusToggle, onDelete, onView, onStart, onEdit, refreshTrigger }: ProjectCardProps) {
  const { user } = useAuth();
  const [plankaProject, setPlankaProject] = useState<PlankaProject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignment[]>([]);
  const [isBookingTeam, setIsBookingTeam] = useState(false);
  const [showKickoff, setShowKickoff] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isBookingRequested, setIsBookingRequested] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    console.log('🔄 ProjectCard mounted/updated for project:', project.id);
    fetchResourceAssignments();
  }, [project.id, refreshTrigger]);
  
  // Also refresh when component mounts
  useEffect(() => {
    console.log('🎮 ProjectCard initial mount - fetching resources in 100ms');
    const timer = setTimeout(() => {
      fetchResourceAssignments();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Check if booking is in progress based on resource assignment status
  useEffect(() => {
    console.log('📌 Checking booking status - resources:', resourceAssignments.length);
    if (hasBookingInProgress()) {
      console.log('🔄 Booking in progress detected');
      setIsBookingRequested(true);
    } else if (resourceAssignments.length > 0 && !hasBookingInProgress()) {
      console.log('✅ Resources exist but no booking in progress');
      // If we have assignments but none in recherche mode, reset booking requested
      setIsBookingRequested(false);
    }
  }, [resourceAssignments]);

  // Reload resource assignments when page regains focus (useful when returning from ReactFlow)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let attemptCount = 0;
    const maxAttempts = 10;
    
    const startPolling = () => {
      console.log('🔄 Starting polling for resources...');
      // Reset attempt count
      attemptCount = 0;
      
      // Start polling every 500ms
      intervalId = setInterval(async () => {
        attemptCount++;
        console.log('🔄 Polling attempt', attemptCount, 'of', maxAttempts);
        
        // Fetch fresh data directly in the interval
        const { data } = await supabase
          .from('hr_resource_assignments')
          .select(`
            id,
            profile_id,
            booking_status,
            hr_profiles (
              name,
              is_ai
            ),
            candidate_profiles (
              first_name,
              last_name,
              profile_title
            )
          `)
          .eq('project_id', project.id);
        
        console.log('🔄 Polling result:', data?.length || 0, 'resources');
        
        if (data && data.length > 0) {
          console.log('🎆 Resources found in polling! Setting state.');
          setResourceAssignments([...data]);
        }
        
        // Stop polling after finding resources or max attempts
        if ((data && data.length > 0) || attemptCount >= maxAttempts) {
          console.log('🏏 Stopping polling:', data?.length ? 'Resources found!' : 'Max attempts reached');
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }, 500);
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Start polling when page becomes visible
        startPolling();
      } else {
        // Stop polling when page is hidden
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };
    
    const handleFocus = async () => {
      console.log('👀 Window gained focus - refreshing resources');
      // Immediate fetch on focus
      await fetchResourceAssignments();
      // Start short polling only if no resources found
      if (resourceAssignments.length === 0) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [resourceAssignments.length]);

  // Écouter l'événement projectUpdated depuis ReactFlow
  useEffect(() => {
    const handleProjectUpdate = (event: CustomEvent) => {
      if (event.detail.projectId === project.id) {
        console.log('🔔 Project updated event received, refreshing resources...');
        fetchResourceAssignments();
      }
    };
    
    window.addEventListener('projectUpdated', handleProjectUpdate as EventListener);
    
    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate as EventListener);
    };
  }, [project.id]);

  const fetchResourceAssignments = async () => {
    console.log('🔎 Fetching resource assignments for project:', project.id);
    console.log('🔎 Project status:', project.status);
    try {
      const { data, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          booking_status,
          hr_profiles (
            name,
            is_ai
          ),
          candidate_profiles (
            first_name,
            last_name,
            profile_title
          )
        `)
        .eq('project_id', project.id);

      if (error) {
        console.error('❌ Error fetching resource assignments:', error);
        return;
      }
      console.log('✅ Found', data?.length || 0, 'resource assignments:', data);
      console.log('📊 Resource assignments state before update:', resourceAssignments);
      
      // Force un rafraîchissement du state même si les données sont identiques
      setResourceAssignments([...data || []]);
      console.log('📊 Resource assignments state after update:', data);
      
      // Si on trouve des ressources, on arrête le polling immédiatement
      if (data && data.length > 0) {
        console.log('🎆 Resources found! Stopping any active polling.');
        console.log('🎯 Button should be active now!');
      } else {
        console.log('⚠️ No resources found - button will remain disabled');
      }
    } catch (error) {
      console.error('❌ Exception:', error);
    }
  };

  const handleStatusToggle = async () => {
    // On peut démarrer le projet dès qu'il y a des ressources
    if ((project.status === 'pause' || project.status === 'attente-team') && resourceAssignments.length === 0) {
      toast.error('Vous devez d\'abord créer une équipe pour ce projet');
      return;
    }
    
    if (project.status === 'pause' || project.status === 'attente-team') {
      // If starting, show kickoff dialog first
      setShowKickoff(true);
    } else {
      // If pausing, directly update status
      await onStatusToggle(project.id, 'pause');
    }
  };

  const handleBookingTeam = async () => {
    setIsBookingTeam(true);
    try {
      // First, update all resource assignments to 'recherche' status
      const { error: updateError } = await supabase
        .from('hr_resource_assignments')
        .update({ booking_status: 'recherche' })
        .eq('project_id', project.id)
        .in('booking_status', ['draft', 'recherche']); // Only update draft and recherche statuses

      if (updateError) {
        console.error('Error updating booking status:', updateError);
        throw updateError;
      }

      // Then call the resource booking function
      const { data, error } = await supabase.functions.invoke('resource-booking', {
        body: {
          projectId: project.id,
          action: 'find_candidates'
        }
      });

      if (error) throw error;

      // Mark booking as requested
      setIsBookingRequested(true);
      
      toast.success(data.message);
      // Refresh resource assignments to update status
      await fetchResourceAssignments();
      
      // Trigger a refresh of the parent component to update project classification
      if (onEdit) {
        onEdit();
      }
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
      // Trigger the project setup with kickoff
      if (onStart) {
        onStart({ id: project.id, title: project.title, kickoffISO });
      }
      setShowKickoff(false);
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
    
    // Vérifier les statuts de booking (accepted = booké)
    const bookedCount = resourceAssignments.filter(assignment => 
      assignment.booking_status === 'booké' || assignment.booking_status === 'accepted'
    ).length;
    const percentage = (bookedCount / resourceAssignments.length) * 100;
    
    return {
      percentage,
      text: `${bookedCount}/${resourceAssignments.length} ressources confirmées`
    };
  };
  
  // Check if team booking has been requested (resources in 'recherche' status)
  const hasBookingInProgress = () => {
    return resourceAssignments.some(assignment => assignment.booking_status === 'recherche');
  };

  // Check if resources exist but no booking has been requested yet (in 'draft' status)
  const hasResourcesInDraft = () => {
    return resourceAssignments.some(assignment => assignment.booking_status === 'draft');
  };

  const bookingProgress = getBookingProgress();
  const allResourcesBooked = resourceAssignments.every(assignment => 
    assignment.booking_status === 'booké' || assignment.booking_status === 'accepted'
  );
  
  // Déterminer si le projet peut être démarré
  // On peut démarrer UNIQUEMENT quand toutes les ressources humaines sont confirmées (IA toujours disponible)
  const canStartProject = (project.status === 'pause' || project.status === 'attente-team') && 
    resourceAssignments.length > 0 && 
    resourceAssignments.every(assignment => {
      // Les IA sont toujours disponibles
      if (assignment.hr_profiles?.is_ai) return true;
      // Les ressources humaines doivent être bookées ou acceptées
      return assignment.booking_status === 'booké' || assignment.booking_status === 'accepted';
    });
  
  console.log('🎯 Project', project.id, 'start conditions:');
  console.log('  - Status is pause or attente-team:', project.status === 'pause' || project.status === 'attente-team');
  console.log('  - All resources booked:', allResourcesBooked);
  console.log('  - Has resources:', resourceAssignments.length > 0, '(count:', resourceAssignments.length, ')');
  console.log('  - Can start:', canStartProject);
  console.log('  - Resource details:', resourceAssignments.map(r => ({
    id: r.id,
    profile: r.hr_profiles?.name,
    status: r.booking_status
  })));

  const formatCurrency = (n?: number | null) => {
    if (typeof n !== 'number') return '—';
    try {
      return n.toLocaleString('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    } catch {
      return `${n}€`;
    }
  };

  // Déterminer le statut visuel
  const getStatusConfig = () => {
    if (project.status === 'play') {
      return {
        badge: { text: 'En cours', variant: 'default' as const, icon: <Play className="w-3 h-3" /> },
        gradient: 'from-green-500 to-emerald-500',
        lightGradient: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-200'
      };
    } else if (canStartProject) {
      return {
        badge: { text: 'Prêt à démarrer', variant: 'default' as const, icon: <Rocket className="w-3 h-3" /> },
        gradient: 'from-blue-600 to-purple-600',
        lightGradient: 'from-blue-50 to-purple-50',
        borderColor: 'border-blue-200'
      };
    } else if (project.status === 'attente-team') {
      return {
        badge: { text: 'Constitution équipe', variant: 'secondary' as const, icon: <Users className="w-3 h-3" /> },
        gradient: 'from-orange-500 to-amber-500',
        lightGradient: 'from-orange-50 to-amber-50',
        borderColor: 'border-orange-200'
      };
    } else {
      return {
        badge: { text: 'New', variant: 'default' as const, icon: <Rocket className="w-3 h-3" /> },
        gradient: 'from-blue-600 to-purple-600',
        lightGradient: 'from-blue-50 to-purple-50',
        borderColor: 'border-blue-200'
      };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <>
      <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl border ${statusConfig.borderColor} bg-white`}>
        {/* Accent gradient top bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${statusConfig.gradient}`} />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant={statusConfig.badge.variant}
                  className={project.status === 'pause' ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 flex items-center gap-1" : "flex items-center gap-1"}
                >
                  {statusConfig.badge.icon}
                  {statusConfig.badge.text}
                </Badge>
                {canStartProject && (
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 animate-pulse">
                    <Rocket className="w-3 h-3 mr-1" />
                    Ready!
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{project.title}</h3>
              {project.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Éditer
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(project.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r ${statusConfig.lightGradient} border ${statusConfig.borderColor}`}>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${statusConfig.gradient} flex items-center justify-center text-white`}>
                <Euro className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Budget</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(project.clientBudget)}</p>
              </div>
            </div>
            
            <div className={`flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r ${statusConfig.lightGradient} border ${statusConfig.borderColor}`}>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${statusConfig.gradient} flex items-center justify-center text-white`}>
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Début</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(project.date)}</p>
              </div>
            </div>
          </div>

          {/* Team progress */}
          {resourceAssignments.length > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Équipe projet</span>
                </div>
                <span className="text-xs font-medium text-gray-600">{bookingProgress.text}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${
                    bookingProgress.percentage === 100 
                      ? 'from-green-500 to-emerald-500' 
                      : 'from-blue-600 to-purple-600'
                  }`}
                  style={{ width: `${bookingProgress.percentage}%` }}
                />
              </div>
              
              <div className="flex flex-wrap gap-1">
                {resourceAssignments.map((assignment) => {
                  const isBooked = assignment.booking_status === 'booké' || assignment.booking_status === 'accepted';
                  return (
                    <Badge 
                      key={assignment.id} 
                      variant={isBooked ? 'default' : 'outline'}
                      className={`text-xs ${isBooked ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0' : ''}`}
                    >
                      {assignment.hr_profiles?.name || 
                       (assignment.candidate_profiles ? 
                        `${assignment.candidate_profiles.first_name} ${assignment.candidate_profiles.last_name}${assignment.candidate_profiles.profile_title ? ` - ${assignment.candidate_profiles.profile_title}` : ''}` : 
                        'Ressource')}
                      {isBooked && ' ✓'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(project.id)}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              {project.status === 'pause' ? 'Créer vos équipes' : 'Voir détails'}
            </Button>

            {/* Booking Team button OU Play/Pause selon l'état */}
            {(project.status === 'pause' || project.status === 'attente-team') && (
              <>
                {console.log('🔘 Button render - resourceAssignments.length:', resourceAssignments.length)}
                {console.log('🔘 Button render - resourceAssignments:', resourceAssignments)}
                {/* Si aucune ressource n'est définie, on affiche le bouton Démarrer désactivé avec tooltip */}
                {resourceAssignments.length === 0 ? (
                  <div className="flex-1 relative group">
                    <Button
                      size="sm"
                      disabled={true}
                      className="w-full bg-gray-100 text-gray-400 cursor-not-allowed"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Créer l'équipe d'abord
                    </Button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      Cliquez sur "Créer vos équipes" pour ajouter des candidats
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                ) : (
                  /* Si le projet a des ressources, afficher le bon bouton selon l'état */
                  <>
                    {/* Si les ressources ne sont pas encore bookées, afficher Booker les équipes */}
                    {!canStartProject && hasResourcesInDraft() && (
                      <Button
                        size="sm"
                        onClick={handleBookingTeam}
                        disabled={isBookingTeam || isBookingRequested}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                      >
                        {isBookingTeam ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Recherche en cours...
                          </>
                        ) : isBookingRequested ? (
                          <>
                            <Users className="w-4 h-4 mr-2 animate-pulse" />
                            En cours de booking...
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4 mr-2" />
                            Booker les équipes
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Si toutes les ressources sont confirmées, afficher Démarrer le projet */}
                    {canStartProject && (
                      <Button
                        size="sm"
                        onClick={handleStatusToggle}
                        disabled={isSyncing}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Mise en place...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Démarrer le projet
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Si le booking est en cours sans être en draft */}
                    {!canStartProject && !hasResourcesInDraft() && (
                      <Button
                        size="sm"
                        disabled={true}
                        className="flex-1 bg-gray-100 text-gray-500"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        En attente de confirmation
                      </Button>
                    )}
                  </>
                )}
              </>
            )}

            {/* Pause pour les projets en cours */}
            {project.status === 'play' && (
              <Button
                size="sm"
                onClick={handleStatusToggle}
                disabled={isSyncing}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mise en pause...
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Mettre en pause
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <KickoffDialog
        open={showKickoff}
        projectTitle={project.title}
        onClose={() => setShowKickoff(false)}
        onConfirm={(iso) => startProject(iso)}
      />

      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onProjectUpdated={onEdit}
        project={{
          id: project.id,
          title: project.title,
          description: project.description,
          project_date: project.date,
          due_date: project.dueDate,
          client_budget: project.clientBudget,
        }}
      />
    </>
  );
}