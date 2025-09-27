/**
 * Hook pour les statistiques et analytics des drives
 * Utilisé pour les dashboards et vues d'ensemble
 */

import { useState, useEffect, useCallback } from 'react';
import { DriveAPI } from '../services/driveAPI';
import type { DriveStats, DriveActivity, DriveAnalytics } from '../types';

interface UseDriveStatsOptions {
  driveId: string;
  includeActivity?: boolean;
  activityLimit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseDriveStatsReturn {
  // Statistiques
  stats: DriveStats | null;
  activity: DriveActivity[];
  analytics: DriveAnalytics | null;

  // État
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshActivity: () => Promise<void>;

  // Métriques calculées
  storageUsagePercent: number;
  recentActivityCount: number;
  mostActiveUser: string | null;
  popularFileTypes: Array<{ type: string; count: number; percentage: number }>;
}

export function useDriveStats({
  driveId,
  includeActivity = true,
  activityLimit = 20,
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: UseDriveStatsOptions): UseDriveStatsReturn {
  const [stats, setStats] = useState<DriveStats | null>(null);
  const [activity, setActivity] = useState<DriveActivity[]>([]);
  const [analytics, setAnalytics] = useState<DriveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const statsData = await DriveAPI.getDriveStats(driveId);
      setStats(statsData);
    } catch (err) {
      console.error('[useDriveStats] Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    }
  }, [driveId]);

  // Charger l'activité
  const loadActivity = useCallback(async () => {
    if (!includeActivity) return;

    try {
      const activityData = await DriveAPI.getDriveActivity(driveId, activityLimit);
      setActivity(activityData);
    } catch (err) {
      console.error('[useDriveStats] Error loading activity:', err);
      // Ne pas faire échouer pour l'activité uniquement
    }
  }, [driveId, includeActivity, activityLimit]);

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadActivity()
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadStats, loadActivity]);

  // Actualisation générale
  const refresh = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Actualisation statistiques uniquement
  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  // Actualisation activité uniquement
  const refreshActivity = useCallback(async () => {
    await loadActivity();
  }, [loadActivity]);

  // Chargement initial
  useEffect(() => {
    if (driveId) {
      loadAllData();
    }
  }, [driveId, loadAllData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !driveId) return;

    const interval = setInterval(() => {
      loadAllData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, driveId, refreshInterval, loadAllData]);

  // Métriques calculées
  const storageUsagePercent = stats ? stats.storage_usage_percent : 0;

  const recentActivityCount = activity.filter(act => {
    const actDate = new Date(act.created_at);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return actDate > dayAgo;
  }).length;

  const mostActiveUser = (() => {
    if (activity.length === 0) return null;

    const userCounts = activity.reduce((counts, act) => {
      counts[act.user_name] = (counts[act.user_name] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const [topUser] = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a);

    return topUser ? topUser[0] : null;
  })();

  const popularFileTypes = (() => {
    if (!stats || !stats.files_by_type) return [];

    const total = Object.values(stats.files_by_type).reduce((sum, count) => sum + count, 0);

    return Object.entries(stats.files_by_type)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  })();

  return {
    // Données
    stats,
    activity,
    analytics,

    // État
    loading,
    error,

    // Actions
    refresh,
    refreshStats,
    refreshActivity,

    // Métriques
    storageUsagePercent,
    recentActivityCount,
    mostActiveUser,
    popularFileTypes
  };
}