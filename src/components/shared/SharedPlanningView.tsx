import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateGoogleCalendarUrl } from "@/utils/googleCalendar";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Trash2, List, Calendar as CalendarIcon, Plus, Edit2, ExternalLink, Check, X, Video, FolderOpen } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

interface Project { id: string; title: string }
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
  const { acceptEvent, declineEvent } = useNotifications();
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
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Membres d'équipe
  const [teamMembers, setTeamMembers] = useState<{ email: string; name: string }[]>([]);
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
  const loadTeamMembersForProject = async (currentProjectId: string) => {
    if (currentProjectId) {
      try {
        // Get current user email
        const { data: userData } = await supabase.auth.getUser();
        const userEmail = userData.user?.email;

        const { data, error } = await supabase
          .from("project_teams")
          .select("email, first_name, last_name")
          .eq("project_id", currentProjectId);
        if (error) {
          console.error("load team members error", error);
          setTeamMembers([]);
        } else {
          const members = (data as any[]).map((r) => ({
            email: r.email,
            name: [r.first_name, r.last_name].filter(Boolean).join(" "),
          }))
          .filter((m) => m.email)
          .filter((m) => m.email !== userEmail); // Exclude current user
          setTeamMembers(members);
        }
      } catch (err) {
        console.error("Error loading team members:", err);
        setTeamMembers([]);
      }
    } else {
      setTeamMembers([]);
    }
  };

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

  useEffect(() => {
    loadTeamMembersForProject(projectId);
  }, [projectId]);

  // Load team members when project changes in edit mode
  useEffect(() => {
    if (isEditDialogOpen && projectId) {
      loadTeamMembersForProject(projectId);
    }
  }, [projectId, isEditDialogOpen]);

  const loadAllEvents = async () => {
    if (!projects.length) {
      setAllEvents([]);
      return;
    }

    setLoading(true);
    try {
      const projectIds = projects.map(p => p.id);
      
      // Load regular project events
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
  }, [projects]);

  const handleCreate = async () => {
    if (!projectId || !title || !date || !startTime) {
      toast({ title: "Champs manquants", description: "Titre, date et heure de début requis" });
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
          const rows = emails.map((email) => ({ event_id: eventId, email }));
          const { error: attErr } = await supabase
            .from("project_event_attendees")
            .insert(rows);
          if (attErr) console.error("attendees insert error", attErr);
          
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
    
    // Load team members for the event's project immediately
    await loadTeamMembersForProject(event.project_id);
    
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
          const rows = emails.map((email) => ({ event_id: editingEvent.id, email }));
          const { error: attErr } = await supabase
            .from("project_event_attendees")
            .insert(rows);
          if (attErr) console.error("attendees update error", attErr);
          
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
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Planning</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun profil candidat trouvé. Veuillez contacter un administrateur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Planning</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {mode === 'candidate' 
                ? "Aucun projet assigné. Votre planning apparaîtra ici une fois que vous serez assigné à des projets."
                : "Aucun projet trouvé. Créez un projet pour commencer à planifier des événements."
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with project select, view toggle, and new event CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Planning</h2>
          </div>
          
          <Select value={filterProjectId} onValueChange={(value) => {
            setFilterProjectId(value);
            setProjectId(value === "all" ? (projects[0]?.id || "") : value);
          }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sélectionner un projet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="rounded-l-none"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvel événement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby="new-event-desc">
              <DialogHeader>
                <DialogTitle>Nouvel événement</DialogTitle>
                <DialogDescription id="new-event-desc">
                  Créez un nouvel événement pour votre projet. Vous pouvez inviter les membres de l'équipe.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
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
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fin (optionnel)</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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
                    disabled={teamMembers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={teamMembers.length ? "Ajouter depuis l'équipe" : "Aucune équipe"} />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.email} value={m.email}>{m.name || m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea value={attendeesEmails} onChange={(e) => setAttendeesEmails(e.target.value)} placeholder="email1@ex.com, email2@ex.com" />
                </div>

                <Button onClick={handleCreate} disabled={!projectId || loading} className="w-full">
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="edit-event-desc">
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
            <DialogDescription id="edit-event-desc">
              Modifiez les détails de cet événement. Les participants seront automatiquement notifiés des changements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
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
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fin (optionnel)</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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
                disabled={teamMembers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={teamMembers.length ? "Ajouter depuis l'équipe" : "Aucune équipe"} />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.email} value={m.email}>{m.name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea value={attendeesEmails} onChange={(e) => setAttendeesEmails(e.target.value)} placeholder="email1@ex.com, email2@ex.com" />
            </div>

            <Button onClick={handleUpdate} disabled={!projectId || loading} className="w-full">
              Modifier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  eventDay: "bg-primary/20 text-primary border-primary/40 border-2",
                  today: "bg-accent text-accent-foreground font-bold ring-2 ring-accent",
                  selected: "bg-secondary text-secondary-foreground ring-2 ring-secondary"
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
                       <div key={ev.id} className="border rounded-md p-3 space-y-3">
                         <div className="flex items-start justify-between">
                           <div className="flex-1">
                             <div className="font-medium">{ev.title}</div>
                             <div className="text-sm text-muted-foreground">
                               {new Date(ev.start_at).toLocaleString()} {ev.end_at ? `→ ${new Date(ev.end_at).toLocaleTimeString()}` : ""}
                             </div>
                             {ev.description && (
                               <div className="text-sm text-muted-foreground mt-1">{ev.description}</div>
                             )}
                             {ev.location && (
                               <div className="text-sm text-muted-foreground">📍 {ev.location}</div>
                             )}
                             {ev._candidate_event && ev._notification_status && (
                               <div className="mt-2">
                                 <span className={`px-2 py-1 rounded text-xs ${
                                   ev._notification_status === 'accepted' ? 'bg-green-100 text-green-800' :
                                   ev._notification_status === 'declined' ? 'bg-red-100 text-red-800' :
                                   'bg-yellow-100 text-yellow-800'
                                 }`}>
                                   {ev._notification_status === 'accepted' ? 'Accepté' :
                                    ev._notification_status === 'declined' ? 'Refusé' : 'En attente'}
                                 </span>
                               </div>
                             )}
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
                 <div key={ev.id} className="border rounded-md p-3 space-y-3">
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <div className="font-medium">{ev.title}</div>
                       <div className="text-sm text-muted-foreground">
                         {new Date(ev.start_at).toLocaleString()} {ev.end_at ? `→ ${new Date(ev.end_at).toLocaleTimeString()}` : ""}
                       </div>
                       {ev.description && (
                         <div className="text-sm text-muted-foreground mt-1">{ev.description}</div>
                       )}
                       {ev.location && (
                         <div className="text-sm text-muted-foreground">📍 {ev.location}</div>
                       )}
                       {ev._candidate_event && ev._notification_status && (
                         <div className="mt-2">
                           <span className={`px-2 py-1 rounded text-xs ${
                             ev._notification_status === 'accepted' ? 'bg-green-100 text-green-800' :
                             ev._notification_status === 'declined' ? 'bg-red-100 text-red-800' :
                             'bg-yellow-100 text-yellow-800'
                           }`}>
                             {ev._notification_status === 'accepted' ? 'Accepté' :
                              ev._notification_status === 'declined' ? 'Refusé' : 'En attente'}
                           </span>
                         </div>
                       )}
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