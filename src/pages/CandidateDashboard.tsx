import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

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
import { PageHeaderNeon } from "@/components/ui/page-header-neon";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useProjectSelector } from "@/hooks/useProjectSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Business Logic Components (unchanged)
import { IallaLogo } from "@/components/IallaLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ValidationPromoBanner } from "@/components/candidate/ValidationPromoBanner";
import CandidateOnboarding from "@/components/candidate/CandidateOnboarding";
import { useCandidateOnboarding } from "@/hooks/useCandidateOnboarding";
import { CandidateProjectsSection } from "@/components/candidate/CandidateProjectsSection";
import { CandidateNotes } from "@/components/candidate/CandidateNotes";
import { CandidateSettings } from "@/components/candidate/CandidateSettings";
import { useUserProjects } from "@/hooks/useUserProjects";
import { useCandidateProjectsOptimized } from "@/hooks/useCandidateProjectsOptimized";
import CandidateEventNotifications from "@/components/candidate/CandidateEventNotifications";
import { CandidateMissionRequests } from "@/components/candidate/CandidateMissionRequests";
import { useRealtimeProjectsFixed } from "@/hooks/useRealtimeProjectsFixed";
import { useCandidateIdentity } from "@/hooks/useCandidateIdentity";

// Lazy load heavy components
const SimpleDriveView = lazy(() => import("@/components/drive/SimpleDriveView"));
const CandidateKanbanView = lazy(() => import("@/components/candidate/CandidateKanbanView"));
const CandidateMessagesView = lazy(() => import("@/components/candidate/CandidateMessagesView"));
const CandidatePayments = lazy(() => import("@/components/candidate/CandidatePayments").then(module => ({ default: module.CandidatePayments })));
const CandidateRatings = lazy(() => import("@/pages/CandidateRatings"));
const CandidateActivities = lazy(() => import("@/pages/CandidateActivities"));
const PlanningPage = lazy(() => import("./PlanningPage"));
const WikiView = lazy(() => import("@/components/wiki/WikiView"));
import { AnimatedBackground } from "@/components/ui/animated-background";
import { TimeTrackerSimple } from "@/components/time-tracking/TimeTrackerSimple";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const CandidateDashboard = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('projects');
  const [isAvailable, setIsAvailable] = useState(true);
  const [candidateProjects, setCandidateProjects] = useState<any[]>([]);
  const [resourceAssignments, setResourceAssignments] = useState<any[]>([]);
  const [candidateLanguages, setCandidateLanguages] = useState<string[]>([]);
  const [candidateExpertises, setCandidateExpertises] = useState<string[]>([]);
  const [selectedDriveProjectId, setSelectedDriveProjectId] = useState<string>("");
  const [selectedWikiProjectId, setSelectedWikiProjectId] = useState<string>("");
  const [selectedKanbanProjectId, setSelectedKanbanProjectId] = useState<string>("");
  const [selectedMessagesProjectId, setSelectedMessagesProjectId] = useState<string>("");
  const [isWikiFullscreen, setIsWikiFullscreen] = useState(false);
  const [assignmentTrigger, setAssignmentTrigger] = useState(0);
  const [acceptedProjects, setAcceptedProjects] = useState<any[]>([]);
  const { user, logout } = useAuth();
  const { getCandidateProjects, projects: userProjects } = useUserProjects();
  const { projects: activeProjects, allAcceptedProjects, loading: activeProjectsLoading } = useCandidateProjectsOptimized();
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
      // Consider 'disponible' as available, all others as not available
      setIsAvailable(candidateStatus === 'disponible');
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

        // Extract accepted projects (including those not yet started)
        const acceptedAssignments = assignmentsData.filter(a =>
          a.candidate_id === candidateId &&
          a.booking_status === 'accepted' &&
          a.projects
        );

        const acceptedProjectsList = acceptedAssignments.map(a => ({
          ...a.projects,
          hr_resource_assignments: [a],
          booking_status: a.booking_status
        }));

        console.log('✅ Accepted projects (all statuses):', acceptedProjectsList);
        setAcceptedProjects(acceptedProjectsList);
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

  // Set default Drive and Wiki projects when allAcceptedProjects change
  useEffect(() => {
    const projectsToUse = allAcceptedProjects || activeProjects || [];
    if (projectsToUse.length > 0) {
      if (!selectedDriveProjectId) {
        setSelectedDriveProjectId(projectsToUse[0].id);
      }
      if (!selectedWikiProjectId) {
        setSelectedWikiProjectId(projectsToUse[0].id);
      }
      if (!selectedKanbanProjectId) {
        setSelectedKanbanProjectId(projectsToUse[0].id);
      }
      if (!selectedMessagesProjectId) {
        setSelectedMessagesProjectId(projectsToUse[0].id);
      }
    }
  }, [allAcceptedProjects, activeProjects]);

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
      toast({
        title: t('dashboard.candidate.error'),
        description: t('dashboard.candidate.cannotUpdateAvailability'),
        variant: "destructive"
      });
      return;
    }

    try {
      // Use 'en_pause' instead of 'indisponible' to match the constraint
      const newStatus = available ? 'disponible' : 'en_pause';

      const { error } = await supabase
        .from('candidate_profiles')
        .update({ status: newStatus })
        .eq('id', candidateId);

      if (error) {
        console.error('Error updating availability:', error);
        toast({
          title: t('dashboard.candidate.error'),
          description: error.message || t('dashboard.candidate.cannotUpdateStatus'),
          variant: "destructive",
        });
        // Revert the UI state on error
        setIsAvailable(!available);
        return;
      }

      setIsAvailable(available);
      toast({
        title: t('dashboard.candidate.statusUpdated'),
        description: available ? t('dashboard.candidate.youAreNowAvailable') : t('dashboard.candidate.youAreNowOnPause'),
      });

      // Refetch identity to update local state
      refetchIdentity();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: t('dashboard.candidate.error'),
        description: t('dashboard.candidate.cannotUpdateStatus'),
        variant: "destructive",
      });
      // Revert the UI state on error
      setIsAvailable(!available);
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
        {/* KPIs avec design néon amélioré */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-neon-cyan rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
          <div className="relative border border-primary-500/20 bg-gradient-to-br from-neutral-900/95 to-neutral-950/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text mb-6 flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-xl opacity-70 animate-neon-pulse" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-primary-500 via-secondary-500 to-neon-cyan rounded-xl flex items-center justify-center shadow-neon-purple">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              {t('dashboard.candidate.overview')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-neutral-900/50 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 hover:shadow-neon-purple group/card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{t('dashboard.candidate.activeProjects')}</p>
                    <p className="text-2xl font-bold text-white">{metrics.activeProjects}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-neutral-900/50 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 hover:shadow-neon-purple group/card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{t('dashboard.candidate.pendingRequests')}</p>
                    <p className="text-2xl font-bold text-white">{metrics.pendingRequests}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-neutral-900/50 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 hover:shadow-neon-purple group/card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{t('dashboard.candidate.weeklyHours')}</p>
                    <p className="text-2xl font-bold text-white">{metrics.totalHours}h</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-neutral-900/50 backdrop-blur-xl rounded-2xl p-6 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 hover:shadow-neon-purple group/card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{t('dashboard.candidate.averageRate')}</p>
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
              {t('dashboard.candidate.myProjects')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(identityLoading || activeProjectsLoading || onboardingLoading) ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                {t('common.loading')}
              </div>
            ) : (!activeProjects || activeProjects.length === 0) && (!resourceAssignments || resourceAssignments.length === 0) ? (
              <div className="border rounded-lg p-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboard.candidate.noProjectsAtTheMoment')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('dashboard.candidate.newMissionOpportunities')}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t('dashboard.candidate.toSeeProjectsYouNeed')}
                  <br />{t('dashboard.candidate.haveMissionsInSearchStatus')}
                  <br />{t('dashboard.candidate.orAcceptedMissionsInPlayStatus')}
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    // Créer des données de test pour la démo
                    console.log('🎯 Création de données de démonstration...');
                    toast({
                      title: t('dashboard.candidate.demoMode'),
                      description: t('dashboard.candidate.askClientToCreateProject'),
                    });
                  }}
                >
                  {t('dashboard.candidate.howToSeeProjects')}
                </Button>
              </div>
            ) : (
              <CandidateProjectsSection
                activeProjects={acceptedProjects || []}
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
                onAcceptMission={async (projectId) => {
                  try {
                    // Trouver l'assignment correspondant
                    const assignment = resourceAssignments.find(a => a.project_id === projectId && a.booking_status === 'recherche');
                    if (!assignment) {
                      console.error('Assignment not found for project:', projectId);
                      return;
                    }

                    console.log('Accepting mission with assignment_id:', assignment.id);
                    const response = await supabase.functions.invoke('resource-booking', {
                      body: {
                        action: 'accept_mission',
                        assignment_id: assignment.id,
                        candidate_email: user?.email
                      }
                    });

                    if (response.error) throw response.error;

                    toast({
                      title: t('dashboard.candidate.missionAccepted'),
                      description: t('dashboard.candidate.missionAcceptedSuccessfully')
                    });

                    // Rafraîchir les données
                    setAssignmentTrigger(prev => prev + 1);

                    // Recharger les assignments pour mettre à jour acceptedProjects
                    const { data: updatedAssignments } = await supabase
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

                    if (updatedAssignments) {
                      setResourceAssignments(updatedAssignments);

                      // Mettre à jour les projets acceptés
                      const acceptedAssignments = updatedAssignments.filter(a =>
                        a.candidate_id === candidateId &&
                        a.booking_status === 'accepted' &&
                        a.projects
                      );

                      const acceptedProjectsList = acceptedAssignments.map(a => ({
                        ...a.projects,
                        hr_resource_assignments: [a],
                        booking_status: a.booking_status
                      }));

                      console.log('🔄 Updated accepted projects:', acceptedProjectsList);
                      setAcceptedProjects(acceptedProjectsList);
                    }
                  } catch (error) {
                    console.error('Error accepting mission:', error);
                    toast({
                      variant: "destructive",
                      title: t('dashboard.candidate.error'),
                      description: t('dashboard.candidate.cannotAcceptMission')
                    });
                  }
                }}
                onDeclineMission={async (projectId) => {
                  try {
                    // Trouver l'assignment correspondant
                    const assignment = resourceAssignments.find(a => a.project_id === projectId && a.booking_status === 'recherche');
                    if (!assignment) {
                      console.error('Assignment not found for project:', projectId);
                      return;
                    }

                    console.log('Declining mission with assignment_id:', assignment.id);
                    const response = await supabase.functions.invoke('resource-booking', {
                      body: {
                        action: 'decline_mission',
                        assignment_id: assignment.id,
                        candidate_email: user?.email
                      }
                    });

                    if (response.error) throw response.error;

                    toast({
                      title: t('dashboard.candidate.missionDeclined'),
                      description: t('dashboard.candidate.missionDeclinedSuccessfully')
                    });

                    // Rafraîchir les données
                    setAssignmentTrigger(prev => prev + 1);
                  } catch (error) {
                    console.error('Error declining mission:', error);
                    toast({
                      variant: "destructive",
                      title: t('dashboard.candidate.error'),
                      description: t('dashboard.candidate.cannotDeclineMission')
                    });
                  }
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Mission Requests */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
          <Card className="relative border border-primary-500/10 backdrop-blur-xl bg-white/90 dark:bg-neutral-900/90 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary-600/10 to-secondary-600/10 backdrop-blur-sm border-b border-primary-500/10">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 shadow-neon-purple">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 text-transparent bg-clip-text">
                  Demandes de mission
                </span>
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
      </div>
    );
  };

  const renderKanbanContent = () => {
    const projectsToShow = allAcceptedProjects || [];

    return (
      <div className="space-y-6">
        {/* Header unifié avec design néon */}
        <PageHeaderNeon
          icon={Trello}
          title={t('dashboard.candidate.kanbanBoard')}
          subtitle={t('dashboard.candidate.manageTasksAndProgress')}
          projects={projectsToShow
            .map(p => ({ ...p, created_at: p.project_date || p.created_at }))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          selectedProjectId={selectedKanbanProjectId}
          onProjectChange={setSelectedKanbanProjectId}
          projectSelectorConfig={{
            placeholder: t('dashboard.candidate.selectProject'),
            showStatus: true,
            showDates: false,
            showTeamProgress: false,
            className: "w-[350px]"
          }}
        />

        {selectedKanbanProjectId && (
          <CandidateKanbanView projectId={selectedKanbanProjectId} />
        )}
      </div>
    );
  };

  const renderPlanningContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t('dashboard.candidate.noActiveProject')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.candidate.acceptMissionToAccess')}
            </p>
          </CardContent>
        </Card>
      );
    }

    return <PlanningPage projects={activeProjects} />;
  };

  const renderMessagesContent = () => {
    const projectsToShow = allAcceptedProjects || [];

    return (
      <div className="space-y-6">
        {/* Header unifié avec design néon */}
        <PageHeaderNeon
          icon={MessageSquare}
          title={t('dashboard.candidate.messages')}
          subtitle={t('dashboard.candidate.realtimeCommunication')}
          badge={{ text: t('dashboard.candidate.online'), animate: true }}
          projects={projectsToShow
            .map(p => ({ ...p, created_at: p.project_date || p.created_at }))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          selectedProjectId={selectedMessagesProjectId}
          onProjectChange={setSelectedMessagesProjectId}
          projectSelectorConfig={{
            placeholder: t('dashboard.candidate.selectProject'),
            showStatus: true,
            showDates: true,
            showTeamProgress: false,
            className: "w-[350px]"
          }}
        />

        {/* Zone de messagerie */}
        {selectedMessagesProjectId && (
          <div className="h-[700px]">
            <CandidateMessagesView projects={[projectsToShow.find(p => p.id === selectedMessagesProjectId)].filter(Boolean)} />
          </div>
        )}
      </div>
    );
  };

  const renderDriveContent = () => {
    const projectsToShow = allAcceptedProjects || [];

    return (
      <div className="space-y-6">
        {/* Header unifié avec design néon */}
        <PageHeaderNeon
          icon={Cloud}
          title={t('dashboard.candidate.drive')}
          subtitle={t('dashboard.candidate.fileStorageAndSharing')}
          projects={projectsToShow
            .map(p => ({ ...p, created_at: p.project_date || p.created_at }))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          selectedProjectId={selectedDriveProjectId}
          onProjectChange={setSelectedDriveProjectId}
          projectSelectorConfig={{
            placeholder: t('dashboard.candidate.selectProject'),
            showStatus: true,
            showDates: false,
            showTeamProgress: false,
            className: "w-[350px]"
          }}
        />

        {selectedDriveProjectId && (
          <div className="border border-primary-500/30 rounded-lg overflow-hidden">
            <SimpleDriveView projectId={selectedDriveProjectId} />
          </div>
        )}
      </div>
    );
  };

  const renderWikiContent = () => {
    const projectsToShow = allAcceptedProjects || [];

    return (
      <div className="space-y-6">
        {/* Header unifié avec design néon */}
        <PageHeaderNeon
          icon={BookOpen}
          title={t('dashboard.candidate.wiki')}
          subtitle={t('dashboard.candidate.projectDocumentation')}
          projects={projectsToShow
            .map(p => ({ ...p, created_at: p.project_date || p.created_at }))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          selectedProjectId={selectedWikiProjectId}
          onProjectChange={setSelectedWikiProjectId}
          projectSelectorConfig={{
            placeholder: t('dashboard.candidate.selectProject'),
            showStatus: true,
            showDates: false,
            showTeamProgress: false,
            className: "w-[350px]"
          }}
          customActions={
            selectedWikiProjectId && (
              <Button
                variant="outline"
                onClick={() => setIsWikiFullscreen(!isWikiFullscreen)}
                className="border-primary-500/30 text-white hover:bg-primary-500/10"
              >
                {isWikiFullscreen ? t('dashboard.candidate.reduce') : t('dashboard.candidate.fullscreen')}
              </Button>
            )
          }
        />

        {selectedWikiProjectId && (
          <div className={isWikiFullscreen ? 'fixed inset-0 bg-background z-50 p-4' : ''}>
            {isWikiFullscreen && (
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  Wiki - {(allAcceptedProjects || []).find(p => p.id === selectedWikiProjectId)?.title}
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setIsWikiFullscreen(false)}
                  className="border-primary-500/30 text-white hover:bg-primary-500/10"
                >
                  {t('dashboard.candidate.close')}
                </Button>
              </div>
            )}
            <div className={`border border-primary-500/30 rounded-lg overflow-hidden ${isWikiFullscreen ? 'h-[calc(100vh-120px)]' : ''}`}>
              <WikiView projectId={selectedWikiProjectId} />
            </div>
          </div>
        )}
      </div>
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
      case 'invoices':
        return <CandidatePayments />;
      case 'ratings':
        return <CandidateRatings />;
      case 'activities':
        return <CandidateActivities />;
      case 'notes':
        return <CandidateNotes currentCandidateId={candidateId} />;
      case 'settings':
        return (
          <div className="space-y-6">
            {/* Header unifié avec design néon */}
            <PageHeaderNeon
              icon={Settings}
              title={t('dashboard.candidate.settings')}
              subtitle={t('dashboard.candidate.candidateProfileConfiguration')}
            />

            <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-primary-500/30 rounded-xl p-6">
              <CandidateSettings candidateId={candidateId} onProfileUpdate={refetchIdentity} />
            </div>
          </div>
        );
      default:
        return renderProjectsContent();
    }
  };

  const sidebarContent = (
    <Sidebar>
      <SidebarContent className="bg-gradient-to-b from-neutral-900 to-neutral-950 dark:from-neutral-950 dark:to-black border-r border-neutral-800/50">
        <div className="p-4 border-b border-neutral-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-50 animate-pulse" />
                <div className="relative">
                  <IallaLogo className="h-8 w-8" />
                </div>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text">
                Candidat
              </span>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="mt-4 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="availability" className="text-sm font-medium text-neutral-300">
                {t('dashboard.candidate.status')}
              </Label>
              <Switch
                id="availability"
                checked={isAvailable}
                onCheckedChange={handleAvailabilityChange}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-500"
              />
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-neutral-400 text-xs uppercase tracking-wider px-2">{t('navigation.home')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('projects')}
                  className={`group relative overflow-hidden transition-all duration-200 ${
                    activeSection === 'projects'
                      ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-white border-l-2 border-primary-500'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>{t('navigation.projects')}</span>
                  {activeSection === 'projects' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 animate-shimmer" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('kanban')}
                  isActive={activeSection === 'kanban'}
                >
                  <Trello className="h-4 w-4" />
                  <span>{t('navigation.kanban')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('planning')}
                  isActive={activeSection === 'planning'}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{t('navigation.calendar')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('messages')}
                  isActive={activeSection === 'messages'}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{t('navigation.messages')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('drive')}
                  isActive={activeSection === 'drive'}
                >
                  <Cloud className="h-4 w-4" />
                  <span>{t('navigation.drive')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('wiki')}
                  isActive={activeSection === 'wiki'}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>{t('navigation.wiki')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('common.dashboard')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('invoices')}
                  isActive={activeSection === 'invoices'}
                >
                  <FileText className="h-4 w-4" />
                  <span>{t('navigation.payments')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('ratings')}
                  isActive={activeSection === 'ratings'}
                >
                  <Star className="h-4 w-4" />
                  <span>{t('dashboard.candidate.ratings')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('activities')}
                  isActive={activeSection === 'activities'}
                >
                  <Layout className="h-4 w-4" />
                  <span>{t('dashboard.candidate.activities')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('notes')}
                  isActive={activeSection === 'notes'}
                >
                  <FileText className="h-4 w-4" />
                  <span>{t('dashboard.candidate.notes')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation.profile')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('settings')}
                  isActive={activeSection === 'settings'}
                >
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
    <header className="h-16 px-6 flex items-center justify-between backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border-b border-neutral-200/50 dark:border-neutral-700/50 sticky top-0 z-40 shadow-lg">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hover:scale-105 transition-transform duration-200" />
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text">
          {t('dashboard.candidate.title')}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <TimeTrackerSimple />
        <div className={`px-4 py-2 rounded-full text-xs font-medium shadow-lg transition-all duration-300 ${
          isAvailable
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/25'
            : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/25'
        }`}>
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isAvailable ? 'bg-white' : 'bg-white/70'}`} />
            {isAvailable ? t('dashboard.candidate.available') : t('dashboard.candidate.onPause')}
          </span>
        </div>
        {/* Removed CandidateEventNotifications from header - was causing overflow */}
        <NotificationBell className="hover:scale-110 transition-transform duration-200" />
        <ThemeToggle className="hover:scale-110 transition-transform duration-200" />
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
              <CandidateOnboarding
                candidateId={user?.id}
                onComplete={() => refetchProfile()}
                completeOnboarding={completeOnboarding}
              />
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

          <main className="flex-1 overflow-auto bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-black">
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