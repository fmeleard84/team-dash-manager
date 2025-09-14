import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadixProjectCard } from '@/components/RadixProjectCard';
import { PageHeaderNeon } from '@/components/ui/page-header-neon';
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
  projects?: DbProject[];
  archivedProjects?: DbProject[];
  resourceAssignments?: any[];
  onViewProject?: (id: string) => void;
  onToggleStatus?: (id: string, status: string) => void;
  onStartProject?: (project: any) => void;
  onDeleteRequest?: (project: DbProject) => void;
  onArchiveProject?: (id: string) => void;
  onUnarchiveProject?: (id: string) => void;
  onCreateProject?: () => void;
  onViewTemplates?: () => void;
  onProjectEdited?: () => void;
  refreshTrigger?: number;
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
  projects = [],
  archivedProjects = [],
  resourceAssignments = [],
  onViewProject = () => {},
  onToggleStatus = () => {},
  onStartProject = () => {},
  onDeleteRequest = () => {},
  onArchiveProject = () => {},
  onUnarchiveProject = () => {},
  onCreateProject = () => {},
  onViewTemplates = () => {},
  onProjectEdited = () => {},
  refreshTrigger = 0,
}: ProjectsSectionProps) {
  // État pour les filtres
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['en-cours', 'nouveau', 'attente-team', 'pause']);
  const [showFilters, setShowFilters] = useState(false);

  // Fusionner tous les projets avec leur catégorie et mapper les noms de propriétés
  const allProjects = [
    ...(projects || []).map(p => ({ 
      ...p, 
      // Mapper les noms de propriétés pour ProjectCard
      date: p.project_date,
      clientBudget: p.client_budget,
      dueDate: p.due_date,
      category: p.status === 'play' ? 'en-cours' : 
                p.status === 'attente-team' ? 'attente-team' : 
                p.status === 'pause' ? 'pause' : 
                p.status === 'completed' ? 'completed' : 'nouveau' 
    })),
    ...(archivedProjects || []).map(p => ({ 
      ...p, 
      // Mapper les noms de propriétés pour ProjectCard
      date: p.project_date,
      clientBudget: p.client_budget,
      dueDate: p.due_date,
      category: 'archived' 
    }))
  ];

  // Projets filtrés
  const filteredProjects = selectedFilters.length === 0 
    ? allProjects 
    : allProjects.filter(p => selectedFilters.includes(p.category));

  // Compteurs par statut
  const statusCounts = {
    'en-cours': (projects || []).filter(p => p.status === 'play').length,
    'nouveau': (projects || []).filter(p => p.status === 'pause' && !(resourceAssignments || []).some(a => a.project_id === p.id && a.booking_status === 'recherche')).length,
    'attente-team': (projects || []).filter(p => p.status === 'attente-team').length,
    'pause': (projects || []).filter(p => p.status === 'pause' && (resourceAssignments || []).some(a => a.project_id === p.id && a.booking_status === 'recherche')).length,
    'completed': (projects || []).filter(p => p.status === 'completed').length,
    'archived': (archivedProjects || []).length,
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


  return (
    <div className="space-y-6">
      {/* Header avec design Neon cohérent */}
      <PageHeaderNeon
        icon={FolderOpen}
        title="Mes projets"
        subtitle={`${filteredProjects.length} projet${filteredProjects.length > 1 ? 's' : ''}${selectedFilters.length > 0 ? ` • Filtré${filteredProjects.length > 1 ? 's' : ''}` : ''}`}
        showProjectSelector={false}
      >
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="border-gray-300 dark:border-gray-600"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {selectedFilters.length > 0 && (
              <Badge className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                {selectedFilters.length}
              </Badge>
            )}
          </Button>
          
          <Button 
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium shadow-lg"
            onClick={onCreateProject}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un projet
          </Button>
          
          <Button 
            variant="outline" 
            className="border-gray-300 dark:border-gray-600"
            onClick={onViewTemplates}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Explorer les templates
          </Button>
        </div>
      </PageHeaderNeon>

      {/* Barre de filtres */}
      {showFilters && (
        <div className="bg-muted/50 dark:bg-muted/20 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Filtrer par statut</span>
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
                      ? "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950/30" 
                      : "border-border bg-background hover:border-purple-300 dark:hover:border-purple-600"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
                  <span className="text-sm font-medium text-foreground">
                    {config.label}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs px-1.5 py-0",
                      isSelected 
                        ? "bg-purple-200 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300" 
                        : "bg-muted text-muted-foreground"
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
          <div className="text-center py-12 bg-muted/30 dark:bg-muted/10 rounded-xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Aucun projet trouvé
            </h3>
            <p className="text-muted-foreground mb-4">
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
          <div className="space-y-4">
            {filteredProjects.map((project) => {
              // Trouver les resource assignments pour ce projet
              const projectAssignments = (resourceAssignments || []).filter(
                a => a.project_id === project.id
              );

              return (
                <RadixProjectCard
                  key={project.id}
                  project={{
                    id: project.id,
                    title: project.title,
                    description: project.description,
                    date: project.project_date || new Date().toISOString(),
                    status: project.status,
                    clientBudget: project.client_budget,
                    dueDate: project.due_date,
                  }}
                  resourceAssignments={projectAssignments}
                  isArchived={project.category === 'archived'}
                  onView={() => onViewProject(project.id)}
                  onStatusToggle={(id, _) => onToggleStatus(id, project.status)}
                  onStart={(projectWithKickoff) => onStartProject(projectWithKickoff)}
                  onDelete={() => onDeleteRequest(project)}
                  onArchive={() => onArchiveProject(project.id)}
                  onUnarchive={() => onUnarchiveProject(project.id)}
                  onEdit={onProjectEdited}
                  refreshTrigger={refreshTrigger}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}