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
    className: 'bg-gradient-to-r from-yellow-500 to-orange-500' 
  },
  'attente-team': { 
    label: 'En attente', 
    icon: Clock, 
    className: 'bg-gradient-to-r from-blue-500 to-cyan-500' 
  },
  'play': { 
    label: 'Actif', 
    icon: PlayCircle, 
    className: 'bg-gradient-to-r from-green-500 to-emerald-500' 
  },
  'completed': { 
    label: 'Terminé', 
    icon: CheckCircle, 
    className: 'bg-gradient-to-r from-gray-500 to-slate-500' 
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

  return (
    <div className={cn("relative", className)}>
      {/* Effet glow néon */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-lg opacity-20" />
      
      <Select value={selectedProjectId} onValueChange={onProjectChange}>
        <SelectTrigger className="relative bg-black/40 backdrop-blur-xl border-purple-500/30 text-white hover:bg-white/10 hover:border-purple-400 transition-all duration-300 shadow-lg shadow-purple-500/20">
          <SelectValue placeholder={placeholder} className="text-white">
            {selectedProject && (
              <div className="flex items-center gap-2">
                <span className="font-medium truncate text-white">{selectedProject.title}</span>
                {showStatus && selectedProject.status && (
                  <Badge className={cn(
                    "ml-auto border-0 text-white shadow-lg",
                    statusConfig[selectedProject.status as keyof typeof statusConfig]?.className
                  )}>
                    {statusConfig[selectedProject.status as keyof typeof statusConfig]?.label || selectedProject.status}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] border-purple-500/30 backdrop-blur-xl">
          {projects.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
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
                  className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer group"
                >
                  <motion.div 
                    className="flex flex-col gap-2 w-full py-1"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Titre et statut */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium truncate flex-1 text-white">{project.title}</span>
                      {showStatus && project.status && (
                        <div className="flex items-center gap-1">
                          <StatusIcon className="w-4 h-4" />
                          <Badge className={cn(
                            "text-xs border-0 text-white shadow-md",
                            status?.className
                          )}>
                            {status?.label}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Informations supplémentaires */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {/* Dates */}
                      {showDates && project.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(new Date(project.start_date), 'dd MMM', { locale: fr })}
                            {project.end_date && ` - ${format(new Date(project.end_date), 'dd MMM', { locale: fr })}`}
                          </span>
                        </div>
                      )}
                      
                      {/* Progression équipe */}
                      {showTeamProgress && project.resource_assignments && project.resource_assignments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{teamProgress}% équipe</span>
                        </div>
                      )}
                      
                      {/* Date de création */}
                      {project.created_at && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          <span>
                            {format(new Date(project.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Barre de progression équipe */}
                    {showTeamProgress && project.resource_assignments && project.resource_assignments.length > 0 && (
                      <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
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