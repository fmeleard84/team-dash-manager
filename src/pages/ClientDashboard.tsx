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
  Package
} from "lucide-react";

// Design System Components
import { AppShell, PageSection, Container } from "@/ui/layout";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientKanbanView from "@/components/client/ClientKanbanView";
import { EnhancedMessageSystem } from "@/components/shared/EnhancedMessageSystem";
import { InvoiceList } from "@/components/invoicing/InvoiceList";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { useProjectOrchestrator } from "@/hooks/useProjectOrchestrator";
import { useRealtimeProjectsFixed } from "@/hooks/useRealtimeProjectsFixed";
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

      {/* Projects Section */}
      <PageSection 
        title="Mes projets"
        action={
          <Button 
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Nouveau projet
          </Button>
        }
      >
        <ProjectsSection
          projects={projects}
          archivedProjects={archivedProjects}
          resourceAssignments={resourceAssignments}
          onCreateProject={() => setIsCreateOpen(true)}
          refreshTrigger={refreshTrigger}
        />
      </PageSection>

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
  const playProjects = projects.filter(p => p.status === 'play');
  
  if (playProjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Kanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
          <p className="text-sm text-muted-foreground">
            Démarrez un projet pour accéder au tableau Kanban
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <PageSection title="Tableau Kanban">
      <div className="mb-4">
        <Select value={selectedKanbanProjectId} onValueChange={setSelectedKanbanProjectId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner un projet" />
          </SelectTrigger>
          <SelectContent>
            {playProjects?.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedKanbanProjectId && (
        <ClientKanbanView projectId={selectedKanbanProjectId} />
      )}
    </PageSection>
  );
};

const renderMessagesContent = () => {
  const playProjects = projects.filter(p => p.status === 'play');
  
  if (playProjects.length === 0) {
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
    <PageSection title="Messagerie">
      <div className="mb-4">
        <Select value={selectedMessagesProjectId} onValueChange={setSelectedMessagesProjectId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner un projet" />
          </SelectTrigger>
          <SelectContent>
            {playProjects?.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedMessagesProjectId && (
        <Card noPadding>
          <div className="h-[600px]">
            <EnhancedMessageSystem projectId={selectedMessagesProjectId} />
          </div>
        </Card>
      )}
    </PageSection>
  );
};

const renderDriveContent = () => {
  const playProjects = projects.filter(p => p.status === 'play');
  
  if (playProjects.length === 0) {
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
    <PageSection title="Drive">
      <div className="mb-4">
        <Select value={selectedDriveProjectId} onValueChange={setSelectedDriveProjectId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner un projet" />
          </SelectTrigger>
          <SelectContent>
            {playProjects?.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedDriveProjectId && (
        <Card noPadding>
          <SimpleDriveView projectId={selectedDriveProjectId} />
        </Card>
      )}
    </PageSection>
  );
};

const renderWikiContent = () => {
  const playProjects = projects.filter(p => p.status === 'play');
  
  if (playProjects.length === 0) {
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
    <PageSection title="Wiki">
      <div className="mb-4 flex gap-4">
        <Select value={selectedWikiProjectId} onValueChange={setSelectedWikiProjectId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner un projet" />
          </SelectTrigger>
          <SelectContent>
            {playProjects?.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedWikiProjectId && (
          <Button
            variant="outline"
            onClick={() => setIsWikiFullscreen(!isWikiFullscreen)}
          >
            {isWikiFullscreen ? 'Réduire' : 'Plein écran'}
          </Button>
        )}
      </div>
      
      {selectedWikiProjectId && (
        <div className={isWikiFullscreen ? 'fixed inset-0 bg-background z-50 p-4' : ''}>
          {isWikiFullscreen && (
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Wiki - {playProjects.find(p => p.id === selectedWikiProjectId)?.title}</h2>
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
    </PageSection>
  );
};

const renderContent = () => {
  switch (activeSection) {
    case 'start':
      return renderStartContent();
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
      return (
        <PageSection title="Factures">
          <InvoiceList userRole="client" />
        </PageSection>
      );
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
  <div className="h-16 px-6 flex items-center justify-between bg-card/80 backdrop-blur-md">
    <div className="flex items-center gap-4">
      <SidebarTrigger />
      <h1 className="text-xl font-semibold">Dashboard Client</h1>
    </div>
    <div className="flex items-center gap-4">
      <NotificationBell />
      <ThemeToggle />
    </div>
  </div>
);

return (
  <SidebarProvider>
    <AppShell 
      sidebar={sidebarContent}
      header={headerContent}
    >
      <Container size="xl">
        {renderContent()}
      </Container>

      {/* Modals */}
      <CreateProjectModal 
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
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
    </AppShell>
  </SidebarProvider>
);
};

export default ClientDashboard;