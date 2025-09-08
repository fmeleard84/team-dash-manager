import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateGoogleCalendarUrl } from "@/utils/googleCalendar";
import { useNotifications } from "@/hooks/useNotifications";
import { useProjectUsers } from "@/hooks/useProjectUsers";
import { useEffect as useEffectForLog } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Trash2, List, Calendar as CalendarIcon, Plus, Edit2, ExternalLink, Check, X, Video, FolderOpen, CalendarPlus, Briefcase, Clock, MapPin, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Project { id: string; title: string; archived_at?: string | null }
interface EventRow {
  id: string;
  title: string;
  description?: string | null;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  video_url?: string | null;
  drive_url?: string | null;
  project_id: string;
  _candidate_event?: boolean;
  _notification_id?: string;
  _notification_status?: string;
}

interface SharedPlanningViewProps {
  mode: 'client' | 'candidate';
  projects: Project[];
  candidateId?: string;
}

export default function SharedPlanningView({ mode, projects, candidateId }: SharedPlanningViewProps) {
  const { toast } = useToast();
  // Only use notifications hook in candidate mode to avoid loading candidate profiles in client mode
  const { acceptEvent, declineEvent } = mode === 'candidate' ? useNotifications() : { acceptEvent: async () => {}, declineEvent: async () => {} };
  const [projectId, setProjectId] = useState<string>("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [location, setLocation] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [attendeesEmails, setAttendeesEmails] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

  // Edition d'événement
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Filtres et vues
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const eventsToShow = useMemo(
    () => (filterProjectId === "all" ? allEvents : allEvents.filter((e) => e.project_id === filterProjectId)),
    [allEvents, filterProjectId]
  );
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Membres d'équipe - utilisation du hook unifié
  const { users: projectMembers, loading: membersLoading } = useProjectUsers(projectId);
  
  // Log pour debug
  useEffect(() => {
    if (projectMembers.length > 0) {
      console.log('👥 Membres du projet chargés:', projectMembers);
    }
  }, [projectMembers]);
  const [selectedTeamEmail, setSelectedTeamEmail] = useState<string>("");

  const suggestedVideoUrl = useMemo(() => {
    if (!projectId || !date || !startTime) return "";
    const ts = `${date}-${startTime.replace(":", "")}`;
    return `https://meet.jit.si/${projectId}-${ts}`;
  }, [projectId, date, startTime]);

  // Set first project as default
  useEffect(() => {
    if (projects.length && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Load team members when project changes
  // Cette fonction n'est plus nécessaire car nous utilisons useProjectMembers hook

  // Load event attendees for editing
  const loadEventAttendees = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("project_event_attendees")
        .select("email")
        .eq("event_id", eventId);
      
      if (error) {
        console.error("load event attendees error", error);
        return "";
      }
      
      const emails = (data || []).map(attendee => attendee.email).filter(Boolean);
      return emails.join(", ");
    } catch (err) {
      console.error("Error loading event attendees:", err);
      return "";
    }
  };

  const loadAllEvents = async () => {
    if (!projects.length) {
      setAllEvents([]);
      return;
    }

    setLoading(true);
    try {
      const projectIds = projects.map(p => p.id);
      console.log('📅 Loading events for projects:', projectIds);
      
      // Load from project_events table only
      const { data: projectEvents, error: projectError } = await supabase
        .from("project_events")
        .select("id,title,description,start_at,end_at,location,video_url,drive_url,project_id")
        .in("project_id", projectIds)
        .order("start_at", { ascending: true });

      if (projectError) {
        console.error("Error loading project events:", projectError);
        toast({ title: "Erreur", description: "Impossible de charger les événements" });
        setLoading(false);
        return;
      }

      let allEvents = (projectEvents as EventRow[]) || [];
      console.log('Found', allEvents.length, 'events in project_events');

      // If in candidate mode, also load all event notifications (not just accepted)
      if (mode === 'candidate' && candidateId) {
        console.log('Loading candidate events for candidateId:', candidateId);
        const { data: candidateEvents, error: candidateError } = await supabase
          .from("candidate_event_notifications")
          .select(`
            id,
            event_id,
            title,
            description,
            event_date,
            location,
            video_url,
            project_id,
            status
          `)
          .eq('candidate_id', candidateId)
          .neq('status', 'archived') // Show all except archived
          .order('event_date', { ascending: true });

        if (candidateError) {
          console.error("Error loading candidate events:", candidateError);
        } else if (candidateEvents) {
          console.log('Loaded candidate events:', candidateEvents);
          // Convert candidate event notifications to EventRow format
          const convertedEvents: EventRow[] = candidateEvents.map(event => ({
            id: event.event_id || `candidate_${event.id}`,
            title: event.title,
            description: event.description,
            start_at: event.event_date,
            end_at: null,
            location: event.location,
            video_url: event.video_url,
            drive_url: null,
            project_id: event.project_id,
            _candidate_event: true, // Mark as candidate event
            _notification_id: event.id, // Store notification ID for actions
            _notification_status: event.status // Store status
          }));

          allEvents = [...allEvents, ...convertedEvents];
        }
      }

      setAllEvents(allEvents);
    } catch (error) {
      console.error("Error loading events:", error);
      toast({ title: "Erreur", description: "Impossible de charger les événements" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length) {
      loadAllEvents();
    } else {
      setAllEvents([]);
    }
  }, [projects.length]); // Utiliser projects.length au lieu de projects pour éviter les re-renders

  const handleCreateEvent = async () => {
    await handleCreate();
  };

  const handleUpdateEvent = async () => {
    await handleUpdate();
  };

  const handleCreate = async () => {
    if (!projectId || !title || !date || !startTime) {
      toast({ title: "Champs manquants", description: "Titre, date et heure de début requis" });
      return;
    }
    
    // Vérifier si le projet est archivé
    const currentProject = projects.find(p => p.id === projectId);
    if (currentProject?.archived_at) {
      toast({
        title: "Action non autorisée",
        description: "Impossible d'ajouter des événements dans un projet archivé.",
        variant: "destructive",
      });
      return;
    }

    if (mode === 'candidate' && !candidateId) {
      toast({ title: "Erreur", description: "Profil candidat non trouvé" });
      return;
    }

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        toast({ title: "Non connecté", description: "Veuillez vous reconnecter" });
        return;
      }

      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : null;
      const finalVideoUrl = videoUrl || suggestedVideoUrl || null;

      const { data: inserted, error } = await supabase
        .from("project_events")
        .insert({
          project_id: projectId,
          title,
          description: description || null,
          start_at: startISO,
          end_at: endISO,
          location: location || null,
          video_url: finalVideoUrl,
          drive_url: driveUrl || null,
          created_by: uid,
        })
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("create event error", error);
        toast({ title: "Erreur", description: "Création de l'événement échouée" });
        return;
      }

      const eventId = inserted?.id as string | undefined;
      if (eventId && attendeesEmails.trim()) {
        const emails = attendeesEmails
          .split(/[,\n]/)
          .map((e) => e.trim())
          .filter(Boolean);
        if (emails.length) {
          // 1. D'abord supprimer les participants existants (au cas où)
          await supabase
            .from('project_event_attendees')
            .delete()
            .eq('event_id', eventId);

          // 2. Insérer les nouveaux participants un par un pour éviter les conflits
          for (const email of emails) {
            const attendee = {
              event_id: eventId,
              email,
              required: true,
              response_status: 'pending'
            };
            
            const { error: attErr } = await supabase
              .from("project_event_attendees")
              .insert([attendee]);
              
            if (attErr) {
              console.error(`Erreur insertion participant ${email}:`, attErr);
            }
          }
          
          // Send email invitations to attendees
          try {
            const projectTitle = projects.find(p => p.id === projectId)?.title || "Projet";
            await supabase.functions.invoke('send-event-invitations', {
              body: {
                eventId,
                eventTitle: title,
                eventDate: `${date}T${startTime}:00`,
                projectTitle,
                attendeesEmails: emails,
                organizerName: mode === 'client' ? 'Client' : 'Équipe',
                videoUrl: finalVideoUrl,
                location: location || undefined
              }
            });
            console.log('Event invitations sent successfully');
          } catch (emailError) {
            console.error('Failed to send event invitations:', emailError);
            // Don't fail the event creation if email sending fails
          }
        }
      }

      toast({ title: "Événement créé" });
      resetForm();
      setIsDialogOpen(false);
      await loadAllEvents();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({ title: "Erreur", description: "Une erreur inattendue est survenue" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setVideoUrl("");
    setDriveUrl("");
    setAttendeesEmails("");
  };

  const handleEdit = async (event: EventRow) => {
    setEditingEvent(event);
    const eventDate = new Date(event.start_at);
    const eventEndDate = event.end_at ? new Date(event.end_at) : null;
    
    setProjectId(event.project_id);
    setTitle(event.title);
    setDescription(event.description || "");
    setDate(eventDate.toISOString().split('T')[0]);
    setStartTime(eventDate.toTimeString().slice(0, 5));
    setEndTime(eventEndDate ? eventEndDate.toTimeString().slice(0, 5) : "");
    setLocation(event.location || "");
    setVideoUrl(event.video_url || "");
    setDriveUrl(event.drive_url || "");
    
    // Load existing attendees
    const existingAttendees = await loadEventAttendees(event.id);
    setAttendeesEmails(existingAttendees);
    
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingEvent || !projectId || !title || !date || !startTime) {
      toast({ title: "Champs manquants", description: "Titre, date et heure de début requis" });
      return;
    }
    
    // Vérifier si le projet est archivé
    const currentProject = projects.find(p => p.id === projectId);
    if (currentProject?.archived_at) {
      toast({
        title: "Action non autorisée",
        description: "Impossible de modifier des événements dans un projet archivé.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : null;
      const finalVideoUrl = videoUrl || suggestedVideoUrl || null;

      // Update the event
      const { error } = await supabase
        .from("project_events")
        .update({
          project_id: projectId,
          title,
          description: description || null,
          start_at: startISO,
          end_at: endISO,
          location: location || null,
          video_url: finalVideoUrl,
          drive_url: driveUrl || null,
        })
        .eq("id", editingEvent.id);

      if (error) {
        console.error("update event error", error);
        toast({ title: "Erreur", description: "Modification de l'événement échouée" });
        return;
      }

      // Update attendees
      if (attendeesEmails.trim()) {
        // Delete existing attendees
        await supabase
          .from("project_event_attendees")
          .delete()
          .eq("event_id", editingEvent.id);

        // Add new attendees
        const emails = attendeesEmails
          .split(/[,\n]/)
          .map((e) => e.trim())
          .filter(Boolean);
        
        if (emails.length) {
          // Insérer les participants un par un pour éviter les conflits
          for (const email of emails) {
            const attendee = {
              event_id: editingEvent.id,
              email,
              required: true,
              response_status: 'pending'
            };
            
            const { error: attErr } = await supabase
              .from("project_event_attendees")
              .insert([attendee]);
              
            if (attErr) {
              console.error(`Erreur insertion participant ${email}:`, attErr);
            }
          }
          
          // Send updated event invitations
          try {
            const projectTitle = projects.find(p => p.id === projectId)?.title || "Projet";
            await supabase.functions.invoke('send-event-invitations', {
              body: {
                eventId: editingEvent.id,
                eventTitle: title,
                eventDate: `${date}T${startTime}:00`,
                projectTitle,
                attendeesEmails: emails,
                organizerName: mode === 'client' ? 'Client' : 'Équipe',
                videoUrl: finalVideoUrl,
                location: location || undefined,
                isUpdate: true
              }
            });
            console.log('Event update invitations sent successfully');
          } catch (emailError) {
            console.error('Failed to send event update invitations:', emailError);
          }
        }
      } else {
        // If no attendees, delete all existing ones
        await supabase
          .from("project_event_attendees")
          .delete()
          .eq("event_id", editingEvent.id);
      }

      toast({ title: "Événement modifié" });
      resetForm();
      setEditingEvent(null);
      setIsEditDialogOpen(false);
      await loadAllEvents();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({ title: "Erreur", description: "Une erreur inattendue est survenue" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Vérifier si le projet est archivé  
    const event = allEvents.find(e => e.id === id);
    if (event) {
      const currentProject = projects.find(p => p.id === event.project_id);
      if (currentProject?.archived_at) {
        toast({
          title: "Action non autorisée",
          description: "Impossible de supprimer des événements dans un projet archivé.",
          variant: "destructive",
        });
        return;
      }
    }
    
    console.log(`Attempting to delete event with ID: ${id}`);
    const { error } = await supabase.from("project_events").delete().eq("id", id);
    if (error) {
      console.error("delete event error", error);
      toast({ title: "Erreur", description: `Suppression échouée: ${error.message}` });
    } else {
      console.log(`Successfully deleted event with ID: ${id}`);
      toast({ title: "Événement supprimé" });
      setAllEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleAcceptNotification = async (notificationId: string, eventId: string) => {
    await acceptEvent(notificationId);
    setAllEvents((prev) => prev.map((e) =>
      e.id === eventId ? { ...e, _notification_status: 'accepted' } : e
    ));
    toast({ title: "Événement accepté", description: "Vous avez accepté l'invitation à cet événement." });
  };

  const handleDeclineNotification = async (notificationId: string, eventId: string) => {
    await declineEvent(notificationId);
    setAllEvents((prev) => prev.map((e) =>
      e.id === eventId ? { ...e, _notification_status: 'declined' } : e
    ));
    toast({ title: "Événement refusé", description: "Vous avez refusé l'invitation à cet événement." });
  };

  // Get event dates for calendar highlighting
  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    eventsToShow.forEach(event => {
      const eventDate = new Date(event.start_at);
      dates.add(eventDate.toDateString());
    });
    return dates;
  }, [eventsToShow]);

  const isEventDate = (date: Date) => {
    return eventDates.has(date.toDateString());
  };

  // Check for insufficient data
  if (mode === 'candidate' && !candidateId) {
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <CalendarDays className="h-8 w-8 text-orange-500" />
              <p className="text-center text-orange-700 font-medium">
                Aucun profil candidat trouvé. Veuillez contacter un administrateur.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-3">
              <CalendarDays className="h-12 w-12 text-blue-500 mx-auto" />
              <p className="text-blue-700 font-medium">
                {mode === 'candidate' 
                  ? "Aucun projet assigné. Votre planning apparaîtra ici une fois que vous serez assigné à des projets."
                  : "Aucun projet trouvé. Créez un projet pour commencer à planifier des événements."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec design unifié - comme dans Drive et Kanban */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            
            <Select value={filterProjectId} onValueChange={setFilterProjectId}>
              <SelectTrigger className="w-64 bg-white border-purple-200 focus:border-purple-400">
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle view mode */}
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={viewMode === 'calendar' ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white' : ''}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Calendrier
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white' : ''}
            >
              <List className="w-4 h-4 mr-2" />
              Liste
            </Button>
            
            {/* New event button */}
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel événement
            </Button>
          </div>
      </div>

      {/* Main Modal for creating events */}
      <FullScreenModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Nouvel événement"
        description="Planifiez un événement pour votre équipe projet"
        actions={
          <ModalActions
            onSave={handleCreateEvent}
            onCancel={() => {
              resetForm();
              setIsDialogOpen(false);
            }}
            saveText="Créer l'événement"
            cancelText="Annuler"
            saveDisabled={!title || !projectId || !date || !startTime}
          />
        }
      >
        <div className="space-y-4">
                {/* Projet avec icône et style amélioré */}
                <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                  <label className="text-sm font-semibold text-purple-700 flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4" />
                    Projet
                  </label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="border-purple-200 focus:border-purple-400 bg-white">
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Titre de l'événement */}
                <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                  <label className="text-sm font-semibold text-purple-700 mb-2 block">
                    Titre de l'événement
                  </label>
                  <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Ex: Réunion kickoff, Point hebdo..." 
                    className="border-purple-200 focus:border-purple-400 bg-white"
                  />
                </div>

                {/* Date et heures regroupées */}
                <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                  <label className="text-sm font-semibold text-purple-700 flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    Date et horaires
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="border-purple-200 focus:border-purple-400 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <Input 
                        type="time" 
                        value={startTime} 
                        onChange={(e) => setStartTime(e.target.value)}
                        className="border-purple-200 focus:border-purple-400 bg-white text-sm"
                        placeholder="Début"
                        step="60"
                        pattern="[0-9]{2}:[0-9]{2}"
                      />
                    </div>
                    <div>
                      <Input 
                        type="time" 
                        value={endTime} 
                        onChange={(e) => setEndTime(e.target.value)}
                        className="border-purple-200 focus:border-purple-400 bg-white text-sm"
                        placeholder="Fin"
                        step="60"
                        pattern="[0-9]{2}:[0-9]{2}"
                      />
                    </div>
                  </div>
                </div>

                {/* Lieu et liens en ligne */}
                <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-purple-700 flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        Lieu
                      </label>
                      <Input 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)} 
                        placeholder="Salle / Adresse" 
                        className="border-purple-200 focus:border-purple-400 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-purple-700 flex items-center gap-1 mb-2">
                        <Video className="w-3 h-3" />
                        Visio
                      </label>
                      <Input 
                        value={videoUrl || suggestedVideoUrl} 
                        onChange={(e) => setVideoUrl(e.target.value)} 
                        placeholder="Lien Jitsi/Teams" 
                        className="border-purple-200 focus:border-purple-400 bg-white text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <label className="text-sm font-semibold text-purple-700 flex items-center gap-1 mb-2">
                      <FolderOpen className="w-3 h-3" />
                      Documents
                    </label>
                    <Input 
                      value={driveUrl} 
                      onChange={(e) => setDriveUrl(e.target.value)} 
                      placeholder="Lien vers les documents (Drive, etc.)" 
                      className="border-purple-200 focus:border-purple-400 bg-white text-sm"
                    />
                  </div>
                </div>

                {/* Participants avec style compact */}
                <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                  <label className="text-sm font-semibold text-purple-700 flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    Participants
                  </label>
                  {!membersLoading && projectMembers.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto bg-white/50 p-2 rounded border border-purple-100">
                      {projectMembers.map((member) => (
                        <div key={member.user_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`member-${member.user_id}`}
                            checked={selectedAttendees.includes(member.email)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAttendees([...selectedAttendees, member.email]);
                                setAttendeesEmails((prev) => {
                                  const emails = prev.split(/[\s,\n]+/).filter(Boolean);
                                  if (!emails.includes(member.email)) {
                                    emails.push(member.email);
                                  }
                                  return emails.join(", ");
                                });
                              } else {
                                setSelectedAttendees(selectedAttendees.filter(e => e !== member.email));
                                setAttendeesEmails((prev) => {
                                  const emails = prev.split(/[\s,\n]+/).filter(e => e && e !== member.email);
                                  return emails.join(", ");
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`member-${member.user_id}`}
                            className="text-sm flex items-center gap-2 cursor-pointer"
                          >
                            {member.display_name}
                            <Badge variant="outline" className="text-xs">
                              {member.role === 'client' ? 'Client' : member.job_title || 'Consultant'}
                            </Badge>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  <Textarea 
                    value={attendeesEmails} 
                    onChange={(e) => setAttendeesEmails(e.target.value)} 
                    placeholder="Entrez les emails des participants (séparés par des virgules)" 
                    className="border-purple-200 focus:border-purple-400 bg-white min-h-[60px] text-sm"
                  />
                </div>
        </div>
      </FullScreenModal>

      {/* Edit Event Modal */}
      <FullScreenModal
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        title="Modifier l'événement"
        description="Modifiez les détails de cet événement. Les participants seront automatiquement notifiés des changements."
        actions={
          <ModalActions
            onSave={handleUpdateEvent}
            onDelete={() => editingEvent && handleDelete(editingEvent.id)}
            onCancel={() => {
              setEditingEvent(null);
              setIsEditDialogOpen(false);
            }}
            saveText="Enregistrer"
            deleteText="Supprimer"
            cancelText="Annuler"
            saveDisabled={!title || !date || !startTime || loading}
          />
        }
      >
        <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Projet</label>
              <Select value={projectId} onValueChange={setProjectId}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Titre</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Kickoff" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Début</label>
                <Input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)}
                  step="60"
                  pattern="[0-9]{2}:[0-9]{2}"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fin (optionnel)</label>
              <Input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                step="60"
                pattern="[0-9]{2}:[0-9]{2}"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lieu (optionnel)</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Adresse / Salle" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lien visio (optionnel)</label>
              <Input value={videoUrl || suggestedVideoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="URL Jitsi / Teams" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lien Google Drive (optionnel)</label>
              <Input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="URL Google Drive / Docs" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optionnel)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails supplémentaires" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Invités</label>
              <Select
                value={selectedTeamEmail}
                onValueChange={(v) => {
                  setSelectedTeamEmail(v);
                  setAttendeesEmails((prev) => {
                    const set = new Set(prev.split(/[\s,\n]+/).filter(Boolean));
                    set.add(v);
                    return Array.from(set).join(", ");
                  });
                }}
                disabled={projectMembers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={projectMembers.length ? "Ajouter depuis l'équipe" : "Aucune équipe"} />
                </SelectTrigger>
                <SelectContent>
                  {projectMembers.map((m) => (
                    <SelectItem key={m.email} value={m.email}>{m.display_name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea value={attendeesEmails} onChange={(e) => setAttendeesEmails(e.target.value)} placeholder="email1@ex.com, email2@ex.com" />
            </div>
        </div>
      </FullScreenModal>
      </div>

      {/* Events section */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : viewMode === "calendar" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Calendar 
                selected={selectedDate} 
                onSelect={setSelectedDate} 
                mode="single" 
                className="rounded-md border"
                modifiers={{
                  eventDay: (date) => isEventDate(date),
                  today: (date) => {
                    const today = new Date();
                    return date.toDateString() === today.toDateString();
                  },
                  selected: (date) => {
                    return selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
                  }
                }}
                modifiersClassNames={{
                  eventDay: "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-2 border-blue-300 font-semibold",
                  today: "bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold ring-2 ring-orange-400 shadow-lg",
                  selected: "bg-gradient-to-r from-blue-500 to-purple-500 text-white ring-2 ring-blue-400 shadow-md"
                }}
              />
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  Événements du {selectedDate ? selectedDate.toLocaleDateString() : "jour sélectionné"}
                </div>
                {eventsToShow.filter((ev) => {
                  if (!selectedDate) return true;
                  const d = new Date(ev.start_at);
                  return d.toDateString() === selectedDate.toDateString();
                }).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun événement.</p>
                ) : (
                  eventsToShow
                    .filter((ev) => {
                      if (!selectedDate) return true;
                      const d = new Date(ev.start_at);
                      return d.toDateString() === selectedDate.toDateString();
                    })
                     .map((ev) => (
                       <div key={ev.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                         <div className="flex items-start justify-between">
                           <div className="flex-1">
                             <div className="flex items-start gap-3">
                               <div className="flex flex-col gap-1">
                                 <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold shadow-sm">
                                   {new Date(ev.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                 </span>
                                 <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold shadow-sm">
                                   {new Date(ev.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                               </div>
                               <div className="flex-1">
                                 <div className="font-semibold text-gray-900 text-lg">{ev.title}</div>
                                 {ev.end_at && (
                                   <div className="text-sm text-gray-600 mt-1">
                                     Jusqu'à {new Date(ev.end_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                 )}
                                 {ev.description && (
                                   <div className="text-sm text-gray-600 mt-2">{ev.description}</div>
                                 )}
                                 {ev.location && (
                                   <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-sm">
                                     <span>📍</span>
                                     <span>{ev.location}</span>
                                   </div>
                                 )}
                                 {ev._candidate_event && ev._notification_status && (
                                   <div className="mt-2">
                                     <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                       ev._notification_status === 'accepted' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300' :
                                       ev._notification_status === 'declined' ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300' :
                                       'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300'
                                     }`}>
                                       {ev._notification_status === 'accepted' ? '✓ Accepté' :
                                        ev._notification_status === 'declined' ? '✗ Refusé' : '⏳ En attente'}
                                     </span>
                                   </div>
                                 )}
                               </div>
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex gap-2 flex-wrap">
                           {ev.video_url && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => window.open(ev.video_url, '_blank')}
                             >
                               <Video className="w-4 h-4 mr-2" />
                               Visio
                             </Button>
                           )}
                           
                           {ev.drive_url && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => window.open(ev.drive_url, '_blank')}
                             >
                               <FolderOpen className="w-4 h-4 mr-2" />
                               Drive
                             </Button>
                           )}
                           
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               const googleUrl = generateGoogleCalendarUrl({
                                 title: ev.title,
                                 description: ev.description,
                                 start_at: ev.start_at,
                                 end_at: ev.end_at,
                                 location: ev.location,
                                 video_url: ev.video_url
                               });
                               window.open(googleUrl, '_blank');
                             }}
                           >
                             <CalendarIcon className="w-4 h-4 mr-2" />
                             Google Agenda
                           </Button>
                           
                           {!ev._candidate_event && (
                             <>
                               <Button variant="outline" size="sm" onClick={() => handleEdit(ev)}>
                                 <Edit2 className="h-4 w-4 mr-2" />
                                 Modifier
                               </Button>
                               <Button variant="outline" size="sm" onClick={() => handleDelete(ev.id)}>
                                 <Trash2 className="h-4 w-4 mr-2" />
                                 Supprimer
                               </Button>
                             </>
                           )}
                         </div>
                         
                         {ev._candidate_event && ev._notification_status === 'pending' && ev._notification_id && (
                           <div className="flex gap-2">
                             <Button
                               variant="default"
                               size="sm"
                               onClick={() => handleAcceptNotification(ev._notification_id!, ev.id)}
                               className="flex-1"
                             >
                               <Check className="w-4 h-4 mr-2" />
                               Accepter
                             </Button>
                             <Button
                               variant="destructive"
                               size="sm"
                               onClick={() => handleDeclineNotification(ev._notification_id!, ev.id)}
                               className="flex-1"
                             >
                               <X className="w-4 h-4 mr-2" />
                               Refuser
                             </Button>
                           </div>
                         )}
                       </div>
                     ))
                )}
              </div>
            </div>
          ) : eventsToShow.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement.</p>
          ) : (
             <div className="space-y-3">
               {eventsToShow.map((ev) => (
                 <div key={ev.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <div className="flex items-start gap-3">
                         <div className="flex flex-col gap-1">
                           <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold shadow-sm">
                             {new Date(ev.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                           </span>
                           <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold shadow-sm">
                             {new Date(ev.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </div>
                         <div className="flex-1">
                           <div className="font-semibold text-gray-900 text-lg">{ev.title}</div>
                           {ev.end_at && (
                             <div className="text-sm text-gray-600 mt-1">
                               Jusqu'à {new Date(ev.end_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                             </div>
                           )}
                           {ev.description && (
                             <div className="text-sm text-gray-600 mt-2">{ev.description}</div>
                           )}
                           {ev.location && (
                             <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-sm">
                               <span>📍</span>
                               <span>{ev.location}</span>
                             </div>
                           )}
                           {ev._candidate_event && ev._notification_status && (
                             <div className="mt-2">
                               <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                 ev._notification_status === 'accepted' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300' :
                                 ev._notification_status === 'declined' ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300' :
                                 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300'
                               }`}>
                                 {ev._notification_status === 'accepted' ? '✓ Accepté' :
                                  ev._notification_status === 'declined' ? '✗ Refusé' : '⏳ En attente'}
                               </span>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex gap-2 flex-wrap">
                     {ev.video_url && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => window.open(ev.video_url, '_blank')}
                       >
                         <Video className="w-4 h-4 mr-2" />
                         Visio
                       </Button>
                     )}
                     
                     {ev.drive_url && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => window.open(ev.drive_url, '_blank')}
                       >
                         <FolderOpen className="w-4 h-4 mr-2" />
                         Drive
                       </Button>
                     )}
                     
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         const googleUrl = generateGoogleCalendarUrl({
                           title: ev.title,
                           description: ev.description,
                           start_at: ev.start_at,
                           end_at: ev.end_at,
                           location: ev.location,
                           video_url: ev.video_url
                         });
                         window.open(googleUrl, '_blank');
                       }}
                     >
                       <CalendarIcon className="w-4 h-4 mr-2" />
                       Google Agenda
                     </Button>
                     
                     {!ev._candidate_event && (
                       <>
                         <Button variant="outline" size="sm" onClick={() => handleEdit(ev)}>
                           <Edit2 className="h-4 w-4 mr-2" />
                           Modifier
                         </Button>
                         <Button variant="outline" size="sm" onClick={() => handleDelete(ev.id)}>
                           <Trash2 className="h-4 w-4 mr-2" />
                           Supprimer
                         </Button>
                       </>
                     )}
                   </div>
                   
                   {ev._candidate_event && ev._notification_status === 'pending' && ev._notification_id && (
                     <div className="flex gap-2">
                       <Button
                         variant="default"
                         size="sm"
                         onClick={() => handleAcceptNotification(ev._notification_id!, ev.id)}
                         className="flex-1"
                       >
                         <Check className="w-4 h-4 mr-2" />
                         Accepter
                       </Button>
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => handleDeclineNotification(ev._notification_id!, ev.id)}
                         className="flex-1"
                       >
                         <X className="w-4 h-4 mr-2" />
                         Refuser
                       </Button>
                     </div>
                   )}
                 </div>
               ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}