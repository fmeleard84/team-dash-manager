import { useState, useEffect } from "react";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Users, 
  Edit2, 
  Save,
  X,
  User,
  Mail,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'resource';
  response_status?: 'accepted' | 'declined' | 'pending';
}

interface EventData {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  location?: string;
  video_url?: string;
  created_by: string;
  created_at: string;
  project?: {
    title: string;
  };
  project_event_attendees?: Array<{
    user_id: string;
    email?: string;
    response_status: 'accepted' | 'declined' | 'pending';
    required: boolean;
    role?: string;
  }>;
}

interface ViewEventDialogProps {
  open: boolean;
  eventId: string;
  projectTitle?: string;
  onClose: () => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
  canEdit?: boolean;
}

export function ViewEventDialog({ 
  open, 
  eventId,
  projectTitle: initialProjectTitle,
  onClose, 
  onEventUpdated,
  onEventDeleted,
  canEdit = false
}: ViewEventDialogProps) {
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Champs éditables
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [generateVideoLink, setGenerateVideoLink] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Charger les données de l'événement
  useEffect(() => {
    if (open && eventId) {
      loadEventData();
    }
  }, [open, eventId]);

  // Charger les membres de l'équipe quand on a le project_id
  useEffect(() => {
    if (eventData?.project_id) {
      loadTeamMembers();
    }
  }, [eventData?.project_id]);

  // Générer automatiquement l'URL Jitsi en mode édition
  useEffect(() => {
    if (generateVideoLink && title && isEditMode) {
      const projectTitle = eventData?.project?.title || initialProjectTitle || "project";
      const roomName = `${projectTitle}-${title}-${Date.now()}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .slice(0, 50);
      setVideoUrl(`https://meet.jit.si/${roomName}`);
    }
  }, [generateVideoLink, title, isEditMode, eventData, initialProjectTitle]);

  const loadEventData = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('project_events')
        .select(`
          *,
          project:projects(title),
          project_event_attendees(*)
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;

      setEventData(data);
      
      // Initialiser les champs éditables
      setTitle(data.title);
      setDescription(data.description || "");
      
      const startDate = new Date(data.start_at);
      setDate(startDate.toISOString().slice(0, 10));
      setStartTime(startDate.toTimeString().slice(0, 5));
      
      const endDate = new Date(data.end_at);
      setEndTime(endDate.toTimeString().slice(0, 5));
      
      setLocation(data.location || "");
      setVideoUrl(data.video_url || "");
      setGenerateVideoLink(false);

    } catch (error) {
      console.error('Erreur chargement événement:', error);
      toast.error("Erreur lors du chargement de l'événement");
    } finally {
      setLoadingData(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', eventData!.project_id)
        .single();

      if (!project) return;

      const members: TeamMember[] = [];

      // Ajouter le client (owner)
      if (project.owner_id) {
        const { data: clientProfile } = await supabase
          .from('client_profiles')
          .select('id, email, first_name, last_name')
          .eq('id', project.owner_id)
          .single();

        if (clientProfile) {
          const attendee = eventData?.project_event_attendees?.find(
            a => a.user_id === clientProfile.id
          );
          members.push({
            ...clientProfile,
            role: 'client',
            response_status: attendee?.response_status || 'pending'
          });
        }
      }

      // Ajouter les candidats acceptés
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          candidate_id,
          candidate_profiles (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('project_id', eventData!.project_id)
        .eq('booking_status', 'accepted');

      if (assignments) {
        assignments.forEach((assignment: any) => {
          if (assignment.candidate_profiles) {
            const attendee = eventData?.project_event_attendees?.find(
              a => a.user_id === assignment.candidate_profiles.id
            );
            members.push({
              ...assignment.candidate_profiles,
              role: 'resource',
              response_status: attendee?.response_status || 'pending'
            });
          }
        });
      }

      setTeamMembers(members);
      
      // En mode édition, initialiser les membres sélectionnés
      if (isEditMode && eventData?.project_event_attendees) {
        const selectedIds = eventData.project_event_attendees.map(a => a.user_id);
        setSelectedMembers(selectedIds);
      }

    } catch (error) {
      console.error('Erreur chargement équipe:', error);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (!title || !date || !startTime || !endTime) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      // Créer les dates complètes
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      // Mettre à jour l'événement
      const { error: eventError } = await supabase
        .from('project_events')
        .update({
          title,
          description,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          location,
          video_url: generateVideoLink ? videoUrl : (videoUrl || null)
        })
        .eq('id', eventId);

      if (eventError) throw eventError;

      // Mettre à jour les participants
      // D'abord supprimer les anciens
      await supabase
        .from('project_event_attendees')
        .delete()
        .eq('event_id', eventId);

      // Ajouter les nouveaux
      if (selectedMembers.length > 0) {
        const attendees = selectedMembers.map(userId => {
          const member = teamMembers.find(m => m.id === userId);
          return {
            event_id: eventId,
            user_id: userId,
            role: member?.role || 'participant',
            required: true,
            response_status: 'pending'
          };
        });

        // Insert new attendees - duplicates will be handled by unique constraint
        await supabase
          .from('project_event_attendees')
          .insert(attendees);
      }

      toast.success("Événement mis à jour avec succès!");
      setIsEditMode(false);
      if (onEventUpdated) onEventUpdated();
      await loadEventData(); // Recharger les données

    } catch (error) {
      console.error('Erreur mise à jour événement:', error);
      toast.error("Erreur lors de la mise à jour de l'événement");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success("Événement supprimé avec succès");
      if (onEventDeleted) onEventDeleted();
      onClose();

    } catch (error) {
      console.error('Erreur suppression événement:', error);
      toast.error("Erreur lors de la suppression de l'événement");
    } finally {
      setLoading(false);
    }
  };

  const getResponseIcon = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getResponseBadge = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-700">Accepté</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-700">Refusé</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const projectTitle = eventData?.project?.title || initialProjectTitle || "Projet";

  return (
    <FullScreenModal
      isOpen={open}
      onClose={onClose}
      title={isEditMode ? "Modifier l'événement" : eventData?.title || "Événement"}
      description={`Projet : ${projectTitle}`}
      actions={
        isEditMode ? (
          <ModalActions
            onCancel={() => {
              setIsEditMode(false);
              loadEventData(); // Recharger les données originales
            }}
            onSave={handleSave}
            cancelText="Annuler"
            saveText={loading ? "Enregistrement..." : "Enregistrer"}
            isSaving={loading}
            customActions={
              <div className="flex items-center gap-2 text-emerald-600 mr-4">
                <Edit2 className="w-5 h-5" />
                <span className="font-medium">Mode édition</span>
              </div>
            }
          />
        ) : (
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Supprimer
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )
      }
    >
      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Chargement de l'événement...</div>
        </div>
      ) : isEditMode ? (
        // Mode édition
        <div className="space-y-6">
          {/* Informations de base */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations de l'événement
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">
                  Titre de l'événement <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Réunion de suivi, Point d'équipe..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ordre du jour, objectifs de la réunion..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Date et heure */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Date et horaire
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-start-time">
                  Heure de début <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1"
                  step="60"
                  pattern="[0-9]{2}:[0-9]{2}"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-end-time">
                  Heure de fin <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1"
                  step="60"
                  pattern="[0-9]{2}:[0-9]{2}"
                />
              </div>
            </div>
          </div>

          {/* Lieu et visio */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Lieu et visioconférence
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-location">Lieu (optionnel)</Label>
                <Input
                  id="edit-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Adresse ou salle de réunion"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-generate-video"
                  checked={generateVideoLink}
                  onCheckedChange={(checked) => setGenerateVideoLink(checked as boolean)}
                />
                <Label htmlFor="edit-generate-video" className="cursor-pointer">
                  Générer un nouveau lien Jitsi Meet
                </Label>
              </div>

              {videoUrl && (
                <div className="bg-emerald-50 rounded-lg p-3 flex items-center gap-2">
                  <Video className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700 flex-1 truncate">
                    {videoUrl}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Participants
            </h3>
            
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`edit-member-${member.id}`}
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <Label
                      htmlFor={`edit-member-${member.id}`}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {member.first_name[0]}{member.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </Label>
                  </div>
                  <Badge variant={member.role === 'client' ? 'default' : 'secondary'}>
                    {member.role === 'client' ? 'Client' : 'Ressource'}
                  </Badge>
                </div>
              ))}
              
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">
                  {selectedMembers.length} participant(s) sélectionné(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Mode visualisation
        <div className="space-y-6">
          {/* Informations principales */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations de l'événement
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Titre</p>
                <p className="text-lg font-medium">{eventData?.title}</p>
              </div>

              {eventData?.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{eventData.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">
                      {eventData && format(new Date(eventData.start_at), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Horaire</p>
                    <p className="font-medium">
                      {eventData && (
                        <>
                          {format(new Date(eventData.start_at), "HH:mm")} - 
                          {format(new Date(eventData.end_at), "HH:mm")}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lieu et visio */}
          {(eventData?.location || eventData?.video_url) && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Lieu et accès
              </h3>
              
              <div className="space-y-4">
                {eventData.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Lieu</p>
                      <p className="font-medium">{eventData.location}</p>
                    </div>
                  </div>
                )}

                {eventData.video_url && (
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-emerald-600" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Lien de visioconférence</p>
                        <a 
                          href={eventData.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 font-medium break-all"
                        >
                          {eventData.video_url}
                        </a>
                      </div>
                    </div>
                    <Button
                      className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => window.open(eventData.video_url, '_blank')}
                    >
                      Rejoindre la visio
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Participants ({eventData?.project_event_attendees?.length || 0})
            </h3>
            
            <div className="space-y-3">
              {eventData?.project_event_attendees && eventData.project_event_attendees.length > 0 ? (
                eventData.project_event_attendees.map((attendee: any) => {
                  // Chercher les infos complètes dans teamMembers si disponible
                  const member = teamMembers.find(m => m.id === attendee.user_id);
                  
                  return (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {member ? (
                            `${member.first_name[0]}${member.last_name[0]}`
                          ) : (
                            'U'
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {member ? `${member.first_name} ${member.last_name}` : 'Participant'}
                          </p>
                          {member?.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getResponseBadge(attendee.response_status)}
                        {member && (
                          <Badge variant={member.role === 'client' ? 'default' : 'secondary'}>
                            {member.role === 'client' ? 'Client' : 'Ressource'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Aucun participant pour cet événement
                </p>
              )}
            </div>
          </div>

          {/* Métadonnées */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p>
              Créé le {eventData && format(new Date(eventData.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
            </p>
          </div>
        </div>
      )}
    </FullScreenModal>
  );
}