import React from 'react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, PlayCircle, PauseCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Project {
  id: string;
  title: string;
  created_at?: string;
  status?: string;
  resource_assignments?: any[];
  start_date?: string;
  end_date?: string;
}

interface ProjectSelectorNeonProps {
  projects: Project[];
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  placeholder?: string;
  className?: string;
  showStatus?: boolean;
  showDates?: boolean;
  showTeamProgress?: boolean;
}

const statusConfig = {
  'pause': {
    label: 'En pause',
    icon: PauseCircle,
    className: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    dotColor: 'bg-orange-500 dark:bg-orange-400'
  },
  'attente-team': {
    label: 'En attente',
    icon: Clock,
    className: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    dotColor: 'bg-blue-500 dark:bg-blue-400'
  },
  'play': {
    label: 'Actif',
    icon: PlayCircle,
    className: 'bg-gradient-to-r from-green-500 to-emerald-500',
    dotColor: 'bg-green-500 dark:bg-green-400'
  },
  'completed': {
    label: 'Terminé',
    icon: CheckCircle,
    className: 'bg-gradient-to-r from-neutral-500 to-neutral-600',
    dotColor: 'bg-neutral-500 dark:bg-neutral-400'
  },
  'archived': {
    label: 'Archivé',
    icon: CheckCircle,
    className: 'bg-gradient-to-r from-red-500 to-rose-500',
    dotColor: 'bg-red-500 dark:bg-red-400'
  },
  'deleted': {
    label: 'Supprimé',
    icon: CheckCircle,
    className: 'bg-gradient-to-r from-red-500 to-rose-500',
    dotColor: 'bg-red-500 dark:bg-red-400'
  }
};

export const ProjectSelectorNeon: React.FC<ProjectSelectorNeonProps> = ({
  projects,
  selectedProjectId,
  onProjectChange,
  placeholder = "Sélectionner un projet",
  className,
  showStatus = true,
  showDates = false,
  showTeamProgress = false
}) => {
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getTeamProgress = (project: Project) => {
    if (!project.resource_assignments?.length) return 0;
    const accepted = project.resource_assignments.filter(a => a.booking_status === 'accepted').length;
    return Math.round((accepted / project.resource_assignments.length) * 100);
  };

  // Fonction pour tronquer le titre du projet
  const truncateTitle = (title: string, maxLength: number = 15) => {
    if (!title) return '';
    return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
  };

  // Fonction pour formater la date de façon courte
  const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'dd/MM', { locale: fr });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Effet glow néon Material Design */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-20 dark:opacity-30" />

      <Select value={selectedProjectId} onValueChange={onProjectChange}>
        <SelectTrigger className="
          relative
          bg-white dark:bg-neutral-900/80
          backdrop-blur-xl
          border border-neutral-200 dark:border-neutral-700
          text-neutral-900 dark:text-white
          hover:bg-neutral-50 dark:hover:bg-neutral-800/80
          hover:border-primary-500 dark:hover:border-primary-400
          focus:border-primary-500 dark:focus:border-primary-400
          focus:ring-2 focus:ring-primary-500/20
          transition-all duration-200
          shadow-lg dark:shadow-xl dark:shadow-primary-500/10
        ">
          <SelectValue placeholder={placeholder} className="text-neutral-900 dark:text-white">
            {selectedProject && (
              <div className="flex items-center gap-2 w-full">
                {/* Indicateur de statut coloré */}
                {showStatus && selectedProject.status && (
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0 shadow-sm",
                    statusConfig[selectedProject.status as keyof typeof statusConfig]?.dotColor || 'bg-neutral-500'
                  )} />
                )}
                {/* Titre tronqué */}
                <span className="font-medium text-neutral-900 dark:text-white flex-shrink-0">
                  {truncateTitle(selectedProject.title, 15)}
                </span>
                {/* Date courte */}
                {selectedProject.created_at && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-auto flex-shrink-0">
                    {formatShortDate(selectedProject.created_at)}
                  </span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent className="
          bg-white dark:bg-gradient-to-br dark:from-neutral-900 dark:via-neutral-900/95 dark:to-neutral-950
          border border-neutral-200 dark:border-neutral-700
          backdrop-blur-xl
          shadow-xl dark:shadow-2xl dark:shadow-primary-500/10
        ">
          {projects.length === 0 ? (
            <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">Aucun projet disponible</p>
            </div>
          ) : (
            projects.map((project) => {
              const status = statusConfig[project.status as keyof typeof statusConfig];
              const StatusIcon = status?.icon || PlayCircle;
              const teamProgress = showTeamProgress ? getTeamProgress(project) : 0;
              
              return (
                <SelectItem
                  key={project.id}
                  value={project.id}
                  className="
                    text-neutral-900 dark:text-white
                    hover:bg-neutral-100 dark:hover:bg-white/10
                    focus:bg-neutral-100 dark:focus:bg-white/10
                    cursor-pointer group
                    transition-colors duration-200
                  "
                >
                  <motion.div
                    className="flex flex-col gap-2 w-full py-1"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Ligne unique avec tous les éléments alignés */}
                    <div className="flex items-center gap-2 w-full">
                      {/* Indicateur de statut */}
                      {showStatus && project.status && (
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0 shadow-sm",
                          status?.dotColor || 'bg-neutral-500'
                        )} />
                      )}

                      {/* Titre tronqué (15 caractères max) */}
                      <span className="font-medium text-neutral-900 dark:text-white flex-shrink-0 min-w-[120px] max-w-[120px]">
                        {truncateTitle(project.title, 15)}
                      </span>

                      {/* Date courte */}
                      {project.created_at && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-auto flex-shrink-0">
                          {formatShortDate(project.created_at)}
                        </span>
                      )}

                      {/* Progression équipe (optionnel) */}
                      {showTeamProgress && project.resource_assignments && project.resource_assignments.length > 0 && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                          {teamProgress}%
                        </span>
                      )}
                    </div>

                    {/* Barre de progression équipe (si activée) */}
                    {showTeamProgress && project.resource_assignments && project.resource_assignments.length > 0 && (
                      <div className="w-full bg-neutral-200 dark:bg-black/40 rounded-full h-1 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full shadow-sm"
                          initial={{ width: 0 }}
                          animate={{ width: `${teamProgress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    )}
                  </motion.div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ProjectSelectorNeon;