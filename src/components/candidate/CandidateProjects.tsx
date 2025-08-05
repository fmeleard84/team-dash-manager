import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  resourceProfile: string;
}

const CandidateProjects = () => {
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentCandidate();
  }, []);

  useEffect(() => {
    if (currentCandidateId) {
      fetchNotifications();
    }
  }, [currentCandidateId]);

  const fetchCurrentCandidate = async () => {
    try {
      const candidateAuth = localStorage.getItem('candidate-auth');
      if (!candidateAuth) {
        toast.error('Non authentifié');
        return;
      }

      const authData = JSON.parse(candidateAuth);
      
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', authData.email)
        .single();

      if (error) {
        console.error('Error fetching candidate:', error);
        return;
      }

      setCurrentCandidateId(data.id);
    } catch (error) {
      console.error('Error:', error);
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
              .single(),
            supabase
              .from('hr_resource_assignments')
              .select(`
                hr_profiles (
                  name
                )
              `)
              .eq('id', notification.resource_assignment_id)
              .single()
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

  const handleViewDetails = (notification: ProjectNotification) => {
    setSelectedProject({
      id: notification.project_id,
      title: notification.projects.title,
      description: notification.projects.description,
      project_date: notification.projects.project_date,
      resourceProfile: notification.hr_resource_assignments.hr_profiles.name
    });
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
        // Refresh notifications
        await fetchNotifications();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (isLoading) {
    return <div className="p-6">Chargement...</div>;
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
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground">{selectedProject.description}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Poste</h4>
              <Badge variant="secondary">{selectedProject.resourceProfile}</Badge>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Date du projet</h4>
              <p className="text-muted-foreground">{formatDate(selectedProject.project_date)}</p>
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
      
      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Aucun nouveau projet disponible</p>
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
    </div>
  );
};

export default CandidateProjects;