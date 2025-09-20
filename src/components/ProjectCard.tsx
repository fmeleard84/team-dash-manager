import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { FullScreenModal, ModalActions } from "./ui/fullscreen-modal";
import { Play, Pause, Eye, Trash2, ExternalLink, Users, Loader2, MoreVertical, Edit, Clock, TrendingUp, CheckCircle2, AlertCircle, Rocket, Calendar, Euro, Archive, RotateCcw, Paperclip, Download, Info, FileText, Video, Link2, CreditCard } from "lucide-react";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserAvatarNeon } from '@/components/ui/user-avatar-neon';
import { useAuth } from "@/contexts/AuthContext";
import { KickoffDialog } from "@/components/KickoffDialog";
import { buildFunctionHeaders } from "@/lib/functionAuth";
import { PriceCalculator } from "@/services/PriceCalculator";
import { CandidateFormatter } from "@/services/CandidateFormatter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditProjectModal from "@/components/EditProjectModal";
import { useClientCredits } from '@/hooks/useClientCredits';
import { StripePaymentModal } from './payment/StripePaymentModal';
import { useTranslation } from 'react-i18next';

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
    base_price?: number;
  };
  candidate_profiles?: {
    first_name: string;
    last_name: string;
    daily_rate?: number;
  };
  seniority?: string;
  languages?: string[];
  expertises?: string[];
  industries?: string[];
  candidate_id?: string;
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
  // Props pour l'optimisation des performances
  preLoadedAssignments?: ResourceAssignment[]; // Si fourni, utilise ces données au lieu de faire une requête
  skipDataFetching?: boolean; // Si true, désactive toutes les requêtes et le polling
}

interface PlankaProject {
  planka_url: string;
}

export function ProjectCard({
  project,
  onStatusToggle,
  onDelete,
  onView,
  onStart,
  onEdit,
  onArchive,
  onUnarchive,
  isArchived = false,
  refreshTrigger,
  preLoadedAssignments,
  skipDataFetching = false
}: ProjectCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { checkCreditsForAction, formatBalance } = useClientCredits();
  const [plankaProject, setPlankaProject] = useState<PlankaProject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Utiliser les données pré-chargées si disponibles
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignment[]>(preLoadedAssignments || []);
  const [profileNames, setProfileNames] = useState<Record<string, string>>(() => {
    // Si on a des données pré-chargées, extraire les noms tout de suite
    if (preLoadedAssignments) {
      const names: Record<string, string> = {};
      preLoadedAssignments.forEach((assignment) => {
        if (assignment.hr_profiles?.name) {
          names[assignment.profile_id] = assignment.hr_profiles.name;
        }
      });
      return names;
    }
    return {};
  });
  const [isBookingTeam, setIsBookingTeam] = useState(false);
  const [showKickoff, setShowKickoff] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isBookingRequested, setIsBookingRequested] = useState(false);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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

    resourceAssignments.forEach((assignment: any) => {
      // Utiliser hr_profiles.base_price pour TOUTES les ressources (IA et humaines)
      if (assignment.hr_profiles?.base_price) {
        totalPerMinute += assignment.hr_profiles.base_price;
      }
    });

    return totalPerMinute;
  };

  useEffect(() => {
    // Ne pas faire de requête si on a déjà les données ou si on doit skipper
    if (!skipDataFetching && !preLoadedAssignments) {
      fetchResourceAssignments();
    }
  }, [project.id, refreshTrigger]);

  // Also refresh when component mounts
  useEffect(() => {
    if (!skipDataFetching && !preLoadedAssignments) {
      const timer = setTimeout(() => {
        fetchResourceAssignments();
        fetchProjectFiles();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Check if booking is in progress based on resource assignment status
  useEffect(() => {
    if (hasBookingInProgress()) {
      setIsBookingRequested(true);
    } else if (resourceAssignments.length > 0 && !hasBookingInProgress()) {
      setIsBookingRequested(false);
    }
  }, [resourceAssignments]);

  // Reload resource assignments when page regains focus (useful when returning from ReactFlow)
  useEffect(() => {
    // Pas de polling si on utilise des données pré-chargées
    if (skipDataFetching || preLoadedAssignments) {
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let attemptCount = 0;
    const maxAttempts = 10;

    const startPolling = () => {
      attemptCount = 0;

      intervalId = setInterval(async () => {
        attemptCount++;

        // Utiliser la même logique que fetchResourceAssignments avec jointure directe
        const { data } = await supabase
          .from('hr_resource_assignments')
          .select(`
            id,
            profile_id,
            booking_status,
            seniority,
            languages,
            expertises,
            candidate_id,
            node_data,
            candidate_profiles (
              first_name,
              last_name,
              daily_rate
            ),
            hr_profiles (
              id,
              name,
              base_price,
              is_ai
            )
          `)
          .eq('project_id', project.id);

        if (data && data.length > 0) {
          // Les données sont déjà enrichies grâce à la jointure directe
          setResourceAssignments([...data]);

          // Remplir profileNames
          const names: Record<string, string> = {};
          data.forEach((assignment: any) => {
            if (assignment.hr_profiles?.name) {
              names[assignment.profile_id] = assignment.hr_profiles.name;
            }
          });
          setProfileNames(names);
        }

        // Stop polling after finding resources or max attempts
        if ((data && data.length > 0) || attemptCount >= maxAttempts) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }, 3000); // Réduit de 500ms à 3s pour éviter la surcharge
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
          // Refresh resource assignments when any change occurs
          // Call the main fetchResourceAssignments function to update the UI
          fetchResourceAssignments();
        }
      )
      .subscribe((status) => {
        // Subscription ready
      });

    return () => {
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
    try {
      // Récupérer les assignments AVEC la jointure hr_profiles directe
      // Ajout d'un timeout pour éviter les blocages
      const { data, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          booking_status,
          seniority,
          languages,
          expertises,
          candidate_id,
          candidate_profiles (
            first_name,
            last_name,
            daily_rate
          ),
          hr_profiles (
            id,
            name,
            base_price,
            is_ai
          )
        `)
        .eq('project_id', project.id);

      if (error) {
        console.error('Error fetching resource assignments:', error);
        return;
      }

      // Les données sont déjà enrichies grâce à la jointure directe
      const enrichedData = data || [];

      // Mettre à jour les ressources
      setResourceAssignments([...enrichedData]);

      // Remplir profileNames avec les noms des métiers depuis hr_profiles
      const names: Record<string, string> = {};
      enrichedData.forEach((assignment: any) => {
        if (assignment.hr_profiles?.name) {
          names[assignment.profile_id] = assignment.hr_profiles.name;
        }
      });
      setProfileNames(names);

      // Récupérer les noms des profils HR séparément (ancien code - peut être retiré)
      if (false && data && data.length > 0) {
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
        
        // Resources found
      }
    } catch (error) {
      console.error('❌ Exception:', error);
    }
  };

  const handleStatusToggle = async () => {
    // Vérifier les crédits avant de démarrer
    const creditCheck = checkCreditsForAction('Démarrer un projet', 5000);
    if (!creditCheck.success) {
      toast.error(creditCheck.message);
      setShowPaymentModal(true);
      return;
    }

    // On peut démarrer le projet dès qu'il y a des ressources
    if ((project.status === 'pause' || project.status === 'attente-team') && resourceAssignments.length === 0) {
      toast.error('Vous devez d\'abord créer une équipe pour ce projet');
      return;
    }
    
    // Si le projet est en play sans kickoff (tous ont accepté mais pas encore de planning)
    if (isPlayWithoutKickoff) {
      // Opening kickoff dialog for play project without tools
      setShowKickoff(true);
    } else if (project.status === 'pause' || project.status === 'attente-team') {
      // If starting, show kickoff dialog first
      setShowKickoff(true);
    } else if (project.status === 'play') {
      // If pausing from play status, call toggle with current status
      await onStatusToggle(project.id, project.status);
    }
  };

  // Fonction temporaire pour corriger les statuts IA
  const fixIAStatuses = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fix-ia-booking-status');
      if (error) throw error;
      toast.success(data.message || 'Statuts IA corrigés');
      await fetchResourceAssignments();
    } catch (error) {
      console.error('Error fixing IA statuses:', error);
      toast.error('Erreur lors de la correction des statuts IA');
    }
  };

  const handleBookingTeam = async () => {
    // Vérifier les crédits avant de booker une équipe
    const creditCheck = checkCreditsForAction('Booker une équipe', 5000);
    if (!creditCheck.success) {
      toast.error(creditCheck.message);
      setShowPaymentModal(true);
      return;
    }

    setIsBookingTeam(true);
    try {
      // Récupérer toutes les ressources du projet pour identifier les IA
      const { data: allAssignments, error: fetchError } = await supabase
        .from('hr_resource_assignments')
        .select('id, profile_id, booking_status, node_data')
        .eq('project_id', project.id);

      if (fetchError) {
        console.error('Error fetching assignments:', fetchError);
        throw fetchError;
      }

      // Récupérer les profils IA pour une vérification supplémentaire
      const { data: iaProfiles } = await supabase
        .from('hr_profiles')
        .select('id')
        .eq('is_ai', true);

      const iaProfileIds = iaProfiles?.map(p => p.id) || [];

      // Identifier les ressources IA et membres d'équipe qui doivent être auto-acceptées
      const iaAndTeamAssignmentIds = allAssignments
        ?.filter(a => {
          const nodeData = a.node_data as any;
          const isIAByNodeData = nodeData?.is_ai === true;
          const isIAByProfile = iaProfileIds.includes(a.profile_id);
          const isTeamMember = nodeData?.is_team_member === true;

          return isIAByNodeData || isIAByProfile || isTeamMember;
        })
        .map(a => a.id) || [];

      // Mettre à jour SEULEMENT les ressources humaines (non-IA, non-équipe) en statut 'recherche'
      const humanAssignments = allAssignments?.filter(a => {
        const nodeData = a.node_data as any;
        const isHuman = !nodeData?.is_ai && !nodeData?.is_team_member;
        const needsSearch = a.booking_status === 'draft' || a.booking_status === 'recherche';
        return isHuman && needsSearch;
      }) || [];

      if (humanAssignments.length > 0) {
        const humanAssignmentIds = humanAssignments.map(a => a.id);
        const { error: updateError } = await supabase
          .from('hr_resource_assignments')
          .update({ booking_status: 'recherche' })
          .in('id', humanAssignmentIds);

        if (updateError) {
          console.error('Error updating booking status:', updateError);
          throw updateError;
        }
      }

      // S'assurer que les ressources IA et équipe sont bien marquées comme 'accepted' (auto-booking)
      if (iaAndTeamAssignmentIds.length > 0) {
        const { error: iaUpdateError } = await supabase
          .from('hr_resource_assignments')
          .update({ booking_status: 'accepted' })
          .in('id', iaAndTeamAssignmentIds)
          .neq('booking_status', 'accepted'); // Ne mettre à jour que si pas déjà accepted

        if (iaUpdateError) {
          console.error('Error updating IA/team booking status:', iaUpdateError);
          // Ne pas faire échouer la requête pour ça
        }
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

      toast.success(data.message || "Recherche d'équipe lancée");
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
        await onStart({ id: project.id, title: project.title, kickoffISO });
      } else {
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
  }, [resourceAssignments]); // Recalculer quand resourceAssignments change
  
  // Check if team booking has been requested (resources in 'recherche' status)
  const hasBookingInProgress = () => {
    return resourceAssignments.some(assignment => assignment.booking_status === 'recherche');
  };

  // Check if resources exist but need booking (in 'draft' or 'recherche' status)
  const hasResourcesNeedingBooking = () => {
    // Vérifier s'il y a des assignments en draft ou recherche
    const needsBooking = resourceAssignments.some(assignment =>
      assignment.booking_status === 'draft' ||
      assignment.booking_status === 'recherche'
    );
    // Ou s'il n'y a aucune assignment (mais il pourrait y avoir des hr_resources)
    const hasNoAssignments = resourceAssignments.length === 0;
    return needsBooking || hasNoAssignments;
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
      <Card className="group relative border-0 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-blue-600/10 dark:from-purple-600/20 dark:via-pink-600/20 dark:to-blue-600/20 p-[1px] rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 hover:scale-[1.02]">
        <div className="relative bg-white dark:bg-gradient-to-br dark:from-[#0f172a] dark:via-[#1e1b4b] dark:to-[#312e81] rounded-2xl p-6">
        
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {(project.status === 'pause' || project.status === 'nouveaux') && (
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded shadow-md shadow-purple-500/30">
                    New
                  </Badge>
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">{project.title}</h3>
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1 mt-1">{project.description}</p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
                sideOffset={5}
                style={{ zIndex: 99999, position: 'relative' }}
              >
                {!isArchived && (
                  <>
                    <DropdownMenuItem onClick={() => onView(project.id)} className="hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      <Users className="h-4 w-4 mr-2" />
                      Modifier l'équipe
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowEditModal(true)} className="hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      <Edit className="h-4 w-4 mr-2" />
                      Éditer le projet
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onArchive?.(project.id)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archiver
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(project.id)}
                      className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
                {isArchived && (
                  <DropdownMenuItem
                    onClick={() => onUnarchive?.(project.id)}
                    className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('projects.actions.unarchive')}
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
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-500/20">
              <Euro className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 dark:text-gray-400 uppercase">Budget</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(project.clientBudget)}</span>
              </div>
            </div>
            
            {/* Date */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 border border-blue-500/20">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 dark:text-gray-400 uppercase">Début</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(project.date)}</span>
              </div>
            </div>

            {/* Prix total par minute */}
            {resourceAssignments.length > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-500/20">
                <Euro className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {PriceCalculator.formatMinuteRate(calculateTotalPricePerMinute())}
                </span>
              </div>
            )}

            {/* Fichiers attachés */}
            {projectFiles.length > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 border border-orange-500/20">
                <Paperclip className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {projectFiles.length} fichier{projectFiles.length > 1 ? 's' : ''} attaché{projectFiles.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Team progress - Design amélioré comme dans la popup */}
          {resourceAssignments.length > 0 && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 dark:from-primary-500/20 dark:to-secondary-500/20 rounded-lg p-3 border border-primary-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-primary-600 dark:text-primary-400">{t('team.progress')}</p>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">{bookingProgress.text}</p>
                  </div>
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {Math.round(bookingProgress.percentage)}%
                  </div>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 mt-2">
                  <div
                    className="h-1.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-300"
                    style={{ width: `${bookingProgress.percentage}%` }}
                  />
                </div>
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
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium border border-green-500/20'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
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
                className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-4 py-2 rounded-lg transition-all duration-200"
              >
                <Users className="h-4 w-4" />
                Équipe
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowProjectDetailsModal(true)}
                className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-4 py-2 rounded-lg transition-all duration-200"
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
                    {!canStartProject && hasResourcesNeedingBooking() && (
                      <Button
                        onClick={handleBookingTeam}
                        disabled={isBookingTeam || isBookingRequested}
                        className="h-11 px-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all duration-200 font-medium"
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
                        className="h-11 px-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all duration-200 font-medium"
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
                    {!canStartProject && !hasResourcesNeedingBooking() && (
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
                className="h-11 px-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all duration-200 font-medium"
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
        title={t('team.title')}
        description={`${t('team.projectTeam')} "${project.title}"`}
      >
        <div className="space-y-4">
          {resourceAssignments.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
              <Users className="h-12 w-12 mx-auto text-neutral-400 dark:text-neutral-600 mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">{t('team.noResourcesDefined')}</p>
              <Button
                onClick={() => {
                  setShowTeamModal(false);
                  onView(project.id);
                }}
                className="mt-4"
              >
                {t('team.defineTeam')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 dark:from-primary-500/20 dark:to-secondary-500/20 rounded-lg p-4 mb-6 border border-primary-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-600 dark:text-primary-400">{t('team.progress')}</p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-1">{bookingProgress.text}</p>
                  </div>
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {Math.round(bookingProgress.percentage)}%
                  </div>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mt-3">
                  <div
                    className="h-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-300"
                    style={{ width: `${bookingProgress.percentage}%` }}
                  />
                </div>
              </div>

              {resourceAssignments.map((assignment, index) => (
                <div key={index} className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-700/50 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900 dark:text-white">
                          {profileNames[assignment.profile_id] || t('team.positionUndefined')}
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{assignment.seniority || t('team.seniorityUndefined')}</p>
                        {assignment.languages && assignment.languages.length > 0 && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                            <span className="font-medium">{t('team.languages')}:</span> {assignment.languages.join(', ')}
                          </p>
                        )}
                        {assignment.expertises && assignment.expertises.length > 0 && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-500">
                            <span className="font-medium">{t('team.skills')}:</span> {assignment.expertises.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {assignment.booking_status === 'accepted' ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        ✓ {t('team.booking.accepted')}
                      </Badge>
                    ) : assignment.booking_status === 'recherche' ? (
                      <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                        {t('team.booking.searchingTeam')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {t('common.draft')}
                      </Badge>
                    )}
                  </div>
                  
                  {assignment.booking_status === 'accepted' && assignment.candidate_profiles && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                      <UserAvatarNeon
                        user={{
                          id: assignment.candidate_profiles.id,
                          firstName: assignment.candidate_profiles.first_name,
                          lastName: '', // Ne jamais afficher le nom de famille
                          name: CandidateFormatter.formatCandidateTitle({
                            first_name: assignment.candidate_profiles.first_name,
                            hr_profile: { name: profileNames[assignment.profile_id] || assignment.candidate_profiles.position }
                          }),
                          jobTitle: profileNames[assignment.profile_id] || assignment.candidate_profiles.position,
                          seniority: assignment.seniority,
                          status: 'online',
                          isValidated: true,
                          hourlyRate: assignment.candidate_profiles?.daily_rate ?
                            PriceCalculator.getDailyToHourlyRate(assignment.candidate_profiles.daily_rate) : undefined
                        }}
                        size="sm"
                        variant="detailed"
                        showStatus={true}
                        showRate={true}
                        showBadges={true}
                        className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2"
                      />
                    </div>
                  )}
                  
                  {assignment.candidate_profiles?.daily_rate && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t('team.rate')}</span>
                        <span className="font-semibold text-gray-900">
                          {PriceCalculator.formatPrice(PriceCalculator.getDailyToHourlyRate(assignment.candidate_profiles.daily_rate))}/h
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('projects.totalPricePerMinute')}</span>
                  <span className="text-xl font-bold text-purple-700">
                    {PriceCalculator.formatMinuteRate(calculateTotalPricePerMinute())}
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
        description={t('projects.fullDetails')}
      >
        <div className="space-y-6">
          {/* Description */}
          {project.description && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">{t('common.description')}</h3>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Informations */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">{t('common.info')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>{t('projects.startDate')}</span>
                </div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {formatDate(project.date)}
                </p>
              </div>

              {project.dueDate && (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>{t('projects.projectDeadline')}</span>
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {formatDate(project.dueDate)}
                  </p>
                </div>
              )}

              {project.clientBudget && (
                <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 dark:from-primary-500/20 dark:to-secondary-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 mb-1">
                    <Euro className="h-4 w-4" />
                    <span>{t('projects.projectBudget')}</span>
                  </div>
                  <p className="font-semibold text-primary-700 dark:text-primary-300">
                    {formatCurrency(project.clientBudget)}
                  </p>
                </div>
              )}

              <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  <Info className="h-4 w-4" />
                  <span>{t('common.status')}</span>
                </div>
                <Badge variant={project.status === 'play' ? 'default' : 'secondary'}>
                  {project.status === 'play' ? t('projects.status.inProgress') :
                   project.status === 'pause' ? t('projects.status.pause') :
                   project.status === 'attente-team' ? t('projects.status.waitingTeam') :
                   project.status === 'completed' ? t('projects.status.completed') : project.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Fichiers attachés */}
          {projectFiles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                {t('projects.card.attachments')} ({projectFiles.length})
              </h3>
              <div className="space-y-2">
                {projectFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{file.name}</span>
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

      {/* Modal de paiement Stripe */}
      <StripePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          toast.success('Crédits ajoutés avec succès');
        }}
        minimumAmount={50}
      />
    </>
  );
}