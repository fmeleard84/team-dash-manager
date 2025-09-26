import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FullScreenModal, ModalActions } from '@/components/ui/fullscreen-modal';
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
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatarNeon } from '@/components/ui/user-avatar-neon';

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
    languages?: string[];
    expertises?: string[];
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
  activeProjects = [],
  pendingInvitations = [],
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
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [fullTeam, setFullTeam] = useState<any[]>([]);

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

  // Fonction pour charger toute l'équipe du projet
  const fetchFullTeam = async (projectId: string) => {
    console.log("🔍 [fetchFullTeam] Chargement équipe pour projet:", projectId);
    try {
      const { data: assignments, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          project_id,
          candidate_id,
          profile_id,
          booking_status,
          seniority,
          languages,
          expertises,
          calculated_price,
          created_at,
          candidate_profiles (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      console.log("📊 [fetchFullTeam] Résultat requête:", { assignments, error });
      
      if (error) {
        console.error("❌ [fetchFullTeam] Erreur chargement équipe:", error);
        setFullTeam([]);
      } else if (assignments && assignments.length > 0) {
        console.log(`✅ [fetchFullTeam] ${assignments.length} membres trouvés`);
        
        // Enrichir avec les informations hr_profiles
        const enrichedAssignments = await Promise.all(assignments.map(async (a) => {
          // Récupérer le hr_profile pour avoir le label du métier
          const { data: hrProfile, error: profileError } = await supabase
            .from('hr_profiles')
            .select('name')
            .eq('id', a.profile_id)
            .single();
          
          if (profileError) {
            console.warn("⚠️ [fetchFullTeam] Erreur récupération hr_profile:", profileError);
          }
          
          return {
            ...a,
            hr_profiles: hrProfile ? { label: hrProfile.name } : null,
            candidate_profiles: a.candidate_profiles || null
          };
        }));
        
        console.log("🎯 [fetchFullTeam] Équipe enrichie:", enrichedAssignments);
        setFullTeam(enrichedAssignments);
      } else {
        console.log("⚠️ [fetchFullTeam] Aucun membre d'équipe trouvé");
        setFullTeam([]);
      }
    } catch (error) {
      console.error("Erreur inattendue chargement équipe:", error);
    }
  };

  // Charger les fichiers et l'équipe quand un projet est sélectionné
  useEffect(() => {
    if (selectedProject) {
      fetchProjectFiles(selectedProject.id);
      fetchFullTeam(selectedProject.id);
    } else {
      setProjectFiles([]);
      setFullTeam([]);
    }
  }, [selectedProject]);

  // Catégoriser tous les projets
  const allProjects = [
    ...(Array.isArray(pendingInvitations) ? pendingInvitations : []).map(p => ({
      ...p,
      category: 'invitations'
    })),
    ...(Array.isArray(activeProjects) ? activeProjects : []).map(p => ({
      ...p,
      // Le candidat a accepté (booking_status='accepted'), donc on regarde le statut du projet
      category: p.booking_status === 'completed' ? 'termines' :  // Projet terminé pour ce candidat
                p.status === 'completed' ? 'termines' :  // Projet globalement terminé
                p.status === 'play' ? 'en-cours' :  // Projet démarré (kickoff fait)
                'attente-kickoff'  // Projet accepté mais pas encore démarré
    }))
  ];

  // Projets filtrés
  const filteredProjects = selectedFilters.length === 0 
    ? allProjects 
    : allProjects.filter(p => selectedFilters.includes(p.category));

  // Compteurs par statut
  const safeActiveProjects = Array.isArray(activeProjects) ? activeProjects : [];
  const safePendingInvitations = Array.isArray(pendingInvitations) ? pendingInvitations : [];

  const statusCounts = {
    'invitations': safePendingInvitations.length,
    'en-cours': safeActiveProjects.filter(p => p.booking_status !== 'completed' && p.status === 'play').length,
    'attente-kickoff': safeActiveProjects.filter(p => p.booking_status === 'accepted' && p.status !== 'play' && p.status !== 'completed').length,
    'termines': safeActiveProjects.filter(p => p.booking_status === 'completed' || p.status === 'completed').length,
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
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <Briefcase className="w-4 h-4 text-primary-500" />
        <span>{assignment.hr_profiles?.label || 'Non défini'}</span>
        {assignment.seniority && (
          <>
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
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
            <h1 className="flex items-center gap-3 text-4xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-50 animate-pulse" />
                <FolderOpen className="relative h-9 w-9 text-primary-500" />
              </div>
              Mes missions
            </h1>
            <p className="mt-2 text-lg text-neutral-600 dark:text-neutral-400">
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
        <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filtrer par statut</span>
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
                      ? "border-primary-500 bg-primary-500/10 dark:bg-primary-500/20"
                      : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-primary-300 dark:hover:border-primary-700"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {config.label}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs px-1.5 py-0",
                      isSelected ? "bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-300" : "bg-neutral-100 dark:bg-neutral-700"
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
          <div className="text-center py-12 backdrop-blur-xl bg-white/50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full blur-xl opacity-30 animate-pulse" />
              <div className="relative w-16 h-16 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-full flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-primary-500" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              Aucune mission trouvée
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
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
                className="relative backdrop-blur-xl bg-white/90 dark:bg-neutral-900/90 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 hover:border-primary-500/50 hover:shadow-neon-purple transition-all duration-300 p-6"
              >
                {/* Badge de statut positionné en haut à droite */}
                <div className="absolute -top-2 right-4 z-10">
                  {getProjectBadge(project)}
                </div>
                
                <div className="space-y-4">
                  {/* En-tête du projet */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-neutral-600 dark:text-neutral-400 mb-3">{project.description}</p>
                      )}
                      
                      {/* Infos du projet */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {project.owner?.company_name && (
                          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                            <Building2 className="w-4 h-4" />
                            <span>{project.owner.company_name}</span>
                          </div>
                        )}
                        
                        {getCandidateRole(project)}
                        
                        {project.project_date && (
                          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                            <Calendar className="w-4 h-4 text-primary-500" />
                            <span>
                              Début le {new Date(project.project_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
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
                        // Toujours ouvrir le modal de détails pour tous les projets
                        setSelectedProject(project);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Voir les détails du projet
                    </Button>
                    
                    {project.category === 'invitations' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onAcceptMission?.(project.id)}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-neon-cyan transition-all duration-300 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeclineMission?.(project.id)}
                          className="border-red-500/50 text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:border-red-500 hover:shadow-lg transition-all duration-300 flex items-center gap-1"
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
              <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-xl p-6 border border-neutral-200/50 dark:border-neutral-700/50">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-neutral-900 dark:text-white">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded blur opacity-50" />
                    <FileText className="relative w-5 h-5 text-primary-500" />
                  </div>
                  Description
                </h3>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {selectedProject.description || 'Aucune description disponible pour ce projet.'}
                </p>
              </div>
              
              {/* Informations du projet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client */}
                {selectedProject.owner?.company_name && (
                  <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-lg p-4 border border-neutral-200/50 dark:border-neutral-700/50 hover:border-primary-500/50 hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                      <Building2 className="w-4 h-4 text-primary-500" />
                      <span>Client</span>
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-white">{selectedProject.owner.company_name}</p>
                  </div>
                )}
                
                {/* Rôle */}
                {selectedProject.hr_resource_assignments?.[0]?.hr_profiles?.label && (
                  <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-lg p-4 border border-neutral-200/50 dark:border-neutral-700/50 hover:border-primary-500/50 hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                      <Briefcase className="w-4 h-4 text-primary-500" />
                      <span>Rôle demandé</span>
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {selectedProject.hr_resource_assignments[0].hr_profiles.label}
                      {selectedProject.hr_resource_assignments[0].seniority && (
                        <span className="text-sm text-neutral-600 dark:text-neutral-400 ml-2 capitalize">
                          ({selectedProject.hr_resource_assignments[0].seniority})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                
                {/* Date de début */}
                {selectedProject.project_date && (
                  <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-lg p-4 border border-neutral-200/50 dark:border-neutral-700/50 hover:border-primary-500/50 hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      <span>Date de début</span>
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
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
                  <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-lg p-4 border border-neutral-200/50 dark:border-neutral-700/50 hover:border-primary-500/50 hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                      <Clock className="w-4 h-4 text-primary-500" />
                      <span>Date de fin estimée</span>
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
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
                  <div className="backdrop-blur-xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 dark:from-primary-500/20 dark:to-secondary-500/20 rounded-lg p-4 border border-primary-500/30 dark:border-primary-500/50 shadow-lg shadow-primary-500/10">
                    <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 mb-1">
                      <Euro className="w-4 h-4" />
                      <span>Budget du projet</span>
                    </div>
                    <p className="font-bold text-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-transparent bg-clip-text">
                      {selectedProject.client_budget.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </p>
                  </div>
                )}

                {/* Fichiers attachés */}
                {projectFiles.length > 0 && (
                  <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-lg p-4 border border-neutral-200/50 dark:border-neutral-700/50">
                    <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 mb-3">
                      <Paperclip className="w-4 h-4" />
                      <span>Fichiers attachés ({projectFiles.length})</span>
                    </div>
                    <div className="space-y-2">
                      {projectFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/50 dark:bg-neutral-800/50 rounded p-2 border border-neutral-200/30 dark:border-neutral-700/30">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-primary-500 flex-shrink-0" />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{file.name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from('project-files')
                                .download(`projects/${selectedProject.id}/${file.name}`);
                              if (data) {
                                const url = URL.createObjectURL(data);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = file.name;
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Constitution de l'équipe */}
              {fullTeam.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded blur opacity-50" />
                      <Users className="relative w-5 h-5 text-primary-500" />
                    </div>
                    Constitution de l'équipe complète ({fullTeam.length} membre{fullTeam.length > 1 ? 's' : ''})
                  </h3>
                  <div className="space-y-3">
                    {fullTeam.map((assignment, index) => (
                      <div key={index} className="backdrop-blur-xl bg-neutral-50 dark:bg-neutral-800/90 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4 flex-1">
                            <div>
                              <span className="font-semibold text-neutral-900 dark:text-white">
                                {assignment.hr_profiles?.label || 'Poste non défini'}
                              </span>
                              <span className="text-neutral-400 dark:text-neutral-500 mx-2">•</span>
                              <span className="text-neutral-700 dark:text-neutral-300">
                                {assignment.seniority || 'Séniorité non définie'}
                              </span>
                            </div>
                          </div>
                          {assignment.booking_status === 'accepted' && (
                            <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                              ✓ Confirmé
                            </Badge>
                          )}
                          {assignment.booking_status === 'recherche' && (
                            <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              En recherche
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {assignment.languages && assignment.languages.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-500 dark:text-neutral-400">Langues:</span>
                              <div className="flex gap-1">
                                {assignment.languages.map((lang: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700">
                                    {lang}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {assignment.expertises && assignment.expertises.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-500 dark:text-neutral-400">Expertises:</span>
                              <div className="flex gap-1">
                                {assignment.expertises.map((exp: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs bg-secondary-100 dark:bg-secondary-900/50 text-secondary-700 dark:text-secondary-300 border border-secondary-300 dark:border-secondary-700">
                                    {exp}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {assignment.booking_status === 'accepted' && assignment.candidate_profiles && (
                          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                            <UserAvatarNeon
                              user={{
                                id: assignment.candidate_profiles.id,
                                firstName: assignment.candidate_profiles.first_name,
                                lastName: assignment.candidate_profiles.last_name,
                                jobTitle: assignment.hr_profiles?.label || assignment.candidate_profiles.position,
                                seniority: assignment.seniority,
                                status: 'online',
                                isValidated: true
                              }}
                              size="sm"
                              variant="list"
                              showStatus={true}
                              showBadges={true}
                              className="bg-white/50 rounded-lg px-2"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </FullScreenModal>
    </div>
  );
}