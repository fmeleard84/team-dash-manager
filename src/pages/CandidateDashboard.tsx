import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Design System Components
import { AppShell, PageSection, Container } from "@/ui/layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import { KPI } from "@/ui/components/KPI";
import { ThemeToggle } from "@/ui/components/ThemeToggle";
import { EmptyState } from "@/ui/components/EmptyState";

// UI Components
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
  Settings,
  LogOut,
  Briefcase,
  Calendar,
  FolderOpen,
  Trello,
  MessageSquare,
  FileText,
  Star,
  Activity,
  Layout,
  Cloud,
  BookOpen,
  Clock,
  DollarSign,
  TrendingUp,
  Users
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Business Logic Components (unchanged)
import { IallaLogo } from "@/components/IallaLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ValidationPromoBanner } from "@/components/candidate/ValidationPromoBanner";
import CandidateOnboarding from "@/components/candidate/CandidateOnboarding";
import { useCandidateOnboarding } from "@/hooks/useCandidateOnboarding";
import { CandidateProjectsSection } from "@/components/candidate/CandidateProjectsSection";
import SimpleDriveView from "@/components/drive/SimpleDriveView";
import CandidateKanbanView from "@/components/candidate/CandidateKanbanView";
import { CandidateNotes } from "@/components/candidate/CandidateNotes";
import { CandidateSettings } from "@/components/candidate/CandidateSettings";
import { useUserProjects } from "@/hooks/useUserProjects";
import { useCandidateProjectsOptimized } from "@/hooks/useCandidateProjectsOptimized";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CandidateEventNotifications from "@/components/candidate/CandidateEventNotifications";
import { CandidateMissionRequests } from "@/components/candidate/CandidateMissionRequests";
import CandidateMessagesView from "@/components/candidate/CandidateMessagesView";
import { useRealtimeProjectsFixed } from "@/hooks/useRealtimeProjectsFixed";
import { CandidatePayments } from "@/components/candidate/CandidatePayments";
import CandidateRatings from "@/pages/CandidateRatings";
import CandidateActivities from "@/pages/CandidateActivities";
import { TimeTrackerSimple } from "@/components/time-tracking/TimeTrackerSimple";
import { useCandidateIdentity } from "@/hooks/useCandidateIdentity";
import PlanningPage from "./PlanningPage";
import WikiView from "@/components/wiki/WikiView";

const CandidateDashboard = () => {
  const [activeSection, setActiveSection] = useState('projects');
  const [isAvailable, setIsAvailable] = useState(true);
  const [candidateProjects, setCandidateProjects] = useState<any[]>([]);
  const [resourceAssignments, setResourceAssignments] = useState<any[]>([]);
  const [candidateLanguages, setCandidateLanguages] = useState<string[]>([]);
  const [candidateExpertises, setCandidateExpertises] = useState<string[]>([]);
  const [selectedDriveProjectId, setSelectedDriveProjectId] = useState<string>("");
  const [selectedWikiProjectId, setSelectedWikiProjectId] = useState<string>("");
  const [isWikiFullscreen, setIsWikiFullscreen] = useState(false);
  const [assignmentTrigger, setAssignmentTrigger] = useState(0);
  const { user, logout } = useAuth();
  const { getCandidateProjects, projects: userProjects } = useUserProjects();
  const { projects: activeProjects, loading: activeProjectsLoading } = useCandidateProjectsOptimized();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use centralized candidate identity hook
  const { candidateId, profileId, seniority, status: candidateStatus, isLoading: identityLoading, error: identityError, refetch: refetchIdentity } = useCandidateIdentity();

  // Hook d'onboarding
  const { 
    candidateProfile, 
    needsOnboarding, 
    isLoading: onboardingLoading, 
    completeOnboarding,
    refetchProfile 
  } = useCandidateOnboarding();

  // Set initial availability based on status from database
  useEffect(() => {
    if (candidateStatus) {
      setIsAvailable(candidateStatus === 'disponible' || candidateStatus === null);
    }
  }, [candidateStatus]);

  // Set default Drive and Wiki projects when activeProjects change
  useEffect(() => {
    if (activeProjects && activeProjects.length > 0) {
      if (!selectedDriveProjectId) {
        setSelectedDriveProjectId(activeProjects[0].id);
      }
      if (!selectedWikiProjectId) {
        setSelectedWikiProjectId(activeProjects[0].id);
      }
    }
  }, [activeProjects]);

  // Use realtime hook for candidate projects
  useRealtimeProjectsFixed({
    userId: user?.id,
    userRole: 'candidate',
    candidateId: candidateId,
    onProjectsUpdate: setCandidateProjects,
    onResourceAssignmentsUpdate: setResourceAssignments
  });

  // Update availability in database
  const handleAvailabilityChange = async (available: boolean) => {
    if (!candidateId) {
      console.error('No candidateId available');
      return;
    }

    try {
      const newStatus = available ? 'disponible' : 'indisponible';
      
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ status: newStatus })
        .eq('id', candidateId);

      if (error) throw error;

      setIsAvailable(available);
      toast({
        title: "Statut mis à jour",
        description: `Vous êtes maintenant ${available ? 'disponible' : 'indisponible'}`,
      });

      // Refetch identity to update local state
      refetchIdentity();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const acceptedAssignments = resourceAssignments.filter(a => a.booking_status === 'accepted');
    const totalHours = acceptedAssignments.reduce((sum, a) => sum + (a.weekly_hours || 0), 0);
    const avgRate = acceptedAssignments.length > 0 
      ? acceptedAssignments.reduce((sum, a) => sum + (a.rate || 0), 0) / acceptedAssignments.length
      : 0;
    
    return {
      activeProjects: activeProjects?.length || 0,
      pendingRequests: resourceAssignments.filter(a => a.booking_status === 'recherche').length,
      totalHours,
      avgRate
    };
  }, [activeProjects, resourceAssignments]);

  const renderProjectsContent = () => {
    return (
      <div className="space-y-8">
        {/* KPIs */}
        <PageSection title="Vue d'ensemble">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI 
              label="Projets actifs" 
              value={metrics.activeProjects}
              icon={<Briefcase className="w-5 h-5" />}
            />
            <KPI 
              label="Demandes en attente" 
              value={metrics.pendingRequests}
              icon={<Users className="w-5 h-5" />}
            />
            <KPI 
              label="Heures hebdo" 
              value={`${metrics.totalHours}h`}
              icon={<Clock className="w-5 h-5" />}
            />
            <KPI 
              label="TJM moyen" 
              value={`${Math.round(metrics.avgRate)}€`}
              delta={{ value: "+5%", trend: "up" }}
              icon={<DollarSign className="w-5 h-5" />}
            />
          </div>
        </PageSection>

        {/* Projects Section */}
        <PageSection title="Mes projets">
          <CandidateProjectsSection 
            candidateProjects={candidateProjects}
            resourceAssignments={resourceAssignments}
            onAssignmentUpdate={() => setAssignmentTrigger(prev => prev + 1)}
          />
        </PageSection>

        {/* Mission Requests */}
        <PageSection title="Demandes de mission">
          <CandidateMissionRequests 
            profileId={profileId}
            seniority={seniority}
            candidateLanguages={candidateLanguages}
            candidateExpertises={candidateExpertises}
            assignmentTrigger={assignmentTrigger}
            onAssignmentUpdate={() => setAssignmentTrigger(prev => prev + 1)}
          />
        </PageSection>
      </div>
    );
  };

  const renderKanbanContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Trello className="w-8 h-8" />}
              title="Aucun projet actif"
              description="Acceptez une mission pour accéder au tableau Kanban"
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <PageSection title="Tableau Kanban">
        {activeProjects.map(project => (
          <div key={project.id} className="mb-8">
            <h3 className="text-lg font-semibold mb-4">{project.title}</h3>
            <CandidateKanbanView projectId={project.id} />
          </div>
        ))}
      </PageSection>
    );
  };

  const renderPlanningContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="Aucun projet actif"
              description="Acceptez une mission pour accéder au planning"
            />
          </CardContent>
        </Card>
      );
    }

    return <PlanningPage projects={activeProjects} />;
  };

  const renderMessagesContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={<MessageSquare className="w-8 h-8" />}
              title="Aucun projet actif"
              description="Acceptez une mission pour accéder à la messagerie"
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <PageSection title="Messages">
        <CandidateMessagesView projects={activeProjects} />
      </PageSection>
    );
  };

  const renderDriveContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Cloud className="w-8 h-8" />}
              title="Aucun projet actif"
              description="Acceptez une mission pour accéder au Drive"
            />
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
              {activeProjects.map(project => (
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
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="Aucun projet actif"
              description="Acceptez une mission pour accéder au Wiki"
            />
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
              {activeProjects.map(project => (
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
                <h2 className="text-2xl font-bold">
                  Wiki - {activeProjects.find(p => p.id === selectedWikiProjectId)?.title}
                </h2>
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
    // Show onboarding if needed
    if (needsOnboarding) {
      return (
        <Card>
          <CardContent>
            <CandidateOnboarding onComplete={() => {
              completeOnboarding();
              refetchProfile();
            }} />
          </CardContent>
        </Card>
      );
    }

    switch (activeSection) {
      case 'projects':
        return renderProjectsContent();
      case 'kanban':
        return renderKanbanContent();
      case 'planning':
        return renderPlanningContent();
      case 'messages':
        return renderMessagesContent();
      case 'drive':
        return renderDriveContent();
      case 'wiki':
        return renderWikiContent();
      case 'time':
        return (
          <PageSection title="Suivi du temps">
            <TimeTrackerSimple projects={activeProjects || []} />
          </PageSection>
        );
      case 'invoices':
        return (
          <PageSection title="Paiements">
            <CandidatePayments />
          </PageSection>
        );
      case 'ratings':
        return <CandidateRatings />;
      case 'activities':
        return <CandidateActivities />;
      case 'notes':
        return (
          <PageSection title="Notes">
            <CandidateNotes />
          </PageSection>
        );
      case 'settings':
        return (
          <PageSection title="Paramètres">
            <CandidateSettings />
          </PageSection>
        );
      default:
        return renderProjectsContent();
    }
  };

  const sidebarContent = (
    <Sidebar>
      <SidebarContent className="bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <IallaLogo className="h-8 w-8" />
              <span className="font-semibold text-lg">Candidat</span>
            </div>
          </div>
          
          {/* Availability Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <Label htmlFor="availability" className="text-sm">
              Disponible
            </Label>
            <Switch
              id="availability"
              checked={isAvailable}
              onCheckedChange={handleAvailabilityChange}
            />
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('projects')}
                  isActive={activeSection === 'projects'}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Projets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('kanban')}
                  isActive={activeSection === 'kanban'}
                >
                  <Trello className="h-4 w-4" />
                  <span>Kanban</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('planning')}
                  isActive={activeSection === 'planning'}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Planning</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('messages')}
                  isActive={activeSection === 'messages'}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('drive')}
                  isActive={activeSection === 'drive'}
                >
                  <Cloud className="h-4 w-4" />
                  <span>Drive</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('wiki')}
                  isActive={activeSection === 'wiki'}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Wiki</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('time')}
                  isActive={activeSection === 'time'}
                >
                  <Activity className="h-4 w-4" />
                  <span>Temps</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('invoices')}
                  isActive={activeSection === 'invoices'}
                >
                  <FileText className="h-4 w-4" />
                  <span>Paiements</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('ratings')}
                  isActive={activeSection === 'ratings'}
                >
                  <Star className="h-4 w-4" />
                  <span>Évaluations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('activities')}
                  isActive={activeSection === 'activities'}
                >
                  <Layout className="h-4 w-4" />
                  <span>Activités</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('notes')}
                  isActive={activeSection === 'notes'}
                >
                  <FileText className="h-4 w-4" />
                  <span>Notes</span>
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
                <SidebarMenuButton 
                  onClick={() => setActiveSection('settings')}
                  isActive={activeSection === 'settings'}
                >
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
        <h1 className="text-xl font-semibold">Dashboard Candidat</h1>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant={isAvailable ? "default" : "secondary"}>
          {isAvailable ? "Disponible" : "Indisponible"}
        </Badge>
        <CandidateEventNotifications />
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
          {candidateProfile?.qualification_status === 'pending' && (
            <div className="mb-6">
              <ValidationPromoBanner status={candidateProfile.qualification_status} />
            </div>
          )}
          
          {renderContent()}
        </Container>
      </AppShell>
    </SidebarProvider>
  );
};

export default CandidateDashboard;