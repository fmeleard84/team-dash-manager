import { useState, useEffect, useMemo } from "react";
import { Play, Pause, Eye, Trash2, Users, Loader2, MoreVertical, Edit, Clock, CheckCircle2, Rocket, Calendar, Euro, Archive, RotateCcw, Paperclip, Download, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { KickoffDialog } from "@/components/KickoffDialog";
import { buildFunctionHeaders } from "@/lib/functionAuth";
import EditProjectModal from "@/components/EditProjectModal";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { FullScreenModal } from "@/components/ui/fullscreen-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  refreshTrigger?: number;
}

export function MaterialProjectCard({ 
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
}: ProjectCardProps) {
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
        ),
        hr_profiles (
          id,
          name
        )
      `)
      .eq('project_id', project.id);

    if (error) {
      console.error('Error fetching assignments:', error);
      return;
    }

    if (assignments) {
      setResourceAssignments(assignments);

      // Utiliser les données hr_profiles de la jointure directe
      if (assignments.length > 0) {
        const names: Record<string, string> = {};
        assignments.forEach(assignment => {
          if (assignment.hr_profiles?.name) {
            names[assignment.profile_id] = assignment.hr_profiles.name;
          }
        });
        setProfileNames(names);
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
  const isPlayWithoutKickoff = project.status === 'play' && 
    !resourceAssignments.some(r => r.booking_status === 'accepted');

  return (
    <>
      {/* Material Design 3 Card */}
      <div className="group relative bg-card rounded-3xl border border-border hover:border-border/80 dark:hover:border-border/60 transition-all duration-300 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-purple-500/10 overflow-hidden">
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
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </div>
              
              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-accent transition-colors">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onView(project.id)}>
                    <Users className="h-4 w-4 mr-2" />
                    Éditer l'équipe
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier le projet
                  </DropdownMenuItem>
                  {!isArchived ? (
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archiver / Supprimer
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onUnarchive?.(project.id)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Désarchiver
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
                <span className="text-xs font-semibold text-purple-700">
                  {Math.round(bookingProgress.percentage)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${bookingProgress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{bookingProgress.text}</p>
            </div>
          )}
        </div>

        {/* Card Actions */}
        <div className="p-6 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTeamModal(true)}
              className="p-2.5 rounded-full hover:bg-accent transition-colors"
              title="Voir l'équipe"
            >
              <Users className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowProjectDetailsModal(true)}
              className="p-2.5 rounded-full hover:bg-accent transition-colors"
              title="Voir les détails"
            >
              <Info className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Primary Action Button */}
          {(project.status === 'pause' || project.status === 'attente-team' || isPlayWithoutKickoff) && (
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
                      className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl dark:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBookingTeam ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Recherche...
                        </span>
                      ) : isBookingRequested ? (
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 animate-pulse" />
                          Booking...
                        </span>
                      ) : (
                        "Booker les équipes"
                      )}
                    </button>
                  )}
                  
                  {canStartProject && (
                    <button
                      onClick={handleStatusToggle}
                      disabled={isSyncing}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl dark:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {project.status === 'play' && !isPlayWithoutKickoff && (
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

      {/* Modal Constitution de l'équipe */}
      <FullScreenModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title="Constitution de l'équipe"
        description={`Équipe du projet "${project.title}"`}
      >
        <div className="space-y-4">
          {resourceAssignments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <Users className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Aucune ressource définie pour ce projet</p>
              <Button
                onClick={() => onView(project.id)}
                className="mt-4"
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                Définir l'équipe dans ReactFlow
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resourceAssignments.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className={`p-4 rounded-lg border ${
                    assignment.booking_status === 'accepted'
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
                      : assignment.booking_status === 'declined'
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                      : assignment.booking_status === 'recherche'
                      ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900'
                      : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {/* Métier */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {profileNames[assignment.profile_id] || 'Métier non défini'}
                    </span>
                    <Badge 
                      className={
                        assignment.booking_status === 'accepted'
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                          : assignment.booking_status === 'declined'
                          ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                          : assignment.booking_status === 'recherche'
                          ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                      }
                    >
                      {assignment.booking_status === 'accepted' ? 'Confirmé' :
                       assignment.booking_status === 'declined' ? 'Refusé' :
                       assignment.booking_status === 'recherche' ? 'En recherche' :
                       'En attente'}
                    </Badge>
                  </div>

                  {/* Candidat */}
                  {assignment.candidate_profiles && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Candidat:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {assignment.candidate_profiles.first_name} {assignment.candidate_profiles.last_name}
                      </p>
                    </div>
                  )}

                  {/* Séniorité */}
                  {assignment.seniority && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Séniorité:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {assignment.seniority}
                      </p>
                    </div>
                  )}

                  {/* Prix */}
                  {assignment.calculated_price && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Tarif:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {assignment.calculated_price}€/min
                      </p>
                    </div>
                  )}
                </div>
              ))}
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Informations générales */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Informations générales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Date de création:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200">{formatDate(project.date)}</p>
              </div>
              {project.dueDate && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Date d'échéance:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatDate(project.dueDate)}</p>
                </div>
              )}
              {project.clientBudget && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Budget client:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {project.clientBudget.toLocaleString()} €
                  </p>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Statut:</span>
                <div className="mt-1">
                  <Badge className={statusInfo.color}>
                    {statusInfo.icon}
                    <span className="ml-1">{statusInfo.label}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Fichiers attachés */}
          {projectFiles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Fichiers attachés ({projectFiles.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const { data } = await supabase.storage
                          .from('project-files')
                          .createSignedUrl(`projects/${project.id}/${file.name}`, 60);
                        
                        if (data?.signedUrl) {
                          window.open(data.signedUrl, '_blank');
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

      {/* Dialog de suppression/archivage */}
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