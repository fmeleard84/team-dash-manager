/**
 * UnifiedProjectCard - Composant unifié pour l'affichage des projets
 * Remplace TOUTES les variantes de ProjectCard existantes
 * Préserve 100% de la logique métier existante
 */

import { useState, useEffect, useMemo, ReactNode } from "react";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { UserAvatarNeon } from "../ui/user-avatar-neon";
import { FullScreenModal, ModalActions } from "../ui/fullscreen-modal";
import { KickoffDialog } from "../KickoffDialog";
import EditProjectModal from "../EditProjectModal";
import { StripePaymentModal } from "../payment/StripePaymentModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Play, Pause, Eye, Trash2, ExternalLink, Users, Loader2,
  MoreVertical, Edit, Clock, TrendingUp, CheckCircle2, AlertCircle,
  Rocket, Calendar, Euro, Archive, RotateCcw, Paperclip, Download,
  Info, FileText, Video, Link2, CreditCard, Shield, Target, Briefcase
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useClientCredits } from "@/hooks/useClientCredits";
import { useTranslation } from "react-i18next";
import { buildFunctionHeaders } from "@/lib/functionAuth";
import { PriceCalculator } from "@/services/PriceCalculator";
import { CandidateFormatter } from "@/services/CandidateFormatter";
import { cn } from "@/lib/utils";

// Types unifiés préservant toutes les structures existantes
interface Project {
  id: string;
  title: string;
  description?: string;
  price?: number;
  date: string;
  status: string;
  clientBudget?: number | null;
  dueDate?: string | null;
  total_compensation?: number;
  is_critical?: boolean;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  tags?: string[];
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ResourceAssignment {
  id: string;
  profile_id: string;
  booking_status: string;
  hr_profiles?: {
    name: string;
    is_ai?: boolean;
    base_price?: number;
    category?: string;
  };
  candidate_profiles?: {
    first_name: string;
    last_name: string;
    daily_rate?: number;
    email?: string;
    avatar_url?: string;
  };
  seniority?: string;
  languages?: string[];
  expertises?: string[];
  industries?: string[];
  candidate_id?: string;
  calculated_price?: number;
}

interface UnifiedProjectCardProps {
  // Props essentielles
  project: Project;
  variant?: 'client' | 'candidate' | 'admin' | 'default';

  // Actions callbacks
  onStatusToggle?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  onStart?: (project: { id: string; title: string; kickoffISO?: string }) => void | Promise<void>;
  onEdit?: () => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onAccept?: () => void;
  onDecline?: () => void;

  // État et options
  isArchived?: boolean;
  isAccepted?: boolean;
  showActions?: boolean;
  showTeam?: boolean;
  showBudget?: boolean;
  showFiles?: boolean;
  showProgress?: boolean;
  showTimeline?: boolean;
  refreshTrigger?: number;

  // Optimisation performances
  preLoadedAssignments?: ResourceAssignment[];
  skipDataFetching?: boolean;

  // Personnalisation
  className?: string;
  cardHeader?: ReactNode;
  cardFooter?: ReactNode;
  customActions?: ReactNode;
}

interface PlankaProject {
  planka_url: string;
  planka_board_id?: string;
}

interface ProjectFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export function UnifiedProjectCard({
  project,
  variant = 'default',
  onStatusToggle,
  onDelete,
  onView,
  onStart,
  onEdit,
  onArchive,
  onUnarchive,
  onAccept,
  onDecline,
  isArchived = false,
  isAccepted,
  showActions = true,
  showTeam = true,
  showBudget = true,
  showFiles = false,
  showProgress = true,
  showTimeline = false,
  refreshTrigger,
  preLoadedAssignments,
  skipDataFetching = false,
  className,
  cardHeader,
  cardFooter,
  customActions
}: UnifiedProjectCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { checkCreditsForAction, formatBalance } = useClientCredits();

  // États
  const [plankaProject, setPlankaProject] = useState<PlankaProject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignment[]>(preLoadedAssignments || []);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [acceptedResources, setAcceptedResources] = useState<ResourceAssignment[]>([]);
  const [pendingResources, setPendingResources] = useState<ResourceAssignment[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [totalProjectPrice, setTotalProjectPrice] = useState<number>(0);
  const [isKickoffModalOpen, setIsKickoffModalOpen] = useState(false);
  const [kickoffDate, setKickoffDate] = useState<string>("");
  const [kickoffTime, setKickoffTime] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(!skipDataFetching);

  // Calcul du statut visuel
  const getStatusColor = (status: string) => {
    const statusColors = {
      'pause': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'attente-team': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'play': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'archived': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return statusColors[status] || statusColors['pause'];
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'pause': <Pause className="w-4 h-4" />,
      'attente-team': <Clock className="w-4 h-4" />,
      'play': <Play className="w-4 h-4" />,
      'completed': <CheckCircle2 className="w-4 h-4" />,
      'archived': <Archive className="w-4 h-4" />,
      'cancelled': <AlertCircle className="w-4 h-4" />
    };
    return icons[status] || <Info className="w-4 h-4" />;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'pause': t?.('project.status.pause') || 'En pause',
      'attente-team': t?.('project.status.waiting') || 'En attente équipe',
      'play': t?.('project.status.active') || 'Actif',
      'completed': t?.('project.status.completed') || 'Terminé',
      'archived': t?.('project.status.archived') || 'Archivé',
      'cancelled': t?.('project.status.cancelled') || 'Annulé'
    };
    return labels[status] || status;
  };

  // Calcul de la progression de l'équipe
  const bookingProgress = useMemo(() => {
    if (!showProgress || resourceAssignments.length === 0) return 0;
    const accepted = resourceAssignments.filter(r => r.booking_status === 'accepted').length;
    return (accepted / resourceAssignments.length) * 100;
  }, [resourceAssignments, showProgress]);

  // Chargement des données (préserve toute la logique existante)
  useEffect(() => {
    if (skipDataFetching || !project.id) return;

    const loadProjectData = async () => {
      setIsLoadingAssignments(true);
      try {
        // Charger les ressources assignées
        const { data: assignments, error: assignmentsError } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            hr_profiles (
              name,
              is_ai,
              base_price,
              category
            ),
            candidate_profiles (
              first_name,
              last_name,
              daily_rate,
              email,
              avatar_url
            )
          `)
          .eq('project_id', project.id);

        if (!assignmentsError && assignments) {
          setResourceAssignments(assignments);

          // Séparer les ressources acceptées et en attente
          const accepted = assignments.filter(r => r.booking_status === 'accepted');
          const pending = assignments.filter(r => r.booking_status === 'recherche');
          setAcceptedResources(accepted);
          setPendingResources(pending);

          // Calculer le prix total
          const total = assignments.reduce((sum, r) => {
            const price = r.calculated_price ||
                         r.candidate_profiles?.daily_rate ||
                         r.hr_profiles?.base_price || 0;
            return sum + price;
          }, 0);
          setTotalProjectPrice(total);

          // Stocker les noms de profils
          const names: Record<string, string> = {};
          assignments.forEach(r => {
            if (r.hr_profiles?.name) {
              names[r.profile_id] = r.hr_profiles.name;
            }
          });
          setProfileNames(names);
        }

        // Charger les fichiers si nécessaire
        if (showFiles) {
          const { data: files } = await supabase
            .storage
            .from('project-files')
            .list(`projects/${project.id}`);

          if (files) {
            setProjectFiles(files.map(f => ({
              id: f.id,
              name: f.name,
              size: f.metadata?.size || 0,
              type: f.metadata?.mimetype || 'unknown'
            })));
          }
        }

        // Charger les infos Planka si c'est un projet actif
        if (project.status === 'play' && variant === 'client') {
          const { data: plankaData } = await supabase
            .from('planka_projects')
            .select('planka_url, planka_board_id')
            .eq('project_id', project.id)
            .single();

          if (plankaData) {
            setPlankaProject(plankaData);
          }
        }
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setIsLoadingAssignments(false);
      }
    };

    loadProjectData();

    // Polling pour les mises à jour temps réel (projets actifs seulement)
    let interval: NodeJS.Timeout;
    if (project.status === 'play' && !skipDataFetching) {
      interval = setInterval(loadProjectData, 30000); // 30 secondes
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [project.id, project.status, variant, showFiles, skipDataFetching, refreshTrigger]);

  // Handler pour synchronisation Planka (logique métier préservée)
  const handlePlankaSync = async () => {
    if (!plankaProject?.planka_url) return;

    setIsSyncing(true);
    try {
      const response = await fetch(
        `${supabase.storage.from('').getPublicUrl('').data.publicUrl}/functions/v1/sync-planka-board`,
        {
          method: 'POST',
          headers: buildFunctionHeaders(),
          body: JSON.stringify({
            projectId: project.id,
            plankaUrl: plankaProject.planka_url
          })
        }
      );

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      toast.success(t?.('project.sync.success') || 'Synchronisation réussie');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(t?.('project.sync.error') || 'Erreur de synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler pour le démarrage du projet (kickoff)
  const handleStartProject = async () => {
    if (!kickoffDate || !kickoffTime) {
      toast.error(t?.('project.kickoff.dateRequired') || 'Date et heure requises');
      return;
    }

    const kickoffISO = `${kickoffDate}T${kickoffTime}:00`;

    if (onStart) {
      await onStart({
        id: project.id,
        title: project.title,
        kickoffISO
      });
    }

    setIsKickoffModalOpen(false);
    toast.success(t?.('project.kickoff.success') || 'Projet démarré avec succès');
  };

  // Actions spécifiques selon le variant
  const renderActions = () => {
    if (!showActions) return customActions;

    const commonActions = (
      <>
        {onView && (
          <DropdownMenuItem onClick={() => onView(project.id)}>
            <Eye className="mr-2 h-4 w-4" />
            {t?.('common.view') || 'Voir'}
          </DropdownMenuItem>
        )}
        {onEdit && project.status !== 'completed' && (
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            {t?.('common.edit') || 'Modifier'}
          </DropdownMenuItem>
        )}
      </>
    );

    if (variant === 'client') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {commonActions}
            {project.status === 'attente-team' && onStart && (
              <DropdownMenuItem onClick={() => setIsKickoffModalOpen(true)}>
                <Rocket className="mr-2 h-4 w-4" />
                {t?.('project.start') || 'Démarrer'}
              </DropdownMenuItem>
            )}
            {project.status === 'play' && plankaProject && (
              <DropdownMenuItem onClick={() => window.open(plankaProject.planka_url, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t?.('project.planka') || 'Ouvrir Planka'}
              </DropdownMenuItem>
            )}
            {!isArchived && onArchive && (
              <DropdownMenuItem onClick={() => onArchive(project.id)}>
                <Archive className="mr-2 h-4 w-4" />
                {t?.('project.archive') || 'Archiver'}
              </DropdownMenuItem>
            )}
            {isArchived && onUnarchive && (
              <DropdownMenuItem onClick={() => onUnarchive(project.id)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t?.('project.unarchive') || 'Désarchiver'}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(project.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t?.('common.delete') || 'Supprimer'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    if (variant === 'candidate') {
      return (
        <div className="flex gap-2">
          {!isAccepted && onAccept && (
            <Button
              onClick={onAccept}
              size="sm"
              className="bg-green-500 hover:bg-green-600"
            >
              {t?.('project.accept') || 'Accepter'}
            </Button>
          )}
          {!isAccepted && onDecline && (
            <Button
              onClick={onDecline}
              size="sm"
              variant="destructive"
            >
              {t?.('project.decline') || 'Refuser'}
            </Button>
          )}
          {isAccepted && onView && (
            <Button
              onClick={() => onView(project.id)}
              size="sm"
              variant="outline"
            >
              <Eye className="mr-2 h-4 w-4" />
              {t?.('project.access') || 'Accéder'}
            </Button>
          )}
        </div>
      );
    }

    return customActions || (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {commonActions}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Rendu principal du composant
  return (
    <>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-xl hover:scale-[1.02]",
        "bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-700",
        isArchived && "opacity-60",
        project.is_critical && "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
        className
      )}>
        {/* Header personnalisé si fourni */}
        {cardHeader}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">
                  {project.title}
                </h3>
                {project.is_critical && (
                  <Badge variant="destructive" className="animate-pulse">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t?.('project.critical') || 'Critique'}
                  </Badge>
                )}
                {project.priority === 'high' && (
                  <Badge className="bg-orange-500">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {t?.('project.priority.high') || 'Priorité haute'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("flex items-center gap-1", getStatusColor(project.status))}>
                  {getStatusIcon(project.status)}
                  {getStatusLabel(project.status)}
                </Badge>

                {project.category && (
                  <Badge variant="outline">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {project.category}
                  </Badge>
                )}

                {showFiles && projectFiles.length > 0 && (
                  <Badge variant="outline">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {projectFiles.length} {t?.('project.files') || 'fichiers'}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {renderActions()}
            </div>
          </div>

          {/* Progress bar si équipe en cours de constitution */}
          {showProgress && resourceAssignments.length > 0 && project.status === 'attente-team' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>{t?.('project.teamProgress') || 'Constitution équipe'}</span>
                <span>{Math.round(bookingProgress)}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${bookingProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Description */}
          {project.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Équipe */}
          {showTeam && acceptedResources.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t?.('project.team') || 'Équipe'} ({acceptedResources.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {acceptedResources.slice(0, 5).map((resource) => (
                  <div key={resource.id} className="flex items-center gap-2">
                    <UserAvatarNeon
                      email={resource.candidate_profiles?.email}
                      firstName={resource.candidate_profiles?.first_name}
                      lastName={resource.candidate_profiles?.last_name}
                      size="sm"
                    />
                    <div className="text-xs">
                      <div className="font-medium text-neutral-700 dark:text-neutral-300">
                        {CandidateFormatter.formatCandidateName(resource.candidate_profiles)}
                      </div>
                      <div className="text-neutral-500">
                        {resource.hr_profiles?.name}
                      </div>
                    </div>
                  </div>
                ))}
                {acceptedResources.length > 5 && (
                  <Badge variant="outline">
                    +{acceptedResources.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Infos budgétaires */}
          {showBudget && (project.clientBudget || totalProjectPrice > 0) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {project.clientBudget && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mb-1">
                    <Target className="w-3 h-3" />
                    {t?.('project.budget') || 'Budget'}
                  </div>
                  <div className="font-semibold text-neutral-900 dark:text-white">
                    {PriceCalculator.formatDailyRate(project.clientBudget)}
                  </div>
                </div>
              )}
              {totalProjectPrice > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mb-1">
                    <Euro className="w-3 h-3" />
                    {t?.('project.cost') || 'Coût équipe'}
                  </div>
                  <div className="font-semibold text-neutral-900 dark:text-white">
                    {PriceCalculator.formatDailyRate(totalProjectPrice)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {showTimeline && project.dueDate && (
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <Calendar className="w-4 h-4" />
              <span>{t?.('project.deadline') || 'Échéance'}: </span>
              <span className="font-medium">
                {new Date(project.dueDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {project.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        {/* Footer personnalisé si fourni */}
        {cardFooter}
      </Card>

      {/* Modals */}
      {isKickoffModalOpen && (
        <KickoffDialog
          isOpen={isKickoffModalOpen}
          onClose={() => setIsKickoffModalOpen(false)}
          onConfirm={handleStartProject}
          projectTitle={project.title}
          kickoffDate={kickoffDate}
          kickoffTime={kickoffTime}
          onDateChange={setKickoffDate}
          onTimeChange={setKickoffTime}
        />
      )}

      {isEditModalOpen && onEdit && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            onEdit();
          }}
          projectId={project.id}
        />
      )}

      {isPaymentModalOpen && (
        <StripePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          amount={totalProjectPrice}
          projectId={project.id}
          projectTitle={project.title}
        />
      )}

      {/* Modal de détails pour vue complète */}
      {isDetailsModalOpen && (
        <FullScreenModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={project.title}
          subtitle={project.description}
        >
          <div className="p-6">
            {/* Contenu détaillé du projet */}
            <div className="space-y-6">
              {/* Section équipe complète */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {t?.('project.teamComplete') || 'Équipe complète'}
                </h3>
                {/* Afficher tous les membres de l'équipe */}
              </div>

              {/* Section fichiers */}
              {projectFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {t?.('project.attachedFiles') || 'Fichiers attachés'}
                  </h3>
                  {/* Liste des fichiers avec téléchargement */}
                </div>
              )}
            </div>
          </div>

          <ModalActions>
            <Button onClick={() => setIsDetailsModalOpen(false)}>
              {t?.('common.close') || 'Fermer'}
            </Button>
          </ModalActions>
        </FullScreenModal>
      )}
    </>
  );
}

// Exports de compatibilité pour migration progressive
export const ClientProjectCard = (props: Omit<UnifiedProjectCardProps, 'variant'>) => (
  <UnifiedProjectCard {...props} variant="client" />
);

export const CandidateProjectCard = (props: Omit<UnifiedProjectCardProps, 'variant'>) => (
  <UnifiedProjectCard {...props} variant="candidate" />
);

export const AdminProjectCard = (props: Omit<UnifiedProjectCardProps, 'variant'>) => (
  <UnifiedProjectCard {...props} variant="admin" />
);

// Export par défaut pour remplacement direct
export default UnifiedProjectCard;