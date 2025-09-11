import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
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
  Smartphone
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
import { EnhancedMessageSystem } from "@/components/shared/EnhancedMessageSystem";
import { EnhancedMessageSystemNeon } from "@/components/shared/EnhancedMessageSystemNeon";
import { InvoiceList } from "@/components/invoicing/InvoiceList";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { useProjectOrchestrator } from "@/hooks/useProjectOrchestrator";
import { useRealtimeProjectsFixed } from "@/hooks/useRealtimeProjectsFixed";
import { useProjectSort, type ProjectWithDate } from "@/hooks/useProjectSort";
import { ProjectSelectorNeon } from "@/components/ui/project-selector-neon";
import { useProjectSelector } from "@/hooks/useProjectSelector";
import ClientMetricsDashboard from "./ClientMetricsDashboard";
import PlanningPage from "./PlanningPage";
import WikiView from "@/components/wiki/WikiView";

const ClientDashboard = () => {
const [searchParams, setSearchParams] = useSearchParams();
const [activeSection, setActiveSection] = useState('start');
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const { user, logout } = useAuth();
const navigate = useNavigate();
const { toast } = useToast();

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
      .eq('owner_id', user.id);
    
    if (!error && projectsData) {
      const active = projectsData.filter(p => !p.archived_at && !p.deleted_at);
      const archived = projectsData.filter(p => p.archived_at || p.deleted_at);
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
}, [user?.id]);

// Use realtime hook for projects
useRealtimeProjectsFixed({
  setProjects: (updater) => {
    const currentProjects = [...projects, ...archivedProjects];
    const allProjects = typeof updater === 'function' ? updater(currentProjects) : updater;
    const active = allProjects?.filter(p => !p.archived_at && !p.deleted_at) || [];
    const archived = allProjects?.filter(p => p.archived_at || p.deleted_at) || [];
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

const handleProjectArchive = async (projectId: string) => {
  if (!user?.id) return;
  
  try {
    const { error } = await supabase
      .from('projects')
      .update({ 
        archived_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', projectId)
      .eq('owner_id', user.id);

    if (error) throw error;

    toast({
      title: "Projet archivé",
      description: "Le projet a été archivé avec succès",
    });
    
    setRefreshTrigger(prev => prev + 1);
  } catch (error) {
    console.error('Error archiving project:', error);
    toast({
      title: "Erreur",
      description: "Impossible d'archiver le projet",
      variant: "destructive",
    });
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

const handleProjectDelete = async (project: DbProject) => {
  if (!user?.id) return;
  
  try {
    // Archive the project instead of hard delete
    const { error } = await supabase
      .from('projects')
      .update({ 
        archived_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', project.id)
      .eq('owner_id', user.id);

    if (error) throw error;

    toast({
      title: "Projet archivé",
      description: "Le projet a été archivé avec succès",
    });
    
    setRefreshTrigger(prev => prev + 1);
  } catch (error) {
    console.error('Error archiving project:', error);
    toast({
      title: "Erreur",
      description: "Impossible d'archiver le projet",
      variant: "destructive",
    });
  }
};

const renderStartContent = () => {
  return (
    <div className="space-y-8">
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

      {/* Archived Projects */}
      {archivedProjects && archivedProjects.length > 0 && (
        <PageSection title="Projets archivés">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedProjects.map((project) => (
              <Card key={project.id} className="opacity-75">
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {project.description || 'Pas de description'}
                  </p>
                  <Badge variant="secondary" className="mt-2">Archivé</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageSection>
      )}
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
      {/* Header unifié */}
      <Card className="border-0 bg-gradient-to-br from-primary to-primary/80">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-background/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Kanban className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary-foreground">Tableau Kanban</h2>
                <p className="text-sm text-primary-foreground/80">Gérez vos tâches et suivez l'avancement du projet</p>
              </div>
            </div>
            
            <ProjectSelectorNeon
              projects={playProjects.map(p => ({ ...p, created_at: p.project_date }))}
              selectedProjectId={selectedKanbanProjectId}
              onProjectChange={setSelectedKanbanProjectId}
              placeholder="Sélectionner un projet"
              className="w-[280px]"
              showStatus={true}
              showDates={false}
              showTeamProgress={false}
            />
          </div>
        </CardContent>
      </Card>
      
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
      {/* Header moderne avec dégradé néon */}
      <Card className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              {/* Section gauche avec icône et titre */}
              <div className="flex items-center gap-6">
                {/* Icône animée avec effet néon */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                </div>
                
                {/* Titre et sous-titre */}
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">
                      Messagerie
                    </h2>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs px-2 py-0.5 animate-pulse">
                      En ligne
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Communication en temps réel avec votre équipe</p>
                </div>
                
                {/* Sélecteur de projet sur la même ligne */}
                <ProjectSelectorNeon
                  projects={playProjects.map(p => ({ ...p, created_at: p.project_date }))}
                  selectedProjectId={selectedMessagesProjectId}
                  onProjectChange={setSelectedMessagesProjectId}
                  placeholder="Sélectionner un projet"
                  className="w-[280px]"
                  showStatus={true}
                  showDates={true}
                  showTeamProgress={false}
                />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
      
      {/* Zone de messagerie */}
      {selectedMessagesProjectId && (
        <div className="h-[700px]">
          <EnhancedMessageSystemNeon projectId={selectedMessagesProjectId} userType="client" />
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
      {/* Header unifié */}
      <Card className="border-0 bg-gradient-to-br from-primary to-primary/80">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-background/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary-foreground">Drive partagé</h2>
                <p className="text-sm text-primary-foreground/80">Stockage et partage de fichiers du projet</p>
              </div>
            </div>
            
            <ProjectSelectorNeon
              projects={playProjects.map(p => ({ ...p, created_at: p.project_date }))}
              selectedProjectId={selectedDriveProjectId}
              onProjectChange={setSelectedDriveProjectId}
              placeholder="Sélectionner un projet"
              className="w-[280px]"
              showStatus={true}
              showDates={false}
              showTeamProgress={false}
            />
          </div>
        </CardContent>
      </Card>
      
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
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-8 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
              <Rocket className="h-10 w-10" />
              Bibliothèque de Templates
            </h1>
            <p className="text-lg opacity-90">
              Démarrez rapidement avec nos modèles de projets préconfigurés
            </p>
          </div>
          {/* Motif décoratif */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>

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
      {/* Header moderne avec gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-8 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
            <Rocket className="h-10 w-10" />
            Bibliothèque de Templates
          </h1>
          <p className="text-lg opacity-90">
            {templates.length} modèles disponibles dans {categories.length} catégories
          </p>
        </div>
        {/* Motif décoratif */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

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
                  className="p-3 rounded-xl shadow-lg text-white"
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
                    className="group relative overflow-hidden border-border hover:border-purple-500/50 dark:hover:border-purple-400/50 transition-all duration-300 hover:shadow-xl cursor-pointer"
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
      {/* Header unifié */}
      <Card className="border-0 bg-gradient-to-br from-primary to-primary/80">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-background/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary-foreground">Wiki collaboratif</h2>
                <p className="text-sm text-primary-foreground/80">Documentation et base de connaissances du projet</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ProjectSelectorNeon
                projects={playProjects.map(p => ({ ...p, created_at: p.project_date }))}
                selectedProjectId={selectedWikiProjectId}
                onProjectChange={setSelectedWikiProjectId}
                placeholder="Sélectionner un projet"
                className="w-[280px]"
                showStatus={true}
                showDates={false}
                showTeamProgress={false}
              />
              
              {selectedWikiProjectId && (
                <Button
                  variant="secondary"
                  className="bg-background/20 hover:bg-background/30 text-primary-foreground border-0"
                  onClick={() => setIsWikiFullscreen(!isWikiFullscreen)}
                >
                  {isWikiFullscreen ? 'Réduire' : 'Plein écran'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
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
                <span>Projets</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('templates')}
                isActive={activeSection === 'templates'}
              >
                <Rocket className="h-4 w-4" />
                <span>Templates</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('kanban')}
                isActive={activeSection === 'kanban'}
              >
                <Kanban className="h-4 w-4" />
                <span>Kanban</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('planning')}
                isActive={activeSection === 'planning'}
              >
                <Calendar className="h-4 w-4" />
                <span>Planning</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('messages')}
                isActive={activeSection === 'messages'}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Messages</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('drive')}
                isActive={activeSection === 'drive'}
              >
                <Cloud className="h-4 w-4" />
                <span>Drive</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('wiki')}
                isActive={activeSection === 'wiki'}
              >
                <BookOpen className="h-4 w-4" />
                <span>Wiki</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('invoices')}
                isActive={activeSection === 'invoices'}
              >
                <Receipt className="h-4 w-4" />
                <span>Factures</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigateToSection('metrics')}
                isActive={activeSection === 'metrics'}
              >
                <Activity className="h-4 w-4" />
                <span>Métriques</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Compte</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigateToSection('settings')}>
                <Settings className="h-4 w-4" />
                <span>Paramètres</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
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
      <h1 className="text-xl font-semibold">Dashboard Client</h1>
    </div>
    <div className="flex items-center gap-4">
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
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDelete={() => {
          handleProjectDelete(projectToDelete);
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
      />
    )}
  </SidebarProvider>
);
};

export default ClientDashboard;