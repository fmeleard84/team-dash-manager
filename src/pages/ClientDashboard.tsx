import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  MessageSquare
} from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import PlanningView from "@/components/client/PlanningView";
import DriveView from "@/components/client/DriveView";
import CreateProjectModal from "@/components/CreateProjectModal";
import { ProjectCard } from "@/components/ProjectCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSystem } from "@/components/messages/MessageSystem";

const ClientDashboard = () => {
const [activeSection, setActiveSection] = useState('projects');
const { user, logout } = useAuth();
const navigate = useNavigate();
const { toast } = useToast();

// Projects state
type DbProject = { id: string; title: string; description?: string | null; project_date: string; due_date?: string | null; client_budget?: number | null; status: string };
const [projects, setProjects] = useState<DbProject[]>([]);
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [isCreating, setIsCreating] = useState(false);
const [selectedKanbanProjectId, setSelectedKanbanProjectId] = useState<string>("");
const [selectedMessagesProjectId, setSelectedMessagesProjectId] = useState<string>("");

useEffect(() => {
  const load = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id,title,description,project_date,due_date,client_budget,status')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('load projects', error);
    } else {
      setProjects((data || []) as DbProject[]);
      if (!selectedKanbanProjectId && data && data.length) setSelectedKanbanProjectId(data[0].id);
      if (!selectedMessagesProjectId && data && data.length) setSelectedMessagesProjectId(data[0].id);
    }
  };
  load();
}, []);

const refreshProjects = async () => {
  const { data } = await supabase
    .from('projects')
    .select('id,title,description,project_date,due_date,client_budget,status')
    .order('created_at', { ascending: false });
  setProjects((data || []) as DbProject[]);
};

const onViewProject = (id: string) => navigate(`/project/${id}`);

const onToggleStatus = async (id: string, status: string) => {
  const { error } = await supabase.from('projects').update({ status }).eq('id', id);
  if (error) {
    console.error('toggle status error', error);
    toast({ title: 'Erreur', description: 'Mise à jour du statut échouée' });
  } else {
    await refreshProjects();
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
    const raw = localStorage.getItem('keycloak_identity');
    const sub = raw ? (JSON.parse(raw)?.sub as string | undefined) : undefined;
    const insert = {
      title: data.title,
      description: data.description || null,
      project_date: data.project_date,
      due_date: data.due_date || null,
      client_budget: data.client_budget ?? null,
      status: 'pause',
      keycloak_user_id: sub,
      user_id: sub,
    } as any;

    const { data: inserted, error } = await supabase
      .from('projects')
      .insert(insert)
      .select('id')
      .single();

    if (error || !inserted) throw error;

    const projectId = inserted.id as string;

    if (data.file) {
      const path = `project/${projectId}/${data.file.name}`;
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, data.file, { upsert: true });
      if (upErr) {
        console.error('upload error', upErr);
        toast({ title: 'Upload échoué', description: data.file.name });
      }
    }

    toast({ title: 'Projet créé' });
    setIsCreateOpen(false);
    await refreshProjects();
    navigate(`/project/${projectId}`);
  } catch (e) {
    console.error('create project error', e);
    toast({ title: 'Erreur', description: 'Création du projet échouée' });
  } finally {
    setIsCreating(false);
  }
};
const menuItems = [
  { id: 'projects', label: 'Mes projets', icon: FolderOpen },
  { id: 'planning', label: 'Planning', icon: CalendarClock },
  { id: 'drive', label: 'Drive', icon: Cloud },
  { id: 'kanban', label: 'Tableau Kanban', icon: Kanban },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'invoices', label: 'Mes factures', icon: Receipt },
];

  const renderContent = () => {
    switch (activeSection) {
      case 'projects':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Mes projets</h2>
              <Button onClick={() => setIsCreateOpen(true)}>Créer un nouveau projet</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
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
                />
              ))}
            </div>

            <CreateProjectModal
              isOpen={isCreateOpen}
              onClose={() => setIsCreateOpen(false)}
              onCreateProject={handleCreateProject}
              isCreating={isCreating}
            />
          </div>
        );
        
      case 'planning':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Planning</h2>
            <PlanningView />
          </div>
        );

      case 'drive':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Drive</h2>
            <DriveView />
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Messages</h2>
            <div className="space-y-4">
              <div className="w-full md:w-80">
                <label className="text-sm font-medium">Projet</label>
                <Select value={selectedMessagesProjectId} onValueChange={setSelectedMessagesProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MessageSystem />
            </div>
          </div>
        );

      case 'invoices':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mes factures</h2>
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Facture #2024-INV-001</CardTitle>
                  <Badge variant="default">Payée</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Projet:</span>
                      <span>Refonte site web</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Montant:</span>
                      <span className="font-semibold">7 500€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Date:</span>
                      <span className="text-sm">15/01/2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Facture #2024-INV-002</CardTitle>
                  <Badge variant="outline">En attente</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Projet:</span>
                      <span>Application mobile</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Montant:</span>
                      <span className="font-semibold">12 500€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Date:</span>
                      <span className="text-sm">01/02/2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'kanban':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Tableau Kanban</h2>
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gestion de projet Kanban</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Projet</label>
                      <Select value={selectedKanbanProjectId} onValueChange={setSelectedKanbanProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un projet" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="text-muted-foreground">
                      Organisez vos tâches et suivez l'avancement de vos projets avec notre tableau Kanban interactif.
                    </p>

                    <Button 
                      onClick={() => selectedKanbanProjectId && navigate(`/kanban?project_id=${selectedKanbanProjectId}`)} 
                      className="w-full"
                      disabled={!selectedKanbanProjectId}
                    >
                      Ouvrir le tableau Kanban
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Boards récents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Projet de développement web</span>
                      <Badge variant="secondary">3 colonnes • 8 cartes</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Sprint Planning Q1</span>
                      <Badge variant="secondary">4 colonnes • 12 cartes</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
        <Sidebar className="w-64">
          <SidebarContent>
            <div className="p-4">
              <h3 className="font-semibold text-lg">Espace Client</h3>
              <p className="text-sm text-muted-foreground">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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

        <main className="flex-1">
          <header className="h-16 border-b flex items-center justify-between px-6">
            <div className="flex items-center">
              <SidebarTrigger />
              <div className="ml-4">
                <h1 className="text-xl font-semibold">Tableau de bord client</h1>
                <p className="text-sm text-muted-foreground">
                  Bienvenue {user?.firstName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline">Client</Badge>
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

export default ClientDashboard;
