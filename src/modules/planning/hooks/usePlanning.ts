/**
 * Hook principal pour la gestion du planning d'un projet
 * Fournit l'état et les actions pour les événements et calendriers
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PlanningAPI } from '../services/planningAPI';
import type { ProjectEvent, EventFilters, CalendarViewEvent } from '../types';

interface UsePlanningOptions {
  projectId: string;
  filters?: EventFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UsePlanningReturn {
  // État
  events: ProjectEvent[];
  calendarEvents: CalendarViewEvent[];
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  setFilters: (filters: EventFilters) => void;

  // Vues et navigation
  viewPeriod: { start: string; end: string };
  setViewPeriod: (period: { start: string; end: string }) => void;
  goToToday: () => void;
  goToNextPeriod: () => void;
  goToPreviousPeriod: () => void;

  // Statistiques rapides
  upcomingEventsCount: number;
  todayEventsCount: number;
  thisWeekEventsCount: number;
}

export function usePlanning({
  projectId,
  filters: initialFilters,
  autoRefresh = true,
  refreshInterval = 30000
}: UsePlanningOptions): UsePlanningReturn {
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>(initialFilters || {});

  // Période de vue (par défaut: mois current)
  const [viewPeriod, setViewPeriod] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  // Fonction pour charger les événements
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const combinedFilters = {
        ...filters,
        date_from: viewPeriod.start,
        date_to: viewPeriod.end
      };

      const eventsData = await PlanningAPI.getProjectEvents(projectId, combinedFilters);
      setEvents(eventsData);
    } catch (err) {
      console.error('[usePlanning] Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du planning');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters, viewPeriod]);

  // Navigation dans le temps
  const goToToday = useCallback(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setViewPeriod({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, []);

  const goToNextPeriod = useCallback(() => {
    const currentStart = new Date(viewPeriod.start);
    const nextStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
    const nextEnd = new Date(nextStart.getFullYear(), nextStart.getMonth() + 1, 0);
    setViewPeriod({
      start: nextStart.toISOString().split('T')[0],
      end: nextEnd.toISOString().split('T')[0]
    });
  }, [viewPeriod]);

  const goToPreviousPeriod = useCallback(() => {
    const currentStart = new Date(viewPeriod.start);
    const prevStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
    setViewPeriod({
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0]
    });
  }, [viewPeriod]);

  // Actualisation manuelle
  const refresh = useCallback(async () => {
    await loadEvents();
  }, [loadEvents]);

  // Chargement initial et réactif
  useEffect(() => {
    if (projectId) {
      loadEvents();
    }
  }, [projectId, loadEvents]);

  // Auto-refresh optionnel
  useEffect(() => {
    if (!autoRefresh || !projectId) return;

    const interval = setInterval(() => {
      loadEvents();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, projectId, refreshInterval, loadEvents]);

  // Conversion pour les vues calendrier
  const calendarEvents = useMemo<CalendarViewEvent[]>(() => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_at),
      end: event.end_at ? new Date(event.end_at) : undefined,
      allDay: false, // TODO: Calculer si événement d'une journée
      description: event.description,
      location: event.location,
      attendees: [], // Sera chargé séparément si nécessaire
      resources: [],
      event_type: event.event_type,
      status: event.status,
      priority: event.priority,
      video_url: event.video_url,
      drive_url: event.drive_url,
      is_recurring: event.is_recurring,
      can_edit: true, // TODO: Vérifier les permissions
      can_delete: true,
      color: getEventColor(event.event_type, event.priority)
    }));
  }, [events]);

  // Statistiques rapides
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const upcomingEventsCount = events.filter(event =>
    new Date(event.start_at) > now && event.status === 'scheduled'
  ).length;

  const todayEventsCount = events.filter(event =>
    event.start_at.startsWith(today) && event.status !== 'cancelled'
  ).length;

  const thisWeekEventsCount = events.filter(event =>
    new Date(event.start_at) >= now &&
    new Date(event.start_at) <= new Date(weekFromNow) &&
    event.status !== 'cancelled'
  ).length;

  return {
    events,
    calendarEvents,
    loading,
    error,
    refresh,
    setFilters,
    viewPeriod,
    setViewPeriod,
    goToToday,
    goToNextPeriod,
    goToPreviousPeriod,
    upcomingEventsCount,
    todayEventsCount,
    thisWeekEventsCount
  };
}

// Fonction utilitaire pour les couleurs d'événements
function getEventColor(eventType: string, priority: string): string {
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