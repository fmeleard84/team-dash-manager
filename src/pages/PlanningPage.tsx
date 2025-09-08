import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, Video, Users, Server, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SimpleScheduleCalendar } from '@/components/SimpleScheduleCalendar';
import { CreateEventDialog } from '@/components/CreateEventDialog';
import { ViewEventDialog } from '@/components/ViewEventDialog';
import { supabase } from '@/integrations/supabase/client';

interface PlanningPageProps {
  userType: 'client' | 'candidate';
  userEmail?: string;
  userName?: string;
  candidateId?: string;
}

const PlanningPage = ({ userType, userEmail, userName, candidateId }: PlanningPageProps) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showViewEvent, setShowViewEvent] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Charger les projets et événements
  useEffect(() => {
    loadProjects();
  }, [userType, candidateId]);

  // Realtime pour les événements
  useEffect(() => {
    if (!selectedProject) return;

    // Subscription pour les événements
    const eventChannel = supabase
      .channel(`project-events-${selectedProject.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_events',
          filter: `project_id=eq.${selectedProject.id}`
        },
        (payload) => {
          console.log('📡 Événement reçu:', payload);
          // Recharger les événements
          selectProject(selectedProject);
        }
      )
      .subscribe();

    // Subscription pour les participants
    const attendeesChannel = supabase
      .channel(`event-attendees-${selectedProject.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_event_attendees'
        },
        (payload) => {
          console.log('📡 Participant mis à jour:', payload);
          // Recharger les événements pour mettre à jour les participants
          selectProject(selectedProject);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventChannel);
      supabase.removeChannel(attendeesChannel);
    };
  }, [selectedProject]);

  const loadProjects = async () => {
    let projectsData;
    
    if (userType === 'client') {
      // Client: ses projets actifs
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'play')
        .order('created_at', { ascending: false });
      projectsData = data;
    } else {
      // Candidat: projets où il est accepté
      const { data } = await supabase
        .from('projects')
        .select(`
          *,
          hr_resource_assignments!inner(
            candidate_id,
            booking_status
          )
        `)
        .eq('status', 'play')
        .eq('hr_resource_assignments.candidate_id', candidateId)
        .eq('hr_resource_assignments.booking_status', 'accepted')
        .order('created_at', { ascending: false });
      projectsData = data;
    }
    
    if (projectsData) {
      setProjects(projectsData);
      if (projectsData.length > 0) {
        selectProject(projectsData[0]);
      }
    }
  };

  const selectProject = async (project: any) => {
    setSelectedProject(project);
    
    // Charger les événements du projet
    const { data: eventsData } = await supabase
      .from('project_events')
      .select('*')
      .eq('project_id', project.id)
      .order('start_at', { ascending: true });
    
    if (eventsData) {
      const formattedEvents = eventsData.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start_at,
        end: event.end_at,
        description: event.description,
        location: event.video_url
      }));
      setEvents(formattedEvents);
    }
    
    // Charger les membres de l'équipe depuis la base de données
    const members: any[] = [];
    
    // Récupérer le client (owner)
    const { data: projectData } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', project.id)
      .single();
    
    if (projectData?.owner_id) {
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('id, email, first_name, last_name, company_name')
        .eq('id', projectData.owner_id)
        .single();
      
      if (clientProfile) {
        members.push({
          email: clientProfile.email,
          name: `${clientProfile.first_name} ${clientProfile.last_name}`,
          role: 'client'
        });
      }
    }
    
    // Récupérer les candidats acceptés (mais pas celui qui consulte si c'est un candidat)
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        candidate_id,
        booking_status,
        candidate_profiles (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', project.id)
      .eq('booking_status', 'accepted');
    
    if (assignments) {
      assignments.forEach((assignment: any) => {
        if (assignment.candidate_profiles) {
          // Pour un candidat, ne pas s'afficher soi-même
          if (userType === 'candidate' && assignment.candidate_id === candidateId) {
            return;
          }
          members.push({
            email: assignment.candidate_profiles.email,
            name: `${assignment.candidate_profiles.first_name} ${assignment.candidate_profiles.last_name}`,
            role: 'resource'
          });
        }
      });
    }
    
    setTeamMembers(members);
  };

  // Fonction pour créer un événement kickoff de test (client uniquement)
  const createTestKickoffEvent = async () => {
    if (userType !== 'client') {
      toast({
        title: "Action non autorisée",
        description: "Seul le client peut créer un kickoff de test.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedProject) {
      toast({
        title: "Sélectionnez un projet",
        description: "Veuillez d'abord sélectionner un projet actif.",
        variant: "destructive"
      });
      return;
    }

    const kickoffDate = new Date();
    kickoffDate.setDate(kickoffDate.getDate() + 1);
    kickoffDate.setHours(14, 0, 0, 0);
    
    const { data, error } = await supabase.functions.invoke('project-kickoff', {
      body: {
        projectId: selectedProject.id,
        kickoffDate: kickoffDate.toISOString()
      }
    });
    
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le kickoff. Vérifiez la configuration.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Kickoff créé !",
        description: `Un événement kickoff a été créé pour ${selectedProject.title}`,
      });
      selectProject(selectedProject); // Recharger les données
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Planning & Calendrier</h1>
            <p className="text-gray-600">
              {userType === 'client' 
                ? 'Gérez vos rendez-vous et événements projet'
                : 'Consultez le planning partagé de vos projets'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Réunion Kickoff</h3>
              <p className="text-sm text-gray-600">Planifier le lancement</p>
            </div>
          </div>
          {userType === 'client' && (
            <Button 
              onClick={createTestKickoffEvent}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
            >
              Créer un kickoff test
            </Button>
          )}
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Point d'équipe</h3>
              <p className="text-sm text-gray-600">Réunion hebdomadaire</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{userType === 'client' ? 'Entretien' : 'Rendez-vous'}</h3>
              <p className="text-sm text-gray-600">{userType === 'client' ? 'Rencontrer un candidat' : 'Rendez-vous avec un membre'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Status de Schedule-X */}
      <Alert className="mb-6 border-emerald-200 bg-emerald-50">
        <Calendar className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-emerald-900">Planning Partagé du Projet</AlertTitle>
        <AlertDescription className="text-emerald-700">
          <div className="space-y-2 mt-2">
            <p>
              {userType === 'client' 
                ? 'Gérez les événements et réunions de vos projets actifs.'
                : 'Consultez les événements et réunions des projets auxquels vous participez.'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-medium">
                {userType === 'client' ? 'Vos projets actifs :' : 'Vos projets :'}
              </span>
              <select 
                className="px-3 py-1 rounded-md border border-emerald-300 bg-white text-sm"
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  if (project) selectProject(project);
                }}
              >
                {projects.length === 0 && <option>Aucun projet actif</option>}
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Calendrier Schedule-X intégré */}
      {selectedProject ? (
        <SimpleScheduleCalendar
          projectName={selectedProject.title}
          events={events}
          teamMembers={teamMembers}
          calendarConfig={selectedProject.metadata?.scheduleX?.calendar_config}
          onEventClick={(event) => {
            setSelectedEventId(event.id);
            setShowViewEvent(true);
          }}
          onAddEvent={() => setShowCreateEvent(true)}
        />
      ) : (
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">Aucun projet actif sélectionné</p>
              <p className="text-sm text-gray-500">Créez ou démarrez un projet pour voir le calendrier</p>
            </div>
          </div>
        </Card>
      )}

      {/* Dialog de création d'événement */}
      {selectedProject && (
        <CreateEventDialog
          open={showCreateEvent}
          projectId={selectedProject.id}
          projectTitle={selectedProject.title}
          userType={userType}
          onClose={() => setShowCreateEvent(false)}
          onEventCreated={() => {
            selectProject(selectedProject); // Recharger les événements
            toast({
              title: "Événement créé",
              description: "L'événement a été ajouté au calendrier du projet",
            });
          }}
        />
      )}

      {/* Dialog de visualisation/édition d'événement */}
      {selectedEventId && (
        <ViewEventDialog
          open={showViewEvent}
          eventId={selectedEventId}
          projectTitle={selectedProject?.title}
          onClose={() => {
            setShowViewEvent(false);
            setSelectedEventId('');
          }}
          onEventUpdated={() => {
            selectProject(selectedProject); // Recharger les événements
            toast({
              title: "Événement modifié",
              description: "L'événement a été mis à jour avec succès",
            });
          }}
          onEventDeleted={() => {
            selectProject(selectedProject); // Recharger les événements
            toast({
              title: "Événement supprimé",
              description: "L'événement a été supprimé du calendrier",
            });
          }}
          canEdit={userType === 'client'}
        />
      )}

      {/* Section événements à venir avec kickoff de test (client uniquement) */}
      {userType === 'client' && (
        <Card className="mt-6 p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Événements Kickoff de Test</h2>
          
          {/* Bouton pour créer un kickoff de test */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <h3 className="font-medium text-purple-900 mb-2">🚀 Tester un Kickoff de Projet</h3>
            <p className="text-sm text-purple-700 mb-3">
              Créez un événement kickoff de test pour vérifier que l'intégration Schedule-X fonctionne correctement.
            </p>
            <Button 
              onClick={createTestKickoffEvent}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Video className="w-4 h-4 mr-2" />
              Créer un Kickoff de Test
            </Button>
          </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Kickoff Test - Nouveau Projet</h4>
                <p className="text-sm text-gray-600">Date à définir • Durée: 1 heure</p>
                <p className="text-xs text-gray-500 mt-1">Lien visio: meet.jit.si/test-kickoff</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://meet.jit.si/test-kickoff', '_blank')}
              >
                Tester Visio
              </Button>
              <Button 
                variant="default" 
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Planifier
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
                15
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Kickoff Projet Alpha</h4>
                <p className="text-sm text-gray-600">15 Sept 2025 • 14:00 - 15:00</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Rejoindre
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-semibold">
                16
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Point d'équipe hebdo</h4>
                <p className="text-sm text-gray-600">16 Sept 2025 • 10:00 - 10:30</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Rejoindre
            </Button>
          </div>
        </div>
      </Card>
      )}
    </div>
  );
};

export default PlanningPage;