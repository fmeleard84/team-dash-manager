/**
 * Service API centralisé pour le module PLANNING
 * Toute la logique d'interaction avec Supabase pour la gestion des événements et planning
 * Utilisé par les hooks React pour éviter les appels directs dans les composants
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ProjectEvent,
  EventAttendee,
  EventNotification,
  Calendar,
  TimeSlot,
  Resource,
  ResourceBooking,
  PlanningStats,
  PlanningAnalytics,
  CreateEventData,
  UpdateEventData,
  CreateCalendarData,
  BookResourceData,
  EventFilters,
  PlanningSearchResult,
  CalendarViewEvent,
  RecurrenceRule
} from '../types';

export class PlanningAPI {
  /**
   * Récupère tous les événements d'un ou plusieurs projets
   */
  static async getProjectEvents(
    projectIds: string | string[],
    filters?: EventFilters
  ): Promise<ProjectEvent[]> {
    try {
      const ids = Array.isArray(projectIds) ? projectIds : [projectIds];

      let queryBuilder = supabase
        .from('project_events')
        .select(`
          *,
          created_by_profile:created_by(first_name, last_name, email),
          event_attendees:project_event_attendees(*),
          resource_bookings(*)
        `)
        .in('project_id', ids)
        .order('start_at', { ascending: true });

      // Appliquer les filtres
      if (filters) {
        if (filters.event_types?.length) {
          queryBuilder = queryBuilder.in('event_type', filters.event_types);
        }
        if (filters.statuses?.length) {
          queryBuilder = queryBuilder.in('status', filters.statuses);
        }
        if (filters.priorities?.length) {
          queryBuilder = queryBuilder.in('priority', filters.priorities);
        }
        if (filters.date_from) {
          queryBuilder = queryBuilder.gte('start_at', filters.date_from);
        }
        if (filters.date_to) {
          queryBuilder = queryBuilder.lte('start_at', filters.date_to);
        }
        if (filters.location) {
          queryBuilder = queryBuilder.ilike('location', `%${filters.location}%`);
        }
        if (filters.has_video_url !== undefined) {
          if (filters.has_video_url) {
            queryBuilder = queryBuilder.not('video_url', 'is', null);
          } else {
            queryBuilder = queryBuilder.is('video_url', null);
          }
        }
        if (filters.created_by) {
          queryBuilder = queryBuilder.eq('created_by', filters.created_by);
        }
        if (filters.search_query) {
          queryBuilder = queryBuilder.or(
            `title.ilike.%${filters.search_query}%,description.ilike.%${filters.search_query}%`
          );
        }
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[PlanningAPI] Error fetching project events:', error);
      throw error;
    }
  }

  /**
   * Récupère un événement complet avec tous ses détails
   */
  static async getEventById(eventId: string): Promise<{
    event: ProjectEvent;
    attendees: EventAttendee[];
    resources: ResourceBooking[];
  }> {
    try {
      // Récupérer l'événement
      const { data: eventData, error: eventError } = await supabase
        .from('project_events')
        .select(`
          *,
          created_by_profile:created_by(first_name, last_name, email)
        `)
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Récupérer les participants
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('project_event_attendees')
        .select(`
          *,
          user_profile:user_id(first_name, last_name, email, avatar_url)
        `)
        .eq('event_id', eventId);

      if (attendeesError) throw attendeesError;

      // Récupérer les ressources réservées
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resource_bookings')
        .select(`
          *,
          resource:resource_id(*)
        `)
        .eq('event_id', eventId);

      if (resourcesError) throw resourcesError;

      return {
        event: eventData,
        attendees: attendeesData || [],
        resources: resourcesData || []
      };
    } catch (error) {
      console.error('[PlanningAPI] Error fetching event by ID:', error);
      throw error;
    }
  }

  /**
   * Crée un nouvel événement avec participants et ressources
   */
  static async createEvent(eventData: CreateEventData): Promise<ProjectEvent> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Créer l'événement principal
      const newEvent = {
        project_id: eventData.project_id,
        title: eventData.title,
        description: eventData.description,
        start_at: eventData.start_at,
        end_at: eventData.end_at,
        location: eventData.location,
        event_type: eventData.event_type,
        priority: eventData.priority || 'medium',
        is_recurring: eventData.is_recurring || false,
        recurrence_rule: eventData.recurrence_rule ? JSON.stringify(eventData.recurrence_rule) : null,
        status: 'scheduled' as const,
        is_public: true,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: eventData.metadata ? JSON.stringify(eventData.metadata) : null
      };

      // Générer l'URL de visio si demandé
      if (eventData.auto_create_video_room) {
        const videoUrl = await this.generateVideoRoomUrl(
          eventData.project_id,
          eventData.start_at,
          eventData.video_platform || 'jitsi'
        );
        newEvent.video_url = videoUrl;
      }

      const { data: createdEvent, error: eventError } = await supabase
        .from('project_events')
        .insert([newEvent])
        .select()
        .single();

      if (eventError) throw eventError;

      // Ajouter les participants
      if (eventData.attendees_emails?.length) {
        await this.addEventAttendees(createdEvent.id, eventData.attendees_emails);
      }

      // Réserver les ressources
      if (eventData.resource_ids?.length) {
        await Promise.all(
          eventData.resource_ids.map(resourceId =>
            this.bookResource({
              resource_id: resourceId,
              event_id: createdEvent.id,
              start_at: eventData.start_at,
              end_at: eventData.end_at || eventData.start_at,
              purpose: `Réservation pour ${eventData.title}`
            })
          )
        );
      }

      // Envoyer les invitations
      if (eventData.attendees_emails?.length) {
        await this.sendEventInvitations(createdEvent.id, eventData.attendees_emails);
      }

      return createdEvent;
    } catch (error) {
      console.error('[PlanningAPI] Error creating event:', error);
      throw error;
    }
  }

  /**
   * Met à jour un événement existant
   */
  static async updateEvent(eventId: string, updateData: UpdateEventData): Promise<ProjectEvent> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const updatedFields = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Sérialiser les objets complexes
      if (updateData.recurrence_rule) {
        updatedFields.recurrence_rule = JSON.stringify(updateData.recurrence_rule);
      }
      if (updateData.metadata) {
        updatedFields.metadata = JSON.stringify(updateData.metadata);
      }

      const { data, error } = await supabase
        .from('project_events')
        .update(updatedFields)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour les participants si fournis
      if (updateData.attendees_emails) {
        // Supprimer les anciens participants
        await supabase
          .from('project_event_attendees')
          .delete()
          .eq('event_id', eventId);

        // Ajouter les nouveaux
        await this.addEventAttendees(eventId, updateData.attendees_emails);

        // Envoyer notifications de mise à jour
        if (updateData.notify_attendees) {
          await this.sendEventUpdateNotifications(eventId);
        }
      }

      return data;
    } catch (error) {
      console.error('[PlanningAPI] Error updating event:', error);
      throw error;
    }
  }

  /**
   * Supprime un événement (avec gestion des événements récurrents)
   */
  static async deleteEvent(
    eventId: string,
    deleteType: 'single' | 'series' | 'future' = 'single'
  ): Promise<void> {
    try {
      // Si suppression d'une série ou des futurs événements
      if (deleteType !== 'single') {
        // TODO: Implémenter la logique pour les événements récurrents
        console.log(`[PlanningAPI] Delete type '${deleteType}' not yet implemented`);
      }

      // Supprimer les participants
      await supabase
        .from('project_event_attendees')
        .delete()
        .eq('event_id', eventId);

      // Supprimer les réservations de ressources
      await supabase
        .from('resource_bookings')
        .delete()
        .eq('event_id', eventId);

      // Supprimer l'événement
      const { error } = await supabase
        .from('project_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('[PlanningAPI] Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Ajoute des participants à un événement
   */
  static async addEventAttendees(eventId: string, emails: string[]): Promise<EventAttendee[]> {
    try {
      const attendeesToInsert = emails.map(email => ({
        event_id: eventId,
        email,
        required: true,
        response_status: 'pending' as const,
        permissions: {
          can_edit_event: false,
          can_invite_others: false,
          can_access_recording: true,
          can_view_notes: true,
          is_organizer: false
        }
      }));

      const { data, error } = await supabase
        .from('project_event_attendees')
        .insert(attendeesToInsert)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[PlanningAPI] Error adding event attendees:', error);
      throw error;
    }
  }

  /**
   * Met à jour la réponse d'un participant
   */
  static async updateAttendeeResponse(
    attendeeId: string,
    responseStatus: EventAttendee['response_status'],
    notes?: string
  ): Promise<EventAttendee> {
    try {
      const { data, error } = await supabase
        .from('project_event_attendees')
        .update({
          response_status: responseStatus,
          response_at: new Date().toISOString(),
          notes
        })
        .eq('id', attendeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[PlanningAPI] Error updating attendee response:', error);
      throw error;
    }
  }

  /**
   * Recherche d'événements avec scoring de pertinence
   */
  static async searchEvents(
    query: string,
    projectIds?: string[],
    filters?: EventFilters
  ): Promise<PlanningSearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('project_events')
        .select(`
          *,
          event_attendees:project_event_attendees(*),
          resource_bookings(*)
        `);

      if (projectIds?.length) {
        queryBuilder = queryBuilder.in('project_id', projectIds);
      }

      // Recherche textuelle
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`
      );

      // Appliquer les filtres additionnels
      if (filters) {
        if (filters.event_types?.length) {
          queryBuilder = queryBuilder.in('event_type', filters.event_types);
        }
        if (filters.date_from) {
          queryBuilder = queryBuilder.gte('start_at', filters.date_from);
        }
        if (filters.date_to) {
          queryBuilder = queryBuilder.lte('start_at', filters.date_to);
        }
      }

      const { data, error } = await queryBuilder
        .order('start_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculer les scores de pertinence et formater les résultats
      return (data || []).map(event => ({
        event,
        attendees: event.event_attendees || [],
        resources: event.resource_bookings || [],
        relevance_score: this.calculateEventRelevanceScore(event, query),
        matched_fields: this.getEventMatchedFields(event, query),
        preview_snippet: this.generateEventPreviewSnippet(event, query)
      })).sort((a, b) => b.relevance_score - a.relevance_score);
    } catch (error) {
      console.error('[PlanningAPI] Error searching events:', error);
      throw error;
    }
  }

  /**
   * Gère les calendriers
   */
  static async getProjectCalendars(projectId: string): Promise<Calendar[]> {
    try {
      const { data, error } = await supabase
        .from('project_calendars')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[PlanningAPI] Error fetching project calendars:', error);
      throw error;
    }
  }

  static async createCalendar(calendarData: CreateCalendarData): Promise<Calendar> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const newCalendar = {
        ...calendarData,
        user_id: user.id,
        timezone: calendarData.timezone || 'Europe/Paris',
        is_default: calendarData.is_default || false,
        is_public: calendarData.is_public || true,
        settings: calendarData.settings ? JSON.stringify(calendarData.settings) : JSON.stringify({
          work_hours: { start_time: '09:00', end_time: '18:00', days: [1, 2, 3, 4, 5] },
          default_event_duration: 60,
          auto_accept_invites: false,
          show_declined_events: false
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('project_calendars')
        .insert([newCalendar])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[PlanningAPI] Error creating calendar:', error);
      throw error;
    }
  }

  /**
   * Gestion des ressources
   */
  static async getAvailableResources(
    startAt: string,
    endAt: string,
    resourceType?: string
  ): Promise<Resource[]> {
    try {
      let queryBuilder = supabase
        .from('resources')
        .select(`
          *,
          bookings:resource_bookings!resource_id(*)
        `)
        .eq('is_active', true);

      if (resourceType) {
        queryBuilder = queryBuilder.eq('resource_type', resourceType);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      // Filtrer les ressources disponibles pour la période demandée
      return (data || []).filter(resource => {
        const conflictingBookings = (resource.bookings || []).filter(booking =>
          booking.booking_status === 'confirmed' &&
          !(new Date(booking.end_at) <= new Date(startAt) ||
            new Date(booking.start_at) >= new Date(endAt))
        );
        return conflictingBookings.length === 0;
      });
    } catch (error) {
      console.error('[PlanningAPI] Error fetching available resources:', error);
      throw error;
    }
  }

  static async bookResource(bookingData: BookResourceData): Promise<ResourceBooking> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const newBooking = {
        ...bookingData,
        booked_by_user_id: user.id,
        booking_status: 'confirmed' as const,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('resource_bookings')
        .insert([newBooking])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[PlanningAPI] Error booking resource:', error);
      throw error;
    }
  }

  /**
   * Statistiques et analytics
   */
  static async getPlanningStats(
    projectId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<PlanningStats> {
    try {
      const { data, error } = await supabase.rpc('get_planning_stats', {
        p_project_id: projectId,
        p_period_start: periodStart,
        p_period_end: periodEnd
      });

      if (error) throw error;
      return data || {
        project_id: projectId,
        period_start: periodStart,
        period_end: periodEnd,
        total_events: 0,
        completed_events: 0,
        cancelled_events: 0,
        total_meeting_hours: 0,
        average_event_duration: 0,
        events_by_type: {},
        events_by_status: {},
        attendance_rate: 0,
        most_active_day: '',
        most_active_hour: 9,
        resource_utilization: {},
        top_attendees: []
      };
    } catch (error) {
      console.error('[PlanningAPI] Error fetching planning stats:', error);
      throw error;
    }
  }

  /**
   * Convertit les événements pour les vues de calendrier
   */
  static async getCalendarViewEvents(
    projectIds: string[],
    startDate: string,
    endDate: string
  ): Promise<CalendarViewEvent[]> {
    try {
      const events = await this.getProjectEvents(projectIds, {
        date_from: startDate,
        date_to: endDate
      });

      return events.map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_at),
        end: event.end_at ? new Date(event.end_at) : undefined,
        allDay: this.isAllDayEvent(event.start_at, event.end_at),
        color: this.getEventColor(event.event_type, event.priority),
        description: event.description,
        location: event.location,
        attendees: [], // Sera rempli par un appel séparé si nécessaire
        resources: [],
        event_type: event.event_type,
        status: event.status,
        priority: event.priority,
        video_url: event.video_url,
        drive_url: event.drive_url,
        is_recurring: event.is_recurring,
        can_edit: true, // TODO: Vérifier les permissions
        can_delete: true // TODO: Vérifier les permissions
      }));
    } catch (error) {
      console.error('[PlanningAPI] Error getting calendar view events:', error);
      throw error;
    }
  }

  // ========================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================

  private static generateVideoRoomUrl(
    projectId: string,
    startAt: string,
    platform: 'jitsi' | 'zoom' | 'teams' | 'meet'
  ): string {
    const cleanProjectId = projectId.substring(0, 8);
    const dateStr = new Date(startAt).toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = new Date(startAt).toISOString().slice(11, 16).replace(':', '');

    switch (platform) {
      case 'jitsi':
        return `vaya-room:proj-${cleanProjectId}-${dateStr}-${timeStr}`;
      default:
        return `vaya-room:proj-${cleanProjectId}-${dateStr}-${timeStr}`;
    }
  }

  private static async sendEventInvitations(eventId: string, emails: string[]): Promise<void> {
    try {
      await supabase.functions.invoke('send-event-invitations', {
        body: {
          eventId,
          attendeesEmails: emails
        }
      });
    } catch (error) {
      console.warn('[PlanningAPI] Failed to send invitations:', error);
    }
  }

  private static async sendEventUpdateNotifications(eventId: string): Promise<void> {
    try {
      await supabase.functions.invoke('send-event-update-notifications', {
        body: { eventId }
      });
    } catch (error) {
      console.warn('[PlanningAPI] Failed to send update notifications:', error);
    }
  }

  private static calculateEventRelevanceScore(event: ProjectEvent, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    if (event.title.toLowerCase().includes(lowerQuery)) {
      score += event.title.toLowerCase().startsWith(lowerQuery) ? 100 : 80;
    }
    if (event.description?.toLowerCase().includes(lowerQuery)) {
      score += 60;
    }
    if (event.location?.toLowerCase().includes(lowerQuery)) {
      score += 40;
    }

    return score;
  }

  private static getEventMatchedFields(event: ProjectEvent, query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const fields: string[] = [];

    if (event.title.toLowerCase().includes(lowerQuery)) fields.push('title');
    if (event.description?.toLowerCase().includes(lowerQuery)) fields.push('description');
    if (event.location?.toLowerCase().includes(lowerQuery)) fields.push('location');

    return fields;
  }

  private static generateEventPreviewSnippet(event: ProjectEvent, query: string): string | undefined {
    if (event.description) {
      const desc = event.description;
      const index = desc.toLowerCase().indexOf(query.toLowerCase());
      if (index >= 0) {
        const start = Math.max(0, index - 50);
        const end = Math.min(desc.length, index + query.length + 50);
        return desc.substring(start, end) + (end < desc.length ? '...' : '');
      }
    }
    return undefined;
  }

  private static isAllDayEvent(startAt: string, endAt?: string): boolean {
    const start = new Date(startAt);
    const startTimeStr = start.toTimeString();

    if (endAt) {
      const end = new Date(endAt);
      const endTimeStr = end.toTimeString();
      // Considérer comme événement d'une journée complète si commence à 00:00 et finit à 23:59 (ou lendemain à 00:00)
      return startTimeStr.startsWith('00:00') && (endTimeStr.startsWith('23:59') || endTimeStr.startsWith('00:00'));
    }

    // Si pas d'heure de fin et commence à 00:00, c'est probablement un événement d'une journée
    return startTimeStr.startsWith('00:00');
  }

  private static getEventColor(eventType: string, priority: string): string {
    const colorMap: Record<string, string> = {
      'meeting': '#3b82f6',
      'kickoff': '#10b981',
      'review': '#f59e0b',
      'demo': '#8b5cf6',
      'workshop': '#06b6d4',
      'planning': '#6366f1',
      'other': '#6b7280'
    };

    const priorityColorMap: Record<string, string> = {
      'urgent': '#dc2626',
      'high': '#ea580c',
      'medium': '#3b82f6',
      'low': '#6b7280'
    };

    // Prioriser la couleur par priorité si elle est élevée
    if (priority === 'urgent' || priority === 'high') {
      return priorityColorMap[priority];
    }

    return colorMap[eventType] || colorMap.other;
  }
}