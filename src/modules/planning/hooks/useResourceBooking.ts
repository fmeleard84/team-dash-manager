/**
 * Hook spécialisé pour la gestion des ressources et réservations
 * Gestion des salles, équipements et autres ressources bookables
 */

import { useState, useEffect, useCallback } from 'react';
import { PlanningAPI } from '../services/planningAPI';
import type { Resource, ResourceBooking, BookResourceData } from '../types';

interface UseResourceBookingOptions {
  resourceType?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseResourceBookingReturn {
  // Ressources disponibles
  resources: Resource[];
  bookings: ResourceBooking[];
  loading: boolean;
  error: string | null;

  // Actions
  getAvailableResources: (startAt: string, endAt: string, resourceType?: string) => Promise<Resource[]>;
  bookResource: (bookingData: BookResourceData) => Promise<ResourceBooking | null>;
  cancelBooking: (bookingId: string) => Promise<boolean>;
  updateBooking: (bookingId: string, updates: Partial<BookResourceData>) => Promise<ResourceBooking | null>;
  checkAvailability: (resourceId: string, startAt: string, endAt: string) => Promise<boolean>;

  // Utilitaires de disponibilité
  getResourceUtilization: (resourceId: string, periodDays: number) => Promise<number>;
  getConflictingBookings: (resourceId: string, startAt: string, endAt: string) => ResourceBooking[];
  suggestAlternativeTime: (resourceId: string, startAt: string, duration: number) => Promise<string[]>;

  // Filtres et recherche
  filterResources: (filters: ResourceFilters) => Resource[];
  searchResources: (query: string) => Resource[];

  // État des réservations
  userBookings: ResourceBooking[];
  upcomingBookings: ResourceBooking[];
  pastBookings: ResourceBooking[];

  // Statistiques rapides
  totalResources: number;
  availableResourcesCount: number;
  activeBookingsCount: number;
}

interface ResourceFilters {
  resourceType?: string;
  capacity?: number;
  features?: string[];
  location?: string;
  isAvailable?: boolean;
}

export function useResourceBooking({
  resourceType,
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: UseResourceBookingOptions = {}): UseResourceBookingReturn {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les ressources
  const loadResources = useCallback(async () => {
    try {
      setError(null);

      // Note: Cette fonction n'existe pas encore dans l'API
      // En attendant, on simule avec une requête directe
      const { data, error: resourceError } = await supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (resourceError) throw resourceError;

      let filteredResources = data || [];
      if (resourceType) {
        filteredResources = filteredResources.filter(r => r.resource_type === resourceType);
      }

      setResources(filteredResources);
    } catch (err) {
      console.error('[useResourceBooking] Error loading resources:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des ressources');
    }
  }, [resourceType]);

  // Charger les réservations
  const loadBookings = useCallback(async () => {
    try {
      const { data, error: bookingsError } = await supabase
        .from('resource_bookings')
        .select(`
          *,
          resource:resource_id(*),
          booked_by:booked_by_user_id(first_name, last_name, email)
        `)
        .neq('booking_status', 'cancelled')
        .order('start_at', { ascending: true });

      if (bookingsError) throw bookingsError;
      setBookings(data || []);
    } catch (err) {
      console.error('[useResourceBooking] Error loading bookings:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des réservations');
    }
  }, []);

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadResources(), loadBookings()]);
    } finally {
      setLoading(false);
    }
  }, [loadResources, loadBookings]);

  // Obtenir les ressources disponibles pour une période
  const getAvailableResources = useCallback(async (
    startAt: string,
    endAt: string,
    filterResourceType?: string
  ): Promise<Resource[]> => {
    try {
      const availableResources = await PlanningAPI.getAvailableResources(
        startAt,
        endAt,
        filterResourceType
      );
      return availableResources;
    } catch (err) {
      console.error('[useResourceBooking] Error getting available resources:', err);
      return [];
    }
  }, []);

  // Réserver une ressource
  const bookResource = useCallback(async (bookingData: BookResourceData): Promise<ResourceBooking | null> => {
    try {
      const booking = await PlanningAPI.bookResource(bookingData);
      if (booking) {
        setBookings(prev => [...prev, booking]);
      }
      return booking;
    } catch (err) {
      console.error('[useResourceBooking] Error booking resource:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
      return null;
    }
  }, []);

  // Annuler une réservation
  const cancelBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('resource_bookings')
        .update({
          booking_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev => prev.filter(b => b.id !== bookingId));
      return true;
    } catch (err) {
      console.error('[useResourceBooking] Error cancelling booking:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'annulation');
      return false;
    }
  }, []);

  // Mettre à jour une réservation
  const updateBooking = useCallback(async (
    bookingId: string,
    updates: Partial<BookResourceData>
  ): Promise<ResourceBooking | null> => {
    try {
      const { data, error } = await supabase
        .from('resource_bookings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;

      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...data } : b));
      return data;
    } catch (err) {
      console.error('[useResourceBooking] Error updating booking:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    }
  }, []);

  // Vérifier la disponibilité d'une ressource
  const checkAvailability = useCallback(async (
    resourceId: string,
    startAt: string,
    endAt: string
  ): Promise<boolean> => {
    const conflicting = getConflictingBookings(resourceId, startAt, endAt);
    return conflicting.length === 0;
  }, []);

  // Obtenir le taux d'utilisation d'une ressource
  const getResourceUtilization = useCallback(async (
    resourceId: string,
    periodDays: number
  ): Promise<number> => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const resourceBookings = bookings.filter(b =>
      b.resource_id === resourceId &&
      b.booking_status === 'confirmed' &&
      new Date(b.start_at) >= startDate &&
      new Date(b.end_at || b.start_at) <= endDate
    );

    const totalBookedMinutes = resourceBookings.reduce((total, booking) => {
      const start = new Date(booking.start_at);
      const end = new Date(booking.end_at);
      return total + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);

    const totalPeriodMinutes = periodDays * 24 * 60;
    return totalPeriodMinutes > 0 ? (totalBookedMinutes / totalPeriodMinutes) * 100 : 0;
  }, [bookings]);

  // Obtenir les réservations en conflit
  const getConflictingBookings = useCallback((
    resourceId: string,
    startAt: string,
    endAt: string
  ): ResourceBooking[] => {
    const requestStart = new Date(startAt);
    const requestEnd = new Date(endAt);

    return bookings.filter(booking =>
      booking.resource_id === resourceId &&
      booking.booking_status === 'confirmed' &&
      !(new Date(booking.end_at) <= requestStart || new Date(booking.start_at) >= requestEnd)
    );
  }, [bookings]);

  // Suggérer des créneaux alternatifs
  const suggestAlternativeTime = useCallback(async (
    resourceId: string,
    startAt: string,
    duration: number // en minutes
  ): Promise<string[]> => {
    const suggestions: string[] = [];
    const requestDate = new Date(startAt);
    const durationMs = duration * 60 * 1000;

    // Chercher des créneaux libres dans la même journée
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const candidateStart = new Date(requestDate);
        candidateStart.setHours(hour, minute, 0, 0);
        const candidateEnd = new Date(candidateStart.getTime() + durationMs);

        const hasConflict = getConflictingBookings(
          resourceId,
          candidateStart.toISOString(),
          candidateEnd.toISOString()
        ).length > 0;

        if (!hasConflict && suggestions.length < 5) {
          suggestions.push(candidateStart.toISOString());
        }
      }
    }

    return suggestions;
  }, [getConflictingBookings]);

  // Filtrer les ressources
  const filterResources = useCallback((filters: ResourceFilters): Resource[] => {
    return resources.filter(resource => {
      if (filters.resourceType && resource.resource_type !== filters.resourceType) {
        return false;
      }
      if (filters.capacity && (resource.capacity || 0) < filters.capacity) {
        return false;
      }
      if (filters.features && filters.features.length > 0) {
        const hasAllFeatures = filters.features.every(feature =>
          resource.features.includes(feature)
        );
        if (!hasAllFeatures) return false;
      }
      if (filters.location && resource.location !== filters.location) {
        return false;
      }
      return true;
    });
  }, [resources]);

  // Rechercher des ressources
  const searchResources = useCallback((query: string): Resource[] => {
    const lowerQuery = query.toLowerCase();
    return resources.filter(resource =>
      resource.name.toLowerCase().includes(lowerQuery) ||
      resource.description?.toLowerCase().includes(lowerQuery) ||
      resource.location?.toLowerCase().includes(lowerQuery) ||
      resource.features.some(feature => feature.toLowerCase().includes(lowerQuery))
    );
  }, [resources]);

  // Chargement initial
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadAllData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadAllData]);

  // Calculs dérivés
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const userBookings = bookings.filter(b => b.booked_by_user_id === userId);
  const now = new Date();

  const upcomingBookings = bookings.filter(b =>
    new Date(b.start_at) > now && b.booking_status === 'confirmed'
  );

  const pastBookings = bookings.filter(b =>
    new Date(b.start_at) <= now && b.booking_status === 'confirmed'
  );

  const totalResources = resources.length;
  const availableResourcesCount = resources.filter(r => r.is_active).length;
  const activeBookingsCount = bookings.filter(b => b.booking_status === 'confirmed').length;

  return {
    // Données
    resources,
    bookings,
    loading,
    error,

    // Actions
    getAvailableResources,
    bookResource,
    cancelBooking,
    updateBooking,
    checkAvailability,

    // Utilitaires
    getResourceUtilization,
    getConflictingBookings,
    suggestAlternativeTime,
    filterResources,
    searchResources,

    // État
    userBookings,
    upcomingBookings,
    pastBookings,

    // Statistiques
    totalResources,
    availableResourcesCount,
    activeBookingsCount
  };
}