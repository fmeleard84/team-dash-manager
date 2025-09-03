import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Play, Pause, Eye, Trash2, ExternalLink, Users, Loader2, MoreVertical, Edit, Clock, TrendingUp, CheckCircle2, AlertCircle, Rocket, Calendar, Euro, Archive, RotateCcw } from "lucide-react";
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
  calculated_price?: number;  // Prix déjà calculé avec les pourcentages
  hr_profiles?: {
    name: string;
    is_ai?: boolean;
    base_price?: number;
  };
  candidate_profiles?: {
    first_name: string;
    last_name: string;
    daily_rate?: number;
  };
}

interface ProjectCardProps {
  project: Project;
  onStatusToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onStart?: (project: { id: string; title: string; kickoffISO?: string }) => void;
  onEdit?: () => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  isArchived?: boolean;
  refreshTrigger?: number; // Optional prop to force refresh
}

interface PlankaProject {
  planka_url: string;
}

export function ProjectCard({ project, onStatusToggle, onDelete, onView, onStart, onEdit, onArchive, onUnarchive, isArchived = false, refreshTrigger }: ProjectCardProps) {
  const { user } = useAuth();
  const [plankaProject, setPlankaProject] = useState<PlankaProject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignment[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
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
  
  // Calcul du prix cumulé par minute des ressources
  const calculateTotalPricePerMinute = () => {
    if (resourceAssignments.length === 0) return 0;
    
    let totalPerMinute = 0;
    
    console.log('💰 Calcul des prix pour', resourceAssignments.length, 'ressources');
    
    resourceAssignments.forEach(assignment => {
      // Utiliser calculated_price qui contient déjà le prix avec les pourcentages appliqués
      if (assignment.calculated_price) {
        // calculated_price est déjà en €/minute avec les pourcentages des langues et expertises
        console.log('  - Ressource calculated_price:', assignment.calculated_price, '€/min (avec pourcentages)');
        totalPerMinute += assignment.calculated_price;
      }
      // Fallback pour les candidats avec daily_rate si calculated_price n'existe pas
      else if (assignment.candidate_profiles?.daily_rate) {
        // Convertir tarif journalier en tarif par minute (8h par jour, 60 min par heure)
        const minuteRate = assignment.candidate_profiles.daily_rate / (8 * 60);
        console.log('  - Candidat daily_rate:', assignment.candidate_profiles.daily_rate, '=> minute:', minuteRate);
        totalPerMinute += minuteRate;
      }
    });
    
    console.log('💰 Prix total par minute:', totalPerMinute);
    return totalPerMinute;
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
            calculated_price,
            candidate_profiles (
              first_name,
              last_name,
              daily_rate
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
          calculated_price,
          seniority
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
      
      // Récupérer les noms des profils HR séparément
      if (data && data.length > 0) {
        const profileIds = [...new Set(data.map(a => a.profile_id).filter(Boolean))];
        
        if (profileIds.length > 0) {
          // Récupérer les profils HR
          const { data: profiles } = await supabase
            .from('hr_profiles')
            .select('id, name')
            .in('id', profileIds);
          
          if (profiles) {
            const namesMap: Record<string, string> = {};
            profiles.forEach(p => {
              namesMap[p.id] = p.name;
            });
            setProfileNames(namesMap);
            
            // Ajouter les profils aux assignments pour le reste du code
            setResourceAssignments(prevAssignments => 
              prevAssignments.map(assignment => ({
                ...assignment,
                hr_profiles: profiles.find(p => p.id === assignment.profile_id)
              }))
            );
          }
        }
        
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
    } else if (project.status === 'play') {
      // If pausing from play status, call toggle with current status
      await onStatusToggle(project.id, project.status);
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

      // Then call the resource booking function (using debug version temporarily)
      const { data, error } = await supabase.functions.invoke('resource-booking-debug', {
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
    
    // Vérifier les statuts de booking
    const bookedCount = resourceAssignments.filter(assignment => 
      assignment.booking_status === 'accepted'
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
    assignment.booking_status === 'accepted'
  );
  
  // Déterminer si le projet peut être démarré
  // On peut démarrer UNIQUEMENT quand toutes les ressources humaines sont confirmées (IA toujours disponible)
  const canStartProject = (project.status === 'pause' || project.status === 'attente-team') && 
    resourceAssignments.length > 0 && 
    resourceAssignments.every(assignment => {
      // Les IA sont toujours disponibles
      if (assignment.hr_profiles?.is_ai) return true;
      // Les ressources humaines doivent être acceptées
      return assignment.booking_status === 'accepted';
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
      <Card className="group relative bg-white border border-[#ECEEF1] rounded-2xl p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {(project.status === 'pause' || project.status === 'nouveaux') && (
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-[#F1F3F5] text-[#6B7280] text-xs font-medium px-2 py-1 rounded">
                    New
                  </Badge>
                </div>
              )}
              <h3 className="text-xl font-bold text-[#0E0F12] line-clamp-1">{project.title}</h3>
              {project.description && (
                <p className="text-sm text-[#6B7280] line-clamp-1 mt-1">{project.description}</p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-[#0E0F12] hover:bg-[#F7F8FA] rounded">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-[#ECEEF1]">
                {!isArchived && (
                  <>
                    <DropdownMenuItem onClick={() => setShowEditModal(true)} className="hover:bg-[#F7F8FA] text-[#0E0F12]">
                      <Edit className="h-4 w-4 mr-2" />
                      Éditer
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onArchive?.(project.id)}
                      className="hover:bg-blue-50 text-blue-600"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archiver
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(project.id)}
                      className="hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
                {isArchived && (
                  <DropdownMenuItem 
                    onClick={() => onUnarchive?.(project.id)}
                    className="hover:bg-green-50 text-green-600"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Désarchiver
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        
          {/* Meta pills with price */}
          <div className="flex flex-wrap gap-3">
            {/* Budget */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#ECEEF1]">
              <Euro className="h-4 w-4 text-[#7B3EF4]" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#6B7280] uppercase">Budget</span>
                <span className="text-sm font-medium text-[#0E0F12]">{formatCurrency(project.clientBudget)}</span>
              </div>
            </div>
            
            {/* Date */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#ECEEF1]">
              <Calendar className="h-4 w-4 text-[#7B3EF4]" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#6B7280] uppercase">Début</span>
                <span className="text-sm font-medium text-[#0E0F12]">{formatDate(project.date)}</span>
              </div>
            </div>

            {/* Prix total par minute */}
            {resourceAssignments.length > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#ECEEF1]">
                <Euro className="h-4 w-4 text-[#7B3EF4]" />
                <span className="text-sm font-medium text-[#0E0F12]">
                  {calculateTotalPricePerMinute().toFixed(2)}€/min
                </span>
              </div>
            )}
          </div>

          {/* Team progress */}
          {resourceAssignments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">{bookingProgress.text}</span>
              </div>
              
              <div className="w-full bg-[#E7EAF0] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-1.5 bg-[#7B3EF4] transition-all duration-300"
                  style={{ width: `${bookingProgress.percentage}%` }}
                />
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(resourceAssignments.map(a => a.profile_id).filter(Boolean))].map((profileId) => {
                  const profileAssignments = resourceAssignments.filter(a => a.profile_id === profileId);
                  const hasBooked = profileAssignments.some(a => a.booking_status === 'accepted');
                  const profileName = profileNames[profileId] || 'Métier';
                  
                  return (
                    <span
                      key={profileId} 
                      className="text-xs px-2 py-1 rounded bg-[#F4F6F9] text-[#0E0F12]"
                    >
                      {profileName}
                      {hasBooked && ' ✓'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => onView(project.id)}
              className="text-sm text-[#0E0F12] underline-offset-4 hover:underline"
            >
              {project.status === 'pause' ? 'Créer vos équipes' : 'Voir détails'}
            </button>

            {/* CTA principal unique selon l'état */}
            {(project.status === 'pause' || project.status === 'attente-team') && (
              <>
                {resourceAssignments.length === 0 ? (
                  <Button
                    size="sm"
                    disabled={true}
                    className="h-11 px-5 bg-[#F7F8FA] text-[#6B7280] rounded-full font-medium cursor-not-allowed"
                  >
                    Créer l'équipe d'abord
                  </Button>
                ) : (
                  <>
                    {/* Si les ressources ne sont pas encore bookées, afficher Booker les équipes */}
                    {!canStartProject && hasResourcesInDraft() && (
                      <Button
                        onClick={handleBookingTeam}
                        disabled={isBookingTeam || isBookingRequested}
                        className="h-11 px-5 bg-[#7B3EF4] hover:bg-[#6A35D3] text-white rounded-full shadow-[0_6px_20px_rgba(123,62,244,0.18)] transition-all duration-200 font-medium"
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
                            Booker les équipes
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Si toutes les ressources sont confirmées, afficher Démarrer le projet */}
                    {canStartProject && (
                      <Button
                        onClick={handleStatusToggle}
                        disabled={isSyncing}
                        className="h-11 px-5 bg-[#7B3EF4] hover:bg-[#6A35D3] text-white rounded-full shadow-[0_6px_20px_rgba(123,62,244,0.18)] transition-all duration-200 font-medium"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Mise en place...
                          </>
                        ) : (
                          <>
                            Démarrer le projet
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Si le booking est en cours sans être en draft */}
                    {!canStartProject && !hasResourcesInDraft() && (
                      <Button
                        disabled={true}
                        className="h-11 px-5 bg-[#F7F8FA] text-[#6B7280] rounded-full font-medium cursor-not-allowed"
                      >
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
                onClick={handleStatusToggle}
                disabled={isSyncing}
                className="h-11 px-5 bg-[#7B3EF4] hover:bg-[#6A35D3] text-white rounded-full shadow-[0_6px_20px_rgba(123,62,244,0.18)] transition-all duration-200 font-medium"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mise en pause...
                  </>
                ) : (
                  <>
                    Mettre en pause
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
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