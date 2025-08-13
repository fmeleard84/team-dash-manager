import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useCandidateProjects } from "@/hooks/useCandidateProjects";

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
}

export default function CandidatePlanningView() {
  const { toast } = useToast();
  const { projects, candidateId } = useCandidateProjects();
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

  // Filter and views
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const eventsToShow = useMemo(
    () => (filterProjectId === "all" ? allEvents : allEvents.filter((e) => e.project_id === filterProjectId)),
    [allEvents, filterProjectId]
  );
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Team members for the selected project
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
  useEffect(() => {
    if (projectId) {
      (async () => {
        const { data, error } = await supabase
          .from("candidate_project_assignments")
          .select("status, candidate_profiles!inner(email, first_name, last_name)")
          .eq("project_id", projectId)
          .eq("status", "accepted");
        if (error) {
          console.error("load team members error", error);
          setTeamMembers([]);
        } else {
          const members = (data as any[]).map((r) => ({
            email: r.candidate_profiles?.email as string,
            name: [r.candidate_profiles?.first_name, r.candidate_profiles?.last_name].filter(Boolean).join(" "),
          })).filter((m) => m.email);
          setTeamMembers(members);
        }
      })();
    } else {
      setTeamMembers([]);
    }
  }, [projectId]);

  const loadAllEvents = async () => {
    if (!projects.length) {
      setAllEvents([]);
      return;
    }

    setLoading(true);
    const ids = projects.map((p) => p.id);
    const { data, error } = await supabase
      .from("project_events")
      .select("id,title,description,start_at,end_at,location,video_url,drive_url,project_id")
      .in("project_id", ids)
      .order("start_at", { ascending: true });
    setLoading(false);

    if (error) {
      console.error("load all events error", error);
      toast({ title: "Erreur", description: "Impossible de charger les événements" });
    } else {
      setAllEvents((data || []) as EventRow[]);
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

    if (!candidateId) {
      toast({ title: "Erreur", description: "Profil candidat non trouvé" });
      return;
    }

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
      }
    }

    toast({ title: "Événement créé" });
    setTitle(""); setDescription(""); setDate(""); setStartTime(""); setEndTime(""); setLocation(""); setVideoUrl(""); setDriveUrl(""); setAttendeesEmails("");
    await loadAllEvents();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("project_events").delete().eq("id", id);
    if (error) {
      console.error("delete event error", error);
      toast({ title: "Erreur", description: "Suppression échouée" });
    } else {
      toast({ title: "Événement supprimé" });
      setAllEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  if (!candidateId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Planning</h2>
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
        <h2 className="text-2xl font-bold">Planning</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun projet assigné. Votre planning apparaîtra ici une fois que vous serez assigné à des projets.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Planning</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Nouvel événement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Réunion équipe" />
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

            <Button onClick={handleCreate} disabled={!projectId || loading}>Créer</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Événements à venir</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filtrer par projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les projets</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Vue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">Liste</SelectItem>
                  <SelectItem value="calendar">Calendrier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : viewMode === "calendar" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Calendar selected={selectedDate} onSelect={setSelectedDate} mode="single" className="rounded-md border" />
                <div className="space-y-3">
                  <div className="text-sm font-medium">Événements du {selectedDate ? selectedDate.toLocaleDateString() : "jour sélectionné"}</div>
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
                        <div key={ev.id} className="flex items-center justify-between border rounded-md p-3">
                          <div>
                            <div className="font-medium">{ev.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(ev.start_at).toLocaleString()} {ev.end_at ? `→ ${new Date(ev.end_at).toLocaleTimeString()}` : ""}
                            </div>
                            <div className="flex gap-3">
                              {ev.video_url && (
                                <a href={ev.video_url} target="_blank" rel="noreferrer" className="text-sm underline">Lien visio</a>
                              )}
                              {ev.drive_url && (
                                <a href={ev.drive_url} target="_blank" rel="noreferrer" className="text-sm underline">Drive</a>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ev.id)} aria-label="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                  <div key={ev.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(ev.start_at).toLocaleString()} {ev.end_at ? `→ ${new Date(ev.end_at).toLocaleTimeString()}` : ""}
                      </div>
                      <div className="flex gap-3">
                        {ev.video_url && (
                          <a href={ev.video_url} target="_blank" rel="noreferrer" className="text-sm underline">Lien visio</a>
                        )}
                        {ev.drive_url && (
                          <a href={ev.drive_url} target="_blank" rel="noreferrer" className="text-sm underline">Drive</a>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ev.id)} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}