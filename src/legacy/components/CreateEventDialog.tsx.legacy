import { useState, useEffect } from "react";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, Video, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface CreateEventDialogProps {
  open: boolean;
  projectId: string;
  projectTitle: string;
  onClose: () => void;
  onEventCreated: () => void;
  userType?: 'client' | 'candidate';
}

interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'resource';
}

export function CreateEventDialog({ 
  open, 
  projectId, 
  projectTitle, 
  onClose, 
  onEventCreated,
  userType = 'client'
}: CreateEventDialogProps) {
  
  // Date par défaut: demain à 10h
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
  const defaultStartTime = "10:00";
  const defaultEndTime = "11:00";
  
  // Fonction pour formater la date en français
  const formatDateFr = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };
  
  // Fonction pour parser une date française vers ISO
  const parseDateFr = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [location, setLocation] = useState("");
  const [generateVideoLink, setGenerateVideoLink] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Générer automatiquement l'URL Jitsi
  useEffect(() => {
    if (generateVideoLink && title) {
      const roomName = `${projectTitle}-${title}-${Date.now()}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .slice(0, 50);
      setVideoUrl(`https://meet.jit.si/${roomName}`);
    }
  }, [generateVideoLink, title, projectTitle]);

  // Charger les membres de l'équipe
  useEffect(() => {
    if (open && projectId) {
      loadTeamMembers();
    }
  }, [open, projectId]);

  const loadTeamMembers = async () => {
    setLoadingMembers(true);
    try {
      // Récupérer le projet pour avoir l'owner_id
      const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
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
          members.push({
            ...clientProfile,
            role: 'client'
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
        .eq('project_id', projectId)
        .eq('booking_status', 'accepted');

      if (assignments) {
        assignments.forEach((assignment: any) => {
          if (assignment.candidate_profiles) {
            members.push({
              ...assignment.candidate_profiles,
              role: 'resource'
            });
          }
        });
      }

      setTeamMembers(members);
      // Sélectionner tous les membres par défaut (utiliser les IDs)
      setSelectedMembers(members.map(m => m.id));

    } catch (error) {
      console.error('Erreur chargement équipe:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!title || !date || !startTime || !endTime) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      // Créer les dates complètes
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      // Créer l'événement
      const { data: event, error: eventError } = await supabase
        .from('project_events')
        .insert({
          project_id: projectId,
          title,
          description,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          location,
          video_url: generateVideoLink ? videoUrl : null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (eventError) {
        console.error('❌ Erreur création événement:', eventError);
        throw eventError;
      }
      
      console.log('✅ Événement créé:', event);

      // Ajouter les participants
      if (event && selectedMembers.length > 0) {
        // Préparer les participants avec leurs IDs universels
        const attendees = selectedMembers.map(userId => {
          // Trouver le membre correspondant
          const member = teamMembers.find(m => m.id === userId);
          return {
            event_id: event.id,
            user_id: userId, // Utiliser l'ID universel
            role: member?.role || 'participant', // 'client' ou 'resource'
            required: true,
            response_status: 'pending'
          };
        });

        console.log('📤 Insertion des participants (sans email):', attendees);
        
        // Approche simple : supprimer puis insérer
        // Évite tous les problèmes de syntaxe UPSERT avec Supabase/PostgREST
        
        // 1. Supprimer les participants existants pour cet événement
        await supabase
          .from('project_event_attendees')
          .delete()
          .eq('event_id', event.id);
        
        // 2. Insérer tous les participants en une seule requête
        if (attendees.length > 0) {
          const { data, error } = await supabase
            .from('project_event_attendees')
            .insert(attendees)
            .select(); // Ajout du select() pour éviter le paramètre columns dans l'URL
          
          if (error) {
            console.error('❌ Erreur insertion participants:', error);
            toast.error(`Erreur ajout participants: ${error.message}`);
            return;
          }
        }
        
        console.log('✅ Participants ajoutés avec succès !');
        console.log(`${attendees.length} participants ajoutés`);

        // Créer des notifications pour les candidats
        const candidateNotifications = teamMembers
          .filter(m => m.role === 'resource' && selectedMembers.includes(m.id))
          .map(m => ({
            candidate_id: m.id,
            project_id: projectId,
            event_id: event.id,
            title: `Invitation: ${title}`,
            description: `Vous êtes invité à l'événement "${title}"`,
            event_date: startDateTime.toISOString(),
            location,
            video_url: generateVideoLink ? videoUrl : null,
            status: 'pending'
          }));

        if (candidateNotifications.length > 0) {
          await supabase
            .from('candidate_event_notifications')
            .insert(candidateNotifications);
        }
      }

      toast.success("Événement créé avec succès!");
      onEventCreated();
      handleClose();

    } catch (error) {
      console.error('Erreur création événement:', error);
      toast.error("Erreur lors de la création de l'événement");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Réinitialiser le formulaire
    setTitle("");
    setDescription("");
    setDate(defaultDate);
    setStartTime(defaultStartTime);
    setEndTime(defaultEndTime);
    setLocation("");
    setGenerateVideoLink(true);
    setVideoUrl("");
    setSelectedMembers([]);
    onClose();
  };

  return (
    <FullScreenModal
      isOpen={open}
      onClose={handleClose}
      title="Créer un événement"
      description={`Projet : ${projectTitle}`}
      actions={
        <ModalActions
          onCancel={handleClose}
          onSave={handleCreate}
          cancelText="Annuler"
          saveText={loading ? "Création..." : "Créer l'événement"}
          isSaving={loading}
          customActions={
            <div className="flex items-center gap-2 text-emerald-600 mr-4">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Nouvel événement</span>
            </div>
          }
        />
      }
    >
      <div className="space-y-6">
        {/* Informations de base */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informations de l'événement
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">
                Titre de l'événement <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Réunion de suivi, Point d'équipe..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
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
              <Label htmlFor="date">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="start-time">
                Heure de début <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
                step="60"  // Forcer les pas de 1 minute
                pattern="[0-9]{2}:[0-9]{2}"  // Format 24h
              />
            </div>
            
            <div>
              <Label htmlFor="end-time">
                Heure de fin <span className="text-red-500">*</span>
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
                step="60"  // Forcer les pas de 1 minute
                pattern="[0-9]{2}:[0-9]{2}"  // Format 24h
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
              <Label htmlFor="location">Lieu (optionnel)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Adresse ou salle de réunion"
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-video"
                checked={generateVideoLink}
                onCheckedChange={(checked) => setGenerateVideoLink(checked as boolean)}
              />
              <Label htmlFor="generate-video" className="cursor-pointer">
                Générer automatiquement un lien Jitsi Meet
              </Label>
            </div>

            {generateVideoLink && videoUrl && (
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
          
          {loadingMembers ? (
            <p className="text-gray-500">Chargement de l'équipe...</p>
          ) : teamMembers.length === 0 ? (
            <p className="text-gray-500">Aucun membre dans l'équipe</p>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <Label
                      htmlFor={`member-${member.id}`}
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
          )}
        </div>
      </div>
    </FullScreenModal>
  );
}