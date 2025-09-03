import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FullScreenModal, ModalActions } from '@/components/ui/fullscreen-modal';
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
  Euro
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CandidateProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  project_date?: string;
  due_date?: string;
  client_budget?: number;
  owner?: {
    company_name?: string;
  };
  hr_resource_assignments?: Array<{
    id: string;
    booking_status: string;
    profile_id: string;
    seniority: string;
    start_date?: string;
    end_date?: string;
    hr_profiles?: {
      label: string;
    };
  }>;
}

interface CandidateProjectsSectionProps {
  activeProjects: CandidateProject[];
  pendingInvitations: CandidateProject[];
  onViewProject: (id: string) => void;
  onAcceptMission?: (projectId: string) => void;
  onDeclineMission?: (projectId: string) => void;
}

// Configuration des statuts avec leurs styles
const statusConfig = {
  'invitations': {
    label: 'Invitations en attente',
    icon: AlertCircle,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
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
  activeProjects,
  pendingInvitations,
  onViewProject,
  onAcceptMission,
  onDeclineMission,
}: CandidateProjectsSectionProps) {
  // Debug logs
  // console.log('CandidateProjectsSection - activeProjects:', activeProjects);
  // console.log('CandidateProjectsSection - pendingInvitations:', pendingInvitations);
  
  // État pour les filtres
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['invitations', 'en-cours', 'attente-kickoff']);
  const [showFilters, setShowFilters] = useState(false);
  
  // État pour le modal de détails
  const [selectedProject, setSelectedProject] = useState<CandidateProject | null>(null);

  // Catégoriser tous les projets
  const allProjects = [
    ...pendingInvitations.map(p => ({ 
      ...p, 
      category: 'invitations' 
    })),
    ...activeProjects.map(p => ({ 
      ...p, 
      // Utiliser booking_status pour déterminer si le projet est terminé pour ce candidat
      category: p.booking_status === 'completed' ? 'termines' :
                p.status === 'play' ? 'en-cours' : 
                p.status === 'completed' ? 'termines' : 'attente-kickoff'
    }))
  ];

  // Projets filtrés
  const filteredProjects = selectedFilters.length === 0 
    ? allProjects 
    : allProjects.filter(p => selectedFilters.includes(p.category));

  // Compteurs par statut
  const statusCounts = {
    'invitations': pendingInvitations.length,
    'en-cours': activeProjects.filter(p => p.booking_status !== 'completed' && p.status === 'play').length,
    'attente-kickoff': activeProjects.filter(p => p.booking_status !== 'completed' && (p.status === 'attente-team' || p.status === 'pause')).length,
    'termines': activeProjects.filter(p => p.booking_status === 'completed' || p.status === 'completed').length,
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

  // Fonction pour obtenir le rôle du candidat dans le projet
  const getCandidateRole = (project: CandidateProject) => {
    const assignment = project.hr_resource_assignments?.[0];
    if (!assignment) return null;
    
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Briefcase className="w-4 h-4" />
        <span>{assignment.hr_profiles?.label || 'Non défini'}</span>
        {assignment.seniority && (
          <>
            <span className="text-gray-400">•</span>
            <span className="capitalize">{assignment.seniority}</span>
          </>
        )}
      </div>
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
              Mes missions
            </h1>
            <p className="mt-2 text-lg text-[#6B7280]">
              {filteredProjects.length} mission{filteredProjects.length > 1 ? 's' : ''} 
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
              Aucune mission trouvée
            </h3>
            <p className="text-gray-500 mb-4">
              {selectedFilters.length > 0 
                ? "Aucune mission ne correspond aux filtres sélectionnés"
                : "Vous n'avez pas encore de mission"}
            </p>
            {selectedFilters.length > 0 && (
              <Button 
                variant="outline"
                onClick={clearAllFilters}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map((project) => (
              <div 
                key={project.id} 
                className="relative bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all p-6"
              >
                {/* Badge de statut positionné en haut à droite */}
                <div className="absolute -top-2 right-4 z-10">
                  {getProjectBadge(project)}
                </div>
                
                <div className="space-y-4">
                  {/* En-tête du projet */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-gray-600 mb-3">{project.description}</p>
                      )}
                      
                      {/* Infos du projet */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {project.owner?.company_name && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Building2 className="w-4 h-4" />
                            <span>{project.owner.company_name}</span>
                          </div>
                        )}
                        
                        {getCandidateRole(project)}
                        
                        {project.project_date && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Début {formatDistanceToNow(new Date(project.project_date), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (project.status === 'play') {
                          // Pour les projets actifs, naviguer vers le projet
                          onViewProject(project.id);
                        } else {
                          // Pour les autres, ouvrir le modal de détails
                          setSelectedProject(project);
                        }
                      }}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      {project.status === 'play' ? 'Accéder au projet' : 'Voir les détails'}
                    </Button>
                    
                    {project.category === 'invitations' && (
                      <>
                        <Button 
                          size="sm"
                          onClick={() => onAcceptMission?.(project.id)}
                          className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Accepter
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => onDeclineMission?.(project.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Refuser
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal de détails du projet */}
      <FullScreenModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        title={selectedProject?.title || ''}
        description="Détails complets de la mission"
        actions={
          selectedProject?.category === 'invitations' ? (
            <ModalActions
              onSave={() => {
                onAcceptMission?.(selectedProject.id);
                setSelectedProject(null);
              }}
              onCancel={() => {
                onDeclineMission?.(selectedProject.id);
                setSelectedProject(null);
              }}
              saveText="Accepter la mission"
              cancelText="Refuser"
              saveDisabled={false}
            />
          ) : undefined
        }
      >
        {selectedProject && (
          <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Description
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedProject.description || 'Aucune description disponible pour ce projet.'}
                </p>
              </div>
              
              {/* Informations du projet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client */}
                {selectedProject.owner?.company_name && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Building2 className="w-4 h-4" />
                      <span>Client</span>
                    </div>
                    <p className="font-semibold">{selectedProject.owner.company_name}</p>
                  </div>
                )}
                
                {/* Rôle */}
                {selectedProject.hr_resource_assignments?.[0]?.hr_profiles?.label && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span>Rôle demandé</span>
                    </div>
                    <p className="font-semibold">
                      {selectedProject.hr_resource_assignments[0].hr_profiles.label}
                      {selectedProject.hr_resource_assignments[0].seniority && (
                        <span className="text-sm text-gray-600 ml-2 capitalize">
                          ({selectedProject.hr_resource_assignments[0].seniority})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                
                {/* Date de début */}
                {selectedProject.project_date && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>Date de début</span>
                    </div>
                    <p className="font-semibold">
                      {new Date(selectedProject.project_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                
                {/* Date de fin */}
                {selectedProject.due_date && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Clock className="w-4 h-4" />
                      <span>Date de fin estimée</span>
                    </div>
                    <p className="font-semibold">
                      {new Date(selectedProject.due_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                
                {/* Budget */}
                {selectedProject.client_budget && (
                  <div className="bg-purple-50 rounded-lg p-4 md:col-span-2">
                    <div className="flex items-center gap-2 text-sm text-purple-600 mb-1">
                      <Euro className="w-4 h-4" />
                      <span>Budget du projet</span>
                    </div>
                    <p className="font-bold text-xl text-purple-700">
                      {selectedProject.client_budget.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </p>
                  </div>
                )}
              </div>
          </div>
        )}
      </FullScreenModal>
    </div>
  );
}