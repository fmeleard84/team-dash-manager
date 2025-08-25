import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  CalendarDays,
  Layout
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IallaLogo } from "@/components/IallaLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ValidationPromoBanner } from "@/components/candidate/ValidationPromoBanner";
import CandidateOnboarding from "@/components/candidate/CandidateOnboarding";
import { useCandidateOnboarding } from "@/hooks/useCandidateOnboarding";
import CandidateProjectsFixed from "@/components/candidate/CandidateProjectsFixed";
import CandidatePlanningView from "@/components/candidate/CandidatePlanningView";
import SharedPlanningView from "@/components/shared/SharedPlanningView";
import CandidateDriveView from "@/components/candidate/CandidateDriveView";
import CandidateKanbanView from "@/components/candidate/CandidateKanbanView";
import { CandidateNotes } from "@/components/candidate/CandidateNotes";
import { CandidateSettings } from "@/components/candidate/CandidateSettings";
import { useUserProjects } from "@/hooks/useUserProjects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DynamicCandidateMessages from "@/components/candidate/DynamicCandidateMessages";
import CandidateEventNotifications from "@/components/candidate/CandidateEventNotifications";
import { CandidateMissionRequests } from "@/components/candidate/CandidateMissionRequests";
import { EnhancedMessageSystem } from "@/components/shared/EnhancedMessageSystem";
import { useRealtimeProjectsFixed } from "@/hooks/useRealtimeProjectsFixed";
import { CandidatePayments } from "@/components/candidate/CandidatePayments";
import CandidateRatings from "@/pages/CandidateRatings";
import CandidateActivities from "@/pages/CandidateActivities";
import { TimeTrackerSimple } from "@/components/time-tracking/TimeTrackerSimple";
import { useCandidateIdentity } from "@/hooks/useCandidateIdentity";

const CandidateDashboard = () => {
  const [activeSection, setActiveSection] = useState('projects');
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [candidateProjects, setCandidateProjects] = useState<any[]>([]);
  const [resourceAssignments, setResourceAssignments] = useState<any[]>([]);
  const { user, logout } = useAuth();
  const { getCandidateProjects, projects: userProjects } = useUserProjects();
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

  // Set up fixed real-time project updates for candidate (only after onboarding)
  // Use user.id for channel identification, profile_id for filtering
  // Only enable when we have all the required data AND no loading states
  const shouldEnableRealtime = !needsOnboarding && 
                               !identityLoading && 
                               !onboardingLoading &&
                               user?.id && 
                               candidateId && 
                               profileId;
  
  useRealtimeProjectsFixed({
    setProjects: setCandidateProjects,
    setResourceAssignments: setResourceAssignments,
    userId: shouldEnableRealtime ? user.id : null,
    userType: 'candidate',
    candidateProfile: shouldEnableRealtime && seniority ? { profile_id: profileId, seniority } : null
  });

  // Handle URL parameters to set initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    if (tab && ['projects', 'planning', 'drive', 'kanban', 'messages', 'notes', 'invoices'].includes(tab)) {
      setActiveSection(tab);
    }
  }, [location.search]);

  const menuItems = [
    { id: 'projects', label: 'Mes projets', icon: Briefcase },
    { id: 'planning', label: 'Planning', icon: Calendar },
    { id: 'drive', label: 'Drive', icon: FolderOpen },
    { id: 'kanban', label: 'Kanban', icon: Trello },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'activities', label: 'Mes activités', icon: Activity },
    { id: 'ratings', label: 'Mes notes', icon: Star },
    { id: 'invoices', label: 'Mes paiements', icon: FileText },
  ];

  const handleAvailabilityChange = async (checked: boolean) => {
    if (!candidateId) return;
    
    // Utiliser 'en_pause' au lieu de 'indisponible' temporairement
    const newStatus = checked ? 'disponible' : 'en_pause';
    
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ status: newStatus })
        .eq('id', candidateId);

      if (error) throw error;

      setIsAvailable(checked);
      toast({
        title: "Disponibilité mise à jour",
        description: checked ? "Vous êtes maintenant disponible" : "Vous êtes maintenant en pause"
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre disponibilité.",
        variant: "destructive"
      });
    }
  };

  // Récupérer les projets actifs du candidat pour les messages
  useEffect(() => {
    const candidateProjectsList = getCandidateProjects();
    const formattedProjects = candidateProjectsList.map(p => ({
      id: p.project_id,
      title: p.project_title,
      status: p.status,
      description: '',
      project_date: p.created_at,
      due_date: null,
      client_budget: null
    }));
    
    setCandidateProjects(formattedProjects);
    
    // Sélectionner automatiquement le premier projet
    if (formattedProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(formattedProjects[0].id);
    }
  }, [userProjects]);

  const renderContent = () => {
    switch (activeSection) {
      case 'projects':
        return <CandidateProjectsFixed />;
        
      case 'planning':
        return candidateId ? (
          <div className="space-y-6">
            {/* Header unifié avec le client */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 text-white" />
                    </div>
                    
                    <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="w-64 bg-white/90 backdrop-blur-sm border-white/20">
                        <SelectValue placeholder="Sélectionner un projet" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidateProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Affichage du planning ou message d'absence */}
            {selectedProjectId ? (
              <SharedPlanningView 
                mode="candidate" 
                projects={candidateProjects.filter(p => p.id === selectedProjectId)} 
                candidateId={candidateId} 
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un projet pour voir le planning</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Planning non disponible</p>
            <p className="text-sm mt-2">Complétez votre profil pour accéder au planning</p>
          </div>
        );
        
      case 'drive':
        return <CandidateDriveView />;
        
      case 'kanban':
        return candidateId ? (
          <div className="space-y-6">
            {/* Header unifié avec le client */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Layout className="w-6 h-6 text-white" />
                    </div>
                    
                    <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="w-64 bg-white/90 backdrop-blur-sm border-white/20">
                        <SelectValue placeholder="Sélectionner un projet" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidateProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Affichage du kanban ou message d'absence */}
            {selectedProjectId ? (
              <div className="h-[calc(100vh-20rem)]">
                <CandidateKanbanView projectId={selectedProjectId} />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un projet pour voir le tableau Kanban</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Kanban non disponible</p>
            <p className="text-sm mt-2">Complétez votre profil pour accéder au tableau Kanban</p>
          </div>
        );
        
      case 'messages':
        return candidateId ? (
          <div className="space-y-6">
            {/* Header unifié avec le client */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    
                    <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="w-64 bg-white/90 backdrop-blur-sm border-white/20">
                        <SelectValue placeholder="Sélectionner un projet" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidateProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Affichage des messages ou message d'absence */}
            {selectedProjectId ? (
              <EnhancedMessageSystem projectId={selectedProjectId} userType="candidate" />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un projet pour voir les messages</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Messagerie non disponible</p>
            <p className="text-sm mt-2">Complétez votre profil pour accéder aux messages</p>
          </div>
        );
        
      case 'activities':
        return <CandidateActivities />;
        
      case 'ratings':
        return <CandidateRatings />;
        
      case 'invoices':
        return <CandidatePayments />;
        
      case 'settings':
        return candidateId ? (
          <CandidateSettings 
            candidateId={candidateId}
            onProfileUpdate={refetchProfile}
          />
        ) : null;
        
      default:
        return null;
    }
  };

  // Si l'onboarding est nécessaire, afficher en plein écran
  if (!onboardingLoading && needsOnboarding && candidateProfile && candidateProfile.id) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
        <CandidateOnboarding 
          candidateId={candidateProfile.id}
          completeOnboarding={completeOnboarding}
          onComplete={async (data) => {
            console.log('Onboarding onComplete triggered');
            // Si des données sont passées, c'est déjà traité dans CandidateOnboarding
            if (data) {
              console.log('Onboarding already completed in component, refreshing...');
              // Refresh everything
              await refetchProfile();
              await refetchIdentity();
              // Rediriger vers le test de qualification
              console.log('Redirecting to skill test...');
              navigate('/candidate/skill-test');
            } else {
              console.log('Onboarding cancelled or failed');
            }
          }}
        />
      </div>
    );
  }

  // Si en chargement ou si on attend l'identité après onboarding
  if (onboardingLoading || (!needsOnboarding && identityLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }
  
  // Si après onboarding mais pas d'ID candidat, attendre encore
  if (!needsOnboarding && !candidateId && !identityError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finalisation de votre profil...</p>
        </div>
      </div>
    );
  }

  // Dashboard normal après onboarding - Unifié avec le design client
  // Vérifier si le candidat est validé
  const showValidationBanner = candidateProfile?.qualification_status !== 'qualified';
  
  return (
    <SidebarProvider>
      {showValidationBanner && <ValidationPromoBanner />}
      <div className={`min-h-screen flex w-full ${showValidationBanner ? 'pt-16' : ''}`}>
        <Sidebar className="w-64" collapsible="icon">
          <SidebarContent>
            <div className="p-4">
              <div className="group-data-[collapsible=icon]:hidden">
                <IallaLogo size="md" />
                <p className="text-sm text-muted-foreground mt-2">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <div className="hidden group-data-[collapsible=icon]:flex justify-center">
                <IallaLogo size="sm" showText={false} />
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        className={activeSection === item.id ? 'bg-muted' : ''}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4 space-y-2">
              <SidebarMenuButton
                onClick={() => setActiveSection('settings')}
                className={activeSection === 'settings' ? 'bg-muted' : ''}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Paramètres</span>
              </SidebarMenuButton>
              
              <SidebarMenuButton onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 bg-gradient-to-br from-purple-50/30 via-white to-pink-50/30">
          <header className="h-16 border-b bg-white/80 backdrop-blur-sm flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center">
              <SidebarTrigger />
              <div className="ml-4">
                <h1 className="text-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {activeSection === 'projects' ? 'Mes projets' :
                   activeSection === 'planning' ? 'Planning' :
                   activeSection === 'drive' ? 'Drive' :
                   activeSection === 'kanban' ? 'Kanban' :
                   activeSection === 'messages' ? 'Messages' :
                   activeSection === 'activities' ? 'Mes activités' :
                   activeSection === 'ratings' ? 'Mes notes' :
                   activeSection === 'invoices' ? 'Mes paiements' :
                   activeSection === 'settings' ? 'Paramètres' :
                   'Tableau de bord'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Bienvenue {user?.firstName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <TimeTrackerSimple />
              <div className="h-6 w-px bg-gray-300" />
              <NotificationBell />
              <div className="flex items-center gap-2">
                <Label htmlFor="availability" className="text-sm font-medium">
                  {isAvailable ? 'Disponible' : 'En pause'}
                </Label>
                <Switch
                  id="availability"
                  checked={isAvailable}
                  onCheckedChange={handleAvailabilityChange}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                Candidat
              </Badge>
            </div>
          </header>
          
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default CandidateDashboard;