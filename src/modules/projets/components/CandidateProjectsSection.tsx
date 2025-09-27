import { useState, useEffect } from 'react';
import { Button } from '@/ui/components/button';
import { Badge } from '@/ui/components/badge';
import { FullScreenModal, ModalActions } from '@/ui/components/fullscreen-modal';
import { supabase } from '@/integrations/supabase/client';
import {
  FolderOpen,
  Filter,
  Clock,
  CheckCircle2,
  PlayCircle,
  Users,
  Calendar,
  Building2,
  MapPin,
  Briefcase,
  AlertCircle,
  Eye,
  X,
  FileText,
  Euro,
  Paperclip,
  Download,
  User,
  BarChart3,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatarNeon } from '@/ui/components/user-avatar-neon';
import { useCandidateProjects, useProjectMembers } from '../hooks';
import type { Project } from '../types';

interface CandidateProject extends Project {
  category?: string;
  booking_status?: string;
  project_date?: string;
  due_date?: string;
  client_budget?: number;
  owner?: {
    company_name?: string;
  };
}

interface CandidateProjectsSectionProps {
  activeProjects?: CandidateProject[];
  pendingInvitations?: CandidateProject[];
  onViewProject?: (project: CandidateProject) => void;
  onAcceptMission?: (project: CandidateProject) => void;
  onDeclineMission?: (project: CandidateProject) => void;
}

const statusConfig = {
  'invitations': {
    label: 'Invitations reçues',
    icon: AlertCircle,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
  },
  'en-cours': {
    label: 'En cours',
    icon: PlayCircle,
    color: 'bg-green-100 text-green-700 border-green-200',
    dotColor: 'bg-green-500',
  },
  'attente-kickoff': {
    label: 'En attente de démarrage',
    icon: Clock,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  'termines': {
    label: 'Terminés',
    icon: CheckCircle2,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
  },
};

export function CandidateProjectsSection({
  activeProjects = [],
  pendingInvitations = [],
  onViewProject,
  onAcceptMission,
  onDeclineMission,
}: CandidateProjectsSectionProps) {
  // Utilisation du nouveau hook
  const { projects: candidateProjects, loading, error, refetch } = useCandidateProjects();

  // État pour les filtres
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['invitations', 'en-cours', 'attente-kickoff']);
  const [showFilters, setShowFilters] = useState(false);

  // État pour le modal de détails
  const [selectedProject, setSelectedProject] = useState<CandidateProject | null>(null);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);

  // Hook pour les membres du projet sélectionné
  const {
    members: fullTeam,
    loading: membersLoading
  } = useProjectMembers(selectedProject?.id || '');

  // Fonction pour charger les fichiers du projet
  const fetchProjectFiles = async (projectId: string) => {
    try {
      const { data: files, error } = await supabase.storage
        .from('project-files')
        .list(`projects/${projectId}`, {
          limit: 10,
          offset: 0
        });

      if (error) {
        console.error("Erreur chargement fichiers:", error);
      } else if (files && files.length > 0) {
        // Filtrer les fichiers réels (pas les placeholders)
        const realFiles = files.filter(file =>
          file.name !== '.emptyFolderPlaceholder' &&
          !file.name.startsWith('.')
        );
        setProjectFiles(realFiles);
      } else {
        setProjectFiles([]);
      }
    } catch (error) {
      console.error("Erreur inattendue chargement fichiers:", error);
      setProjectFiles([]);
    }
  };

  // Charger les fichiers quand un projet est sélectionné
  useEffect(() => {
    if (selectedProject) {
      fetchProjectFiles(selectedProject.id);
    } else {
      setProjectFiles([]);
    }
  }, [selectedProject]);

  // Catégoriser tous les projets - utiliser les projets du hook en priorité
  const projectsToUse = candidateProjects.length > 0 ? candidateProjects : activeProjects;

  const allProjects = [
    ...(Array.isArray(pendingInvitations) ? pendingInvitations : []).map(p => ({
      ...p,
      category: 'invitations'
    })),
    ...(Array.isArray(projectsToUse) ? projectsToUse : []).map(p => ({
      ...p,
      // Catégorisation basée sur le statut du projet
      category: p.status === 'completed' ? 'termines' :
                p.status === 'play' ? 'en-cours' :
                'attente-kickoff'
    }))
  ];

  // Filtrer les projets selon la sélection
  const filteredProjects = allProjects.filter(p =>
    selectedFilters.includes(p.category || 'en-cours')
  );

  // Grouper par catégorie
  const groupedProjects = filteredProjects.reduce((acc, project) => {
    const category = project.category || 'en-cours';
    if (!acc[category]) acc[category] = [];
    acc[category].push(project);
    return acc;
  }, {} as Record<string, CandidateProject[]>);

  // Fonction pour télécharger un fichier
  const downloadFile = async (fileName: string) => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(`projects/${selectedProject.id}/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Chargement des projets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 p-4">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Erreur lors du chargement des projets</p>
        <Button onClick={refetch} variant="outline" className="mt-2">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Mes Projets
          </h2>
          <Badge variant="outline" className="ml-2">
            {filteredProjects.length}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtres
        </Button>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Afficher les projets :
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusConfig).map(([key, config]) => {
              const isSelected = selectedFilters.includes(key);
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedFilters(prev => prev.filter(f => f !== key));
                    } else {
                      setSelectedFilters(prev => [...prev, key]);
                    }
                  }}
                  className={cn(
                    "gap-2 transition-all",
                    isSelected && config.color
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste des projets */}
      {Object.entries(groupedProjects).length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            Aucun projet trouvé
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Vous n'avez pas encore de projets correspondant aux filtres sélectionnés.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedProjects).map(([category, projects]) => {
            const config = statusConfig[category as keyof typeof statusConfig];
            const Icon = config.icon;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    {config.label}
                  </h3>
                  <Badge variant="secondary" className="ml-2">
                    {projects.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      config={config}
                      onViewDetails={() => setSelectedProject(project)}
                      onAccept={() => onAcceptMission?.(project)}
                      onDecline={() => onDeclineMission?.(project)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de détails */}
      {selectedProject && (
        <FullScreenModal
          isOpen={true}
          onClose={() => setSelectedProject(null)}
          title={selectedProject.title}
        >
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="bg-white dark:bg-neutral-900/50 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Détails du projet
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Description</p>
                  <p className="text-neutral-900 dark:text-white">
                    {selectedProject.description || 'Aucune description disponible'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Statut</p>
                  <Badge className={statusConfig[selectedProject.category as keyof typeof statusConfig]?.color}>
                    {statusConfig[selectedProject.category as keyof typeof statusConfig]?.label}
                  </Badge>
                </div>

                {selectedProject.start_date && (
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Date de début</p>
                    <p className="text-neutral-900 dark:text-white">
                      {new Date(selectedProject.start_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}

                {selectedProject.end_date && (
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Date de fin</p>
                    <p className="text-neutral-900 dark:text-white">
                      {new Date(selectedProject.end_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Équipe */}
            <div className="bg-white dark:bg-neutral-900/50 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                Équipe du projet
                {membersLoading && (
                  <div className="w-4 h-4 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                )}
              </h3>

              {fullTeam.length === 0 && !membersLoading ? (
                <p className="text-neutral-600 dark:text-neutral-400">
                  Aucun membre d'équipe trouvé
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fullTeam.map((member, index) => (
                    <div key={member.id || index} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <UserAvatarNeon
                        name={member.name}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white truncate">
                          {member.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {member.isAI ? (
                            <Bot className="w-4 h-4 text-purple-500" />
                          ) : member.role === 'client' ? (
                            <User className="w-4 h-4 text-primary-500" />
                          ) : (
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                            {member.jobTitle}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fichiers attachés */}
            {projectFiles.length > 0 && (
              <div className="bg-white dark:bg-neutral-900/50 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
                <h3 className="font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-primary-500" />
                  Fichiers attachés ({projectFiles.length})
                </h3>

                <div className="space-y-2">
                  {projectFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                        <span className="text-sm text-neutral-900 dark:text-white">
                          {file.name}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(file.name)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ModalActions>
            <Button
              variant="outline"
              onClick={() => setSelectedProject(null)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Fermer
            </Button>
            {onViewProject && (
              <Button
                onClick={() => onViewProject(selectedProject)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Accéder au projet
              </Button>
            )}
          </ModalActions>
        </FullScreenModal>
      )}
    </div>
  );
}

// Composant carte de projet
interface ProjectCardProps {
  project: CandidateProject;
  config: any;
  onViewDetails: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

function ProjectCard({ project, config, onViewDetails, onAccept, onDecline }: ProjectCardProps) {
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", config.dotColor)}></div>
          <Badge variant="outline" className={cn("text-xs", config.color)}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </div>

      <h4 className="font-medium text-neutral-900 dark:text-white mb-2 line-clamp-2">
        {project.title}
      </h4>

      {project.description && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="space-y-2">
        {project.owner?.company_name && (
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Building2 className="w-4 h-4" />
            {project.owner.company_name}
          </div>
        )}

        {project.start_date && (
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Calendar className="w-4 h-4" />
            {new Date(project.start_date).toLocaleDateString('fr-FR')}
          </div>
        )}

        {project.budget && (
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Euro className="w-4 h-4" />
            {project.budget}€
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <Button
          size="sm"
          variant="outline"
          onClick={onViewDetails}
          className="flex-1 gap-2"
        >
          <Eye className="w-4 h-4" />
          Détails
        </Button>

        {project.category === 'invitations' && onAccept && onDecline && (
          <>
            <Button
              size="sm"
              onClick={onAccept}
              className="flex-1 gap-2 bg-green-500 hover:bg-green-600"
            >
              <CheckCircle2 className="w-4 h-4" />
              Accepter
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onDecline}
              className="gap-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default CandidateProjectsSection;