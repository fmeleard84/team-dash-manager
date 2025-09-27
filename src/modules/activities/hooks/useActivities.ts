/**
 * Module ACTIVITÉS - Hook Principal
 *
 * Hook principal pour la gestion des activités avec support real-time,
 * pagination, filtres et gestion d'état centralisée.
 *
 * Fonctionnalités :
 * - Chargement des sessions avec pagination
 * - Filtres avancés et recherche
 * - Real-time via Supabase subscriptions
 * - Gestion des sessions actives
 * - Cache et optimisations performances
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';
import {
  TimeSession,
  ActivityStats,
  ActivityFilters,
  UseActivitiesReturn,
  ActivityError,
  ACTIVITY_CONSTANTS
} from '../types';
import { ActivitiesAPI } from '../services';

interface UseActivitiesOptions {
  initialFilters?: Partial<ActivityFilters>;
  autoRefresh?: boolean;
  realtime?: boolean;
  pageSize?: number;
  enableStats?: boolean;
}

const DEFAULT_FILTERS: ActivityFilters = {
  page: 1,
  per_page: 20,
  sort_by: 'start_time',
  sort_order: 'desc',
  include_archived: false
};

export const useActivities = (options: UseActivitiesOptions = {}) => {
  const {
    initialFilters = {},
    autoRefresh = false,
    realtime = true,
    pageSize = 20,
    enableStats = true
  } = options;

  const { user } = useAuth();
  const candidateId = user?.id;

  // ==========================================
  // STATES
  // ==========================================

  const [activities, setActivities] = useState<TimeSession[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ActivityError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<ActivityFilters>({
    ...DEFAULT_FILTERS,
    per_page: pageSize,
    ...initialFilters
  });

  // Refs pour éviter les re-renders inutiles
  const subscriptionRef = useRef<any>(null);
  const lastLoadTime = useRef<number>(0);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  const activeSessions = useMemo(() =>
    activities.filter(activity => activity.status === 'active'),
    [activities]
  );

  const hasActiveSession = useMemo(() =>
    activeSessions.length > 0,
    [activeSessions]
  );

  const currentFilters = useMemo(() => filters, [filters]);

  // ==========================================
  // DATA LOADING
  // ==========================================

  /**
   * Charge les activités depuis l'API
   */
  const loadActivities = useCallback(async (
    loadFilters: ActivityFilters = filters,
    append: boolean = false
  ) => {
    if (!candidateId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      console.log('[useActivities] Loading activities with filters:', loadFilters);

      const response = await ActivitiesAPI.getSessions(candidateId, loadFilters);

      if (!response.success) {
        throw response.error;
      }

      const { data: paginatedData } = response;

      if (append) {
        setActivities(prev => [...prev, ...paginatedData.data]);
      } else {
        setActivities(paginatedData.data);
      }

      setHasMore(paginatedData.has_more);
      setTotalCount(paginatedData.total);
      setCurrentPage(paginatedData.page);

      lastLoadTime.current = Date.now();

      console.log(`[useActivities] Loaded ${paginatedData.data.length} activities`);

    } catch (err: any) {
      console.error('[useActivities] Error loading activities:', err);
      setError(err as ActivityError);

      if (!append) {
        setActivities([]);
      }

      toast.error('Erreur lors du chargement des activités');
    } finally {
      if (!append) {
        setLoading(false);
      }
    }
  }, [candidateId, filters]);

  /**
   * Charge les statistiques
   */
  const loadStats = useCallback(async () => {
    if (!candidateId || !enableStats) return;

    try {
      console.log('[useActivities] Loading stats...');

      const response = await ActivitiesAPI.getActivityStats(candidateId, filters);

      if (response.success) {
        setStats(response.data);
        console.log('[useActivities] Stats loaded successfully');
      } else {
        console.warn('[useActivities] Stats loading failed:', response.error);
      }

    } catch (err) {
      console.error('[useActivities] Error loading stats:', err);
      // Ne pas afficher d'erreur pour les stats, c'est optionnel
    }
  }, [candidateId, enableStats, filters]);

  // ==========================================
  // ACTIONS
  // ==========================================

  /**
   * Recharge les données
   */
  const refetch = useCallback(async () => {
    await Promise.all([
      loadActivities({ ...filters, page: 1 }),
      enableStats ? loadStats() : Promise.resolve()
    ]);
  }, [loadActivities, loadStats, filters, enableStats]);

  /**
   * Charge plus de données (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const nextPage = currentPage + 1;
    const nextFilters = { ...filters, page: nextPage };

    await loadActivities(nextFilters, true);
  }, [hasMore, loading, currentPage, filters, loadActivities]);

  /**
   * Clear errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Met à jour les filtres
   */
  const updateFilters = useCallback((newFilters: Partial<ActivityFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset page
    }));
  }, []);

  /**
   * Reset des filtres
   */
  const resetFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      per_page: pageSize
    });
  }, [pageSize]);

  // ==========================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================

  /**
   * Configure les abonnements real-time
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!realtime || !candidateId) return;

    console.log('[useActivities] Setting up real-time subscription');

    // Nettoyer l'abonnement précédent
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Nouvel abonnement aux sessions de temps
    subscriptionRef.current = supabase
      .channel('activities-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_tracking_sessions',
          filter: `candidate_id=eq.${candidateId}`
        },
        (payload) => {
          console.log('[useActivities] Real-time event received:', payload.eventType);

          // Recharger les données après un petit délai pour éviter les races conditions
          setTimeout(() => {
            refetch();
          }, 500);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useActivities] Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useActivities] Real-time subscription error');
        }
      });

  }, [realtime, candidateId, refetch]);

  /**
   * Configure le rafraîchissement automatique
   */
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefresh) return;

    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
    }

    autoRefreshInterval.current = setInterval(() => {
      // Ne rafraîchir que s'il y a des sessions actives
      if (hasActiveSession) {
        console.log('[useActivities] Auto-refresh triggered');
        refetch();
      }
    }, 30000); // Toutes les 30 secondes

  }, [autoRefresh, hasActiveSession, refetch]);

  // ==========================================
  // EFFECTS
  // ==========================================

  /**
   * Chargement initial et configuration
   */
  useEffect(() => {
    if (candidateId) {
      loadActivities();
      if (enableStats) {
        loadStats();
      }
      setupRealtimeSubscription();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [candidateId]); // Uniquement au montage

  /**
   * Recharge quand les filtres changent
   */
  useEffect(() => {
    if (candidateId) {
      loadActivities();
      if (enableStats) {
        loadStats();
      }
    }
  }, [filters, candidateId]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    setupAutoRefresh();

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [setupAutoRefresh]);

  /**
   * Cleanup à la désinscription du composant
   */
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  // ==========================================
  // RETURN OBJECT
  // ==========================================

  return {
    // Données principales
    activities,
    stats,
    loading,
    error,

    // États de pagination
    hasMore,
    totalCount,
    currentPage,

    // Actions
    refetch,
    loadMore,
    clearError,

    // Filtres et recherche
    currentFilters,
    setFilters: updateFilters,
    resetFilters,

    // Sessions actives
    activeSessions,
    hasActiveSession
  } as UseActivitiesReturn;
};