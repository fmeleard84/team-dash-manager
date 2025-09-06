import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { FullScreenModal, ModalActions } from "./ui/fullscreen-modal";
import { Play, Pause, Eye, Trash2, ExternalLink, Users, Loader2, MoreVertical, Edit, Clock, TrendingUp, CheckCircle2, AlertCircle, Rocket, Calendar, Euro, Archive, RotateCcw, Paperclip, Download, Info, FileText, Video, Link2 } from "lucide-react";
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
  onStart?: (project: { id: string; title: string; kickoffISO?: string }) => void | Promise<void>;
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
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showProjectDetailsModal, setShowProjectDetailsModal] = useState(false);

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
      fetchProjectFiles();
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
            seniority,
            languages,
            expertises,
            industries,
            candidate_id,
            candidate_profiles!candidate_id (
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
        fetchProjectFiles();
      }
    };
    
    window.addEventListener('projectUpdated', handleProjectUpdate as EventListener);
    
    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate as EventListener);
    };
  }, [project.id]);

  // Real-time subscription for resource assignments
  useEffect(() => {
    console.log('📡 Setting up realtime subscription for resource assignments');
    
    // Initial fetch - use the main fetchResourceAssignments function
    fetchResourceAssignments();
    
    const channel = supabase
      .channel(`resource-assignments-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_resource_assignments',
          filter: `project_id=eq.${project.id}`
        },
        (payload) => {
          console.log('🔄 Resource assignment change detected:', payload);
          console.log('📦 Change type:', payload.eventType);
          console.log('📦 New data:', payload.new);
          console.log('📦 Old data:', payload.old);
          // Refresh resource assignments when any change occurs
          // Call the main fetchResourceAssignments function to update the UI
          fetchResourceAssignments();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to resource assignments changes');
        }
      });

    return () => {
      console.log('🔌 Cleaning up realtime subscription for resource assignments');
      supabase.removeChannel(channel);
    };
  }, [project.id]);

  // Fonction pour charger les fichiers du projet
  const fetchProjectFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from('project-files')
        .list(`projects/${project.id}`, {
          limit: 10,
          offset: 0
        });
      
      if (error) {
        console.error("Erreur chargement fichiers:", error);
      } else if (files && files.length > 0) {
        // Filtrer les fichiers réels (pas les placeholders)
        const realFiles = files.filter(file => 
          !file.name.startsWith('.') && 
          file.name !== 'undefined' &&
          file.metadata
        );
        setProjectFiles(realFiles);
      }
    } catch (error) {
      console.error("Erreur inattendue chargement fichiers:", error);
    }
  };

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
          seniority,
          languages,
          expertises,
          candidate_id,
          candidate_profiles!candidate_id (
            first_name,
            last_name,
            daily_rate
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
    
    // Si le projet est en play sans kickoff (tous ont accepté mais pas encore de planning)
    if (isPlayWithoutKickoff) {
      console.log('🚀 Opening kickoff dialog for play project without tools');
      setShowKickoff(true);
    } else if (project.status === 'pause' || project.status === 'attente-team') {
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
      console.log('🚀 startProject called with kickoffISO:', kickoffISO);
      setIsSyncing(true);
      
      // Trigger the project setup with kickoff
      if (onStart) {
        console.log('✅ Calling onStart with:', { id: project.id, title: project.title, kickoffISO });
        await onStart({ id: project.id, title: project.title, kickoffISO });
      } else {
        console.error('❌ onStart is not defined!');
        toast.error('Fonction de démarrage non définie');
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

  // Calculer la progression des ressources avec useMemo pour mise à jour réactive
  const bookingProgress = useMemo(() => {
    console.log('📊 Recalculating booking progress with', resourceAssignments.length, 'assignments');
    if (resourceAssignments.length === 0) return { percentage: 0, text: 'Aucune ressource' };
    
    // Vérifier les statuts de booking
    const bookedCount = resourceAssignments.filter(assignment => 
      assignment.booking_status === 'accepted'
    ).length;
    const percentage = (bookedCount / resourceAssignments.length) * 100;
    
    console.log('✅ Booking progress:', bookedCount, '/', resourceAssignments.length, '=', percentage + '%');
    
    return {
      percentage,
      text: `${bookedCount}/${resourceAssignments.length} ressources confirmées`
    };
  }, [resourceAssignments]); // Recalculer quand resourceAssignments change
  
  // Check if team booking has been requested (resources in 'recherche' status)
  const hasBookingInProgress = () => {
    return resourceAssignments.some(assignment => assignment.booking_status === 'recherche');
  };

  // Check if resources exist but no booking has been requested yet (in 'draft' status)
  const hasResourcesInDraft = () => {
    return resourceAssignments.some(assignment => assignment.booking_status === 'draft');
  };

  const allResourcesBooked = resourceAssignments.every(assignment => 
    assignment.booking_status === 'accepted'
  );
  
  // Déterminer si le projet peut être démarré
  // On peut démarrer UNIQUEMENT quand toutes les ressources humaines sont confirmées (IA toujours disponible)
  // Inclure aussi les projets 'play' qui n'ont pas encore d'outils collaboratifs (pas de planning)
  const allResourcesAccepted = resourceAssignments.length > 0 && 
    resourceAssignments.every(assignment => {
      // Les IA sont toujours disponibles
      if (assignment.hr_profiles?.is_ai) return true;
      // Les ressources humaines doivent être acceptées
      return assignment.booking_status === 'accepted';
    });

  // Un projet 'play' sans outils collaboratifs est un projet qui vient d'être accepté par tous
  // mais qui n'a pas encore eu son kickoff
  const isPlayWithoutKickoff = project.status === 'play' && !project.planning_shared;
  
  const canStartProject = ((project.status === 'pause' || project.status === 'attente-team') || isPlayWithoutKickoff) && 
    allResourcesAccepted;
  
  console.log('🎯 Project', project.id, 'start conditions:');
  console.log('  - Status:', project.status);
  console.log('  - Planning shared:', project.planning_shared);
  console.log('  - Is play without kickoff:', isPlayWithoutKickoff);
  console.log('  - All resources accepted:', allResourcesAccepted);
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
                    <DropdownMenuItem onClick={() => onView(project.id)} className="hover:bg-[#F7F8FA] text-[#0E0F12]">
                      <Users className="h-4 w-4 mr-2" />
                      Modifier l'équipe
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowEditModal(true)} className="hover:bg-[#F7F8FA] text-[#0E0F12]">
                      <Edit className="h-4 w-4 mr-2" />
                      Éditer le projet
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
        
          {/* Indicateur Schedule-X pour les projets démarrés */}
          {project.status === 'play' && (project.metadata?.scheduleX?.calendar_created || project.metadata?.calcom?.calendar_created) && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex flex-col gap-2">
                {/* Calendrier équipe */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      📅 Calendrier équipe actif
                    </span>
                  </div>
                  <a 
                    href={project.metadata.scheduleX?.calendar_url || project.metadata.calcom?.calendar_url || "/calendar"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    Voir le calendrier
                  </a>
                </div>
                
                {/* Date de kickoff */}
                {(project.metadata.scheduleX?.kickoff_date || project.metadata.calcom?.kickoff_date) && (
                  <div className="flex items-center justify-between pt-2 border-t border-green-200">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-700">
                        Kickoff: {new Date(project.metadata.scheduleX?.kickoff_date || project.metadata.calcom?.kickoff_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {(project.metadata.scheduleX?.kickoff_meeting_url || project.metadata.calcom?.kickoff_meeting_url) && (
                      <a 
                        href={project.metadata.scheduleX?.kickoff_meeting_url || project.metadata.calcom?.kickoff_meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                      >
                        <Video className="w-3 h-3" />
                        Rejoindre
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        
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

            {/* Fichiers attachés */}
            {projectFiles.length > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#ECEEF1]">
                <Paperclip className="h-4 w-4 text-[#7B3EF4]" />
                <span className="text-sm font-medium text-[#0E0F12]">
                  {projectFiles.length} fichier{projectFiles.length > 1 ? 's' : ''} attaché{projectFiles.length > 1 ? 's' : ''}
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
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        hasBooked 
                          ? 'bg-green-100 text-green-700 font-medium border border-green-200' 
                          : 'bg-[#F4F6F9] text-[#0E0F12] border border-gray-200'
                      }`}
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTeamModal(true)}
                className="flex items-center gap-1.5 text-sm text-[#0E0F12] hover:bg-[#F7F8FA]"
              >
                <Users className="h-4 w-4" />
                Équipe
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowProjectDetailsModal(true)}
                className="flex items-center gap-1.5 text-sm text-[#0E0F12] hover:bg-[#F7F8FA]"
              >
                <Info className="h-4 w-4" />
                Détails
              </Button>
            </div>

            {/* CTA principal unique selon l'état */}
            {(project.status === 'pause' || project.status === 'attente-team' || isPlayWithoutKickoff) && (
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

            {/* Pause pour les projets en cours qui ont déjà des outils collaboratifs */}
            {project.status === 'play' && !isPlayWithoutKickoff && (
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

      {/* Modal Constitution de l'équipe */}
      <FullScreenModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title="Constitution de l'équipe"
        description={`Équipe du projet "${project.title}"`}
      >
        <div className="space-y-4">
          {resourceAssignments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Aucune ressource définie pour ce projet</p>
              <Button
                onClick={() => {
                  setShowTeamModal(false);
                  onView(project.id);
                }}
                className="mt-4"
              >
                Définir l'équipe
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Progression de l'équipe</p>
                    <p className="text-lg font-semibold text-purple-900 mt-1">{bookingProgress.text}</p>
                  </div>
                  <div className="text-3xl font-bold text-purple-700">
                    {Math.round(bookingProgress.percentage)}%
                  </div>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2 mt-3">
                  <div 
                    className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${bookingProgress.percentage}%` }}
                  />
                </div>
              </div>

              {resourceAssignments.map((assignment, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {profileNames[assignment.profile_id] || 'Poste non défini'}
                        </h4>
                        <p className="text-sm text-gray-600">{assignment.seniority || 'Séniorité non définie'}</p>
                        {assignment.languages && assignment.languages.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">Langues:</span> {assignment.languages.join(', ')}
                          </p>
                        )}
                        {assignment.expertises && assignment.expertises.length > 0 && (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Expertises:</span> {assignment.expertises.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {assignment.booking_status === 'accepted' ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        ✓ Confirmé
                      </Badge>
                    ) : assignment.booking_status === 'recherche' ? (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                        En recherche
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Brouillon
                      </Badge>
                    )}
                  </div>
                  
                  {assignment.booking_status === 'accepted' && assignment.candidate_profiles && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm">
                        <span className="text-gray-500">Candidat assigné: </span>
                        <span className="font-medium text-gray-900">
                          {assignment.candidate_profiles.first_name} {assignment.candidate_profiles.last_name}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {assignment.calculated_price && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Tarif</span>
                        <span className="font-semibold text-gray-900">
                          {assignment.calculated_price.toFixed(2)}€/min
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Prix total par minute</span>
                  <span className="text-xl font-bold text-purple-700">
                    {calculateTotalPricePerMinute().toFixed(2)}€/min
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </FullScreenModal>

      {/* Modal Détails du projet */}
      <FullScreenModal
        isOpen={showProjectDetailsModal}
        onClose={() => setShowProjectDetailsModal(false)}
        title={project.title}
        description="Détails complets du projet"
      >
        <div className="space-y-6">
          {/* Description */}
          {project.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Informations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Date de début</span>
                </div>
                <p className="font-semibold">
                  {formatDate(project.date)}
                </p>
              </div>

              {project.dueDate && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Date de fin</span>
                  </div>
                  <p className="font-semibold">
                    {formatDate(project.dueDate)}
                  </p>
                </div>
              )}

              {project.clientBudget && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-purple-600 mb-1">
                    <Euro className="h-4 w-4" />
                    <span>Budget du projet</span>
                  </div>
                  <p className="font-semibold text-purple-700">
                    {formatCurrency(project.clientBudget)}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Info className="h-4 w-4" />
                  <span>Statut</span>
                </div>
                <Badge variant={project.status === 'play' ? 'default' : 'secondary'}>
                  {project.status === 'play' ? 'En cours' : 
                   project.status === 'pause' ? 'En pause' : 
                   project.status === 'attente-team' ? 'En attente' : 
                   project.status === 'completed' ? 'Terminé' : project.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Fichiers attachés */}
          {projectFiles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Fichiers attachés ({projectFiles.length})
              </h3>
              <div className="space-y-2">
                {projectFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">{file.name}</span>
                      {file.metadata?.size && (
                        <span className="text-xs text-gray-500">
                          ({(file.metadata.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const { data } = await supabase.storage
                          .from('project-files')
                          .download(`projects/${project.id}/${file.name}`);
                        if (data) {
                          const url = URL.createObjectURL(data);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = file.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </FullScreenModal>
    </>
  );
}