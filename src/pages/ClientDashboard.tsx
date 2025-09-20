import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSelector } from "@/components/ui/language-selector";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger 
} from "@/components/ui/sidebar";
import {
  FolderOpen,
  Receipt,
  Settings,
  LogOut,
  Kanban,
  Calendar,
  Cloud,
  MessageSquare,
  Rocket,
  Plus,
  Eye,
  Network,
  Users,
  Activity,
  Archive,
  BookOpen,
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  Euro,
  Code,
  Palette,
  Megaphone,
  Briefcase,
  Zap,
  Heart,
  ShoppingCart,
  Smartphone,
  Mic,
} from "lucide-react";
// Design System Components
import { PageSection } from "@/ui/layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import { KPI } from "@/ui/components/KPI";
import { ThemeToggle } from "@/ui/components/ThemeToggle";

// Business Logic Components (unchanged)
import { IallaLogo } from "@/components/IallaLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useTemplates } from "@/hooks/useTemplates";
import SimpleDriveView from "@/components/drive/SimpleDriveView";
import CreateProjectModal from "@/components/CreateProjectModal";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectsSection } from '@/components/client/ProjectsSection';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ClientKanbanView from "@/components/client/ClientKanbanView";
import { UnifiedMessageSystem, messageSystemPresets } from "@/components/messaging/UnifiedMessageSystem";
import { InvoiceList } from "@/components/invoicing/InvoiceList";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { useProjectOrchestrator } from "@/hooks/useProjectOrchestrator";
import { useRealtimeProjectsFixed } from "@/hooks/useRealtimeProjectsFixed";
import { useProjectSort, type ProjectWithDate } from "@/hooks/useProjectSort";
import { ProjectSelectorNeon } from "@/components/ui/project-selector-neon";
import { useProjectSelector } from "@/hooks/useProjectSelector";
import { useClientCredits } from "@/hooks/useClientCredits";
import ClientMetricsDashboard from "./ClientMetricsDashboard";
import PlanningPage from "./PlanningPage";
import WikiView from "@/components/wiki/WikiView";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { PageHeaderNeon } from "@/components/ui/page-header-neon";
import { EnhancedVoiceAssistant } from '@/components/client/EnhancedVoiceAssistant';
import { ClientSettings } from '@/components/client/ClientSettings';

const ClientDashboard = () => {
const [searchParams, setSearchParams] = useSearchParams();
const [activeSection, setActiveSection] = useState('start');
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const { user, logout } = useAuth();
const navigate = useNavigate();
const { toast } = useToast();
const { t } = useTranslation();

// Projects state
type DbProject = { 
  id: string; 
  title: string; 
  description?: string | null; 
  project_date: string; 
  due_date?: string | null; 
  client_budget?: number | null; 
  status: string;
  archived_at?: string | null;
  deleted_at?: string | null;
};
const [projects, setProjects] = useState<DbProject[]>([]);
const [archivedProjects, setArchivedProjects] = useState<DbProject[]>([]);
const [resourceAssignments, setResourceAssignments] = useState<any[]>([]);
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [projectToDelete, setProjectToDelete] = useState<DbProject | null>(null);
const [archiveMode, setArchiveMode] = useState(false); // true si on veut archiver, false si on veut supprimer
const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
// const [showTextChat, setShowTextChat] = useState(false); // Removed - using EnhancedVoiceAssistant instead

// Debug useEffect
useEffect(() => {
  console.log('isCreateOpen changed to:', isCreateOpen);
}, [isCreateOpen]);
const [isCreating, setIsCreating] = useState(false);
const [selectedKanbanProjectId, setSelectedKanbanProjectId] = useState<string>("");
const [selectedMessagesProjectId, setSelectedMessagesProjectId] = useState<string>("");
const [selectedDriveProjectId, setSelectedDriveProjectId] = useState<string>("");
const [selectedWikiProjectId, setSelectedWikiProjectId] = useState<string>("");
const [isWikiFullscreen, setIsWikiFullscreen] = useState(false);
const [refreshTrigger, setRefreshTrigger] = useState(0);

const { setupProject, isLoading: isOrchestrating } = useProjectOrchestrator();
const { categories, templates, getTemplatesByCategory } = useTemplates();
const { balance, formatBalance } = useClientCredits();

// Sort projects for different sections using the universal hook
const playProjects = useMemo(() => 
  projects.filter(p => p.status === 'play') as ProjectWithDate[], 
  [projects]
);
const sortedMessagesProjects = useProjectSort(playProjects);
const sortedDriveProjects = useProjectSort(playProjects);
const sortedWikiProjects = useProjectSort(playProjects);
const sortedKanbanProjects = useProjectSort(playProjects);

// Set default project to most recent when projects change
useEffect(() => {
  if (sortedMessagesProjects.length > 0 && !selectedMessagesProjectId) {
    setSelectedMessagesProjectId(sortedMessagesProjects[0].id);
  }
}, [sortedMessagesProjects]);

useEffect(() => {
  if (sortedDriveProjects.length > 0 && !selectedDriveProjectId) {
    setSelectedDriveProjectId(sortedDriveProjects[0].id);
  }
}, [sortedDriveProjects]);

useEffect(() => {
  if (sortedWikiProjects.length > 0 && !selectedWikiProjectId) {
    setSelectedWikiProjectId(sortedWikiProjects[0].id);
  }
}, [sortedWikiProjects]);

useEffect(() => {
  if (sortedKanbanProjects.length > 0 && !selectedKanbanProjectId) {
    setSelectedKanbanProjectId(sortedKanbanProjects[0].id);
  }
}, [sortedKanbanProjects]);

// Load initial projects
useEffect(() => {
  const loadProjects = async () => {
    if (!user?.id) return;

    const { data: projectsData, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && projectsData) {
      console.log('Projects loaded:', projectsData.length, 'projects');
      const active = projectsData.filter(p => !p.archived_at && !p.deleted_at);
      const archived = projectsData.filter(p => p.archived_at && !p.deleted_at);
      setProjects(active);
      setArchivedProjects(archived);
    }

    // Load resource assignments
    const { data: assignmentsData } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .in('project_id', projectsData?.map(p => p.id) || []);

    if (assignmentsData) {
      setResourceAssignments(assignmentsData);
    }
  };

  loadProjects();
}, [user?.id, refreshTrigger]);

// Use realtime hook for projects
useRealtimeProjectsFixed({
  setProjects: (updater) => {
    const currentProjects = [...projects, ...archivedProjects];
    const allProjects = typeof updater === 'function' ? updater(currentProjects) : updater;
    const active = allProjects?.filter(p => !p.archived_at && !p.deleted_at) || [];
    const archived = allProjects?.filter(p => p.archived_at && !p.deleted_at) || [];
    setProjects(active);
    setArchivedProjects(archived);
  },
  setResourceAssignments,
  userId: user?.id,
  userType: 'client',
  candidateProfile: null
});

// Calculate metrics
const projectsMetrics = useMemo(() => {
  const activeProjects = projects.filter(p => p.status === 'play');
  const totalBudget = projects.reduce((sum, p) => sum + (p.client_budget || 0), 0);
  const avgBudget = projects.length > 0 ? totalBudget / projects.length : 0;
  
  return {
    total: projects.length,
    active: activeProjects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalBudget,
    avgBudget
  };
}, [projects]);

// URL parameter handling for section navigation
useEffect(() => {
  const section = searchParams.get('section');
  if (section) {
    setActiveSection(section);
  }
}, [searchParams]);

const navigateToSection = (section: string) => {
  setActiveSection(section);
  setSearchParams({ section });
};

const handleLogout = async () => {
  await logout();
  navigate('/login');
};

const handleProjectToggleStatus = async (projectId: string, currentStatus: string) => {
  if (!user?.id) return;
  
  const newStatus = currentStatus === 'pause' ? 'play' : 'pause';
  
  try {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId)
      .eq('owner_id', user.id);

    if (error) throw error;

    toast({
      title: "Statut mis à jour",
      description: `Le projet est maintenant ${newStatus === 'play' ? 'actif' : 'en pause'}`,
    });
    
    setRefreshTrigger(prev => prev + 1);
  } catch (error) {
    console.error('Error toggling project status:', error);
    toast({
      title: "Erreur",
      description: "Impossible de modifier le statut du projet",
      variant: "destructive",
    });
  }
};

const handleProjectStart = async (project: { id: string; title: string; kickoffISO?: string }) => {
  if (!project.kickoffISO) return;
  
  try {
    await setupProject(project.id, project.kickoffISO);
    
    toast({
      title: "Projet démarré",
      description: `Le projet "${project.title}" a été démarré avec succès`,
    });
    
    setRefreshTrigger(prev => prev + 1);
  } catch (error) {
    console.error('Error starting project:', error);
    toast({
      title: "Erreur",
      description: "Impossible de démarrer le projet",
      variant: "destructive",
    });
  }
};

const handleProjectArchive = (projectId: string) => {
  // Ouvrir la popup en mode archivage
  const project = projects.find(p => p.id === projectId);
  if (project) {
    setProjectToDelete(project);
    setArchiveMode(true);
    setDeleteDialogOpen(true);
  }
};

const handleProjectUnarchive = async (projectId: string) => {
  if (!user?.id) return;

  try {
    const { error } = await supabase
      .from('projects')
      .update({
        archived_at: null,
        status: 'pause'
      })
      .eq('id', projectId)
      .eq('owner_id', user.id);

    if (error) throw error;

    // Trouver le projet archivé et le déplacer immédiatement vers les projets actifs
    const projectToUnarchive = archivedProjects.find(p => p.id === projectId);
    if (projectToUnarchive) {
      setArchivedProjects(prev => prev.filter(p => p.id !== projectId));
      setProjects(prev => [...prev, { ...projectToUnarchive, archived_at: null, status: 'pause' }]);
    }

    toast({
      title: "Projet restauré",
      description: "Le projet a été restauré avec succès",
    });

    setRefreshTrigger(prev => prev + 1);
  } catch (error) {
    console.error('Error unarchiving project:', error);
    toast({
      title: "Erreur",
      description: "Impossible de restaurer le projet",
      variant: "destructive",
    });
  }
};

const handleProjectDelete = (project: DbProject) => {
  // Ouvrir la popup en mode suppression
  setProjectToDelete(project);
  setArchiveMode(false);
  setDeleteDialogOpen(true);
};

const renderStartContent = () => {
  return (
    <div className="relative">
      <AnimatedBackground variant="subtle" speed="slow" className="fixed inset-0" />
      <div className="relative z-10 space-y-8">
        {/* KPIs Section */}
        <PageSection title="Vue d'ensemble">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPI 
            label="Projets actifs" 
            value={projectsMetrics.active}
            icon={<Rocket className="w-5 h-5" />}
          />
          <KPI 
            label="Total projets" 
            value={projectsMetrics.total}
            icon={<Package className="w-5 h-5" />}
          />
          <KPI 
            label="Budget total" 
            value={`${projectsMetrics.totalBudget.toLocaleString()} €`}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <KPI 
            label="Projets terminés" 
            value={projectsMetrics.completed}
            delta={{ value: "+12%", trend: "up" }}
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>
      </PageSection>

      {/* Projects Section - No wrapper needed as ProjectsSection has its own header */}
      <ProjectsSection
        projects={projects}
        archivedProjects={archivedProjects}
        resourceAssignments={resourceAssignments}
        onCreateProject={() => setIsCreateOpen(true)}
        onViewTemplates={() => {
          setActiveSection('templates');
        }}
        onViewProject={(id) => navigate(`/project/${id}`)}
        onToggleStatus={handleProjectToggleStatus}
        onStartProject={handleProjectStart}
        onDeleteRequest={(project) => {
          setProjectToDelete(project);
          setDeleteDialogOpen(true);
        }}
        onArchiveProject={handleProjectArchive}
        onUnarchiveProject={handleProjectUnarchive}
        onProjectEdited={() => setRefreshTrigger(prev => prev + 1)}
        refreshTrigger={refreshTrigger}
      />
      </div>
    </div>
  );
};

const renderKanbanContent = () => {
  if (sortedKanbanProjects.length === 0) {
    return (
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-purple-500/30">
        <Kanban className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2 text-white">Aucun projet actif</h3>
        <p className="text-sm text-gray-300">
          Démarrez un projet pour accéder au tableau Kanban
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header unifié avec design néon */}
      <PageHeaderNeon
        icon={Kanban}
        title="Tableau Kanban"
        subtitle="Gérez vos tâches et suivez l'avancement du projet"
        projects={playProjects.map(p => ({ ...p, created_at: p.project_date }))}
        selectedProjectId={selectedKanbanProjectId}
        onProjectChange={setSelectedKanbanProjectId}
        projectSelectorConfig={{
          placeholder: "Sélectionner un projet",
          showStatus: true,
          showDates: false,
          showTeamProgress: false,
          className: "w-[280px]"
        }}
      />
      
      {selectedKanbanProjectId && (
        <ClientKanbanView projectId={selectedKanbanProjectId} />
      )}
    </div>
  );
};

const renderMessagesContent = () => {
  if (sortedMessagesProjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
          <p className="text-sm text-muted-foreground">
            Démarrez un projet pour accéder à la messagerie
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header unifié avec design néon */}
      <PageHeaderNeon
        icon={MessageSquare}
        title="Messagerie"
        subtitle="Communication en temps réel avec votre équipe"
        badge={{ text: "En ligne", animate: true }}
        projects={playProjects.map(p => ({ ...p, created_at: p.project_date }))}
        selectedProjectId={selectedMessagesProjectId}
        onProjectChange={setSelectedMessagesProjectId}
        projectSelectorConfig={{
          placeholder: "Sélectionner un projet",
          showStatus: true,
          showDates: true,
          showTeamProgress: false,
          className: "w-[280px]"
        }}
      />
      
      {/* Zone de messagerie */}
      {selectedMessagesProjectId && (
        <div className="h-[700px]">
          <UnifiedMessageSystem
            projectId={selectedMessagesProjectId}
            userType="client"
            config={messageSystemPresets.client}
          />
        </div>
      )}
    </div>
  );
};

const renderDriveContent = () => {
  if (sortedDriveProjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Cloud className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
          <p className="text-sm text-muted-foreground">
            Démarrez un projet pour accéder au Drive
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header unifié avec design néon */}
      <PageHeaderNeon
        icon={Cloud}
        title="Drive partagé"
        subtitle="Stockage et partage de fichiers du projet"
        projects={playProjects.map(p => ({ ...p, created_at: p.project_date }))}
        selectedProjectId={selectedDriveProjectId}
        onProjectChange={setSelectedDriveProjectId}
        projectSelectorConfig={{
          placeholder: "Sélectionner un projet",
          showStatus: true,
          showDates: false,
          showTeamProgress: false,
          className: "w-[280px]"
        }}
      />
      
      {selectedDriveProjectId && (
        <Card noPadding>
          <SimpleDriveView projectId={selectedDriveProjectId} />
        </Card>
      )}
    </div>
  );
};

const renderTemplatesContent = () => {
  if (!categories || categories.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header avec design Neon cohérent */}
        <PageHeaderNeon
          icon={Rocket}
          title="Bibliothèque de Templates"
          subtitle="Démarrez rapidement avec nos modèles de projets préconfigurés"
          showProjectSelector={false}
        />

        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-purple-100 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Rocket className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">Templates en préparation</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Notre équipe prépare une collection de templates pour vous aider à démarrer vos projets plus rapidement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fonction pour obtenir l'icône de catégorie dynamique
  const getCategoryIcon = (icon?: string) => {
    const iconClass = "h-6 w-6";
    
    // Mapping des icônes stockées dans le back office
    switch(icon) {
      case 'Code': return <Code className={iconClass} />;
      case 'Palette': return <Palette className={iconClass} />;
      case 'Megaphone': return <Megaphone className={iconClass} />;
      case 'Briefcase': return <Briefcase className={iconClass} />;
      case 'Zap': return <Zap className={iconClass} />;
      case 'Heart': return <Heart className={iconClass} />;
      case 'ShoppingCart': return <ShoppingCart className={iconClass} />;
      case 'Smartphone': return <Smartphone className={iconClass} />;
      case 'TrendingUp': return <TrendingUp className={iconClass} />;
      case 'DollarSign': return <DollarSign className={iconClass} />;
      case 'Users': return <Users className={iconClass} />;
      case 'Rocket': return <Rocket className={iconClass} />;
      default: return <FolderOpen className={iconClass} />;
    }
  };

  // Fonction pour déterminer le badge de complexité
  const getComplexityBadge = (level: string) => {
    switch(level) {
      case 'easy':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">Facile</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400">Intermédiaire</Badge>;
      case 'hard':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">Avancé</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header avec design Neon cohérent */}
      <PageHeaderNeon
        icon={Rocket}
        title="Bibliothèque de Templates"
        subtitle={`${templates.length} modèles disponibles dans ${categories.length} catégories`}
        showProjectSelector={false}
      />

      {/* Catégories et templates */}
      <div className="space-y-10">
        {categories.map((category) => {
          const categoryTemplates = getTemplatesByCategory(category.id);
          if (categoryTemplates.length === 0) return null;

          return (
            <div key={category.id} className="space-y-6">
              {/* Header de catégorie moderne avec gradient dynamique */}
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-xl shadow-md text-white"
                  style={{ 
                    background: category.color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  {getCategoryIcon(category.icon)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{category.name}</h2>
                  {category.description && (
                    <p className="text-muted-foreground">{category.description}</p>
                  )}
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {categoryTemplates.length} template{categoryTemplates.length > 1 ? 's' : ''}
                </Badge>
              </div>
              
              {/* Grille de templates avec design moderne */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="group relative overflow-hidden border-border hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-lg cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/project/template-preview?template=${template.id}`);
                    }}
                  >
                    {/* Barre de gradient en haut */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ background: category.color || 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' }}
                    />
                    
                    <CardHeader className="pt-6">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {template.name}
                          </CardTitle>
                        </div>
                        {getComplexityBadge(template.complexity_level)}
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                          {template.description}
                        </p>
                      )}
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Métriques du template */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Nombre de membres d'équipe */}
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground font-medium">
                            {template.reactflow_data?.nodes?.length || 0} membres
                          </span>
                        </div>
                        {template.estimated_cost && (
                          <div className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-foreground font-medium">
                              {template.estimated_cost.toLocaleString()}€
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Tags */}
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-xs px-2 py-0.5"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge 
                              variant="outline" 
                              className="text-xs px-2 py-0.5"
                            >
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Call to action */}
                      <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform group-hover:scale-[1.02]">
                        Utiliser ce template →
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderWikiContent = () => {
  if (sortedWikiProjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
          <p className="text-sm text-muted-foreground">
            Démarrez un projet pour accéder au Wiki
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header unifié avec design néon */}
      <PageHeaderNeon
        icon={BookOpen}
        title="Wiki collaboratif"
        subtitle="Documentation et base de connaissances du projet"
        projects={playProjects.map(p => ({ ...p, created_at: p.project_date }))}
        selectedProjectId={selectedWikiProjectId}
        onProjectChange={setSelectedWikiProjectId}
        projectSelectorConfig={{
          placeholder: "Sélectionner un projet",
          showStatus: true,
          showDates: false,
          showTeamProgress: false,
          className: "w-[280px]"
        }}
      >
        {selectedWikiProjectId && (
          <div className="flex items-center gap-2">
            <Button
                  variant="secondary"
                  className="bg-background/20 hover:bg-background/30 text-primary-foreground border-0"
                  onClick={() => setIsWikiFullscreen(!isWikiFullscreen)}
                >
                  {isWikiFullscreen ? 'Réduire' : 'Plein écran'}
                </Button>
          </div>
        )}
      </PageHeaderNeon>
      
      {selectedWikiProjectId && (
        <div className={isWikiFullscreen ? 'fixed inset-0 bg-background z-50 p-4' : ''}>
          {isWikiFullscreen && (
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Wiki - {sortedWikiProjects.find(p => p.id === selectedWikiProjectId)?.title}</h2>
              <Button variant="ghost" onClick={() => setIsWikiFullscreen(false)}>
                Fermer
              </Button>
            </div>
          )}
          <Card noPadding className={isWikiFullscreen ? 'h-[calc(100vh-120px)]' : ''}>
            <WikiView projectId={selectedWikiProjectId} />
          </Card>
        </div>
      )}
    </div>
  );
};

const renderContent = () => {
  switch (activeSection) {
    case 'start':
      return renderStartContent();
    case 'templates':
      return renderTemplatesContent();
    case 'kanban':
      return renderKanbanContent();
    case 'planning':
      return <PlanningPage projects={projects.filter(p => p.status === 'play')} />;
    case 'messages':
      return renderMessagesContent();
    case 'drive':
      return renderDriveContent();
    case 'wiki':
      return renderWikiContent();
    case 'invoices':
      return <InvoiceList userRole="client" />;
    case 'metrics':
      return <ClientMetricsDashboard />;
    case 'settings':
      return <ClientSettings defaultTab={searchParams.get('tab') as 'profile' | 'payments' || 'profile'} />;
    default:
      return renderStartContent();
  }
};

const sidebarContent = (
  <Sidebar>
    <SidebarContent className="bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <IallaLogo className="h-8 w-8" />
          <span className="font-semibold text-lg">Client</span>
        </div>
      </div>

      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('start')}
                isActive={activeSection === 'start'}
              >
                <FolderOpen className="h-4 w-4" />
                <span>{t('navigation.projects')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('templates')}
                isActive={activeSection === 'templates'}
              >
                <Rocket className="h-4 w-4" />
                <span>{t('navigation.templates')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('kanban')}
                isActive={activeSection === 'kanban'}
              >
                <Kanban className="h-4 w-4" />
                <span>{t('navigation.kanban')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('planning')}
                isActive={activeSection === 'planning'}
              >
                <Calendar className="h-4 w-4" />
                <span>{t('navigation.calendar')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('messages')}
                isActive={activeSection === 'messages'}
              >
                <MessageSquare className="h-4 w-4" />
                <span>{t('navigation.messages')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('drive')}
                isActive={activeSection === 'drive'}
              >
                <Cloud className="h-4 w-4" />
                <span>{t('navigation.drive')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('wiki')}
                isActive={activeSection === 'wiki'}
              >
                <BookOpen className="h-4 w-4" />
                <span>{t('navigation.wiki')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('invoices')}
                isActive={activeSection === 'invoices'}
              >
                <Receipt className="h-4 w-4" />
                <span>{t('navigation.invoices')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('metrics')}
                isActive={activeSection === 'metrics'}
              >
                <Activity className="h-4 w-4" />
                <span>{t('navigation.reports')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>{t('settings.account')}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigateToSection('settings')}>
                <Settings className="h-4 w-4" />
                <span>{t('navigation.settings')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <LanguageSelector variant="sidebar" />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>{t('navigation.logout')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
);

const headerContent = (
  <header className="h-16 px-6 flex items-center justify-between bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
    <div className="flex items-center gap-4">
      <SidebarTrigger />
      <h1 className="text-xl font-semibold">{t('dashboard.client.title')}</h1>
    </div>
    <div className="flex items-center gap-4">
      {/* Affichage du solde de crédits */}
      <Button
        variant="ghost"
        onClick={() => navigateToSection('settings', 'payments')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          balance === 0 
            ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20' 
            : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:from-purple-500/20 hover:to-pink-500/20'
        }`}
        title={balance === 0 ? "Cliquez pour ajouter des crédits" : "Voir l'historique des paiements"}
      >
        <Euro className={`w-4 h-4 ${balance === 0 ? 'text-red-500' : 'text-purple-500'}`} />
        <span className="text-sm font-medium">
          Solde: <span className={`font-bold ${balance === 0 ? 'text-red-500' : 'text-purple-500'}`}>
            {formatBalance()}
          </span>
        </span>
        {balance === 0 && (
          <Badge variant="secondary" className="ml-2 bg-red-500 text-white text-xs animate-pulse">
            Ajouter des crédits
          </Badge>
        )}
      </Button>
      <NotificationBell />
      <ThemeToggle />
    </div>
  </header>
);

return (
  <SidebarProvider>
    <div className="flex h-screen w-full">
      {sidebarContent}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {headerContent}
        
        <main className="flex-1 overflow-auto">
          <div className="w-full p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>

    {/* Modals */}
    <CreateProjectModal 
      isOpen={isCreateOpen}
      onClose={() => setIsCreateOpen(false)}
      onProjectCreated={(projectId) => {
        setRefreshTrigger(prev => prev + 1);
        setIsCreateOpen(false);
      }}
    />
    
    {projectToDelete && (
      <DeleteProjectDialog
        project={projectToDelete}
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
          setArchiveMode(false);
        }}
        onProjectDeleted={() => {
          // Retirer immédiatement le projet supprimé de la liste
          setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
          setArchivedProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
          setArchiveMode(false);
          setRefreshTrigger(prev => prev + 1);
        }}
        onProjectArchived={() => {
          // Déplacer le projet vers les archives
          const projectToArchive = projects.find(p => p.id === projectToDelete.id);
          if (projectToArchive) {
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            setArchivedProjects(prev => [...prev, {
              ...projectToArchive,
              archived_at: new Date().toISOString(),
              status: 'completed'
            }]);
          }
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
          setArchiveMode(false);
          setRefreshTrigger(prev => prev + 1);
        }}
      />
    )}

    {/* Assistant IA avec onglets Audio et Texte */}
    <EnhancedVoiceAssistant
      isOpen={isVoiceAssistantOpen}
      onClose={() => {
        setIsVoiceAssistantOpen(false);
        // Rafraîchir les projets après fermeture de l'assistant
        const refreshProjects = async () => {
          if (!user?.id) return;
          const { data: projectsData } = await supabase
            .from('projects')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

          if (projectsData) {
            const active = projectsData.filter(p => !p.archived_at && !p.deleted_at);
            const archived = projectsData.filter(p => p.archived_at && !p.deleted_at);
            setProjects(active);
            setArchivedProjects(archived);
          }
        };
        refreshProjects();
      }}
    />
  </SidebarProvider>
);
};

export default ClientDashboard;