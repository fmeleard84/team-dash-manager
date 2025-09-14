import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Design System Components
import { AppShell, PageSection, Container } from "@/ui/layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/ui/components/Card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { ProjectSelectorNeon } from "@/components/ui/project-selector-neon";
import { useProjectSelector } from "@/hooks/useProjectSelector";

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
import { AnimatedBackground } from "@/components/ui/animated-background";

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

  // Debug logs
  useEffect(() => {
    console.log('🔍 CandidateDashboard Debug:', {
      candidateId,
      profileId,
      activeProjects,
      activeProjectsLength: activeProjects?.length,
      resourceAssignments,
      resourceAssignmentsLength: resourceAssignments?.length,
      candidateProjects,
      candidateStatus,
      isLoading: identityLoading || activeProjectsLoading || onboardingLoading
    });
  }, [candidateId, activeProjects, resourceAssignments, candidateProjects]);

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

  // Load initial assignments and set default projects
  useEffect(() => {
    const loadInitialData = async () => {
      if (!candidateId) return;
      
      // Load resource assignments for this candidate with project details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          projects (
            id,
            title,
            description,
            status,
            project_date,
            due_date,
            client_budget,
            owner_id
          )
        `)
        .or(`candidate_id.eq.${candidateId},booking_status.eq.recherche`);

      if (assignmentsError) {
        console.error('Error loading assignments:', assignmentsError);
      } else if (assignmentsData) {
        console.log('📦 Loaded resource assignments:', assignmentsData);
        setResourceAssignments(assignmentsData);
      }
      
      // Load candidate languages
      const { data: langData } = await supabase
        .from('candidate_languages')
        .select('*, hr_languages(*)')
        .eq('candidate_id', candidateId);

      if (langData) {
        const languages = langData.map(cl => cl.hr_languages?.name).filter(Boolean);
        setCandidateLanguages(languages);
      }

      // Load candidate expertises
      const { data: expData } = await supabase
        .from('candidate_expertises')
        .select('*, hr_expertises(*)')
        .eq('candidate_id', candidateId);

      if (expData) {
        const expertises = expData.map(ce => ce.hr_expertises?.name).filter(Boolean);
        setCandidateExpertises(expertises);
      }
    };
    
    loadInitialData();
  }, [candidateId]);

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
    setProjects: setCandidateProjects,
    setResourceAssignments,
    userId: user?.id,
    userType: 'candidate',
    candidateProfile: candidateProfile ? {
      id: candidateId,
      profile_id: profileId,
      seniority: seniority || ''
    } : null
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
      <div className="relative">
        <AnimatedBackground variant="subtle" speed="slow" className="fixed inset-0" />
        <div className="relative z-10 space-y-8">
        {/* KPIs avec design néon */}
        <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              Vue d'ensemble
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Projets actifs</p>
                    <p className="text-2xl font-bold text-white">{metrics.activeProjects}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Demandes en attente</p>
                    <p className="text-2xl font-bold text-white">{metrics.pendingRequests}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Heures hebdo</p>
                    <p className="text-2xl font-bold text-white">{metrics.totalHours}h</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">TJM moyen</p>
                    <p className="text-2xl font-bold text-white">{Math.round(metrics.avgRate)}€</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-green-400">+5%</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Mes projets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(identityLoading || activeProjectsLoading || onboardingLoading) ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                Chargement des projets...
              </div>
            ) : (!activeProjects || activeProjects.length === 0) && (!resourceAssignments || resourceAssignments.length === 0) ? (
              <div className="border rounded-lg p-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucun projet pour le moment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Les nouvelles opportunités de mission apparaîtront ici
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Pour avoir des projets visibles ici, vous devez :
                  <br />1. Avoir des missions en statut "recherche" (invitations)
                  <br />2. Ou avoir accepté des missions qui sont en statut "play" (projets actifs)
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    // Créer des données de test pour la démo
                    console.log('🎯 Création de données de démonstration...');
                    toast({
                      title: "Mode démonstration",
                      description: "Pour voir des projets, demandez à un client de créer un projet et de vous inviter.",
                    });
                  }}
                >
                  Comment voir des projets ?
                </Button>
              </div>
            ) : (
              <CandidateProjectsSection
                activeProjects={activeProjects || []}
                pendingInvitations={resourceAssignments.filter(a => a.booking_status === 'recherche').map(a => ({
                  id: a.project_id || a.id,
                  title: a.projects?.title || 'Projet sans titre',
                  description: a.projects?.description,
                  status: 'recherche',
                  project_date: a.projects?.project_date,
                  due_date: a.projects?.due_date,
                  client_budget: a.projects?.client_budget,
                  owner: a.projects?.owner,
                  hr_resource_assignments: [a],
                  booking_status: a.booking_status
                }))}
                onViewProject={(id) => console.log('View project:', id)}
                onAcceptMission={() => setAssignmentTrigger(prev => prev + 1)}
                onDeclineMission={() => setAssignmentTrigger(prev => prev + 1)}
              />
            )}
          </CardContent>
        </Card>

        {/* Mission Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Demandes de mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateMissionRequests 
              profileId={profileId}
              seniority={seniority}
              candidateLanguages={candidateLanguages}
              candidateExpertises={candidateExpertises}
              assignmentTrigger={assignmentTrigger}
              onAssignmentUpdate={() => setAssignmentTrigger(prev => prev + 1)}
            />
          </CardContent>
        </Card>
        </div>
      </div>
    );
  };

  const renderKanbanContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Trello className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
            <p className="text-sm text-muted-foreground">
              Acceptez une mission pour accéder au tableau Kanban
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trello className="h-5 w-5" />
            Tableau Kanban
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeProjects?.map(project => (
            <div key={project.id} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-white">{project.title}</h3>
              <CandidateKanbanView projectId={project.id} />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderPlanningContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
            <p className="text-sm text-muted-foreground">
              Acceptez une mission pour accéder au planning
            </p>
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
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
            <p className="text-sm text-muted-foreground">
              Acceptez une mission pour accéder à la messagerie
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CandidateMessagesView projects={activeProjects} />
        </CardContent>
      </Card>
    );
  };

  const renderDriveContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Cloud className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
            <p className="text-sm text-muted-foreground">
              Acceptez une mission pour accéder au Drive
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Drive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <ProjectSelectorNeon
              projects={activeProjects || []}
              selectedProjectId={selectedDriveProjectId}
              onProjectChange={setSelectedDriveProjectId}
              placeholder="Sélectionner un projet"
              className="w-64"
              showStatus={true}
              showDates={false}
              showTeamProgress={false}
            />
          </div>

          {selectedDriveProjectId && (
            <div className="border rounded-lg overflow-hidden">
              <SimpleDriveView projectId={selectedDriveProjectId} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderWikiContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
            <p className="text-sm text-muted-foreground">
              Acceptez une mission pour accéder au Wiki
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Wiki
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <ProjectSelectorNeon
              projects={activeProjects || []}
              selectedProjectId={selectedWikiProjectId}
              onProjectChange={setSelectedWikiProjectId}
              placeholder="Sélectionner un projet"
              className="w-64"
              showStatus={true}
              showDates={false}
              showTeamProgress={false}
            />

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
                  <Button variant="outline" onClick={() => setIsWikiFullscreen(false)}>
                    Fermer
                  </Button>
                </div>
              )}
              <div className={`border rounded-lg overflow-hidden ${isWikiFullscreen ? 'h-[calc(100vh-120px)]' : ''}`}>
                <WikiView projectId={selectedWikiProjectId} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderContent = () => {
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Suivi du temps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeTrackerSimple projects={activeProjects || []} />
            </CardContent>
          </Card>
        );
      case 'invoices':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Paiements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CandidatePayments />
            </CardContent>
          </Card>
        );
      case 'ratings':
        return <CandidateRatings />;
      case 'activities':
        return <CandidateActivities />;
      case 'notes':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CandidateNotes />
            </CardContent>
          </Card>
        );
      case 'settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CandidateSettings />
            </CardContent>
          </Card>
        );
      default:
        return renderProjectsContent();
    }
  };

  const sidebarContent = (
    <Sidebar>
      <SidebarContent className="bg-background border-r">
        <div className="p-4 border-b">
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
                  onClick={() => setActiveSection('notes')}
                  isActive={activeSection === 'notes'}
                >
                  <FileText className="h-4 w-4" />
                  <span>Notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('time')}
                  isActive={activeSection === 'time'}
                  className={activeSection === 'time' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
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
    <header className="h-16 px-6 flex items-center justify-between bg-background border-b sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold">Dashboard Candidat</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${isAvailable ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
          {isAvailable ? "Disponible" : "Indisponible"}
        </div>
        {/* Removed CandidateEventNotifications from header - was causing overflow */}
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );

  // Show onboarding fullscreen if needed
  if (needsOnboarding) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full overflow-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
              <CandidateOnboarding onComplete={() => {
                completeOnboarding();
                refetchProfile();
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        {sidebarContent}

        <div className="flex-1 flex flex-col overflow-hidden">
          {headerContent}

          <main className="flex-1 overflow-auto bg-muted/50">
            <div className="w-full p-6 lg:p-8">
              {candidateProfile?.qualification_status === 'pending' && (
                <div className="mb-6">
                  <ValidationPromoBanner status={candidateProfile?.qualification_status || 'pending'} />
                </div>
              )}

              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CandidateDashboard;