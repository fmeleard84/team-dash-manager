import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Check, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useKeycloakAuth } from "@/contexts/KeycloakAuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProjectNotification {
  id: string;
  project_id: string;
  resource_assignment_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  projects: {
    title: string;
    description: string;
    project_date: string;
  };
  hr_resource_assignments: {
    hr_profiles: {
      name: string;
    };
  };
}

interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  project_date: string;
  due_date?: string | null;
  client_budget?: number | null;
  resourceProfile: string;
}

const CandidateProjects = () => {
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [acceptedProjects, setAcceptedProjects] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
  const [nextcloudLinks, setNextcloudLinks] = useState<Record<string, string>>({});
  const { user } = useKeycloakAuth();
  useEffect(() => {
    fetchCurrentCandidate();
  }, []);

  useEffect(() => {
    if (currentCandidateId) {
      fetchNotifications();
      fetchAcceptedProjects();
      fetchCompletedProjects();
    }
  }, [currentCandidateId]);

  // Realtime updates for notifications
  useEffect(() => {
    if (!currentCandidateId) return;
    const channel = supabase
      .channel(`candidate-notifs-${currentCandidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_notifications',
          filter: `candidate_id=eq.${currentCandidateId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCandidateId]);

  const fetchCurrentCandidate = async () => {
    try {
      if (!user?.profile?.email) {
        setIsLoading(false);
        return;
      }

      const { data: candidate, error } = await supabase
        .from('candidate_profiles')
        .select('id, first_name, last_name, email')
        .eq('email', user.profile.email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching candidate:', error);
        toast.error('Erreur lors de la récupération du candidat');
        return;
      }

      if (candidate) {
        setCurrentCandidateId(candidate.id);
        toast.success(`Connecté en tant que ${candidate.first_name} ${candidate.last_name}`);
      } else {
        toast.info("Aucun profil candidat trouvé pour votre compte. Veuillez vérifier votre email ou contacter un administrateur.");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('candidate_notifications')
        .select(`
          id,
          project_id,
          resource_assignment_id,
          title,
          description,
          status,
          created_at
        `)
        .eq('candidate_id', currentCandidateId)
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Fetch additional project and resource data separately
      const enrichedNotifications = await Promise.all(
        (data || []).map(async (notification) => {
          const [projectData, resourceData] = await Promise.all([
            supabase
              .from('projects')
              .select('title, description, project_date')
              .eq('id', notification.project_id)
              .maybeSingle(),
            supabase
              .from('hr_resource_assignments')
              .select(`
                hr_profiles (
                  name
                )
              `)
              .eq('id', notification.resource_assignment_id)
              .maybeSingle()
          ]);

          return {
            ...notification,
            projects: projectData.data || { title: '', description: '', project_date: '' },
            hr_resource_assignments: resourceData.data || { hr_profiles: { name: '' } }
          };
        })
      );

      setNotifications(enrichedNotifications);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

const handleViewDetails = async (notification: ProjectNotification) => {
  try {
    const { data, error } = await supabase.functions.invoke('project-details', {
      body: {
        action: 'get_candidate_project_details',
        projectId: notification.project_id,
        resourceAssignmentId: notification.resource_assignment_id,
      },
    });
    if (error) throw error;
    if (data?.success && data?.project) {
      const p = data.project;
      setSelectedProject({
        id: p.id,
        title: p.title,
        description: p.description || '',
        project_date: p.project_date,
        due_date: p.due_date ?? null,
        client_budget: p.client_budget ?? null,
        resourceProfile: p.resourceProfile || notification.hr_resource_assignments.hr_profiles.name,
      });
    } else {
      // fallback to local enrichment
      setSelectedProject({
        id: notification.project_id,
        title: notification.projects.title,
        description: notification.projects.description,
        project_date: notification.projects.project_date,
        resourceProfile: notification.hr_resource_assignments.hr_profiles.name,
      });
    }
  } catch (e) {
    console.error('Erreur chargement détails projet:', e);
    toast.error("Impossible de charger les détails du projet");
  }
};

  const handleAcceptMission = async (notification: ProjectNotification) => {
    try {
      const { data, error } = await supabase.functions.invoke('resource-booking', {
        body: {
          projectId: notification.project_id,
          candidateId: currentCandidateId,
          resourceAssignmentId: notification.resource_assignment_id,
          action: 'accept_mission'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        // Refresh all project lists
        await fetchNotifications();
        await fetchAcceptedProjects();
        setSelectedProject(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error accepting mission:', error);
      toast.error('Erreur lors de l\'acceptation de la mission');
    }
  };

  const handleRefuseMission = async (notification: ProjectNotification) => {
    try {
      // Mark notification as read (refused)
      const { error } = await supabase
        .from('candidate_notifications')
        .update({ status: 'read' })
        .eq('id', notification.id);

      if (error) throw error;

      toast.success('Mission refusée');
      // Refresh notifications
      await fetchNotifications();
      setSelectedProject(null);
    } catch (error) {
      console.error('Error refusing mission:', error);
      toast.error('Erreur lors du refus de la mission');
    }
  };

const fetchAcceptedProjects = async () => {
  try {
    const { data, error } = await supabase
      .from('project_bookings')
      .select(`
        id,
        status,
        created_at,
        project_id,
        resource_assignment_id,
        projects (
          id,
          title,
          description,
          project_date,
          status
        ),
        hr_resource_assignments (
          hr_profiles (
            name
          )
        )
      `)
      .eq('candidate_id', currentCandidateId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Conserver toutes les lignes, même si les relations imbriquées sont nulles (pas de FK)
    setAcceptedProjects(data || []);

    // Récupérer les liens Nextcloud pour ces projets via la fonction (utilise service role)
    const projectIds = (data || [])
      .map((b: any) => b.projects?.id || b.project_id)
      .filter(Boolean);
    if (projectIds.length > 0) {
      try {
        const { data: linksResp, error: linksErr } = await supabase.functions.invoke('project-details', {
          body: {
            action: 'get_candidate_nextcloud_links',
            projectIds,
          },
        });
        if (!linksErr && linksResp?.success && linksResp.links) {
          setNextcloudLinks(linksResp.links as Record<string, string>);
        }
      } catch (e) {
        console.error('Error fetching Nextcloud links via function:', e);
      }
    }
  } catch (error) {
    console.error('Error fetching accepted projects:', error);
  }
};

  const fetchCompletedProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('project_bookings')
        .select(`
          id,
          status,
          created_at,
          projects (
            id,
            title,
            description,
            project_date,
            status
          ),
          hr_resource_assignments (
            hr_profiles (
              name
            )
          )
        `)
        .eq('candidate_id', currentCandidateId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out bookings with null projects or resource assignments
      const validBookings = (data || []).filter((booking: any) => 
        booking.projects && 
        booking.hr_resource_assignments && 
        booking.hr_resource_assignments.hr_profiles
      );
      
      setCompletedProjects(validBookings);
    } catch (error) {
      console.error('Error fetching completed projects:', error);
    }
  };

const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR');
};

const formatCurrency = (n?: number | null) => {
  if (typeof n !== 'number') return '—';
  try {
    return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  } catch {
    return `${n}€`;
  }
};

  if (isLoading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!currentCandidateId) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold">Mes projets</h2>
        <Alert>
          <AlertTitle>Aucun profil candidat associé</AlertTitle>
          <AlertDescription>
            Aucun profil candidat n'a été trouvé pour l'email {user?.profile?.email || 'inconnu'}.<br />
            Vérifiez que vous êtes connecté avec le bon compte, ou contactez un administrateur.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={fetchCurrentCandidate}>Rafraîchir</Button>
      </div>
    );
  }

  if (selectedProject) {
    const notification = notifications.find(n => n.project_id === selectedProject.id);
    
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedProject(null)}>
            ← Retour
          </Button>
          <h2 className="text-2xl font-bold">Détail du projet</h2>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{selectedProject.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Description du projet</h4>
              <p className="text-muted-foreground">{selectedProject.description || '—'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Date de début</h4>
                <p className="text-muted-foreground">{formatDate(selectedProject.project_date)}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Délai demandé (date cible)</h4>
                <p className="text-muted-foreground">{formatDate(selectedProject.due_date || '')}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Budget global</h4>
                <p className="text-muted-foreground">{formatCurrency(selectedProject.client_budget)}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Poste</h4>
                <Badge variant="secondary">{selectedProject.resourceProfile}</Badge>
              </div>
            </div>

            {notification && (
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={() => handleAcceptMission(notification)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accepter la mission
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleRefuseMission(notification)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Mes projets</h2>
      
      <Tabs defaultValue="nouvelles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="nouvelles">
            Nouvelles demandes ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="acceptes">
            Projets acceptés ({acceptedProjects.length})
          </TabsTrigger>
          <TabsTrigger value="termines">
            Projets terminés ({completedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nouvelles" className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucune nouvelle demande</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{notification.title}</CardTitle>
                      <Badge variant="default">Nouveau</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {notification.description}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Poste:</span>
                      <Badge variant="secondary">
                        {notification.hr_resource_assignments.hr_profiles.name}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(notification)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir le détail
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefuseMission(notification)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Refuser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="acceptes" className="space-y-4">
          {acceptedProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun projet accepté</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {acceptedProjects.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{booking.projects?.title || 'Projet sans titre'}</CardTitle>
                      <Badge variant="default">Accepté</Badge>
                    </div>
                  </CardHeader>
<CardContent className="space-y-4">
  <p className="text-sm text-muted-foreground">
    {booking.projects?.description || 'Aucune description disponible'}
  </p>
  
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium">Poste:</span>
    <Badge variant="secondary">
      {booking.hr_resource_assignments?.hr_profiles?.name || 'Non spécifié'}
    </Badge>
  </div>
  
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium">Date du projet:</span>
    <span className="text-sm">{booking.projects?.project_date ? formatDate(booking.projects.project_date) : 'Non spécifiée'}</span>
  </div>

  {booking.projects?.id && nextcloudLinks[booking.projects.id] && (
    <div className="pt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(nextcloudLinks[booking.projects.id], '_blank')}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Accéder à l’espace Nextcloud
      </Button>
    </div>
  )}
</CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="termines" className="space-y-4">
          {completedProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun projet terminé</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {completedProjects.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{booking.projects?.title || 'Projet sans titre'}</CardTitle>
                      <Badge variant="secondary">Terminé</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {booking.projects?.description || 'Aucune description disponible'}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Poste:</span>
                      <Badge variant="secondary">
                        {booking.hr_resource_assignments?.hr_profiles?.name || 'Non spécifié'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Date du projet:</span>
                      <span className="text-sm">{booking.projects?.project_date ? formatDate(booking.projects.project_date) : 'Non spécifiée'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CandidateProjects;