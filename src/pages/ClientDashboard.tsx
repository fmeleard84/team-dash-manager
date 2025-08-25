import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CalendarClock,
  Cloud,
  MessageSquare,
  Rocket,
  Plus,
  Eye,
  Network,
  Users,
  Activity
} from "lucide-react";
import { IallaLogo } from "@/components/IallaLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ClientActiveTracking } from '@/components/time-tracking/ClientActiveTracking';
import { useTemplates } from "@/hooks/useTemplates";
import SharedPlanningView from "@/components/shared/SharedPlanningView";
import DriveView from "@/components/client/DriveView";
import CreateProjectModal from "@/components/CreateProjectModal";
import { ProjectCard } from "@/components/ProjectCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientKanbanView from "@/components/client/ClientKanbanView";
import { EnhancedMessageSystem } from "@/components/shared/EnhancedMessageSystem";
import { InvoiceList } from "@/components/invoicing/InvoiceList";
import { KickoffDialog } from "@/components/KickoffDialog";
import { useProjectOrchestrator } from "@/hooks/useProjectOrchestrator";
import { useRealtimeProjectsFixed } from "@/hooks/useRealtimeProjectsFixed";
import ClientMetricsDashboard from "./ClientMetricsDashboard";

const ClientDashboard = () => {
const [searchParams, setSearchParams] = useSearchParams();
const [activeSection, setActiveSection] = useState('start');
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const { user, logout } = useAuth();
const navigate = useNavigate();
const { toast } = useToast();

// Projects state
type DbProject = { id: string; title: string; description?: string | null; project_date: string; due_date?: string | null; client_budget?: number | null; status: string };
const [projects, setProjects] = useState<DbProject[]>([]);
const [resourceAssignments, setResourceAssignments] = useState<any[]>([]);
const [isCreateOpen, setIsCreateOpen] = useState(false);

// Debug useEffect
useEffect(() => {
  console.log('isCreateOpen changed to:', isCreateOpen);
}, [isCreateOpen]);
const [isCreating, setIsCreating] = useState(false);
const [selectedKanbanProjectId, setSelectedKanbanProjectId] = useState<string>("");
const [selectedMessagesProjectId, setSelectedMessagesProjectId] = useState<string>("");
const [kickoffDialogOpen, setKickoffDialogOpen] = useState(false);
const [kickoffProject, setKickoffProject] = useState<{ id: string; title: string } | null>(null);
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
  if (section && ['start', 'dashboard', 'templates', 'projects', 'planning', 'drive', 'kanban', 'messages', 'invoices', 'settings'].includes(section)) {
    setActiveSection(section);
  }
}, [searchParams]);

useEffect(() => {
  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('projects')
      .select('id,title,description,project_date,due_date,client_budget,status')
      .eq('owner_id', user.id) // CRITICAL: Filter by owner to prevent data leak
      .order('created_at', { ascending: false });
    if (error) {
      console.error('load projects', error);
    } else {
      setProjects((data || []) as DbProject[]);
      
      // Only set default project if we have active projects (status = 'play')
      const activeProjects = (data || []).filter(p => p.status === 'play');
      if (!selectedKanbanProjectId && activeProjects.length > 0) setSelectedKanbanProjectId(activeProjects[0].id);
      if (!selectedMessagesProjectId && activeProjects.length > 0) setSelectedMessagesProjectId(activeProjects[0].id);
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
        booking_status,
        hr_profiles (
          name
        ),
        candidate_profiles (
          first_name,
          last_name,
          profile_title
        )
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
  const { data } = await supabase
    .from('projects')
    .select('id,title,description,project_date,due_date,client_budget,status')
    .eq('owner_id', user.id) // CRITICAL: Filter by owner to prevent data leak
    .order('created_at', { ascending: false });
  setProjects((data || []) as DbProject[]);
  await loadResourceAssignments();
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

const onToggleStatus = async (id: string, status: string) => {
  const { error } = await supabase.from('projects').update({ status }).eq('id', id);
  if (error) {
    console.error('toggle status error', error);
    toast({ title: 'Erreur', description: 'Mise à jour du statut échouée' });
  } else {
    await refreshProjects();
  }
};

const onStartProject = async (project: { id: string; title: string; kickoffISO?: string }) => {
  if (project.kickoffISO) {
    // Direct start with kickoff - setup the project
    try {
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
  } else {
    // Legacy flow - open dialog
    setKickoffProject(project);
    setKickoffDialogOpen(true);
  }
};

const handleKickoffConfirm = async (kickoffISO: string) => {
  if (!kickoffProject) return;
  
  try {
    // Use the project orchestrator which already handles event creation
    const success = await setupProject(kickoffProject.id, kickoffISO);
    if (!success) {
      toast({ 
        title: "Erreur", 
        description: "Échec de la configuration du projet." 
      });
      return;
    }

    setKickoffDialogOpen(false);
    setKickoffProject(null);
    await refreshProjects();
    toast({ 
      title: "Projet configuré avec succès!", 
      description: "Planning, Kanban, Drive, notifications créés et équipe invitée au kickoff." 
    });
  } catch (error) {
    console.error('Error in handleKickoffConfirm:', error);
    toast({ 
      title: "Erreur", 
      description: "Une erreur s'est produite lors de la configuration." 
    });
  }
};

const onDeleteProject = async (id: string) => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) {
    console.error('delete project error', error);
    toast({ title: 'Erreur', description: 'Suppression du projet échouée' });
  } else {
    toast({ title: 'Projet supprimé' });
    await refreshProjects();
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
    // Support both old 'booké' status and new 'accepted' status
    const allResourcesBooked = assignments.length > 0 && assignments.every(assignment => 
      assignment.booking_status === 'booké' || assignment.booking_status === 'accepted'
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

const menuItems = [
  { id: 'start', label: 'Commencer', icon: Rocket },
  { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
  { id: 'projects', label: 'Mes projets', icon: FolderOpen },
  ...(hasActiveProjects ? [
    { id: 'planning', label: 'Planning', icon: CalendarClock },
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
          <div className="min-h-[calc(100vh-12rem)] bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
            <div className="w-full max-w-4xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <IallaLogo size="lg" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                  Créez votre 
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {" "}équipe externe
                  </span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Choisissez comment vous souhaitez démarrer votre nouveau projet
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mt-12">
                <Card className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg">
                  <CardHeader className="space-y-4 pb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Projet sur-mesure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-6">
                      Créez un projet personnalisé en définissant vos propres besoins et contraintes.
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Button clicked, opening modal...');
                        console.log('isCreateOpen before:', isCreateOpen);
                        setIsCreateOpen(true);
                        console.log('setIsCreateOpen(true) called');
                      }}
                    >
                      Créer un projet
                    </Button>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg cursor-pointer" 
                      onClick={() => setActiveSection('templates')}>
                  <CardHeader className="space-y-4 pb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Rocket className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Templates prêts à l'emploi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-6">
                      Utilisez nos modèles pré-configurés pour démarrer rapidement avec une équipe optimisée.
                    </p>
                    <Button variant="outline" className="w-full border-2">
                      Explorer les templates
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-16 text-center">
                <p className="text-gray-500 text-sm">
                  Besoin d'aide ? Notre équipe est là pour vous accompagner
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
                <h2 className="text-3xl font-bold">Vos futures équipes</h2>
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
          <div className="space-y-6">
            {/* Header avec design Ialla */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-white to-pink-50 border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10" />
              <div className="relative p-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FolderOpen className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Mes projets
                    </h2>
                    <p className="text-gray-600 mt-2 text-lg">
                      Gérez et suivez l'avancement de vos projets
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="nouveaux" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gradient-to-r from-purple-50 to-pink-50 p-1 rounded-xl border border-gray-200/50 shadow-sm mb-4">
                <TabsTrigger 
                  value="nouveaux" 
                  className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-purple-200 data-[state=active]:text-purple-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
                >
                  <span className="flex items-center gap-2">
                    Nouveaux projets
                    {nouveauxProjets.length > 0 && (
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {nouveauxProjets.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="attente-team" 
                  className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-purple-200 data-[state=active]:text-purple-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
                >
                  <span className="flex items-center gap-2">
                    Attente team
                    {projetsAttenteTeam.length > 0 && (
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {projetsAttenteTeam.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="en-pause" 
                  className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
                >
                  <span className="flex items-center gap-2">
                    En pause
                    {projetsEnPause.length > 0 && (
                      <span className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {projetsEnPause.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="en-cours" 
                  className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-green-200 data-[state=active]:text-green-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
                >
                  <span className="flex items-center gap-2">
                    En cours
                    {projetsEnCours.length > 0 && (
                      <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {projetsEnCours.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="termines" 
                  className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-purple-200 data-[state=active]:text-purple-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
                >
                  <span className="flex items-center gap-2">
                    Terminés
                    {projetsTermines.length > 0 && (
                      <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {projetsTermines.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="nouveaux" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {nouveauxProjets.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={{
                        id: p.id,
                        title: p.title,
                        description: p.description || undefined,
                        price: undefined,
                        date: p.project_date,
                        status: p.status,
                        clientBudget: p.client_budget ?? undefined,
                        dueDate: p.due_date ?? undefined,
                      }}
                      onStatusToggle={onToggleStatus}
                      onDelete={onDeleteProject}
                      onView={onViewProject}
                      onStart={onStartProject}
                      onEdit={refreshProjects}
                      refreshTrigger={refreshTrigger}
                    />
                  ))}
                  {nouveauxProjets.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Aucun nouveau projet
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="attente-team" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {projetsAttenteTeam.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={{
                        id: p.id,
                        title: p.title,
                        description: p.description || undefined,
                        price: undefined,
                        date: p.project_date,
                        status: p.status,
                        clientBudget: p.client_budget ?? undefined,
                        dueDate: p.due_date ?? undefined,
                      }}
                      onStatusToggle={onToggleStatus}
                      onDelete={onDeleteProject}
                      onView={onViewProject}
                      onStart={onStartProject}
                      onEdit={refreshProjects}
                      refreshTrigger={refreshTrigger}
                    />
                  ))}
                  {projetsAttenteTeam.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Aucun projet en attente de team
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="en-pause" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {projetsEnPause.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={{
                        id: p.id,
                        title: p.title,
                        description: p.description || undefined,
                        price: undefined,
                        date: p.project_date,
                        status: p.status,
                        clientBudget: p.client_budget ?? undefined,
                        dueDate: p.due_date ?? undefined,
                      }}
                      onStatusToggle={onToggleStatus}
                      onDelete={onDeleteProject}
                      onView={onViewProject}
                      onStart={onStartProject}
                      onEdit={refreshProjects}
                      refreshTrigger={refreshTrigger}
                    />
                  ))}
                  {projetsEnPause.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Aucun projet en pause
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="en-cours" className="space-y-6">
                {/* Active time tracking widget */}
                <ClientActiveTracking />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {projetsEnCours.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={{
                        id: p.id,
                        title: p.title,
                        description: p.description || undefined,
                        price: undefined,
                        date: p.project_date,
                        status: p.status,
                        clientBudget: p.client_budget ?? undefined,
                        dueDate: p.due_date ?? undefined,
                      }}
                      onStatusToggle={onToggleStatus}
                      onDelete={onDeleteProject}
                      onView={onViewProject}
                      onStart={onStartProject}
                      onEdit={refreshProjects}
                      refreshTrigger={refreshTrigger}
                    />
                  ))}
                  {projetsEnCours.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Aucun projet en cours
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="termines" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {projetsTermines.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={{
                        id: p.id,
                        title: p.title,
                        description: p.description || undefined,
                        price: undefined,
                        date: p.project_date,
                        status: p.status,
                        clientBudget: p.client_budget ?? undefined,
                        dueDate: p.due_date ?? undefined,
                      }}
                      onStatusToggle={onToggleStatus}
                      onDelete={onDeleteProject}
                      onView={onViewProject}
                      onStart={onStartProject}
                      onEdit={refreshProjects}
                      refreshTrigger={refreshTrigger}
                    />
                  ))}
                  {projetsTermines.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Aucun projet terminé
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        );
        
      case 'planning':
        return (
          <div className="space-y-4">
            {projetsEnCours.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Planning non disponible</h3>
                <p>Démarrez un projet pour accéder au planning partagé</p>
              </div>
            ) : (
              <SharedPlanningView mode="client" projects={projetsEnCours} />
            )}
          </div>
        );

      case 'drive':
        return (
          <div className="space-y-4">
            {projetsEnCours.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Espace de stockage non disponible</h3>
                <p>Démarrez un projet pour accéder aux fichiers partagés</p>
              </div>
            ) : (
              <DriveView />
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
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
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
      <div className="min-h-screen flex w-full">
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
                <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {activeSection === 'start' ? 'Démarrer un projet' :
                   activeSection === 'templates' ? 'Templates' :
                   activeSection === 'projects' ? 'Mes projets' :
                   activeSection === 'planning' ? 'Planning' :
                   activeSection === 'drive' ? 'Drive' :
                   activeSection === 'kanban' ? 'Kanban' :
                   activeSection === 'messages' ? 'Messages' :
                   activeSection === 'invoices' ? 'Factures' :
                   activeSection === 'settings' ? 'Paramètres' :
                   'Tableau de bord'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Bienvenue {user?.firstName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                Client
              </Badge>
            </div>
          </header>
          
          <div className="p-6">
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

        {/* Other dialogs */}
        <KickoffDialog
          open={kickoffDialogOpen}
          projectTitle={kickoffProject?.title || ""}
          onClose={() => {
            setKickoffDialogOpen(false);
            setKickoffProject(null);
          }}
          onConfirm={handleKickoffConfirm}
        />
      </div>
    </SidebarProvider>
  );
};

export default ClientDashboard;
