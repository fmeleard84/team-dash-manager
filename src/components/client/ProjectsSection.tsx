import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from '@/components/ProjectCard';
import { 
  Plus, 
  Rocket, 
  FolderOpen, 
  Play, 
  Pause, 
  Clock, 
  Users, 
  CheckCircle2,
  Archive,
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DbProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  project_date?: string;
  due_date?: string;
  client_budget?: number;
  archived_at?: string;
  deleted_at?: string;
}

interface ProjectsSectionProps {
  projects: DbProject[];
  archivedProjects: DbProject[];
  resourceAssignments: any[];
  onViewProject: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
  onStartProject: (project: any) => void;
  onDeleteRequest: (project: DbProject) => void;
  onArchiveProject: (id: string) => void;
  onUnarchiveProject: (id: string) => void;
  onCreateProject: () => void;
  onViewTemplates: () => void;
}

// Configuration des statuts avec leurs styles
const statusConfig = {
  'en-cours': {
    label: 'En cours',
    icon: Play,
    color: 'bg-green-100 text-green-700 border-green-200',
    dotColor: 'bg-green-500',
  },
  'nouveau': {
    label: 'Nouveau',
    icon: Plus,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  'attente-team': {
    label: 'Attente équipe',
    icon: Users,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    dotColor: 'bg-yellow-500',
  },
  'pause': {
    label: 'En pause',
    icon: Pause,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    dotColor: 'bg-gray-500',
  },
  'completed': {
    label: 'Terminé',
    icon: CheckCircle2,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
  },
  'archived': {
    label: 'Archivé',
    icon: Archive,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
  },
};

export function ProjectsSection({
  projects,
  archivedProjects,
  resourceAssignments,
  onViewProject,
  onToggleStatus,
  onStartProject,
  onDeleteRequest,
  onArchiveProject,
  onUnarchiveProject,
  onCreateProject,
  onViewTemplates,
}: ProjectsSectionProps) {
  // État pour les filtres
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['en-cours', 'nouveau', 'attente-team', 'pause']);
  const [showFilters, setShowFilters] = useState(false);

  // Fusionner tous les projets avec leur catégorie
  const allProjects = [
    ...projects.map(p => ({ 
      ...p, 
      category: p.status === 'play' ? 'en-cours' : 
                p.status === 'attente-team' ? 'attente-team' : 
                p.status === 'pause' ? 'pause' : 
                p.status === 'completed' ? 'completed' : 'nouveau' 
    })),
    ...archivedProjects.map(p => ({ ...p, category: 'archived' }))
  ];

  // Projets filtrés
  const filteredProjects = selectedFilters.length === 0 
    ? allProjects 
    : allProjects.filter(p => selectedFilters.includes(p.category));

  // Compteurs par statut
  const statusCounts = {
    'en-cours': projects.filter(p => p.status === 'play').length,
    'nouveau': projects.filter(p => p.status === 'pause' && !resourceAssignments.some(a => a.project_id === p.id && a.booking_status === 'recherche')).length,
    'attente-team': projects.filter(p => p.status === 'attente-team').length,
    'pause': projects.filter(p => p.status === 'pause' && resourceAssignments.some(a => a.project_id === p.id && a.booking_status === 'recherche')).length,
    'completed': projects.filter(p => p.status === 'completed').length,
    'archived': archivedProjects.length,
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const selectAllFilters = () => {
    setSelectedFilters(Object.keys(statusConfig));
  };

  const clearAllFilters = () => {
    setSelectedFilters([]);
  };

  // Fonction pour obtenir les props de badge selon le statut
  const getProjectBadge = (project: any) => {
    const config = statusConfig[project.category as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1",
          config.color
        )}
      >
        <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-extrabold text-[#0E0F12]">
              <FolderOpen className="h-9 w-9 text-[#7B3EF4] fill-current" />
              Mes projets
            </h1>
            <p className="mt-2 text-lg text-[#6B7280]">
              {filteredProjects.length} projet{filteredProjects.length > 1 ? 's' : ''} 
              {selectedFilters.length > 0 && ` • Filtré${filteredProjects.length > 1 ? 's' : ''}`}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="h-11 px-4"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
              {selectedFilters.length > 0 && (
                <Badge className="ml-2 bg-purple-600 text-white">
                  {selectedFilters.length}
                </Badge>
              )}
            </Button>
            
            <Button 
              className="h-11 px-6 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              onClick={onCreateProject}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer un projet
            </Button>
            
            <Button 
              variant="outline" 
              className="h-11 px-6 text-sm font-semibold border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 rounded-full transform hover:-translate-y-0.5 transition-all duration-200"
              onClick={onViewTemplates}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Explorer les templates
            </Button>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      {showFilters && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Filtrer par statut</span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={selectAllFilters}
                className="text-xs"
              >
                Tout sélectionner
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                Tout désélectionner
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = statusCounts[key as keyof typeof statusCounts];
              const isSelected = selectedFilters.includes(key);
              
              return (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all",
                    isSelected 
                      ? "border-purple-500 bg-purple-50" 
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
                  <span className="text-sm font-medium">
                    {config.label}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs px-1.5 py-0",
                      isSelected ? "bg-purple-200 text-purple-700" : "bg-gray-100"
                    )}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste des projets */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun projet trouvé
            </h3>
            <p className="text-gray-500 mb-4">
              {selectedFilters.length > 0 
                ? "Aucun projet ne correspond aux filtres sélectionnés"
                : "Vous n'avez pas encore de projet"}
            </p>
            {selectedFilters.length > 0 ? (
              <Button 
                variant="outline"
                onClick={clearAllFilters}
              >
                Réinitialiser les filtres
              </Button>
            ) : (
              <Button onClick={onCreateProject}>
                <Plus className="w-4 h-4 mr-2" />
                Créer votre premier projet
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map((project) => (
              <div key={project.id} className="relative">
                {/* Badge de statut positionné en haut à droite de la carte */}
                <div className="absolute -top-2 right-4 z-10">
                  {getProjectBadge(project)}
                </div>
                
                <ProjectCard
                  project={project}
                  isArchived={project.category === 'archived'}
                  onView={() => onViewProject(project.id)}
                  onStatusToggle={(id, _) => onToggleStatus(id, project.status)}
                  onStart={() => onStartProject(project)}
                  onDelete={() => onDeleteRequest(project)}
                  onArchive={() => onArchiveProject(project.id)}
                  onUnarchive={() => onUnarchiveProject(project.id)}
                  resourceAssignments={resourceAssignments}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}