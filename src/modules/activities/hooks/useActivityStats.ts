/**
 * Module ACTIVITÉS - Hook Statistiques
 *
 * Hook spécialisé pour la gestion des statistiques et analytiques
 * des activités avec cache intelligent et analyses avancées.
 *
 * Fonctionnalités :
 * - Statistiques globales et détaillées
 * - Analyses de tendances et performance
 * - Comparaisons temporelles
 * - Recommandations automatiques
 * - Cache intelligent pour les performances
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  ActivityStats,
  ActivityFilters,
  ProjectActivityStats,
  ActivityTypeDistribution,
  MonthlyActivityStats,
  ActivityRecommendation,
  ActivityGoal,
  PeriodComparison,
  BenchmarkComparison,
  UseActivityStatsReturn,
  ActivityError
} from '../types';
import { ActivitiesAPI } from '../services';

interface UseActivityStatsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // en minutes
  enableCache?: boolean;
  cacheTimeout?: number; // en minutes
}

export const useActivityStats = (options: UseActivityStatsOptions = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 15,
    enableCache = true,
    cacheTimeout = 10
  } = options;

  const { user } = useAuth();
  const candidateId = user?.id;

  // ==========================================
  // STATES
  // ==========================================

  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ActivityError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'stale' | 'updating'>('fresh');

  // Refs pour le cache et les intervalles
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // CACHE MANAGEMENT
  // ==========================================

  /**
   * Génère une clé de cache basée sur les filtres
   */
  const getCacheKey = useCallback((filters?: ActivityFilters): string => {
    const key = JSON.stringify({
      candidateId,
      filters: filters || {}
    });
    return btoa(key); // Base64 pour éviter les caractères spéciaux
  }, [candidateId]);

  /**
   * Récupère des données depuis le cache
   */
  const getFromCache = useCallback((key: string): any | null => {
    if (!enableCache) return null;

    const cached = cacheRef.current.get(key);
    if (!cached) return null;

    const now = Date.now();
    const ageInMinutes = (now - cached.timestamp) / (1000 * 60);

    if (ageInMinutes > cacheTimeout) {
      cacheRef.current.delete(key);
      return null;
    }

    // Marquer comme stale si proche de l'expiration
    if (ageInMinutes > cacheTimeout * 0.8) {
      setCacheStatus('stale');
    } else {
      setCacheStatus('fresh');
    }

    return cached.data;
  }, [enableCache, cacheTimeout]);

  /**
   * Stocke des données dans le cache
   */
  const setInCache = useCallback((key: string, data: any) => {
    if (!enableCache) return;

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });

    setCacheStatus('fresh');
  }, [enableCache]);

  // ==========================================
  // DATA LOADING
  // ==========================================

  /**
   * Charge les statistiques principales
   */
  const loadStats = useCallback(async (filters?: ActivityFilters) => {
    if (!candidateId) {
      setStats(null);
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(filters);

    // Vérifier le cache d'abord
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('[useActivityStats] Using cached stats');
      setStats(cached);
      setLoading(false);
      return;
    }

    try {
      setCacheStatus('updating');
      setLoading(true);
      setError(null);

      console.log('[useActivityStats] Loading fresh stats');

      const response = await ActivitiesAPI.getActivityStats(candidateId, filters);

      if (response.success) {
        setStats(response.data);
        setLastUpdated(new Date().toISOString());
        setInCache(cacheKey, response.data);

        console.log('[useActivityStats] Stats loaded successfully');
      } else {
        console.error('[useActivityStats] Error loading stats:', response.error);
        setError(response.error!);
      }

    } catch (err: any) {
      console.error('[useActivityStats] Unexpected error:', err);
      setError({
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors du chargement des statistiques'
      });
    } finally {
      setLoading(false);
      setCacheStatus('fresh');
    }
  }, [candidateId, getCacheKey, getFromCache, setInCache]);

  /**
   * Rafraîchit les statistiques
   */
  const refreshStats = useCallback(async (filters?: ActivityFilters) => {
    // Forcer un rechargement sans cache
    const cacheKey = getCacheKey(filters);
    cacheRef.current.delete(cacheKey);
    await loadStats(filters);
  }, [getCacheKey, loadStats]);

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Récupère les statistiques d'un projet spécifique
   */
  const getProjectStats = useCallback((projectId: string): ProjectActivityStats | null => {
    if (!stats || !stats.project_distribution) return null;

    return stats.project_distribution.find(p => p.project_id === projectId) || null;
  }, [stats]);

  /**
   * Récupère les statistiques d'un type d'activité
   */
  const getActivityTypeStats = useCallback((type: string): ActivityTypeDistribution | null => {
    if (!stats || !stats.activity_distribution) return null;

    return stats.activity_distribution.find(a => a.type === type) || null;
  }, [stats]);

  /**
   * Récupère les statistiques d'une période
   */
  const getPeriodStats = useCallback((period: string): MonthlyActivityStats | null => {
    if (!stats || !stats.monthly_stats) return null;

    return stats.monthly_stats.find(m => m.month === period) || null;
  }, [stats]);

  // ==========================================
  // ADVANCED ANALYTICS
  // ==========================================

  /**
   * Calcule la tendance de productivité sur N jours
   */
  const calculateProductivityTrend = useCallback((days: number): number => {
    if (!stats || !stats.daily_stats) return 0;

    const recentStats = stats.daily_stats
      .slice(-days)
      .map(d => d.productivity_score);

    if (recentStats.length < 2) return 0;

    const firstHalf = recentStats.slice(0, Math.floor(recentStats.length / 2));
    const secondHalf = recentStats.slice(Math.floor(recentStats.length / 2));

    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

    return secondAvg - firstAvg;
  }, [stats]);

  /**
   * Récupère les recommandations
   */
  const getRecommendations = useCallback((): ActivityRecommendation[] => {
    return stats?.recommendations || [];
  }, [stats]);

  /**
   * Récupère le progrès des objectifs
   */
  const getGoalProgress = useCallback((): ActivityGoal[] => {
    return stats?.goals || [];
  }, [stats]);

  /**
   * Compare avec la période précédente
   */
  const compareWithPrevious = useCallback((metric: string): PeriodComparison => {
    if (!stats || !stats.vs_previous_period) {
      return {
        period_type: 'month',
        current_value: 0,
        previous_value: 0,
        change_percentage: 0,
        change_type: 'stable',
        is_improvement: false
      };
    }

    return stats.vs_previous_period;
  }, [stats]);

  /**
   * Récupère la position de benchmark
   */
  const getBenchmarkPosition = useCallback((metric: string): BenchmarkComparison => {
    if (!stats || !stats.vs_average_candidate) {
      return {
        metric,
        user_value: 0,
        average_value: 0,
        percentile: 50,
        ranking: 'average'
      };
    }

    return stats.vs_average_candidate;
  }, [stats]);

  // ==========================================
  // PREDICTIONS
  // ==========================================

  /**
   * Prédit l'objectif mensuel basé sur les données actuelles
   */
  const predictMonthlyGoal = useCallback((): number => {
    if (!stats || !stats.monthly_stats || stats.monthly_stats.length === 0) {
      return 0;
    }

    // Prendre la moyenne des 3 derniers mois
    const recentMonths = stats.monthly_stats.slice(-3);
    const avgMinutes = recentMonths.reduce((sum, month) => sum + month.total_minutes, 0) / recentMonths.length;

    // Projeter avec une croissance légère (+5%)
    return Math.round(avgMinutes * 1.05);
  }, [stats]);

  /**
   * Estime la date de fin d'un projet basé sur la vitesse actuelle
   */
  const estimateProjectCompletion = useCallback((projectId: string): string | null => {
    const projectStats = getProjectStats(projectId);
    if (!projectStats) return null;

    // Estimation basique : si on continue au rythme actuel
    const avgSessionsPerWeek = Math.max(1, projectStats.total_sessions / 4); // Approximation
    const estimatedWeeksRemaining = Math.ceil(10 / avgSessionsPerWeek); // 10 sessions pour finir

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + (estimatedWeeksRemaining * 7));

    return completionDate.toISOString();
  }, [getProjectStats]);

  // ==========================================
  // AUTO REFRESH
  // ==========================================

  /**
   * Configure le rafraîchissement automatique
   */
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefresh) return;

    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      console.log('[useActivityStats] Auto-refresh triggered');
      loadStats();
    }, refreshInterval * 60 * 1000); // Convert minutes to milliseconds

  }, [autoRefresh, refreshInterval, loadStats]);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  const topPerformingProjects = useMemo(() => {
    if (!stats || !stats.project_distribution) return [];

    return stats.project_distribution
      .sort((a, b) => b.efficiency_score - a.efficiency_score)
      .slice(0, 3);
  }, [stats]);

  const mostUsedActivityTypes = useMemo(() => {
    if (!stats || !stats.activity_distribution) return [];

    return stats.activity_distribution
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 5);
  }, [stats]);

  // ==========================================
  // EFFECTS
  // ==========================================

  /**
   * Chargement initial
   */
  useEffect(() => {
    if (candidateId) {
      loadStats();
      setupAutoRefresh();
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [candidateId]); // Uniquement au montage

  /**
   * Nettoyage à la désinscription
   */
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // ==========================================
  // RETURN OBJECT
  // ==========================================

  return {
    // Statistiques principales
    stats,
    loading,
    error,

    // Actions de rafraîchissement
    refreshStats,

    // Méthodes utilitaires
    getProjectStats,
    getActivityTypeStats,
    getPeriodStats,

    // Analyses avancées
    calculateProductivityTrend,
    getRecommendations,
    getGoalProgress,

    // Comparaisons
    compareWithPrevious,
    getBenchmarkPosition,

    // Prédictions
    predictMonthlyGoal,
    estimateProjectCompletion,

    // Cache et performance
    lastUpdated,
    cacheStatus,

    // Données computées
    topPerformingProjects,
    mostUsedActivityTypes
  } as UseActivityStatsReturn;
};