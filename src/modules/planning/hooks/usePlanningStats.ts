/**
 * Hook pour les statistiques et analytics du planning
 * Utilisé pour les dashboards et vues d'ensemble des événements
 */

import { useState, useEffect, useCallback } from 'react';
import { PlanningAPI } from '../services/planningAPI';
import type { PlanningStats, PlanningAnalytics, ProjectEvent } from '../types';

interface UsePlanningStatsOptions {
  projectId: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
  includeAnalytics?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UsePlanningStatsReturn {
  // Statistiques
  stats: PlanningStats | null;
  analytics: PlanningAnalytics | null;

  // État
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  changePeriod: (period: 'week' | 'month' | 'quarter' | 'year') => void;

  // Métriques calculées
  totalEvents: number;
  completionRate: number;
  averageDuration: number;
  mostProductiveDay: string | null;
  mostProductiveHour: number | null;
  topEventType: string | null;
  attendanceRate: number;
  upcomingEventsThisWeek: number;
  overdueEvents: number;

  // Comparaisons période précédente
  periodComparison: {
    eventsGrowth: number;
    durationGrowth: number;
    attendanceGrowth: number;
  };
}

export function usePlanningStats({
  projectId,
  period = 'month',
  includeAnalytics = true,
  autoRefresh = true,
  refreshInterval = 300000 // 5 minutes
}: UsePlanningStatsOptions): UsePlanningStatsReturn {
  const [stats, setStats] = useState<PlanningStats | null>(null);
  const [analytics, setAnalytics] = useState<PlanningAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState(period);

  // Calculer les dates de période
  const getPeriodDates = useCallback((periodType: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (periodType) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    };
  }, []);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const { start, end } = getPeriodDates(currentPeriod);

      const statsData = await PlanningAPI.getPlanningStats(projectId, start, end);
      setStats(statsData);
    } catch (err) {
      console.error('[usePlanningStats] Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    }
  }, [projectId, currentPeriod, getPeriodDates]);

  // Charger les analytics
  const loadAnalytics = useCallback(async () => {
    if (!includeAnalytics) return;

    try {
      // Note: PlanningAnalytics n'est pas encore implémentée dans l'API
      // Cette partie sera complétée quand la fonction RPC sera créée
      console.log(`[usePlanningStats] Analytics for ${currentPeriod} - to be implemented`);

      // Placeholder pour les analytics
      setAnalytics({
        project_id: projectId,
        period: currentPeriod as any,
        events_timeline: [],
        team_availability: [],
        meeting_patterns: {
          peak_hours: [],
          peak_days: [],
          average_meeting_length: 60,
          most_common_durations: []
        },
        resource_insights: []
      });
    } catch (err) {
      console.error('[usePlanningStats] Error loading analytics:', err);
      // Ne pas faire échouer pour les analytics uniquement
    }
  }, [projectId, currentPeriod, includeAnalytics]);

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadAnalytics()
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadStats, loadAnalytics]);

  // Actualisation générale
  const refresh = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Actualisation statistiques uniquement
  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  // Actualisation analytics uniquement
  const refreshAnalytics = useCallback(async () => {
    await loadAnalytics();
  }, [loadAnalytics]);

  // Changer la période
  const changePeriod = useCallback((newPeriod: 'week' | 'month' | 'quarter' | 'year') => {
    setCurrentPeriod(newPeriod);
  }, []);

  // Chargement initial
  useEffect(() => {
    if (projectId) {
      loadAllData();
    }
  }, [projectId, loadAllData]);

  // Rechargement quand la période change
  useEffect(() => {
    if (projectId && currentPeriod !== period) {
      loadAllData();
    }
  }, [currentPeriod, projectId, period, loadAllData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !projectId) return;

    const interval = setInterval(() => {
      loadAllData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, projectId, refreshInterval, loadAllData]);

  // Métriques calculées
  const totalEvents = stats?.total_events || 0;
  const completionRate = totalEvents > 0 ? ((stats?.completed_events || 0) / totalEvents) * 100 : 0;
  const averageDuration = stats?.average_event_duration || 0;
  const attendanceRate = stats?.attendance_rate || 0;

  const mostProductiveDay = stats?.most_active_day || null;
  const mostProductiveHour = stats?.most_active_hour || null;

  const topEventType = (() => {
    if (!stats?.events_by_type) return null;
    const entries = Object.entries(stats.events_by_type);
    if (entries.length === 0) return null;
    const [type] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    return type;
  })();

  // Événements à venir cette semaine
  const upcomingEventsThisWeek = (() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Cette métrique devrait être calculée côté serveur
    // Pour l'instant, on utilise une approximation basée sur les stats
    return Math.round((stats?.total_events || 0) * 0.2); // Approximation: 20% des événements sont dans la semaine à venir
  })();

  // Événements en retard
  const overdueEvents = (() => {
    // Cette métrique devrait être calculée côté serveur
    // En attendant, approximation basée sur les événements annulés
    return stats?.cancelled_events || 0;
  })();

  // Comparaisons avec la période précédente
  const periodComparison = (() => {
    // Ces métriques nécessitent des données de la période précédente
    // Pour l'instant, valeurs par défaut
    return {
      eventsGrowth: 0,
      durationGrowth: 0,
      attendanceGrowth: 0
    };
  })();

  return {
    // Données
    stats,
    analytics,

    // État
    loading,
    error,

    // Actions
    refresh,
    refreshStats,
    refreshAnalytics,
    changePeriod,

    // Métriques
    totalEvents,
    completionRate,
    averageDuration,
    mostProductiveDay,
    mostProductiveHour,
    topEventType,
    attendanceRate,
    upcomingEventsThisWeek,
    overdueEvents,
    periodComparison
  };
}