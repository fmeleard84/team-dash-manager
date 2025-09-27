/**
 * Hook pour toutes les actions CRUD sur les événements et le planning
 * Centralise toutes les mutations avec gestion d'erreur et loading states
 */

import { useState, useCallback } from 'react';
import { PlanningAPI } from '../services/planningAPI';
import type {
  ProjectEvent,
  EventAttendee,
  ResourceBooking,
  CreateEventData,
  UpdateEventData,
  BookResourceData,
  Calendar,
  CreateCalendarData
} from '../types';

interface UsePlanningActionsOptions {
  onSuccess?: (action: string, data?: any) => void;
  onError?: (action: string, error: string) => void;
}

interface UsePlanningActionsReturn {
  // État des actions
  loading: boolean;
  error: string | null;
  lastAction: string | null;

  // Actions sur les événements
  createEvent: (eventData: CreateEventData) => Promise<ProjectEvent | null>;
  updateEvent: (eventId: string, updateData: UpdateEventData) => Promise<ProjectEvent | null>;
  deleteEvent: (eventId: string, deleteType?: 'single' | 'series' | 'future') => Promise<boolean>;
  duplicateEvent: (eventId: string, newDate: string) => Promise<ProjectEvent | null>;

  // Actions sur les participants
  addAttendees: (eventId: string, emails: string[]) => Promise<EventAttendee[]>;
  updateAttendeeResponse: (
    attendeeId: string,
    responseStatus: EventAttendee['response_status'],
    notes?: string
  ) => Promise<EventAttendee | null>;
  removeAttendee: (attendeeId: string) => Promise<boolean>;

  // Actions sur les ressources
  bookResource: (bookingData: BookResourceData) => Promise<ResourceBooking | null>;
  cancelResourceBooking: (bookingId: string) => Promise<boolean>;

  // Actions sur les calendriers
  createCalendar: (calendarData: CreateCalendarData) => Promise<Calendar | null>;
  updateCalendar: (calendarId: string, updateData: Partial<CreateCalendarData>) => Promise<Calendar | null>;
  deleteCalendar: (calendarId: string) => Promise<boolean>;

  // Actions de notification
  sendEventReminder: (eventId: string) => Promise<boolean>;
  sendEventInvitations: (eventId: string, emails: string[]) => Promise<boolean>;

  // Utilitaires
  clearError: () => void;
  generateVideoRoomUrl: (projectId: string, startAt: string, platform?: string) => string;
  exportToGoogleCalendar: (eventId: string) => Promise<string | null>;
}

export function usePlanningActions({
  onSuccess,
  onError
}: UsePlanningActionsOptions = {}): UsePlanningActionsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Gestionnaire d'action générique
  const executeAction = useCallback(async <T>(
    actionName: string,
    actionFn: () => Promise<T>,
    defaultReturn: T | null = null
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      setLastAction(actionName);

      const result = await actionFn();

      onSuccess?.(actionName, result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Erreur lors de l'action: ${actionName}`;
      setError(errorMessage);
      onError?.(actionName, errorMessage);
      return defaultReturn;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  // Créer un événement
  const createEvent = useCallback(async (eventData: CreateEventData): Promise<ProjectEvent | null> => {
    return executeAction('createEvent', () => PlanningAPI.createEvent(eventData));
  }, [executeAction]);

  // Mettre à jour un événement
  const updateEvent = useCallback(async (
    eventId: string,
    updateData: UpdateEventData
  ): Promise<ProjectEvent | null> => {
    return executeAction('updateEvent', () => PlanningAPI.updateEvent(eventId, updateData));
  }, [executeAction]);

  // Supprimer un événement
  const deleteEvent = useCallback(async (
    eventId: string,
    deleteType: 'single' | 'series' | 'future' = 'single'
  ): Promise<boolean> => {
    const result = await executeAction('deleteEvent', async () => {
      await PlanningAPI.deleteEvent(eventId, deleteType);
      return true;
    }, false);
    return result ?? false;
  }, [executeAction]);

  // Dupliquer un événement
  const duplicateEvent = useCallback(async (
    eventId: string,
    newDate: string
  ): Promise<ProjectEvent | null> => {
    return executeAction('duplicateEvent', async () => {
      // Récupérer l'événement original
      const { event } = await PlanningAPI.getEventById(eventId);

      // Calculer la nouvelle heure de fin si elle existe
      let newEndDate: string | undefined;
      if (event.end_at) {
        const originalStart = new Date(event.start_at);
        const originalEnd = new Date(event.end_at);
        const duration = originalEnd.getTime() - originalStart.getTime();
        const newStart = new Date(newDate);
        const newEnd = new Date(newStart.getTime() + duration);
        newEndDate = newEnd.toISOString();
      }

      // Créer le nouvel événement
      const duplicateData: CreateEventData = {
        project_id: event.project_id,
        title: `${event.title} (Copie)`,
        description: event.description,
        start_at: newDate,
        end_at: newEndDate,
        location: event.location,
        event_type: event.event_type,
        priority: event.priority,
        is_recurring: false, // Les copies ne sont pas récurrentes
        auto_create_video_room: !!event.video_url,
        metadata: event.metadata ? JSON.parse(event.metadata as any) : undefined
      };

      return PlanningAPI.createEvent(duplicateData);
    });
  }, [executeAction]);

  // Ajouter des participants
  const addAttendees = useCallback(async (
    eventId: string,
    emails: string[]
  ): Promise<EventAttendee[]> => {
    const result = await executeAction(
      'addAttendees',
      () => PlanningAPI.addEventAttendees(eventId, emails),
      []
    );
    return result ?? [];
  }, [executeAction]);

  // Mettre à jour la réponse d'un participant
  const updateAttendeeResponse = useCallback(async (
    attendeeId: string,
    responseStatus: EventAttendee['response_status'],
    notes?: string
  ): Promise<EventAttendee | null> => {
    return executeAction(
      'updateAttendeeResponse',
      () => PlanningAPI.updateAttendeeResponse(attendeeId, responseStatus, notes)
    );
  }, [executeAction]);

  // Retirer un participant
  const removeAttendee = useCallback(async (attendeeId: string): Promise<boolean> => {
    const result = await executeAction('removeAttendee', async () => {
      const { error } = await PlanningAPI.supabase
        .from('project_event_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) throw error;
      return true;
    }, false);
    return result ?? false;
  }, [executeAction]);

  // Réserver une ressource
  const bookResource = useCallback(async (bookingData: BookResourceData): Promise<ResourceBooking | null> => {
    return executeAction('bookResource', () => PlanningAPI.bookResource(bookingData));
  }, [executeAction]);

  // Annuler une réservation
  const cancelResourceBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    const result = await executeAction('cancelResourceBooking', async () => {
      const { error } = await PlanningAPI.supabase
        .from('resource_bookings')
        .update({ booking_status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
      return true;
    }, false);
    return result ?? false;
  }, [executeAction]);

  // Créer un calendrier
  const createCalendar = useCallback(async (calendarData: CreateCalendarData): Promise<Calendar | null> => {
    return executeAction('createCalendar', () => PlanningAPI.createCalendar(calendarData));
  }, [executeAction]);

  // Mettre à jour un calendrier
  const updateCalendar = useCallback(async (
    calendarId: string,
    updateData: Partial<CreateCalendarData>
  ): Promise<Calendar | null> => {
    return executeAction('updateCalendar', async () => {
      const { data, error } = await PlanningAPI.supabase
        .from('project_calendars')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', calendarId)
        .select()
        .single();

      if (error) throw error;
      return data;
    });
  }, [executeAction]);

  // Supprimer un calendrier
  const deleteCalendar = useCallback(async (calendarId: string): Promise<boolean> => {
    const result = await executeAction('deleteCalendar', async () => {
      const { error } = await PlanningAPI.supabase
        .from('project_calendars')
        .delete()
        .eq('id', calendarId);

      if (error) throw error;
      return true;
    }, false);
    return result ?? false;
  }, [executeAction]);

  // Envoyer un rappel
  const sendEventReminder = useCallback(async (eventId: string): Promise<boolean> => {
    const result = await executeAction('sendEventReminder', async () => {
      const { error } = await PlanningAPI.supabase.functions.invoke('send-event-reminder', {
        body: { eventId }
      });

      if (error) throw error;
      return true;
    }, false);
    return result ?? false;
  }, [executeAction]);

  // Envoyer des invitations
  const sendEventInvitations = useCallback(async (
    eventId: string,
    emails: string[]
  ): Promise<boolean> => {
    const result = await executeAction('sendEventInvitations', async () => {
      const { error } = await PlanningAPI.supabase.functions.invoke('send-event-invitations', {
        body: { eventId, attendeesEmails: emails }
      });

      if (error) throw error;
      return true;
    }, false);
    return result ?? false;
  }, [executeAction]);

  // Générer URL de visioconférence
  const generateVideoRoomUrl = useCallback((
    projectId: string,
    startAt: string,
    platform: string = 'jitsi'
  ): string => {
    const cleanProjectId = projectId.substring(0, 8);
    const dateStr = new Date(startAt).toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = new Date(startAt).toISOString().slice(11, 16).replace(':', '');

    switch (platform) {
      case 'jitsi':
        return `vaya-room:proj-${cleanProjectId}-${dateStr}-${timeStr}`;
      case 'zoom':
        return `https://zoom.us/j/${cleanProjectId}${dateStr}${timeStr}`;
      case 'teams':
        return `https://teams.microsoft.com/l/meetup-join/${cleanProjectId}`;
      case 'meet':
        return `https://meet.google.com/${cleanProjectId}-${dateStr}-${timeStr}`;
      default:
        return `vaya-room:proj-${cleanProjectId}-${dateStr}-${timeStr}`;
    }
  }, []);

  // Exporter vers Google Calendar
  const exportToGoogleCalendar = useCallback(async (eventId: string): Promise<string | null> => {
    return executeAction('exportToGoogleCalendar', async () => {
      const { event } = await PlanningAPI.getEventById(eventId);

      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: formatGoogleCalendarDates(event.start_at, event.end_at),
        details: event.description || '',
        location: event.location || '',
        trp: 'false'
      });

      const googleUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
      return googleUrl;
    });
  }, [executeAction]);

  // Effacer l'erreur
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    lastAction,
    createEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    addAttendees,
    updateAttendeeResponse,
    removeAttendee,
    bookResource,
    cancelResourceBooking,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    sendEventReminder,
    sendEventInvitations,
    clearError,
    generateVideoRoomUrl,
    exportToGoogleCalendar
  };
}

// Fonction utilitaire pour formater les dates Google Calendar
function formatGoogleCalendarDates(startAt: string, endAt?: string): string {
  const start = new Date(startAt);
  const startFormatted = start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  if (endAt) {
    const end = new Date(endAt);
    const endFormatted = end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return `${startFormatted}/${endFormatted}`;
  }

  // Si pas d'heure de fin, ajouter 1 heure par défaut
  const defaultEnd = new Date(start.getTime() + 60 * 60 * 1000);
  const defaultEndFormatted = defaultEnd.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `${startFormatted}/${defaultEndFormatted}`;
}