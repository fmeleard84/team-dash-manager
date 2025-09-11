import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Video, Users, Server, Settings, Plus, ChevronDown, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { SimpleScheduleCalendar } from '@/components/SimpleScheduleCalendar';
import { supabase } from '@/integrations/supabase/client';
import { useProjectSort, type ProjectWithDate } from '@/hooks/useProjectSort';
import { ProjectSelectorNeon } from '@/components/ui/project-selector-neon';
import { useProjectSelector } from '@/hooks/useProjectSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FullScreenModal, ModalActions, useFullScreenModal } from '@/components/ui/fullscreen-modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

interface PlanningPageProps {
  projects: ProjectWithDate[];
}

const PlanningPage = ({ projects }: PlanningPageProps) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithDate | null>(null);
  const createEventModal = useFullScreenModal();
  const viewEventModal = useFullScreenModal();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    start_time: new Date(),
    end_time: new Date(Date.now() + 3600000), // Par défaut 1h après
    location: ''
  });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  
  // Trier les projets par date de création (plus récent en premier)
  const sortedProjects = useProjectSort(projects);

  // Sélectionner le premier projet au chargement
  useEffect(() => {
    if (sortedProjects.length > 0 && !selectedProject) {
      const firstProject = projects.find(p => p.id === sortedProjects[0].id);
      if (firstProject) {
        selectProject(firstProject);
      }
    }
  }, [sortedProjects, selectedProject, projects]);

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


  const selectProject = async (project: any) => {
    console.log('selectProject appelé avec:', project);
    setSelectedProject(project);
    
    // Charger les événements du projet
    const { data: eventsData, error: eventsError } = await supabase
      .from('project_events')
      .select('*')
      .eq('project_id', project.id);
    
    if (eventsError) {
      console.error('Erreur chargement événements:', eventsError);
      setEvents([]);
    } else if (eventsData) {
      console.log('Evénements chargés:', eventsData.length);
      console.log('Premier événement brut complet:', JSON.stringify(eventsData[0], null, 2)); // Debug complet
      
      // Vérifier quels champs existent vraiment
      if (eventsData.length > 0) {
        const firstEvent = eventsData[0];
        console.log('Champs disponibles:', Object.keys(firstEvent));
        console.log('start_at:', firstEvent.start_at);
        console.log('end_at:', firstEvent.end_at);
        console.log('video_url:', firstEvent.video_url);
      }
      
      // Trier les événements par date de début
      const sortedEvents = eventsData.sort((a, b) => {
        const aTime = (a.start_at || a.start_time) ? new Date(a.start_at || a.start_time).getTime() : 0;
        const bTime = (b.start_at || b.start_time) ? new Date(b.start_at || b.start_time).getTime() : 0;
        return aTime - bTime;
      });
      
      // Transform events pour SimpleScheduleCalendar
      // IMPORTANT: La DB utilise start_at et end_at, PAS start_time et end_time !
      const transformedEvents = sortedEvents.map(event => ({
        id: event.id,
        title: event.title || 'Sans titre',
        start: event.start_at || event.start_time || null,  // Priorité à start_at (colonne DB)
        end: event.end_at || event.end_time || null,        // Priorité à end_at (colonne DB)
        description: event.description || '',
        location: event.video_url || event.meeting_link || event.location || '', 
        attendees: []
      }));
      console.log('Événements transformés pour le calendrier:', transformedEvents);
      setEvents(transformedEvents);
    } else {
      console.log('Aucun événement trouvé');
      setEvents([]);
    }
    
    // Charger les membres de l'équipe
    const { data: assignmentsData } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        candidate:candidate_profiles!candidate_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('project_id', project.id)
      .eq('booking_status', 'accepted');
    
    if (assignmentsData) {
      const members = assignmentsData
        .filter(a => a.candidate)
        .map(a => ({
          id: a.candidate.id,
          name: `${a.candidate.first_name || ''} ${a.candidate.last_name || ''}`.trim() || a.candidate.email?.split('@')[0] || 'Candidat',
          email: a.candidate.email,
          role: 'resource' // Rôle pour le composant SimpleScheduleCalendar
        }));
      console.log('Membres de l\'équipe chargés:', members);
      setTeamMembers(members);
    }
  };

  const checkAndCreateKickoff = async () => {
    if (!selectedProject) return;
    
    // Vérifier s'il existe déjà un kickoff
    const { data: existingKickoff } = await supabase
      .from('project_events')
      .select('*')
      .eq('project_id', selectedProject.id)
      .eq('event_type', 'kickoff')
      .single();
    
    if (existingKickoff) {
      toast({
        title: "Kickoff existant",
        description: `Un kickoff est déjà planifié pour ce projet`,
        variant: "default",
      });
      return;
    }
    
    // Créer un événement kickoff par défaut
    const kickoffDate = new Date();
    kickoffDate.setDate(kickoffDate.getDate() + 7); // Dans 7 jours
    kickoffDate.setHours(10, 0, 0, 0); // À 10h00
    
    const endDate = new Date(kickoffDate);
    endDate.setHours(11, 0, 0, 0); // Durée d'1 heure
    
    // Récupérer l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('project_events')
      .insert({
        project_id: selectedProject.id,
        title: `Kickoff - ${selectedProject.title}`,
        description: 'Réunion de lancement du projet avec toute l\'équipe',
        start_at: kickoffDate.toISOString(),    
        end_at: endDate.toISOString(),          
        location: 'Visioconférence',
        video_url: `https://meet.jit.si/kickoff-${selectedProject.title}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50),
        created_by: userData?.user?.id,  // ID de l'utilisateur créateur
        metadata: {
          is_mandatory: true,
          created_by_system: true
        }
      });
    
    if (error) {
      console.error('Erreur création kickoff:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le kickoff",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Kickoff créé !",
        description: `Un événement kickoff a été créé pour ${selectedProject.title}`,
      });
      selectProject(selectedProject);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header unifié */}
      <Card className="border-0 bg-gradient-to-br from-primary to-primary/80">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-background/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary-foreground">Planning & Calendrier</h2>
                <p className="text-sm text-primary-foreground/80">Gérez vos rendez-vous et événements projet</p>
              </div>
            </div>
            
            {/* Sélecteur de projet unifié */}
            <ProjectSelectorNeon
              projects={projects.map(p => ({ ...p, created_at: p.project_date }))}
              selectedProjectId={selectedProject?.id || ''}
              onProjectChange={(value) => {
                const project = projects.find(p => p.id === value);
                if (project) {
                  console.log('Sélection du projet:', project.title, project.id);
                  selectProject(project);
                }
              }}
              placeholder="Sélectionner un projet"
              className="w-[280px]"
              showStatus={true}
              showDates={true}
              showTeamProgress={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contenu principal */}
      {selectedProject ? (
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'calendar' | 'list')} className="space-y-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Calendrier du projet {selectedProject.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      <Calendar className="w-3 h-3 mr-1" />
                      {events.length} événement{events.length > 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TabsList>
                    <TabsTrigger value="calendar">
                      <Calendar className="w-4 h-4 mr-2" />
                      Calendrier
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <Clock className="w-4 h-4 mr-2" />
                      Liste
                    </TabsTrigger>
                  </TabsList>
                  <Button onClick={() => {
                    setNewEventData({
                      title: '',
                      description: '',
                      start_time: new Date(),
                      end_time: new Date(Date.now() + 3600000),
                      location: ''
                    });
                    setSelectedParticipants([]); // Réinitialiser la sélection
                    createEventModal.open();
                  }} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvel événement
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <TabsContent value="calendar" className="mt-0 border-0">
              <CardContent>
                {/* Debug: Afficher le nombre d'événements */}
                {events.length > 0 && (
                  <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                    📅 {events.length} événement(s) chargé(s) pour ce projet
                  </div>
                )}
                <SimpleScheduleCalendar
                  projectName={selectedProject.title}
                  events={events}
                  teamMembers={teamMembers}
                  calendarConfig={selectedProject.metadata?.scheduleX?.calendar_config}
                  onEventClick={(event) => {
                    setSelectedEventId(event.id);
                    setSelectedEvent(event);
                    viewEventModal.open();
                  }}
                  onAddEvent={(date) => {
                    const startDate = date || new Date();
                    const endDate = new Date(startDate.getTime() + 3600000);
                    setNewEventData({
                      title: '',
                      description: '',
                      start_time: startDate,
                      end_time: endDate,
                      location: ''
                    });
                    setSelectedParticipants([]); // Réinitialiser la sélection
                    createEventModal.open();
                  }}
                />
              </CardContent>
            </TabsContent>
            
            <TabsContent value="list" className="mt-0 border-0">
              <CardContent className="space-y-4">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" 
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setSelectedEvent(event);
                        viewEventModal.open();
                      }}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                        {event.start && !isNaN(new Date(event.start).getTime()) 
                          ? new Date(event.start).getDate()
                          : '?'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.start && !isNaN(new Date(event.start).getTime())
                            ? `${new Date(event.start).toLocaleDateString('fr-FR', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })} • ${new Date(event.start).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit',
                                minute: '2-digit'
                              })}`
                            : 'Date non définie'}
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {event.location && (
                          <Badge variant="outline" className="text-xs">
                            <Video className="w-3 h-3 mr-1" />
                            Visio
                          </Badge>
                        )}
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="font-medium mb-2">Aucun événement planifié</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Créez votre premier événement pour commencer à organiser votre projet
                    </p>
                    <Button onClick={() => {
                      setNewEventData({
                        title: '',
                        description: '',
                        start_time: new Date(),
                        end_time: new Date(Date.now() + 3600000),
                        location: '',
                        meeting_link: ''
                      });
                      createEventModal.open();
                    }} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un événement
                    </Button>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Card>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Aucun projet sélectionné</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Sélectionnez un projet actif pour afficher son calendrier et gérer ses événements
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal fullscreen pour créer un événement */}
      <FullScreenModal
        isOpen={createEventModal.isOpen}
        onClose={createEventModal.close}
        title="Nouvel événement"
        description={selectedProject ? `Projet : ${selectedProject.title}` : ''}
        actions={
          <ModalActions
            onSave={async () => {
              if (newEventData.title && selectedProject) {
                try {
                  // Générer automatiquement le lien Jitsi
                  const roomName = `${selectedProject.title}-${newEventData.title}-${Date.now()}`
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .slice(0, 50);
                  const videoUrl = `https://meet.jit.si/${roomName}`;
                  
                  // Récupérer l'utilisateur actuel
                  const { data: userData } = await supabase.auth.getUser();
                  
                  const { data: eventData, error } = await supabase
                    .from('project_events')
                    .insert({
                      project_id: selectedProject.id,
                      title: newEventData.title,
                      description: newEventData.description,
                      start_at: newEventData.start_time.toISOString(),  
                      end_at: newEventData.end_time.toISOString(),      
                      location: newEventData.location || 'Visioconférence',
                      video_url: videoUrl,  // Lien généré automatiquement
                      created_by: userData?.user?.id  // ID de l'utilisateur créateur
                    })
                    .select()
                    .single();

                  if (error) throw error;

                  // Ajouter uniquement les participants sélectionnés
                  if (eventData && selectedParticipants.length > 0) {
                    const selectedMembers = teamMembers.filter(m => selectedParticipants.includes(m.id));
                    const attendees = selectedMembers.map(member => ({
                      event_id: eventData.id,
                      user_id: member.id,
                      email: member.email,
                      name: member.name,
                      role: member.role || 'participant'
                    }));

                    const { error: attendeesError } = await supabase
                      .from('project_event_attendees')
                      .insert(attendees);

                    if (attendeesError) {
                      console.error('Erreur ajout participants:', attendeesError);
                    } else {
                      console.log(`${attendees.length} participants ajoutés à l'événement`);
                    }
                  }

                  selectProject(selectedProject);
                  createEventModal.close();
                  toast({
                    title: "Événement créé",
                    description: "L'événement a été ajouté au calendrier du projet",
                  });
                } catch (error) {
                  console.error('Erreur création événement:', error);
                  toast({
                    title: "Erreur",
                    description: "Impossible de créer l'événement",
                    variant: "destructive",
                  });
                }
              }
            }}
            onCancel={createEventModal.close}
            saveDisabled={!newEventData.title}
            saveText="Créer l'événement"
          />
        }
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="event-title">Titre *</Label>
            <Input
              id="event-title"
              value={newEventData.title}
              onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
              placeholder="Titre de l'événement"
              className="mt-2"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={newEventData.description}
              onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
              placeholder="Description de l'événement"
              className="mt-2 min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-start">Date et heure de début *</Label>
              <div className="mt-2 space-y-2">
                <DatePicker
                  date={newEventData.start_time}
                  onSelect={(date) => {
                    if (date) {
                      const newDate = new Date(date);
                      newDate.setHours(newEventData.start_time.getHours());
                      newDate.setMinutes(newEventData.start_time.getMinutes());
                      setNewEventData({ ...newEventData, start_time: newDate });
                    }
                  }}
                />
                <Input
                  type="time"
                  value={`${String(newEventData.start_time.getHours()).padStart(2, '0')}:${String(newEventData.start_time.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(newEventData.start_time);
                    newDate.setHours(parseInt(hours));
                    newDate.setMinutes(parseInt(minutes));
                    setNewEventData({ ...newEventData, start_time: newDate });
                  }}
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="event-duration">Durée de la réunion *</Label>
              <div className="mt-2">
                <Select
                  value={`${Math.round((newEventData.end_time.getTime() - newEventData.start_time.getTime()) / 60000)}`}
                  onValueChange={(value) => {
                    const minutes = parseInt(value);
                    const endTime = new Date(newEventData.start_time.getTime() + minutes * 60000);
                    setNewEventData({ ...newEventData, end_time: endTime });
                  }}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Sélectionner la durée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                    <SelectItem value="180">3 heures</SelectItem>
                    <SelectItem value="240">4 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="event-location">Lieu</Label>
            <Input
              id="event-location"
              value={newEventData.location}
              onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
              placeholder="Lieu de l'événement (par défaut : Visioconférence)"
              className="mt-2 h-12"
            />
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Lien de visioconférence
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Un lien Jitsi Meet sera généré automatiquement lors de la création de l'événement.
                    Les participants recevront le lien par email.
                  </p>
                </div>
              </div>
            </div>

            {teamMembers.length > 0 && (
              <div>
                <Label>Participants à inviter</Label>
                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Sélectionner les participants ({selectedParticipants.length}/{teamMembers.length})
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedParticipants.length === teamMembers.length) {
                            setSelectedParticipants([]);
                          } else {
                            setSelectedParticipants(teamMembers.map(m => m.id));
                          }
                        }}
                      >
                        {selectedParticipants.length === teamMembers.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedParticipants.includes(member.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParticipants([...selectedParticipants, member.id]);
                              } else {
                                setSelectedParticipants(selectedParticipants.filter(id => id !== member.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {member.role === 'client' ? 'Client' : 'Équipe'}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </FullScreenModal>

      {/* Modal fullscreen pour voir/modifier un événement */}
      {selectedEvent && (
        <FullScreenModal
          isOpen={viewEventModal.isOpen}
          onClose={viewEventModal.close}
          title={selectedEvent.title}
          description={selectedProject?.title}
          actions={
            <ModalActions
              onDelete={async () => {
                if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
                  try {
                    const { error } = await supabase
                      .from('project_events')
                      .delete()
                      .eq('id', selectedEventId);

                    if (error) throw error;

                    selectProject(selectedProject);
                    viewEventModal.close();
                    toast({
                      title: "Événement supprimé",
                      description: "L'événement a été supprimé du calendrier",
                    });
                  } catch (error) {
                    console.error('Erreur suppression:', error);
                    toast({
                      title: "Erreur",
                      description: "Impossible de supprimer l'événement",
                      variant: "destructive",
                    });
                  }
                }
              }}
            />
          }
        >
          <div className="space-y-6">
            <div>
              <Label className="text-white">Description</Label>
              <p className="mt-2 text-gray-300">
                {selectedEvent.description || 'Aucune description'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Date et heure</Label>
                <p className="mt-2 text-gray-300">
                  {selectedEvent.start && !isNaN(new Date(selectedEvent.start).getTime())
                    ? new Date(selectedEvent.start).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Date non définie'}
                </p>
              </div>

              {selectedEvent.location && (
                <div>
                  <Label className="text-white">Lieu</Label>
                  <p className="mt-2 text-gray-300">{selectedEvent.location}</p>
                </div>
              )}
            </div>

            {selectedEvent.location && (
              <div>
                <Label className="text-white">Lien de réunion</Label>
                <a
                  href={selectedEvent.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-purple-400 hover:text-purple-300 hover:underline block"
                >
                  {selectedEvent.location}
                </a>
              </div>
            )}
          </div>
        </FullScreenModal>
      )}
    </div>
  );
};

export default PlanningPage;