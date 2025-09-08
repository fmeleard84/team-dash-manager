import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  BookOpen
} from "lucide-react";
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
// KickoffDialog now handled in ProjectCard component
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
// Removed: kickoff dialog state - now handled in ProjectCard
const [refreshTrigger, setRefreshTrigger] = useState(0);

const { setupProject, isLoading: isOrchestrating } = useProjectOrchestrator();
const { categories, templates, getTemplatesByCategory } = useTemplates();

// Set up real-time project updates with FIXED version
useRealtimeProjectsFixed({
  setProjects,
  setResourceAssignments,
  userId: user?.profile?.id || user?.id,
  userType: 'client'
});

// Handle URL parameters for section navigation
useEffect(() => {
  const section = searchParams.get('section');
  if (section && ['start', 'dashboard', 'templates', 'projects', 'calc', 'planning', 'drive', 'kanban', 'messages', 'invoices', 'settings'].includes(section)) {
    setActiveSection(section);
  }
}, [searchParams]);

useEffect(() => {
  const load = async () => {
    if (!user) return;
    
    // Charger les projets actifs (non archivés et non supprimés)
    const { data: activeData, error: activeError } = await supabase
      .from('projects')
      .select('id,title,description,project_date,due_date,client_budget,status,archived_at,deleted_at')
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (activeError) {
      console.error('load active projects', activeError);
    } else {
      setProjects((activeData || []) as DbProject[]);
      
      // Only set default project if we have active projects (status = 'play')
      const activeProjects = (activeData || []).filter(p => p.status === 'play');
      if (!selectedKanbanProjectId && activeProjects.length > 0) setSelectedKanbanProjectId(activeProjects[0].id);
      if (!selectedMessagesProjectId && activeProjects.length > 0) setSelectedMessagesProjectId(activeProjects[0].id);
      if (!selectedDriveProjectId && activeProjects.length > 0) setSelectedDriveProjectId(activeProjects[0].id);
    }
    
    // Charger les projets archivés séparément
    const { data: archivedData, error: archivedError } = await supabase
      .from('projects')
      .select('id,title,description,project_date,due_date,client_budget,status,archived_at,deleted_at')
      .eq('owner_id', user.id)
      .not('archived_at', 'is', null)
      .is('deleted_at', null)
      .order('archived_at', { ascending: false });
    
    if (!archivedError) {
      setArchivedProjects((archivedData || []) as DbProject[]);
    }
    
    // Load resource assignments for all projects
    await loadResourceAssignments();
  };
  load();
}, [user]);

const loadResourceAssignments = async () => {
  try {
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status
      `);
    
    if (error) {
      console.error('Error loading resource assignments:', error);
    } else {
      setResourceAssignments(data || []);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

const refreshProjects = async () => {
  if (!user) return;
  // Rafraîchir d'abord les resource assignments
  await loadResourceAssignments();
  
  // Charger les projets actifs (non archivés et non supprimés)
  const { data: activeData } = await supabase
    .from('projects')
    .select('id,title,description,project_date,due_date,client_budget,status,archived_at,deleted_at')
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  setProjects((activeData || []) as DbProject[]);
  
  // Charger les projets archivés
  const { data: archivedData } = await supabase
    .from('projects')
    .select('id,title,description,project_date,due_date,client_budget,status,archived_at,deleted_at')
    .eq('owner_id', user.id)
    .not('archived_at', 'is', null)
    .is('deleted_at', null)
    .order('archived_at', { ascending: false });
  setArchivedProjects((archivedData || []) as DbProject[]);
};

const onViewProject = (id: string) => {
  navigate(`/project/${id}`);
};

// Function to refresh resource assignments after returning from ReactFlow
const triggerResourceRefresh = () => {
  setRefreshTrigger(prev => prev + 1);
};

// Listen for navigation back to trigger refresh
useEffect(() => {
  const handleFocus = () => {
    triggerResourceRefresh();
  };
  
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, []);

const onToggleStatus = async (id: string, currentStatus: string) => {
  // Déterminer le nouveau statut basé sur le statut actuel
  let newStatus: string;
  
  if (currentStatus === 'play') {
    // Si le projet est actif, le mettre en pause
    newStatus = 'pause';
  } else if (currentStatus === 'pause') {
    // Si le projet est en pause, vérifier s'il peut être démarré
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    // Vérifier que toutes les ressources ont accepté
    const acceptedResources = resourceAssignments.filter(
      a => a.project_id === id && a.booking_status === 'accepted'
    );
    
    const totalResources = resourceAssignments.filter(
      a => a.project_id === id && a.booking_status !== 'draft'
    );
    
    if (acceptedResources.length === 0) {
      toast({ title: 'Erreur', description: 'Aucune ressource n\'a encore accepté ce projet' });
      return;
    }
    
    if (acceptedResources.length < totalResources.length) {
      // Pas toutes les ressources ont accepté, mettre en attente-team
      newStatus = 'attente-team';
      toast({ title: 'Info', description: 'En attente que toutes les ressources acceptent' });
    } else {
      // Toutes les ressources ont accepté, démarrer le projet
      onStartProject(project);
      return;
    }
  } else if (currentStatus === 'attente-team') {
    // Si en attente d'équipe, permettre de démarrer si toutes les ressources sont OK
    const project = projects.find(p => p.id === id);
    if (!project) return;
    onStartProject(project);
    return;
  } else {
    // Pour les autres statuts, ne rien faire
    return;
  }
  
  // Mettre à jour le statut
  const { error } = await supabase
    .from('projects')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    console.error('Error updating project status:', error);
    toast({ title: 'Erreur', description: 'Erreur lors de la mise à jour du statut' });
  } else {
    const statusMessages = {
      'pause': 'Projet mis en pause',
      'attente-team': 'En attente de l\'équipe',
      'play': 'Projet démarré'
    };
    toast({ 
      title: 'Succès', 
      description: statusMessages[newStatus as keyof typeof statusMessages] || 'Statut mis à jour' 
    });
    await refreshProjects();
  }
};

const onStartProject = async (project: { id: string; title: string; kickoffISO?: string }) => {
  console.log('🎯 onStartProject called with:', project);
  
  // Don't check status anymore - check if tools exist instead
  // The project-orchestrator will check if kanban already exists
  // This allows projects in 'play' status (after all accept) to be started with kickoff
  
  // Always expect kickoffISO from ProjectCard
  if (!project.kickoffISO) {
    console.error('onStartProject called without kickoffISO:', project);
    toast({ 
      title: "Erreur", 
      description: "Date de kickoff manquante." 
    });
    return;
  }

  try {
    console.log('📅 Calling setupProject with:', project.id, project.kickoffISO);
    const success = await setupProject(project.id, project.kickoffISO);
    if (!success) {
      toast({ 
        title: "Erreur", 
        description: "Échec de la configuration du projet." 
      });
      return;
    }

    await refreshProjects();
    toast({ 
      title: "Projet configuré avec succès!", 
      description: "Planning, Kanban, Drive, notifications créés et équipe invitée au kickoff." 
    });
  } catch (error) {
    console.error('Error starting project:', error);
    toast({ 
      title: "Erreur", 
      description: "Une erreur s'est produite lors de la configuration." 
    });
  }
};

// Removed: handleKickoffConfirm - now handled in onStartProject

// Handler pour ouvrir le dialogue de suppression
const handleDeleteRequest = (project: DbProject) => {
  setProjectToDelete(project);
  setDeleteDialogOpen(true);
};

// Handler pour archiver un projet
const handleArchiveProject = async (id: string) => {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  
  setProjectToDelete(project);
  setDeleteDialogOpen(true);
};

// Handler pour désarchiver un projet
const handleUnarchiveProject = async (id: string) => {
  try {
    const { data, error } = await supabase.rpc('unarchive_project', {
      project_id_param: id,
      user_id_param: user?.id
    });
    
    if (error) throw error;
    
    if (data?.success) {
      toast({ 
        title: 'Projet désarchivé',
        description: 'Le projet est maintenant actif'
      });
      await refreshProjects();
    }
  } catch (error: any) {
    console.error('Erreur désarchivage:', error);
    toast({ 
      title: 'Erreur',
      description: error.message,
      variant: 'destructive'
    });
  }
};

// Ancien handler pour compatibilité (redirige vers le dialogue)
const onDeleteProject = (id: string) => {
  const project = projects.find(p => p.id === id);
  if (project) {
    handleDeleteRequest(project);
  }
};

const handleCreateProject = async (data: { title: string; description?: string; project_date: string; client_budget?: number; due_date?: string; file?: File | null; }) => {
  setIsCreating(true);
  try {
    const insert = {
      title: data.title,
      description: data.description || null,
      project_date: data.project_date,
      due_date: data.due_date || null,
      client_budget: data.client_budget ?? null,
      status: 'pause',
    } as any;

    const { data: inserted, error } = await supabase
      .from('projects')
      .insert(insert)
      .select('id')
      .single();

    if (error || !inserted) throw error;

    const projectId = inserted.id as string;

    // Upload file and save metadata to database
    if (data.file) {
      try {
        const path = `project/${projectId}/${data.file.name}`;
        const { error: upErr } = await supabase.storage
          .from('project-files')
          .upload(path, data.file, { upsert: true });
        
        if (upErr) {
          console.error('upload error', upErr);
          toast({ title: 'Upload échoué', description: data.file.name });
        } else {
          // Save file metadata to database
          const { data: authData } = await supabase.auth.getUser();
          const { error: fileErr } = await supabase
            .from('project_files')
            .insert({
              project_id: projectId,
              file_name: data.file.name,
              file_path: path,
              file_size: data.file.size,
              file_type: data.file.type,
              uploaded_by: authData.user?.id
            });
          
          if (fileErr) {
            console.error('Error saving file metadata:', fileErr);
          } else {
            console.log('File uploaded and metadata saved successfully');
          }
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    toast({ title: 'Projet créé', description: 'Redirection vers ReactFlow pour construire votre équipe...' });
    setIsCreateOpen(false);
    // Navigate immediately to ReactFlow for team building
    navigate(`/project/${projectId}`);
    // Refresh projects in background
    await refreshProjects();
  } catch (e) {
    console.error('create project error', e);
    toast({ title: 'Erreur', description: 'Création du projet échouée' });
  } finally {
    setIsCreating(false);
  }
};
// Project classification logic
const getProjectResourceAssignments = (projectId: string) => {
  return resourceAssignments.filter(assignment => assignment.project_id === projectId);
};

const getProjectsWithClassification = () => {
  return projects.map(project => {
    const assignments = getProjectResourceAssignments(project.id);
    // Check if all resources are accepted
    const allResourcesBooked = assignments.length > 0 && assignments.every(assignment => 
      assignment.booking_status === 'accepted'
    );
    const hasBookingRequested = assignments.some(assignment => assignment.booking_status === 'recherche');
    const hasResourcesInDraft = assignments.some(assignment => assignment.booking_status === 'draft');
    
    let category = 'nouveaux'; // default
    
    // UNIFIED STATUS LOGIC - based on project status and resource booking
    switch (project.status) {
      case 'completed':
        category = 'termines';
        break;
        
      case 'play':
        // Projet en cours
        category = 'en-cours';
        break;
        
      case 'attente-team':
        // Projet qui attend l'équipe - mais si tous booké, devrait être en cours
        if (allResourcesBooked) {
          // Force immediate UI update - backend should update to 'play' soon
          category = 'en-cours';
          console.log(`🔄 PROJECT ${project.title}: Force move to 'en-cours' (all resources booked)`);
        } else {
          category = 'attente-team';
        }
        break;
        
      case 'pause':
      case 'nouveaux':
      default:
        // Projet pas encore démarré - classification selon les ressources
        if (assignments.length === 0) {
          category = 'nouveaux';
        } else if (allResourcesBooked) {
          // Toutes ressources bookées mais projet en pause
          category = 'en-pause';
        } else if (hasBookingRequested) {
          // Booking en cours
          category = 'attente-team';
        } else if (hasResourcesInDraft) {
          // Ressources définies mais pas encore bookées
          category = 'nouveaux';
        } else {
          category = 'nouveaux';
        }
        break;
    }
    
    return { ...project, category, assignments, allResourcesBooked, hasBookingRequested };
  });
};

const classifiedProjects = useMemo(() => getProjectsWithClassification(), [projects, resourceAssignments]);

const nouveauxProjets = classifiedProjects.filter(p => p.category === 'nouveaux');
const projetsAttenteTeam = classifiedProjects.filter(p => p.category === 'attente-team');
const projetsEnPause = classifiedProjects.filter(p => p.category === 'en-pause');
const projetsEnCours = classifiedProjects.filter(p => p.category === 'en-cours');
const projetsTermines = classifiedProjects.filter(p => p.category === 'termines');

const hasActiveProjects = projetsEnCours.length > 0;

// Initialize first active project IDs for Wiki/Kanban/Messages/Drive when component mounts or projects change
useEffect(() => {
  const activeProjectIds = projetsEnCours.map(p => p.id);
  
  if (activeProjectIds.length > 0) {
    if (!selectedWikiProjectId || !activeProjectIds.includes(selectedWikiProjectId)) {
      setSelectedWikiProjectId(activeProjectIds[0]);
    }
    if (!selectedKanbanProjectId || !activeProjectIds.includes(selectedKanbanProjectId)) {
      setSelectedKanbanProjectId(activeProjectIds[0]);
    }
    if (!selectedMessagesProjectId || !activeProjectIds.includes(selectedMessagesProjectId)) {
      setSelectedMessagesProjectId(activeProjectIds[0]);
    }
    if (!selectedDriveProjectId || !activeProjectIds.includes(selectedDriveProjectId)) {
      setSelectedDriveProjectId(activeProjectIds[0]);
    }
  }
}, [projetsEnCours]);

const menuItems = [
  { id: 'start', label: 'Commencer', icon: Rocket },
  { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
  { id: 'projects', label: 'Mes projets', icon: FolderOpen },
  { id: 'planning', label: 'Planning', icon: Calendar },
  ...(hasActiveProjects ? [
    { id: 'wiki', label: 'Wiki', icon: BookOpen },
    { id: 'drive', label: 'Drive', icon: Cloud },
    { id: 'kanban', label: 'Tableau Kanban', icon: Kanban },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ] : []),
  { id: 'invoices', label: 'Mes factures', icon: Receipt },
];

  const renderContent = () => {
    switch (activeSection) {
      case 'start':
        return (
          <div className="min-h-[calc(100vh-12rem)] bg-gradient-to-b from-white via-purple-50/20 to-white">
            <div className="w-full max-w-6xl mx-auto px-8 pt-16 pb-20">
              {/* Header Section with massive breathing space */}
              <div className="text-center space-y-6 mb-20">
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full"></div>
                    <IallaLogo size="lg" />
                  </div>
                </div>
                
                <h1 className="text-6xl md:text-7xl font-bold leading-[1.1] tracking-[-0.03em] text-gray-900">
                  Créez votre
                  <span className="block md:inline bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    {" "}équipe externe
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-light">
                  Choisissez comment vous souhaitez démarrer votre nouveau projet
                </p>
              </div>

              {/* Cards Section with enhanced styling */}
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Projet sur-mesure Card */}
                <div className="group relative">
                  {/* Glow effect on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-[20px] opacity-0 group-hover:opacity-20 blur-lg transition-all duration-300"></div>
                  
                  <Card className="relative bg-white hover:shadow-2xl transition-all duration-300 border-gray-100 shadow-lg rounded-[20px] overflow-hidden">
                    <CardHeader className="space-y-6 p-8 pb-6">
                      {/* Icon with gradient background */}
                      <div className="relative mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                          <Plus className="w-10 h-10 text-white" />
                        </div>
                        {/* Decorative circle */}
                        <div className="absolute -inset-1 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                      </div>
                      
                      <CardTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                        Projet sur-mesure
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-8 pt-0">
                      <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                        Créez un projet personnalisé en définissant vos propres besoins et contraintes.
                      </p>
                      
                      <Button 
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsCreateOpen(true);
                        }}
                      >
                        Créer un projet
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Templates Card */}
                <div className="group relative">
                  {/* Glow effect on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-[20px] opacity-0 group-hover:opacity-20 blur-lg transition-all duration-300"></div>
                  
                  <Card 
                    className="relative bg-white hover:shadow-2xl transition-all duration-300 border-gray-100 shadow-lg cursor-pointer rounded-[20px] overflow-hidden"
                    onClick={() => setActiveSection('templates')}
                  >
                    <CardHeader className="space-y-6 p-8 pb-6">
                      {/* Icon with gradient background */}
                      <div className="relative mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                          <Rocket className="w-10 h-10 text-white" />
                        </div>
                        {/* Decorative circle */}
                        <div className="absolute -inset-1 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                      </div>
                      
                      <CardTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                        Templates prêts à l'emploi
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-8 pt-0">
                      <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                        Utilisez nos modèles pré-configurés pour démarrer rapidement avec une équipe optimisée.
                      </p>
                      
                      <Button 
                        variant="outline" 
                        className="w-full h-12 text-base font-semibold border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 rounded-full transform hover:-translate-y-0.5 transition-all duration-200"
                      >
                        Explorer les templates →
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Footer Help Section */}
              <div className="mt-20 text-center">
                <p className="text-gray-500 text-base">
                  Besoin d'aide ? 
                  <Button variant="link" className="text-purple-600 hover:text-purple-700 underline-offset-4 ml-1 p-0 h-auto font-medium">
                    Notre équipe est là pour vous accompagner
                  </Button>
                </p>
              </div>
            </div>
          </div>
        );

      case 'dashboard':
        return <ClientMetricsDashboard />;

      case 'templates':
        if (selectedCategory) {
          // Show templates for selected category
          const category = categories.find(c => c.id === selectedCategory);
          const categoryTemplates = getTemplatesByCategory(selectedCategory);
          
          const IconComponent = category?.icon === 'MessageSquare' ? MessageSquare :
                               category?.icon === 'Cloud' ? Cloud :
                               category?.icon === 'Receipt' ? Receipt :
                               FolderOpen; // default icon
          
          return (
            <div className="space-y-6">
              {/* Header avec design Ialla */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-white to-pink-50 border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br opacity-20" 
                     style={{ 
                       background: category?.color?.includes('from-blue') ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' :
                                   category?.color?.includes('from-green') ? 'linear-gradient(135deg, #059669, #047857)' :
                                   category?.color?.includes('from-purple') ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' :
                                   category?.color?.includes('from-red') ? 'linear-gradient(135deg, #dc2626, #b91c1c)' :
                                   category?.color?.includes('from-yellow') ? 'linear-gradient(135deg, #d97706, #b45309)' :
                                   'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                     }}
                />
                <div className="relative p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${category?.color || 'from-purple-600 to-pink-600'} rounded-2xl flex items-center justify-center shadow-lg`}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                          {category?.name || 'Catégorie'}
                        </h2>
                        <p className="text-gray-600 mt-2 text-lg">
                          {category?.description || 'Équipes disponibles dans cette catégorie'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCategory(null)}
                      className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white"
                    >
                      Retour aux catégories
                    </Button>
                  </div>
                </div>
              </div>

              {categoryTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune équipe disponible dans cette catégorie</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="group/template hover:shadow-xl transition-all duration-200 cursor-pointer border-l-4 relative bg-white/80 backdrop-blur-sm"
                      style={{ 
                        borderLeftColor: category?.color?.includes('from-blue') ? '#3b82f6' :
                                       category?.color?.includes('from-green') ? '#059669' :
                                       category?.color?.includes('from-purple') ? '#7c3aed' :
                                       category?.color?.includes('from-red') ? '#dc2626' :
                                       category?.color?.includes('from-yellow') ? '#d97706' :
                                       category?.color?.includes('from-indigo') ? '#4f46e5' :
                                       '#3b82f6'
                      }}
                      onClick={() => {
                        // Navigate to ReactFlow with template data
                        window.open(`/project/template-preview?template=${template.id}`, '_blank');
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 group-hover/template:text-purple-600 transition-colors text-lg mb-2">
                                {template.name}
                              </h4>
                              {template.description && (
                                <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {template.team_size && (
                                  <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full">
                                    <Users className="w-4 h-4" />
                                    <span className="font-medium">{template.team_size} personnes</span>
                                  </span>
                                )}
                                {template.price_per_minute && (
                                  <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                                    <span className="text-lg">€</span>
                                    <span className="font-medium">{template.price_per_minute}/min</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-50 group-hover/template:bg-purple-100 transition-colors">
                              <Eye className="w-5 h-5 text-purple-600" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="text-center mt-8">
                <p className="text-gray-500 text-sm">
                  Vous ne trouvez pas l'équipe adaptée ? 
                  <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setIsCreateOpen(true)}>
                    Créez un projet sur-mesure
                  </Button>
                </p>
              </div>
            </div>
          );
        }

        // Show category overview
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold tracking-tighter">Vos futures équipes</h2>
                <p className="text-gray-600 mt-2">Choisissez une catégorie pour explorer nos équipes pré-configurées</p>
              </div>
              <Button variant="outline" onClick={() => setActiveSection('start')}>
                Retour
              </Button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Chargement des templates...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => {
                  const categoryTemplates = getTemplatesByCategory(category.id);
                  const IconComponent = category.icon === 'MessageSquare' ? MessageSquare :
                                      category.icon === 'Cloud' ? Cloud :
                                      category.icon === 'Receipt' ? Receipt :
                                      FolderOpen; // default icon

                  return (
                    <Card 
                      key={category.id} 
                      className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <CardHeader>
                        <div className={`w-12 h-12 bg-gradient-to-br ${category.color || 'from-gray-600 to-gray-700'} rounded-xl flex items-center justify-center mb-4`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <CardTitle className="group-hover:text-purple-600 transition-colors">{category.name}</CardTitle>
                        {category.description && (
                          <p className="text-sm text-gray-600">{category.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            {categoryTemplates.length} équipe{categoryTemplates.length !== 1 ? 's' : ''} disponible{categoryTemplates.length !== 1 ? 's' : ''}
                          </div>
                          <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                            Explorer →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="text-center mt-8">
              <p className="text-gray-500 text-sm">
                Vous ne trouvez pas le template adapté ? 
                <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setIsCreateOpen(true)}>
                  Créez un projet sur-mesure
                </Button>
              </p>
            </div>
          </div>
        );

      case 'projects':
        return (
          <ProjectsSection
            projects={projects}
            archivedProjects={archivedProjects}
            resourceAssignments={resourceAssignments}
            onViewProject={onViewProject}
            onToggleStatus={onToggleStatus}
            onStartProject={onStartProject}
            onDeleteRequest={handleDeleteRequest}
            onArchiveProject={handleArchiveProject}
            onUnarchiveProject={handleUnarchiveProject}
            onCreateProject={() => setIsCreateOpen(true)}
            onViewTemplates={() => setActiveSection('templates')}
          />
        );
        
      case 'planning':
        return <PlanningPage userType="client" userEmail={user?.email} userName={user?.user_metadata?.name} />;

      case 'wiki':
        return (
          <div className="space-y-4">
            {projetsEnCours.length > 0 && !isWikiFullscreen && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Wiki du Projet</h2>
                      <p className="text-sm text-gray-600">Documentation collaborative de l'équipe</p>
                    </div>
                  </div>
                  
                  <Select value={selectedWikiProjectId} onValueChange={setSelectedWikiProjectId}>
                    <SelectTrigger className="w-64 bg-white border-purple-200 focus:border-purple-400">
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {projetsEnCours.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {projetsEnCours.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Wiki non disponible</h3>
                <p>Démarrez un projet pour accéder à la documentation partagée</p>
              </div>
            ) : selectedWikiProjectId && (
              <div className={isWikiFullscreen ? "fixed inset-0 z-50" : "h-[calc(100vh-16rem)]" }>
                <WikiView 
                  projectId={selectedWikiProjectId}
                  userType="client"
                  onFullscreenChange={setIsWikiFullscreen}
                />
              </div>
            )}
          </div>
        );

      case 'drive':
        return (
          <div className="space-y-4">
            {projetsEnCours.length > 0 && (
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
                      {projetsEnCours.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {projetsEnCours.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Espace de stockage non disponible</h3>
                <p>Démarrez un projet pour accéder aux fichiers partagés</p>
              </div>
            ) : selectedDriveProjectId && (
              <SimpleDriveView 
                projectId={selectedDriveProjectId}
                userType="client"
              />
            )}
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-4">
            {projetsEnCours.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    
                    <Select value={selectedMessagesProjectId} onValueChange={setSelectedMessagesProjectId}>
                      <SelectTrigger className="w-64 bg-white border-purple-200 focus:border-purple-400">
                        <SelectValue placeholder="Sélectionner un projet" />
                      </SelectTrigger>
                      <SelectContent>
                        {projetsEnCours.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            {projetsEnCours.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Messagerie non disponible</h3>
                <p>Démarrez un projet pour communiquer avec votre équipe</p>
              </div>
            ) : selectedMessagesProjectId && (
              <div className="h-[calc(100vh-12rem)]">
                <EnhancedMessageSystem projectId={selectedMessagesProjectId} userType="client" />
              </div>
            )}
          </div>
        );

      case 'invoices':
        return (
          <div className="space-y-6">
            {/* Header avec design unifié */}
            <div className="bg-gradient-to-r from-purple-50 via-white to-pink-50 p-8 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Receipt className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tighter">
                    Gestion des Factures
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Consultez et gérez vos factures hebdomadaires
                  </p>
                </div>
              </div>
            </div>
            
            {/* Invoice List Component */}
            <InvoiceList />
          </div>
        );

      case 'kanban':
        return (
          <div className="h-[calc(100vh-8rem)]">
            {projetsEnCours.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Kanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Tableau Kanban non disponible</h3>
                  <p className="text-muted-foreground">Démarrez un projet pour accéder au tableau de gestion des tâches</p>
                </div>
              </div>
            ) : (
              <ClientKanbanView 
                availableProjects={projetsEnCours} 
                selectedProjectId={selectedKanbanProjectId}
                onProjectChange={setSelectedKanbanProjectId}
              />
            )}
          </div>
        );
        
      case 'settings':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Paramètres</h2>
            <Card>
              <CardHeader>
                <CardTitle>Informations de l'entreprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nom complet</label>
                  <p className="text-muted-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                {user?.companyName && (
                  <div>
                    <label className="text-sm font-medium">Entreprise</label>
                    <p className="text-muted-foreground">{user.companyName}</p>
                  </div>
                )}
                {user?.phone && (
                  <div>
                    <label className="text-sm font-medium">Téléphone</label>
                    <p className="text-muted-foreground">{user.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#FCFCFD]">
        <Sidebar className={`w-64 bg-white/95 backdrop-blur-sm border-r border-gray-100 ${isWikiFullscreen && activeSection === 'wiki' ? 'hidden lg:block lg:w-16' : ''}`} collapsible="icon">
          <SidebarContent className="bg-transparent">
            <div className="p-6">
              <div className="group-data-[collapsible=icon]:hidden">
                <IallaLogo size="md" />
                <p className="text-sm text-gray-500 mt-3 font-light">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <div className="hidden group-data-[collapsible=icon]:flex justify-center">
                <IallaLogo size="sm" showText={false} />
              </div>
            </div>
            
            <SidebarGroup className="px-3">
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2">Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        className={`
                          rounded-xl transition-all duration-200 px-3 py-2.5
                          ${activeSection === item.id 
                            ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 font-medium shadow-sm border border-purple-100/50' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                        `}
                      >
                        <item.icon className={`mr-3 h-4 w-4 ${activeSection === item.id ? 'text-purple-600' : ''}`} strokeWidth={1.5} />
                        <span className="text-sm">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-6 space-y-2">
              <SidebarMenuButton
                onClick={() => setActiveSection('settings')}
                className={`
                  rounded-xl transition-all duration-200 px-3 py-2.5
                  ${activeSection === 'settings' 
                    ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'}
                `}
              >
                <Settings className="mr-3 h-4 w-4" strokeWidth={1.5} />
                <span className="text-sm">Paramètres</span>
              </SidebarMenuButton>
              
              <SidebarMenuButton 
                onClick={logout} 
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 px-3 py-2.5"
              >
                <LogOut className="mr-3 h-4 w-4" strokeWidth={1.5} />
                <span className="text-sm">Déconnexion</span>
              </SidebarMenuButton>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 bg-gradient-to-br from-white via-gray-50/30 to-white">
          <header className={`h-16 border-b border-gray-100 bg-white/70 backdrop-blur-md flex items-center justify-between px-8 ${isWikiFullscreen && activeSection === 'wiki' ? 'hidden' : ''}`}>
            <div className="flex items-center">
              <SidebarTrigger className="text-gray-600 hover:text-gray-900" />
              <div className="ml-4">
                <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight">
                  {activeSection === 'start' ? 'Démarrer un projet' :
                   activeSection === 'templates' ? 'Templates' :
                   activeSection === 'projects' ? 'Mes projets' :
                   activeSection === 'calc' ? 'Calendrier Calc' :
                   activeSection === 'planning' ? 'Planning' :
                   activeSection === 'wiki' ? 'Wiki' :
                   activeSection === 'drive' ? 'Drive' :
                   activeSection === 'kanban' ? 'Kanban' :
                   activeSection === 'messages' ? 'Messages' :
                   activeSection === 'invoices' ? 'Factures' :
                   activeSection === 'settings' ? 'Paramètres' :
                   'Tableau de bord'}
                </h1>
                <p className="text-sm text-gray-500 font-light">
                  Bienvenue {user?.firstName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200/50 px-3 py-1 rounded-full text-xs font-medium">
                Client
              </Badge>
            </div>
          </header>
          
          <div className={isWikiFullscreen && activeSection === 'wiki' ? "" : "p-6"}>
            {renderContent()}
          </div>
        </main>

        {/* Modal always rendered outside of sections */}
        <CreateProjectModal
          isOpen={isCreateOpen}
          onClose={() => {
            console.log('Modal closing...');
            setIsCreateOpen(false);
          }}
          onProjectCreated={(projectId) => {
            refreshProjects();
            // Naviguer vers ReactFlow pour configurer les équipes
            navigate(`/project/${projectId}`);
          }}
        />

        {/* Dialog de suppression/archivage */}
        {projectToDelete && (
          <DeleteProjectDialog
            isOpen={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false);
              setProjectToDelete(null);
            }}
            project={projectToDelete}
            onProjectDeleted={refreshProjects}
            onProjectArchived={refreshProjects}
          />
        )}
      </div>
    </SidebarProvider>
  );
};

export default ClientDashboard;
