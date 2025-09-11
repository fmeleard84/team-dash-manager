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
      
      // Load resource assignments for this candidate
      const { data: assignmentsData } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .or(`candidate_id.eq.${candidateId},booking_status.eq.recherche`);
      
      if (assignmentsData) {
        setResourceAssignments(assignmentsData);
      }
      
      // Load candidate languages and expertises
      const { data: candidateData } = await supabase
        .from('candidate_profiles')
        .select('languages, expertises')
        .eq('id', candidateId)
        .single();
      
      if (candidateData) {
        setCandidateLanguages(candidateData.languages || []);
        setCandidateExpertises(candidateData.expertises || []);
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
        <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
              </div>
              Mes projets
            </h2>
            <CandidateProjectsSection 
              candidateProjects={candidateProjects}
              resourceAssignments={resourceAssignments}
              onAssignmentUpdate={() => setAssignmentTrigger(prev => prev + 1)}
            />
          </div>
        </div>

        {/* Mission Requests */}
        <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
              Demandes de mission
            </h2>
            <CandidateMissionRequests 
              profileId={profileId}
              seniority={seniority}
              candidateLanguages={candidateLanguages}
              candidateExpertises={candidateExpertises}
              assignmentTrigger={assignmentTrigger}
              onAssignmentUpdate={() => setAssignmentTrigger(prev => prev + 1)}
            />
          </div>
        </div>
        </div>
      </div>
    );
  };

  const renderKanbanContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-purple-500/30">
          <Trello className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2 text-white">Aucun projet actif</h3>
          <p className="text-sm text-gray-300">
            Acceptez une mission pour accéder au tableau Kanban
          </p>
        </div>
      );
    }

    return (
      <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                <Trello className="w-5 h-5 text-white" />
              </div>
            </div>
            Tableau Kanban
          </h2>
          {activeProjects?.map(project => (
            <div key={project.id} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-white">{project.title}</h3>
              <CandidateKanbanView projectId={project.id} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPlanningContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-purple-500/30">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2 text-white">Aucun projet actif</h3>
          <p className="text-sm text-gray-300">
            Acceptez une mission pour accéder au planning
          </p>
        </div>
      );
    }

    return <PlanningPage projects={activeProjects} />;
  };

  const renderMessagesContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-purple-500/30">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2 text-white">Aucun projet actif</h3>
          <p className="text-sm text-gray-300">
            Acceptez une mission pour accéder à la messagerie
          </p>
        </div>
      );
    }

    return (
      <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
            </div>
            Messages
          </h2>
          <CandidateMessagesView projects={activeProjects} />
        </div>
      </div>
    );
  };

  const renderDriveContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-purple-500/30">
          <Cloud className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2 text-white">Aucun projet actif</h3>
          <p className="text-sm text-gray-300">
            Acceptez une mission pour accéder au Drive
          </p>
        </div>
      );
    }

    return (
      <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                <Cloud className="w-5 h-5 text-white" />
              </div>
            </div>
            Drive
          </h2>
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
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/30 overflow-hidden">
              <SimpleDriveView projectId={selectedDriveProjectId} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWikiContent = () => {
    if (!activeProjects || activeProjects.length === 0) {
      return (
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-purple-500/30">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2 text-white">Aucun projet actif</h3>
          <p className="text-sm text-gray-300">
            Acceptez une mission pour accéder au Wiki
          </p>
        </div>
      );
    }

    return (
      <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </div>
            Wiki
          </h2>
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
              <button
                className="bg-white/10 hover:bg-white/20 border border-purple-500/30 text-white backdrop-blur-sm px-4 py-2 rounded-lg"
                onClick={() => setIsWikiFullscreen(!isWikiFullscreen)}
              >
                {isWikiFullscreen ? 'Réduire' : 'Plein écran'}
              </button>
            )}
          </div>
          
          {selectedWikiProjectId && (
            <div className={isWikiFullscreen ? 'fixed inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] z-50 p-4' : ''}>
              {isWikiFullscreen && (
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">
                    Wiki - {activeProjects.find(p => p.id === selectedWikiProjectId)?.title}
                  </h2>
                  <button className="bg-white/10 hover:bg-white/20 border border-purple-500/30 text-white backdrop-blur-sm px-4 py-2 rounded-lg" onClick={() => setIsWikiFullscreen(false)}>
                    Fermer
                  </button>
                </div>
              )}
              <div className={`bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/30 overflow-hidden ${isWikiFullscreen ? 'h-[calc(100vh-120px)]' : ''}`}>
                <WikiView projectId={selectedWikiProjectId} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    // Show onboarding if needed
    if (needsOnboarding) {
      return (
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6">
          <CandidateOnboarding onComplete={() => {
            completeOnboarding();
            refetchProfile();
          }} />
        </div>
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
          <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
                  <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                </div>
                Suivi du temps
              </h2>
              <TimeTrackerSimple projects={activeProjects || []} />
            </div>
          </div>
        );
      case 'invoices':
        return (
          <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
                  <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                </div>
                Paiements
              </h2>
              <CandidatePayments />
            </div>
          </div>
        );
      case 'ratings':
        return <CandidateRatings />;
      case 'activities':
        return <CandidateActivities />;
      case 'notes':
        return (
          <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
                  <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                </div>
                Notes
              </h2>
              <CandidateNotes />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
                  <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                </div>
                Paramètres
              </h2>
              <CandidateSettings />
            </div>
          </div>
        );
      default:
        return renderProjectsContent();
    }
  };

  const sidebarContent = (
    <Sidebar>
      <SidebarContent className="bg-black/40 backdrop-blur-xl border-r border-purple-500/20">
        <div className="p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <IallaLogo className="h-8 w-8" />
              <span className="font-semibold text-lg text-white">Candidat</span>
            </div>
          </div>
          
          {/* Availability Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <Label htmlFor="availability" className="text-sm text-white">
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
          <SidebarGroupLabel className="text-gray-300">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('projects')}
                  isActive={activeSection === 'projects'}
                  className={activeSection === 'projects' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Projets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('kanban')}
                  isActive={activeSection === 'kanban'}
                  className={activeSection === 'kanban' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <Trello className="h-4 w-4" />
                  <span>Kanban</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('planning')}
                  isActive={activeSection === 'planning'}
                  className={activeSection === 'planning' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Planning</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('messages')}
                  isActive={activeSection === 'messages'}
                  className={activeSection === 'messages' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('drive')}
                  isActive={activeSection === 'drive'}
                  className={activeSection === 'drive' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <Cloud className="h-4 w-4" />
                  <span>Drive</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('wiki')}
                  isActive={activeSection === 'wiki'}
                  className={activeSection === 'wiki' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Wiki</span>
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
          <SidebarGroupLabel className="text-gray-300">Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('invoices')}
                  isActive={activeSection === 'invoices'}
                  className={activeSection === 'invoices' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <FileText className="h-4 w-4" />
                  <span>Paiements</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('ratings')}
                  isActive={activeSection === 'ratings'}
                  className={activeSection === 'ratings' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <Star className="h-4 w-4" />
                  <span>Évaluations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('activities')}
                  isActive={activeSection === 'activities'}
                  className={activeSection === 'activities' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <Layout className="h-4 w-4" />
                  <span>Activités</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('notes')}
                  isActive={activeSection === 'notes'}
                  className={activeSection === 'notes' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <FileText className="h-4 w-4" />
                  <span>Notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-300">Compte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection('settings')}
                  isActive={activeSection === 'settings'}
                  className={activeSection === 'settings' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-white hover:bg-white/10'}
                >
                  <Settings className="h-4 w-4" />
                  <span>Paramètres</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-white hover:bg-white/10">
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
    <header className="h-16 px-6 flex items-center justify-between bg-black/40 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-white hover:bg-white/10" />
        <h1 className="text-xl font-semibold text-white">Dashboard Candidat</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${isAvailable ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gray-500 text-white'}`}>
          {isAvailable ? "Disponible" : "Indisponible"}
        </div>
        <CandidateEventNotifications />
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]">
        {sidebarContent}
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {headerContent}
          
          <main className="flex-1 overflow-auto">
            <div className="w-full p-6 lg:p-8">
              {candidateProfile?.qualification_status === 'pending' && (
                <div className="mb-6">
                  <ValidationPromoBanner status={candidateProfile.qualification_status} />
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