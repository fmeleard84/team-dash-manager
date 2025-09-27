/**
 * Implémentation des fonctions de gestion des réunions
 */

import { supabase } from '@/integrations/supabase/client';

export interface MeetingData {
  title: string;
  type: string;
  date: string;
  time: string;
  duration_minutes: number;
  participants: string[];
  project_id?: string;
  description?: string;
  location: string;
  meeting_url?: string;
}

export interface AvailableSlot {
  date: string;
  time: string;
  duration_minutes: number;
  participants_available: string[];
}

export interface CreateMeetingResult {
  success: boolean;
  meetingId?: string;
  message: string;
  error?: string;
}

export interface FindSlotResult {
  success: boolean;
  slots: AvailableSlot[];
  message: string;
  error?: string;
}

/**
 * Créer une réunion dans le planning
 */
export async function create_meeting(args: {
  title: string;
  type?: string;
  date: string;
  time: string;
  duration_minutes?: number;
  participants?: string[];
  project_id?: string;
  description?: string;
  location?: string;
  meeting_url?: string;
  send_invites?: boolean;
  reminder_minutes?: number;
}): Promise<CreateMeetingResult> {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        message: 'Utilisateur non authentifié',
        error: userError?.message
      };
    }

    // Construire la date/heure complète
    const startDateTime = new Date(`${args.date}T${args.time}`);
    const endDateTime = new Date(startDateTime.getTime() + (args.duration_minutes || 60) * 60000);

    // Préparer les données de l'événement
    const eventData = {
      project_id: args.project_id,
      title: args.title,
      description: args.description || '',
      event_type: args.type || 'custom',
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      location: args.location || 'online',
      meeting_url: args.meeting_url,
      created_by: user.id,
      reminder_minutes: args.reminder_minutes || 15,
      metadata: {
        participants: args.participants || [],
        send_invites: args.send_invites !== false
      }
    };

    // Créer l'événement
    const { data: event, error: eventError } = await supabase
      .from('project_events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      console.error('Error creating meeting:', eventError);
      return {
        success: false,
        message: 'Error lors de la création de la réunion',
        error: eventError.message
      };
    }

    // Ajouter les participants
    if (args.participants && args.participants.length > 0 && event) {
      const attendeesData = args.participants.map(participant => ({
        event_id: event.id,
        user_id: participant,
        response_status: 'pending'
      }));

      const { error: attendeesError } = await supabase
        .from('project_event_attendees')
        .insert(attendeesData);

      if (attendeesError) {
        console.error('Error adding attendees:', attendeesError);
      }
    }

    // Créer les notifications si demandé
    if (args.send_invites && args.participants && event) {
      for (const participantId of args.participants) {
        await supabase
          .from('Notifications')
          .insert({
            user_id: participantId,
            type: 'meeting_invite',
            title: `Invitation réunion: ${args.title}`,
            message: `Vous êtes invité à la réunion "${args.title}" le ${startDateTime.toLocaleDateString('fr-FR')} à ${args.time}`,
            metadata: {
              event_id: event.id,
              project_id: args.project_id
            }
          });
      }
    }

    return {
      success: true,
      meetingId: event?.id,
      message: `Réunion "${args.title}" créée avec succès pour le ${startDateTime.toLocaleDateString('fr-FR')} à ${args.time}`
    };

  } catch (error) {
    console.error('Error in create_meeting:', error);
    return {
      success: false,
      message: 'An error occurred lors de la création de la réunion',
      error: error instanceof Error ? error.message : 'Error inconnue'
    };
  }
}

/**
 * Trouver un créneau disponible pour une réunion
 */
export async function find_available_slot(args: {
  participants: string[];
  duration_minutes?: number;
  date_range?: { start?: string; end?: string };
  preferred_time?: string;
}): Promise<FindSlotResult> {
  try {
    // Définir la période de recherche
    const startDate = args.date_range?.start ? new Date(args.date_range.start) : new Date();
    const endDate = args.date_range?.end ? new Date(args.date_range.end) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 semaines
    
    // Récupérer les événements existants des participants
    const { data: existingEvents, error } = await supabase
      .from('project_event_attendees')
      .select(`
        event_id,
        project_events (
          start_date,
          end_date
        )
      `)
      .in('user_id', args.participants)
      .gte('project_events.start_date', startDate.toISOString())
      .lte('project_events.end_date', endDate.toISOString());

    if (error) {
      console.error('Error fetching existing events:', error);
    }

    // Créer une liste des créneaux occupés
    const busySlots = existingEvents?.map(e => ({
      start: new Date(e.project_events.start_date),
      end: new Date(e.project_events.end_date)
    })) || [];

    // Générer des créneaux disponibles
    const availableSlots: AvailableSlot[] = [];
    const duration = args.duration_minutes || 60;
    
    // Parcourir chaque jour de la période
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      
      // Créneaux selon la préférence
      const slots = args.preferred_time === 'morning' 
        ? ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
        : args.preferred_time === 'afternoon'
        ? ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
        : ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
      
      for (const timeSlot of slots) {
        const slotStart = new Date(`${d.toISOString().split('T')[0]}T${timeSlot}`);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        
        // Vérifier si le créneau est libre
        const isAvailable = !busySlots.some(busy => 
          (slotStart >= busy.start && slotStart < busy.end) ||
          (slotEnd > busy.start && slotEnd <= busy.end) ||
          (slotStart <= busy.start && slotEnd >= busy.end)
        );
        
        if (isAvailable) {
          availableSlots.push({
            date: d.toISOString().split('T')[0],
            time: timeSlot,
            duration_minutes: duration,
            participants_available: args.participants
          });
        }
        
        // Limiter à 5 créneaux
        if (availableSlots.length >= 5) break;
      }
      
      if (availableSlots.length >= 5) break;
    }

    return {
      success: true,
      slots: availableSlots.slice(0, 5),
      message: availableSlots.length > 0 
        ? `J'ai trouvé ${availableSlots.length} créneaux disponibles`
        : 'Aucun créneau disponible trouvé dans la période demandée'
    };

  } catch (error) {
    console.error('Error in find_available_slot:', error);
    return {
      success: false,
      slots: [],
      message: 'Une erreur est survenue lors de la recherche de créneaux',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Créer un événement de kickoff pour un projet
 */
export async function create_kickoff_meeting(projectId: string): Promise<CreateMeetingResult> {
  try {
    // Récupérer les informations du projet
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        hr_resource_assignments (
          candidate_profile_id
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return {
        success: false,
        message: 'Projet non trouvé',
        error: projectError?.message
      };
    }

    // Récupérer tous les participants
    const participants = project.hr_resource_assignments
      .filter(a => a.candidate_profile_id)
      .map(a => a.candidate_profile_id);

    // Créer la réunion de kickoff dans 2 jours ouvrés
    const kickoffDate = new Date();
    kickoffDate.setDate(kickoffDate.getDate() + 2);
    // Si c'est un weekend, reporter au lundi
    if (kickoffDate.getDay() === 6) kickoffDate.setDate(kickoffDate.getDate() + 2);
    if (kickoffDate.getDay() === 0) kickoffDate.setDate(kickoffDate.getDate() + 1);

    return await create_meeting({
      title: `Kickoff - ${project.name}`,
      type: 'kickoff',
      date: kickoffDate.toISOString().split('T')[0],
      time: '10:00',
      duration_minutes: 120,
      participants: participants,
      project_id: projectId,
      description: `Réunion de lancement du projet ${project.name}. 
Ordre du jour:
- Présentation du projet et des objectifs
- Tour de table de l'équipe
- Méthodologie de travail
- Planning et jalons principaux
- Questions/Réponses`,
      location: 'online',
      send_invites: true,
      reminder_minutes: 1440 // 24h avant
    });

  } catch (error) {
    console.error('Error in create_kickoff_meeting:', error);
    return {
      success: false,
      message: 'Erreur lors de la création de la réunion de kickoff',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}