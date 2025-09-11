import { useState, useEffect, useMemo } from "react";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Progress from '@radix-ui/react-progress';
import * as Tooltip from '@radix-ui/react-tooltip';
import { 
  Play, 
  Pause, 
  Users, 
  MoreVertical, 
  Edit, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Euro, 
  Archive, 
  RotateCcw, 
  Paperclip, 
  Download, 
  Info,
  Loader2,
  User,
  Briefcase,
  Globe,
  Code,
  DollarSign,
  AlertCircle,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { KickoffDialog } from "@/components/KickoffDialog";
import EditProjectModal from "@/components/EditProjectModal";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { FullScreenModal } from "@/components/ui/fullscreen-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/Card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  calculated_price?: number;
  seniority?: string;
  languages?: string[];
  expertises?: string[];
  candidate_id?: string;
  candidate_profiles?: {
    first_name: string;
    last_name: string;
    daily_rate?: number;
  };
}

interface RadixProjectCardProps {
  project: Project;
  onStatusToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onStart?: (project: { id: string; title: string; kickoffISO?: string }) => void | Promise<void>;
  onEdit?: () => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  isArchived?: boolean;
  refreshTrigger?: number;
}

export function RadixProjectCard({ 
  project, 
  onStatusToggle, 
  onDelete, 
  onView, 
  onStart, 
  onEdit, 
  onArchive, 
  onUnarchive, 
  isArchived = false, 
  refreshTrigger 
}: RadixProjectCardProps) {
  const { user } = useAuth();
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Fetch des ressources
  useEffect(() => {
    fetchResourceAssignments();
    fetchProjectFiles();
  }, [project.id, refreshTrigger]);

  const fetchResourceAssignments = async () => {
    const { data: assignments, error } = await supabase
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
      console.error('Error fetching assignments:', error);
      return;
    }

    if (assignments) {
      setResourceAssignments(assignments);
      
      if (assignments.length > 0) {
        const profileIds = [...new Set(assignments.map(a => a.profile_id).filter(Boolean))];
        
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('hr_profiles')
            .select('id, name')
            .in('id', profileIds);
          
          if (profiles) {
            const names: Record<string, string> = {};
            profiles.forEach(p => {
              names[p.id] = p.name;
            });
            setProfileNames(names);
          }
        }
      }
    }
  };

  const fetchProjectFiles = async () => {
    const { data: files } = await supabase
      .storage
      .from('project-files')
      .list(`projects/${project.id}`, {
        limit: 100
      });

    setProjectFiles(files || []);
  };

  const bookingProgress = useMemo(() => {
    if (resourceAssignments.length === 0) {
      return { percentage: 0, text: "Aucune ressource définie" };
    }

    const acceptedCount = resourceAssignments.filter(r => r.booking_status === 'accepted').length;
    const percentage = (acceptedCount / resourceAssignments.length) * 100;

    if (percentage === 100) {
      return { percentage: 100, text: "Équipe complète !" };
    } else if (percentage > 0) {
      return { percentage, text: `${acceptedCount}/${resourceAssignments.length} confirmés` };
    } else {
      return { percentage: 0, text: "En attente de confirmation" };
    }
  }, [resourceAssignments]);

  const canStartProject = resourceAssignments.length > 0 && 
    resourceAssignments.every(r => r.booking_status === 'accepted');

  const hasResourcesInDraft = () => {
    return resourceAssignments.some(r => r.booking_status === 'draft');
  };

  const handleBookingTeam = async () => {
    setIsBookingTeam(true);
    try {
      const draftResources = resourceAssignments.filter(r => r.booking_status === 'draft');
      
      for (const resource of draftResources) {
        await supabase
          .from('hr_resource_assignments')
          .update({ booking_status: 'recherche' })
          .eq('id', resource.id);
      }

      setIsBookingRequested(true);
      toast.success("Recherche de candidats lancée avec succès !");
      await fetchResourceAssignments();
    } catch (error) {
      console.error('Error booking team:', error);
      toast.error("Erreur lors du lancement de la recherche");
    } finally {
      setIsBookingTeam(false);
    }
  };

  const handleStatusToggle = () => {
    if (project.status === 'pause' || project.status === 'attente-team') {
      setShowKickoff(true);
    } else {
      onStatusToggle(project.id, 'pause');
    }
  };

  const startProject = async (kickoffISO: string) => {
    setIsSyncing(true);
    try {
      if (onStart) {
        await onStart({ 
          id: project.id, 
          title: project.title, 
          kickoffISO 
        });
      }
      setShowKickoff(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusInfo = () => {
    switch (project.status) {
      case 'pause':
        return {
          label: 'En pause',
          color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
          icon: <Pause className="h-3.5 w-3.5" />
        };
      case 'attente-team':
        return {
          label: 'En attente équipe',
          color: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
          icon: <Users className="h-3.5 w-3.5" />
        };
      case 'play':
        return {
          label: 'En cours',
          color: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
          icon: <Play className="h-3.5 w-3.5" />
        };
      case 'completed':
        return {
          label: 'Terminé',
          color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />
        };
      default:
        return {
          label: project.status,
          color: 'bg-muted text-muted-foreground border-border',
          icon: null
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <Tooltip.Provider>
        {/* Modern Card with Tailwind */}
        <div className="group relative bg-card rounded-xl border border-border hover:border-purple-500/50 dark:hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg dark:hover:shadow-purple-500/10 overflow-hidden">
          {/* Card Header */}
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {project.title}
                </h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Status Badge */}
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
                  statusInfo.color
                )}>
                  {statusInfo.icon}
                  <span>{statusInfo.label}</span>
                </div>
                
                {/* Dropdown Menu */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content 
                      className="min-w-[200px] bg-popover rounded-lg p-1 shadow-lg border border-border"
                      sideOffset={5}
                    >
                      <DropdownMenu.Item 
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer outline-none"
                        onClick={() => onView(project.id)}
                      >
                        <Users className="h-4 w-4" />
                        Éditer l'équipe
                      </DropdownMenu.Item>
                      
                      <DropdownMenu.Item 
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer outline-none"
                        onClick={() => setShowEditModal(true)}
                      >
                        <Edit className="h-4 w-4" />
                        Modifier le projet
                      </DropdownMenu.Item>
                      
                      <DropdownMenu.Separator className="h-[1px] bg-border my-1" />
                      
                      {!isArchived ? (
                        <DropdownMenu.Item 
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer outline-none"
                          onClick={() => setShowDeleteDialog(true)}
                        >
                          <Archive className="h-4 w-4" />
                          Archiver / Supprimer
                        </DropdownMenu.Item>
                      ) : (
                        <DropdownMenu.Item 
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer outline-none"
                          onClick={() => onUnarchive?.(project.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Désarchiver
                        </DropdownMenu.Item>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground/60" />
                <span>{formatDate(project.date)}</span>
              </div>
              {project.dueDate && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground/60" />
                  <span>{formatDate(project.dueDate)}</span>
                </div>
              )}
              {project.clientBudget && (
                <div className="flex items-center gap-1.5">
                  <Euro className="h-4 w-4 text-muted-foreground/60" />
                  <span>{project.clientBudget.toLocaleString()} €</span>
                </div>
              )}
              {projectFiles.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-muted-foreground/60" />
                  <span>{projectFiles.length} fichier{projectFiles.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {resourceAssignments.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">
                    Progression de l'équipe
                  </span>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {Math.round(bookingProgress.percentage)}%
                  </span>
                </div>
                
                <Progress.Root 
                  className="relative overflow-hidden bg-muted rounded-full w-full h-2"
                  value={bookingProgress.percentage}
                >
                  <Progress.Indicator
                    className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 w-full h-full transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${100 - bookingProgress.percentage}%)` }}
                  />
                </Progress.Root>
                
                <p className="text-xs text-muted-foreground mt-1">{bookingProgress.text}</p>
              </div>
            )}
          </div>

          {/* Card Actions */}
          <div className="p-6 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => setShowTeamModal(true)}
                    className="p-2.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-popover text-popover-foreground px-3 py-1.5 text-xs rounded-md shadow-md border border-border"
                    sideOffset={5}
                  >
                    Voir l'équipe
                    <Tooltip.Arrow className="fill-popover" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => setShowProjectDetailsModal(true)}
                    className="p-2.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Info className="h-5 w-5 text-muted-foreground" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-popover text-popover-foreground px-3 py-1.5 text-xs rounded-md shadow-md border border-border"
                    sideOffset={5}
                  >
                    Voir les détails
                    <Tooltip.Arrow className="fill-popover" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>

            {/* Primary Action Button */}
            {(project.status === 'pause' || project.status === 'attente-team') && (
              <>
                {resourceAssignments.length === 0 ? (
                  <button
                    disabled
                    className="px-6 py-2.5 bg-muted text-muted-foreground rounded-full text-sm font-medium cursor-not-allowed"
                  >
                    Créer l'équipe d'abord
                  </button>
                ) : (
                  <>
                    {!canStartProject && hasResourcesInDraft() && (
                      <button
                        onClick={handleBookingTeam}
                        disabled={isBookingTeam || isBookingRequested}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isBookingTeam ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Recherche...
                          </>
                        ) : isBookingRequested ? (
                          <>
                            <Users className="w-4 h-4 animate-pulse" />
                            Booking...
                          </>
                        ) : (
                          "Booker les équipes"
                        )}
                      </button>
                    )}
                    
                    {canStartProject && (
                      <button
                        onClick={handleStatusToggle}
                        disabled={isSyncing}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSyncing ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Mise en place...
                          </span>
                        ) : (
                          "Démarrer le projet"
                        )}
                      </button>
                    )}
                    
                    {!canStartProject && !hasResourcesInDraft() && (
                      <button
                        disabled
                        className="px-6 py-2.5 bg-muted text-muted-foreground rounded-full text-sm font-medium cursor-not-allowed"
                      >
                        En attente de confirmation
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {project.status === 'play' && (
              <button
                onClick={handleStatusToggle}
                disabled={isSyncing}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mise en pause...
                  </span>
                ) : (
                  "Mettre en pause"
                )}
              </button>
            )}
          </div>
        </div>
      </Tooltip.Provider>

      {/* Modals */}
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

      {/* Team Modal - Restructured with Cards */}
      <FullScreenModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title="Constitution de l'équipe"
        description={`Organisation et composition de l'équipe pour le projet "${project.title}"`}
      >
        <div className="space-y-6">
          {resourceAssignments.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Aucune ressource définie
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    L'équipe n'a pas encore été constituée pour ce projet
                  </p>
                  <button
                    onClick={() => onView(project.id)}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Définir l'équipe dans ReactFlow
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Statistiques de l'équipe */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Vue d'ensemble de l'équipe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {resourceAssignments.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Postes définis</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {resourceAssignments.filter(r => r.booking_status === 'accepted').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Confirmés</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                        {resourceAssignments.filter(r => r.booking_status === 'recherche').length}
                      </div>
                      <div className="text-sm text-muted-foreground">En recherche</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                        {Math.round(bookingProgress.percentage)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Progression</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Liste des membres de l'équipe */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Membres de l'équipe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resourceAssignments.map((assignment) => (
                      <div 
                        key={assignment.id} 
                        className="p-4 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground text-lg">
                              {profileNames[assignment.profile_id] || 'Poste à définir'}
                            </h4>
                            {assignment.candidate_profiles && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <User className="inline h-3 w-3 mr-1" />
                                {assignment.candidate_profiles.first_name} {assignment.candidate_profiles.last_name}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={assignment.booking_status === 'accepted' ? 'default' : 
                                    assignment.booking_status === 'declined' ? 'destructive' :
                                    assignment.booking_status === 'recherche' ? 'secondary' : 'outline'}
                            className={cn(
                              assignment.booking_status === 'accepted' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
                              assignment.booking_status === 'recherche' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                            )}
                          >
                            {assignment.booking_status === 'accepted' ? '✓ Confirmé' :
                             assignment.booking_status === 'declined' ? '✗ Refusé' :
                             assignment.booking_status === 'recherche' ? '⏳ En recherche' :
                             '• En attente'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {assignment.seniority && (
                            <div>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                Séniorité
                              </span>
                              <p className="font-medium text-foreground capitalize mt-1">
                                {assignment.seniority}
                              </p>
                            </div>
                          )}

                          {assignment.languages && assignment.languages.length > 0 && (
                            <div>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Langues
                              </span>
                              <p className="font-medium text-foreground mt-1">
                                {assignment.languages.join(', ')}
                              </p>
                            </div>
                          )}

                          {assignment.expertises && assignment.expertises.length > 0 && (
                            <div>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Code className="h-3 w-3" />
                                Expertises
                              </span>
                              <p className="font-medium text-foreground mt-1">
                                {assignment.expertises.join(', ')}
                              </p>
                            </div>
                          )}

                          {assignment.calculated_price && (
                            <div>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Tarif
                              </span>
                              <p className="font-medium text-foreground mt-1">
                                {assignment.calculated_price}€/min
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </FullScreenModal>

      {/* Project Details Modal - Restructured with Cards */}
      <FullScreenModal
        isOpen={showProjectDetailsModal}
        onClose={() => setShowProjectDetailsModal(false)}
        title="Détails du projet"
        description={project.title}
      >
        <div className="space-y-6">
          {/* Description du projet */}
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Description du projet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {project.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Informations clés */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Informations clés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date de début</p>
                      <p className="font-semibold text-foreground">
                        {formatDate(project.date)}
                      </p>
                    </div>
                  </div>
                  
                  {project.dueDate && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date de fin prévue</p>
                        <p className="font-semibold text-foreground">
                          {formatDate(project.dueDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {project.clientBudget && (
                    <div className="flex items-start gap-3">
                      <Euro className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Budget alloué</p>
                        <p className="font-semibold text-foreground">
                          {project.clientBudget.toLocaleString('fr-FR')} €
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Statut actuel</p>
                      <div className="mt-1">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
                          statusInfo.color
                        )}>
                          {statusInfo.icon}
                          <span>{statusInfo.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fichiers et documents */}
          {projectFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Documents attachés
                  <Badge variant="secondary" className="ml-2">
                    {projectFiles.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {projectFiles.map((file) => (
                    <div 
                      key={file.name} 
                      className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                          <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : 'Taille inconnue'}
                          </p>
                        </div>
                      </div>
                      <button
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('project-files')
                            .createSignedUrl(`projects/${project.id}/${file.name}`, 60);
                          
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          }
                        }}
                        title="Télécharger le fichier"
                      >
                        <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Équipe du projet - Résumé */}
          {resourceAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Équipe assignée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    {resourceAssignments.length} membre{resourceAssignments.length > 1 ? 's' : ''} dans l'équipe
                  </div>
                  <button
                    onClick={() => {
                      setShowProjectDetailsModal(false);
                      setShowTeamModal(true);
                    }}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Voir les détails →
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resourceAssignments.map((assignment) => (
                    <Badge
                      key={assignment.id}
                      variant="outline"
                      className={cn(
                        "px-3 py-1",
                        assignment.booking_status === 'accepted' && 'border-green-500 text-green-700 dark:text-green-400',
                        assignment.booking_status === 'recherche' && 'border-yellow-500 text-yellow-700 dark:text-yellow-400'
                      )}
                    >
                      {profileNames[assignment.profile_id] || 'Non défini'}
                      {assignment.candidate_profiles && (
                        <span className="ml-1 opacity-70">
                          • {assignment.candidate_profiles.first_name}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </FullScreenModal>

      {/* Delete/Archive Dialog */}
      <DeleteProjectDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        project={{
          id: project.id,
          title: project.title,
          status: project.status
        }}
        onProjectDeleted={() => {
          setShowDeleteDialog(false);
          onDelete(project.id);
        }}
        onProjectArchived={() => {
          setShowDeleteDialog(false);
          onArchive?.(project.id);
        }}
      />
    </>
  );
}