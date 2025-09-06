import { useState, useEffect, useMemo } from "react";
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
  Layout,
  Cloud
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

const CandidateDashboard = () => {
  const [activeSection, setActiveSection] = useState('projects');
  const [isAvailable, setIsAvailable] = useState(true);
  const [candidateProjects, setCandidateProjects] = useState<any[]>([]);
  const [resourceAssignments, setResourceAssignments] = useState<any[]>([]);
  const [candidateLanguages, setCandidateLanguages] = useState<string[]>([]);
  const [candidateExpertises, setCandidateExpertises] = useState<string[]>([]);
  const [selectedDriveProjectId, setSelectedDriveProjectId] = useState<string>("");
  const { user, logout } = useAuth();
  const { getCandidateProjects, projects: userProjects } = useUserProjects();
  // Use optimized hook for active projects only (planning/kanban/drive/messages)
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

  // Set default Drive project when activeProjects change
  useEffect(() => {
    if (!selectedDriveProjectId && activeProjects.length > 0) {
      setSelectedDriveProjectId(activeProjects[0].id);
    }
  }, [activeProjects]);

  // Set up fixed real-time project updates for candidate (only after onboarding)
  // Use user.id for channel identification, profile_id for filtering
  // Only enable when we have all the required data AND no loading states
  const shouldEnableRealtime = !needsOnboarding && 
                               !identityLoading && 
                               !onboardingLoading &&
                               user?.id && 
                               candidateId && 
                               profileId;
  
  // Memoize candidateProfile object to prevent re-renders
  const realtimeCandidateProfile = useMemo(() => {
    if (shouldEnableRealtime && candidateId && profileId && seniority) {
      return { 
        id: candidateId,
        profile_id: profileId, 
        seniority 
      };
    }
    return null;
  }, [shouldEnableRealtime, candidateId, profileId, seniority]);
  
  useRealtimeProjectsFixed({
    setProjects: setCandidateProjects,
    setResourceAssignments: setResourceAssignments,
    userId: shouldEnableRealtime ? user.id : null,
    userType: 'candidate',
    candidateProfile: realtimeCandidateProfile
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
    // console.log('[CandidateDashboard] userProjects changed, updating candidateProjects');
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
  }, [userProjects]); // Depend on userProjects data, not the function
  
  // Charger les langues et expertises du candidat
  useEffect(() => {
    const loadCandidateSkills = async () => {
      if (!candidateId || !user?.email) return;
      
      try {
        // Récupérer les langues du candidat
        const { data: langData } = await supabase
          .from('candidate_languages')
          .select(`
            hr_languages (
              name
            )
          `)
          .eq('candidate_id', candidateId);
        
        if (langData) {
          const langs = langData.map(cl => cl.hr_languages?.name).filter(Boolean);
          setCandidateLanguages(langs);
        }
        
        // Récupérer les expertises du candidat
        const { data: expData } = await supabase
          .from('candidate_expertises')
          .select(`
            hr_expertises (
              name
            )
          `)
          .eq('candidate_id', candidateId);
        
        if (expData) {
          const exps = expData.map(ce => ce.hr_expertises?.name).filter(Boolean);
          setCandidateExpertises(exps);
        }
      } catch (error) {
        console.error('Error loading candidate skills:', error);
      }
    };
    
    loadCandidateSkills();
  }, [candidateId, user]);

  // Charger les assignments avec les projets associés
  useEffect(() => {
    const loadAssignments = async () => {
      if (!candidateId || !profileId || !candidateStatus) return;
      
      try {
        // Récupérer TOUS les assignments en recherche ou assignés à ce candidat
        const { data: assignments, error } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            projects:project_id (
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
        
        if (error) {
          console.error('Error loading assignments:', error);
          return;
        }
        
        // console.log('Loaded assignments:', assignments);
        
        // FILTRAGE COMPLET : appliquer la logique de matching comme dans CandidateMissionRequests
        const filteredAssignments = (assignments || []).filter(assignment => {
          // Si déjà assigné à ce candidat, toujours montrer
          if (assignment.candidate_id === candidateId) {
            return true;
          }
          
          // Si assigné à un autre candidat, ne pas montrer
          if (assignment.candidate_id && assignment.candidate_id !== candidateId) {
            return false;
          }
          
          // Pour les missions en recherche, vérifier le matching complet
          if (assignment.booking_status === 'recherche') {
            // 1. PROFILE MATCH: Le candidat doit avoir le bon métier
            const profileMatch = assignment.profile_id === profileId;
            
            // 2. SENIORITY MATCH: Le candidat doit avoir la bonne séniorité
            const seniorityMatch = assignment.seniority === seniority;
            
            // 3. STATUS CHECK: Le candidat doit être qualifié et disponible
            const statusMatch = candidateStatus !== 'qualification' && 
                              (candidateStatus === 'disponible' || candidateStatus === 'en_pause');
            
            // 4. LANGUAGES MATCH: Le candidat doit avoir toutes les langues requises
            const languagesMatch = !assignment.languages?.length || 
              assignment.languages.every(lang => candidateLanguages.includes(lang));
            
            // 5. EXPERTISES MATCH: Le candidat doit avoir toutes les expertises requises
            const expertisesMatch = !assignment.expertises?.length || 
              assignment.expertises.every(exp => candidateExpertises.includes(exp));
            
            // Debug pour comprendre le matching
            if (!profileMatch || !seniorityMatch || !statusMatch || !languagesMatch || !expertisesMatch) {
              console.log('Assignment filtered out:', assignment.projects?.title, {
                profileMatch,
                seniorityMatch,
                statusMatch,
                languagesMatch,
                expertisesMatch,
                required: {
                  profile_id: assignment.profile_id,
                  seniority: assignment.seniority,
                  languages: assignment.languages,
                  expertises: assignment.expertises
                },
                candidate: {
                  profile_id: profileId,
                  seniority: seniority,
                  status: candidateStatus,
                  languages: candidateLanguages,
                  expertises: candidateExpertises
                }
              });
            }
            
            return profileMatch && seniorityMatch && statusMatch && languagesMatch && expertisesMatch;
          }
          
          return false;
        });
        
        // Si on a des assignments filtrés, enrichir avec les données du client et du profil HR
        if (filteredAssignments && filteredAssignments.length > 0) {
          const enrichedAssignments = await Promise.all(
            filteredAssignments.map(async (assignment) => {
              let enrichedAssignment = { ...assignment };
              
              // Charger les infos du client si le projet existe
              if (assignment.projects?.owner_id) {
                const { data: ownerProfile } = await supabase
                  .from('profiles')
                  .select('company_name')
                  .eq('id', assignment.projects.owner_id)
                  .single();
                
                enrichedAssignment.projects = {
                  ...assignment.projects,
                  owner: ownerProfile
                };
              }
              
              // Charger le profil HR si nécessaire
              if (assignment.profile_id) {
                const { data: hrProfile, error } = await supabase
                  .from('hr_profiles')
                  .select('name')
                  .eq('id', assignment.profile_id)
                  .single();
                
                if (!error && hrProfile) {
                  // Utiliser label au lieu de name pour la cohérence
                  enrichedAssignment.hr_profiles = {
                    label: hrProfile.name
                  };
                }
              }
              
              return enrichedAssignment;
            })
          );
          
          // console.log('Enriched assignments:', enrichedAssignments);
          setResourceAssignments(enrichedAssignments);
        } else {
          setResourceAssignments(filteredAssignments || []);
        }
      } catch (error) {
        console.error('Error in loadAssignments:', error);
      }
    };
    
    loadAssignments();
  }, [candidateId, profileId, seniority, candidateStatus, candidateLanguages, candidateExpertises]);
  
  // Functions for accepting/declining missions
  const handleAcceptMission = async (projectId: string) => {
    try {
      // Find the assignment for this project
      const assignment = resourceAssignments.find(a => 
        a.project_id === projectId && a.booking_status === 'recherche'
      );
      
      if (!assignment) {
        toast({
          title: "Erreur",
          description: "Impossible de trouver l'invitation pour ce projet",
          variant: "destructive",
        });
        return;
      }

      // Call the resource-booking function to accept
      const { data, error } = await supabase.functions.invoke('resource-booking', {
        body: {
          action: 'accept_mission',
          assignment_id: assignment.id,
          candidate_email: user?.email
        }
      });

      if (error) throw error;

      toast({
        title: "Mission acceptée",
        description: "Vous avez accepté cette mission avec succès",
      });

      // Refresh projects
      refetchIdentity();
      getCandidateProjects();
    } catch (error: any) {
      console.error('Error accepting mission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'accepter la mission",
        variant: "destructive",
      });
    }
  };

  const handleDeclineMission = async (projectId: string) => {
    try {
      // Find the assignment for this project
      const assignment = resourceAssignments.find(a => 
        a.project_id === projectId && a.booking_status === 'recherche'
      );
      
      if (!assignment) {
        toast({
          title: "Erreur",
          description: "Impossible de trouver l'invitation pour ce projet",
          variant: "destructive",
        });
        return;
      }

      // Call the resource-booking function to decline
      const { data, error } = await supabase.functions.invoke('resource-booking', {
        body: {
          action: 'decline_mission',
          assignment_id: assignment.id,
          candidate_email: user?.email
        }
      });

      if (error) throw error;

      toast({
        title: "Mission refusée",
        description: "Vous avez refusé cette mission",
      });

      // Refresh projects
      refetchIdentity();
      getCandidateProjects();
    } catch (error: any) {
      console.error('Error declining mission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de refuser la mission",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'projects':
        // console.log('CandidateDashboard - resourceAssignments:', resourceAssignments);
        // console.log('CandidateDashboard - candidateProjects:', candidateProjects);
        // console.log('CandidateDashboard - candidateId:', candidateId);
        
        // Filter active projects (accepted by candidate)
        const activeProjectsList = resourceAssignments
          .filter(a => {
            // console.log('Checking assignment for active:', a);
            // Inclure les projets acceptés ET terminés (completed)
            return (a.booking_status === 'accepted' || a.booking_status === 'completed') && a.projects;
          })
          .map(a => ({
            ...a.projects,
            // Ajouter le booking_status pour différencier actif/terminé
            booking_status: a.booking_status,
            hr_resource_assignments: [{
              ...a,
              hr_profiles: a.hr_profiles
            }],
            owner: a.projects?.owner
          }));
        
        // Filter pending invitations (available to candidate)
        // Le filtrage complet a déjà été fait dans loadAssignments
        const pendingInvitationsList = resourceAssignments
          .filter(a => {
            // Les invitations sont les assignments en recherche
            // Soit ils n'ont pas de candidat assigné, soit c'est ce candidat
            return a.booking_status === 'recherche' && 
                   (!a.candidate_id || a.candidate_id === candidateId) && 
                   a.projects;
          })
          .map(a => ({
            ...a.projects,
            hr_resource_assignments: [{
              ...a,
              hr_profiles: a.hr_profiles
            }],
            owner: a.projects?.owner
          }));
        
        // console.log('CandidateDashboard - activeProjectsList:', activeProjectsList);
        // console.log('CandidateDashboard - pendingInvitationsList:', pendingInvitationsList);
        
        return (
          <CandidateProjectsSection
            activeProjects={activeProjectsList}
            pendingInvitations={pendingInvitationsList}
            onViewProject={(id) => navigate(`/candidate/project/${id}`)}
            onAcceptMission={handleAcceptMission}
            onDeclineMission={handleDeclineMission}
          />
        );
        
      case 'planning':
        return <PlanningPage 
          userType="candidate" 
          userEmail={user?.email} 
          userName={user?.user_metadata?.name} 
          candidateId={candidateId}
        />;
        
      case 'drive':
        return (
          <div className="space-y-4">
            {activeProjects.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Cloud className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Drive du Projet</h2>
                      <p className="text-sm text-gray-600">Gérez et partagez les fichiers du projet</p>
                    </div>
                  </div>
                  
                  <Select value={selectedDriveProjectId} onValueChange={setSelectedDriveProjectId}>
                    <SelectTrigger className="w-64 bg-white border-blue-200 focus:border-blue-400">
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {activeProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Espace de stockage non disponible</h3>
                <p>Vous devez être assigné à un projet actif pour accéder au drive</p>
              </div>
            ) : selectedDriveProjectId && (
              <SimpleDriveView 
                projectId={selectedDriveProjectId}
                userType="candidate"
              />
            )}
          </div>
        );
        
      case 'kanban':
        return candidateId && activeProjects.length > 0 ? (
          <CandidateKanbanView />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Kanban non disponible</p>
            <p className="text-sm mt-2">Aucun projet actif. Le Kanban sera disponible lorsque le client aura démarré le projet.</p>
          </div>
        );
        
      case 'messages':
        return candidateId && activeProjects.length > 0 ? (
          <CandidateMessagesView />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Messagerie non disponible</p>
            <p className="text-sm mt-2">Aucun projet actif. La messagerie sera disponible lorsque le client aura démarré le projet.</p>
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