import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Check, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    due_date?: string | null;
    client_budget?: number | null;
  };
  hr_resource_assignments: {
    hr_profiles: {
      name: string;
    };
    expertises?: string[];
    languages?: string[];
    seniority?: string;
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
  expertises?: string[];
  languages?: string[];
  seniority?: string | null;
  files?: { name: string; size: number; url: string; downloadUrl?: string }[];
}

const CandidateProjects = () => {
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [acceptedProjects, setAcceptedProjects] = useState<any[]>([]);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
  const [nextcloudLinks, setNextcloudLinks] = useState<Record<string, string>>({});
  const [projectsData, setProjectsData] = useState<{ [key: string]: any }>({});
  const { user } = useAuth();
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
        // Removed annoying success toast that appears every time
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
      // First, get the list of already booked resource assignments
      const { data: bookedAssignments, error: bookedError } = await supabase
        .from('project_bookings')
        .select('resource_assignment_id')
        .eq('status', 'accepted');

      if (bookedError) {
        console.error('Error fetching booked assignments:', bookedError);
        return;
      }

      const bookedAssignmentIds = (bookedAssignments || []).map(b => b.resource_assignment_id);

      // Fetch contextualized notifications with all necessary data
      // Only exclude notifications for specific resource assignments that are already booked
      let query = supabase
        .from('candidate_notifications')
        .select(`
          id,
          project_id,
          resource_assignment_id,
          title,
          description,
          status,
          created_at,
          profile_type,
          required_seniority,
          required_expertises,
          required_languages,
          calculated_price,
          projects (
            title,
            description,
            project_date,
            due_date,
            client_budget
          )
        `)
        .eq('candidate_id', currentCandidateId)
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

      // Filter out notifications for already booked assignments
      if (bookedAssignmentIds.length > 0) {
        query = query.not('resource_assignment_id', 'in', `(${bookedAssignmentIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Transform notifications to use contextualized data
      const enrichedNotifications = (data || [])
        .map((notification) => ({
        ...notification,
        // Use contextualized resource assignment data specific to this candidate
        hr_resource_assignments: {
          hr_profiles: {
            name: notification.profile_type || ''
          },
          expertises: notification.required_expertises || [],
          languages: notification.required_languages || [],
          seniority: notification.required_seniority,
          calculated_price: notification.calculated_price
        }
       }));

      setNotifications(enrichedNotifications);

      // Fetch detailed project data for notifications
      if (enrichedNotifications && enrichedNotifications.length > 0) {
        const projectIds = enrichedNotifications.map(n => n.project_id).filter(Boolean);
        if (projectIds.length > 0) {
          await fetchProjectsDetails(projectIds);
        }
      }
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
      headers: {
        'x-keycloak-email': user?.profile?.email || '',
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
        expertises: p.expertises || notification.hr_resource_assignments.expertises || [],
        languages: p.languages || notification.hr_resource_assignments.languages || [],
        seniority: p.seniority || notification.hr_resource_assignments.seniority || null,
        files: p.files || []
      });
    } else {
      // fallback to local enrichment
      setSelectedProject({
        id: notification.project_id,
        title: notification.projects.title,
        description: notification.projects.description,
        project_date: notification.projects.project_date,
        resourceProfile: notification.hr_resource_assignments.hr_profiles.name,
        expertises: notification.hr_resource_assignments.expertises || [],
        languages: notification.hr_resource_assignments.languages || [],
        seniority: notification.hr_resource_assignments.seniority || null,
        files: []
      });
    }
  } catch (e) {
    console.error('Erreur chargement détails projet:', e);
    toast.error("Impossible de charger les détails du projet");
  }
};

const handleViewAcceptedProject = async (booking: any, projectData: any) => {
  try {
    const { data, error } = await supabase.functions.invoke('project-details', {
      body: {
        action: 'get_candidate_project_details',
        projectId: booking.project_id,
        resourceAssignmentId: booking.resource_assignment_id,
      },
      headers: {
        'x-keycloak-email': user?.profile?.email || '',
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
        resourceProfile: p.resourceProfile || booking.hr_resource_assignments?.hr_profiles?.name,
        expertises: p.expertises || projectData.expertises || [],
        languages: p.languages || projectData.languages || [],
        seniority: p.seniority || projectData.seniority || null,
        files: p.files || []
      });
    } else {
      // fallback to enriched data
      setSelectedProject({
        id: booking.project_id,
        title: booking.projects?.title || '',
        description: booking.projects?.description || '',
        project_date: booking.projects?.project_date || '',
        due_date: booking.projects?.due_date || null,
        client_budget: booking.projects?.client_budget || null,
        resourceProfile: booking.hr_resource_assignments?.hr_profiles?.name || '',
        expertises: projectData.expertises || [],
        languages: projectData.languages || [],
        seniority: projectData.seniority || null,
        files: projectData.files || []
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
      // Mark notification as refused for this specific candidate
      const { error } = await supabase
        .from('candidate_notifications')
        .update({ status: 'refused' })
        .eq('resource_assignment_id', notification.resource_assignment_id)
        .eq('candidate_id', currentCandidateId);

      if (error) throw error;

      toast.success('Mission refusée');
      // Refresh notifications to remove the refused one
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
        projects!inner (
          id,
          title,
          description,
          project_date,
          due_date,
          client_budget,
          status
        ),
        hr_resource_assignments!inner (
          hr_profiles!inner (
            name
          )
        )
      `)
      .eq('candidate_id', currentCandidateId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Séparer les projets en pause (acceptés) et actifs (en cours)
    const allProjects = data || [];
    console.log('All accepted projects from DB:', allProjects);
    const acceptedOnly = allProjects.filter((p: any) => p.projects?.status === 'pause');
    const activeOnly = allProjects.filter((p: any) => p.projects?.status === 'play');
    
    console.log('Filtered accepted projects (pause):', acceptedOnly);
    console.log('Filtered active projects (play):', activeOnly);
    
    setAcceptedProjects(acceptedOnly);
    setActiveProjects(activeOnly);

    // Récupérer les détails des projets
    const projectIds = allProjects
      .map((b: any) => b.project_id)
      .filter(Boolean);
      
    if (projectIds.length > 0) {
      await fetchProjectsDetails(projectIds);
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

const formatCurrency = (amount: number) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const calculateDuration = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 7) {
    return `${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    const remainingDays = diffInDays % 7;
    if (remainingDays === 0) {
      return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
    }
    return `${weeks} semaine${weeks > 1 ? 's' : ''} ${remainingDays} jour${remainingDays > 1 ? 's' : ''}`;
  } else {
    const months = diffInDays / 30;
    if (months < 2) {
      return `${Math.round(months * 10) / 10} mois`;
    }
    return `${Math.round(months * 10) / 10} mois`;
  }
};

const fetchProjectsDetails = async (projectIds: string[]) => {
  try {
    const { data, error } = await supabase.functions.invoke('project-details', {
      body: { 
        action: 'get_candidate_projects_details',
        projectIds 
      },
      headers: {
        'x-keycloak-email': user?.profile?.email || '',
      },
    });

    if (error) {
      console.error('Error fetching projects details:', error);
      return;
    }

    if (data?.projectsData && Array.isArray(data.projectsData)) {
      const projectsMap: { [key: string]: any } = {};
      data.projectsData.forEach((project: any) => {
        projectsMap[project.id] = {
          ...project,
          expertises: project.expertises || [],
          languages: project.languages || [],
          seniority: project.seniority || '',
          files: project.files || []
        };
      });
      setProjectsData(projectsMap);
    }
  } catch (error) {
    console.error('Error calling projects details function:', error);
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

  return (
    <>
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold">Mes projets</h2>
        
        <Tabs defaultValue="nouvelles" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="nouvelles">
              Nouvelles demandes ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="actifs">
              Projets en cours ({activeProjects.length})
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
                 {notifications.map((notification) => {
                   const projectData = projectsData[notification.project_id];
                   return (
                <Card key={notification.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    {/* Première ligne: Dates à gauche, Budget à droite */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{notification.projects?.project_date ? formatDate(notification.projects.project_date) : (projectData?.project_date ? formatDate(projectData.project_date) : '—')}</span>
                        <span>→</span>
                        <span>{notification.projects?.due_date ? formatDate(notification.projects.due_date) : (projectData?.due_date ? formatDate(projectData.due_date) : '—')}</span>
                        {notification.projects?.project_date && notification.projects?.due_date && (
                          <span className="text-blue-600 font-medium">
                            ({calculateDuration(notification.projects.project_date, notification.projects.due_date)})
                          </span>
                        )}
                        {!notification.projects?.project_date && projectData?.project_date && projectData?.due_date && (
                          <span className="text-blue-600 font-medium">
                            ({calculateDuration(projectData.project_date, projectData.due_date)})
                          </span>
                        )}
                      </div>
                      <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-white">
                        {notification.projects?.client_budget ? formatCurrency(notification.projects.client_budget) : (projectData?.client_budget ? formatCurrency(projectData.client_budget) : '—')}
                      </Badge>
                    </div>

                    {/* Titre */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold line-clamp-1">
                        {notification.projects?.title || notification.title || projectData?.title || 'Projet sans titre'}
                      </h3>
                      <Badge className="bg-blue-600 text-white ml-2 shrink-0">Nouveau</Badge>
                    </div>

                    {/* Description (4 premières lignes) */}
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {(notification.projects?.description || notification.description || projectData?.description || 'Aucune description disponible')?.split('\n').slice(0, 4).join('\n')}
                    </p>
                    
                    {/* Compétences sur une ligne */}
                    {(notification.hr_resource_assignments?.expertises || projectData?.expertises) && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Compétences:</span>
                        {(notification.hr_resource_assignments?.expertises || projectData?.expertises || []).map((expertise: string) => (
                          <Badge key={expertise} variant="secondary" className="text-xs">
                            {expertise}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Langues sur une ligne */}
                    {(notification.hr_resource_assignments?.languages || projectData?.languages) && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Langues:</span>
                        {(notification.hr_resource_assignments?.languages || projectData?.languages || []).map((language: string) => (
                          <Badge key={language} variant="outline" className="text-xs">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex gap-2 pt-2">
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
                   );
                 })}
               </div>
            )}
          </TabsContent>

          <TabsContent value="actifs" className="space-y-4">
            {activeProjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun projet en cours</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {activeProjects.map((booking) => (
                  <Card key={booking.id} className="hover:shadow-md transition-shadow border-green-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{booking.projects?.title || 'Projet sans titre'}</CardTitle>
                        <Badge variant="default" className="bg-green-600">En cours</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {booking.projects?.description || 'Aucune description disponible'}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Poste:</span>
                          <Badge variant="secondary">
                            {booking.hr_resource_assignments?.hr_profiles?.name || 'Non spécifié'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Date de début:</span>
                          <span className="text-sm">{booking.projects?.project_date ? formatDate(booking.projects.project_date) : 'Non spécifiée'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Fin prévue:</span>
                          <span className="text-sm">{booking.projects?.due_date ? formatDate(booking.projects.due_date) : 'Non spécifiée'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Budget:</span>
                          <Badge variant="outline">
                            {formatCurrency(booking.projects?.client_budget)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/planning?project=${booking.project_id}`, '_blank')}
                        >
                          📅 Planning
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/kanban?project_id=${booking.project_id}`, '_blank')}
                        >
                          📋 Kanban
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/drive?project=${booking.project_id}`, '_blank')}
                        >
                          📁 Drive
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/messages?project=${booking.project_id}`, '_blank')}
                        >
                          💬 Messages
                        </Button>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                          onClick={async () => {
                            const title = booking.projects?.title || 'Projet';
                            try {
                              const { data } = await supabase.functions.invoke('project-details', {
                                body: { 
                                  action: 'get_candidate_nextcloud_links',
                                  projectId: booking.project_id 
                                }
                              });
                              if (data?.success && data?.url) {
                                window.open(data.url, '_blank');
                              }
                            } catch (error) {
                              console.error('Error opening Nextcloud:', error);
                            }
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Accéder à l'espace collaboratif
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
                {acceptedProjects.map((booking) => {
                  const projectData = projectsData[booking.project_id] || {};
                  return (
                  <Card key={booking.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold">{booking.projects?.title || 'Projet sans titre'}</CardTitle>
                        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-white">
                          {formatCurrency(booking.projects?.client_budget)}
                        </Badge>
                      </div>
                    </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {booking.projects?.description || 'Aucune description disponible'}
            </p>
            
            {/* Skills and seniority on same line */}
            <div className="flex flex-wrap gap-2">
              {projectData.expertises?.map((expertise: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {expertise}
                </Badge>
              ))}
              {projectData.languages?.map((language: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs bg-blue-50">
                  {language}
                </Badge>
              ))}
              {projectData.seniority && (
                <Badge variant="secondary" className="text-xs">
                  {projectData.seniority}
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Fin prévue:</span>
                <span className="text-sm">{booking.projects?.due_date ? formatDate(booking.projects.due_date) : 'Non spécifiée'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Budget estimé:</span>
                <Badge variant="outline">
                  {formatCurrency(booking.projects?.client_budget)}
                </Badge>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleViewAcceptedProject(booking, projectData)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Voir le détail
              </Button>
            </div>

          </CardContent>
        </Card>
                  );
                })}
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

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">{selectedProject?.title}</DialogTitle>
              <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-white">
                {formatCurrency(selectedProject?.client_budget)}
              </Badge>
            </div>
            {selectedProject?.description && (
              <DialogDescription className="text-base">
                {selectedProject.description}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6">

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
                  <h4 className="font-semibold mb-2">Poste</h4>
                  <Badge variant="secondary">{selectedProject.resourceProfile}</Badge>
                </div>
              </div>

              {/* Skills, languages and seniority on same line */}
              {(selectedProject.expertises?.length || selectedProject.languages?.length || selectedProject.seniority) && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.expertises?.map((expertise, idx) => (
                      <Badge key={idx} variant="outline">
                        {expertise}
                      </Badge>
                    ))}
                    {selectedProject.languages?.map((language, idx) => (
                      <Badge key={idx} variant="outline" className="bg-blue-50">
                        {language}
                      </Badge>
                    ))}
                    {selectedProject.seniority && (
                      <Badge variant="secondary">
                        {selectedProject.seniority}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Project files */}
              <div>
                <h4 className="font-semibold mb-2">Fichiers joints</h4>
                {selectedProject.files?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProject.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            📄
                          </div>
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = file.downloadUrl || file.url;
                              link.download = file.name;
                              link.target = '_blank';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun fichier joint pour le moment
                  </p>
                )}
              </div>

              {(() => {
                const notification = notifications.find(n => n.project_id === selectedProject.id);
                return notification && (
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
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

};

export default CandidateProjects;