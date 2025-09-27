/**
 * Hook useNoteStats - Statistiques et Analytiques des Notes
 *
 * Hook spécialisé pour les statistiques et analyses avancées :
 * - Métriques de productivité et d'activité
 * - Analyses temporelles et tendances
 * - Distribution par types et tags
 * - Objectifs et recommandations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { NotesAPI } from '../services/notesAPI';
import type {
  NoteStats,
  NotebookStats,
  NoteActivity,
  NoteRecommendation,
  NoteGoal,
  PeriodComparison,
  ProductivityMetrics,
  UseNoteStatsReturn,
  TimeRange
} from '../types';

export const useNoteStats = (
  options: {
    timeRange?: TimeRange;
    includeTrends?: boolean;
    includeRecommendations?: boolean;
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UseNoteStatsReturn => {
  const { user } = useAuth();
  const {
    timeRange = 'month',
    includeTrends = true,
    includeRecommendations = true,
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [stats, setStats] = useState<NoteStats | null>(null);
  const [notebookStats, setNotebookStats] = useState<NotebookStats[]>([]);
  const [activity, setActivity] = useState<NoteActivity[]>([]);
  const [recommendations, setRecommendations] = useState<NoteRecommendation[]>([]);
  const [goals, setGoals] = useState<NoteGoal[]>([]);
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ==========================================
  // RÉCUPÉRATION DES STATISTIQUES
  // ==========================================

  const fetchStats = useCallback(async (range: TimeRange = timeRange) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [
        statsResponse,
        notebookStatsResponse,
        activityResponse
      ] = await Promise.all([
        NotesAPI.getNoteStats(user.id, range),
        NotesAPI.getNotebookStats(user.id),
        NotesAPI.getNoteActivity(user.id, range)
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (notebookStatsResponse.success && notebookStatsResponse.data) {
        setNotebookStats(notebookStatsResponse.data);
      }

      if (activityResponse.success && activityResponse.data) {
        setActivity(activityResponse.data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [user?.id, timeRange]);

  const fetchTrends = useCallback(async (range: TimeRange = timeRange) => {
    if (!user?.id || !includeTrends) return;

    try {
      const response = await NotesAPI.getPeriodComparison(user.id, range);
      if (response.success && response.data) {
        setPeriodComparison(response.data);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des tendances:', err);
    }
  }, [user?.id, timeRange, includeTrends]);

  const fetchRecommendations = useCallback(async () => {
    if (!user?.id || !includeRecommendations) return;

    try {
      const response = await NotesAPI.getNoteRecommendations(user.id);
      if (response.success && response.data) {
        setRecommendations(response.data);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des recommandations:', err);
    }
  }, [user?.id, includeRecommendations]);

  const fetchGoals = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await NotesAPI.getNoteGoals(user.id);
      if (response.success && response.data) {
        setGoals(response.data);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des objectifs:', err);
    }
  }, [user?.id]);

  // ==========================================
  // MÉTRIQUES CALCULÉES
  // ==========================================

  const productivityMetrics = useMemo((): ProductivityMetrics | null => {
    if (!stats || !activity.length) return null;

    const today = new Date();
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const recentActivity = activity.filter(a => new Date(a.date) >= thisWeek);
    const monthlyActivity = activity.filter(a => new Date(a.date) >= thisMonth);

    const avgNotesPerWeek = recentActivity.length > 0
      ? recentActivity.reduce((sum, a) => sum + a.notes_created, 0) / Math.max(1, recentActivity.length) * 7
      : 0;

    const avgWordsPerNote = stats.total_notes > 0
      ? Math.round(stats.total_words / stats.total_notes)
      : 0;

    const consistencyScore = (() => {
      const daysWithActivity = new Set(activity.map(a =>
        new Date(a.date).toDateString()
      )).size;
      const totalDays = Math.min(30, activity.length); // Max 30 jours
      return totalDays > 0 ? Math.round((daysWithActivity / totalDays) * 100) : 0;
    })();

    const qualityScore = (() => {
      if (stats.total_notes === 0) return 0;

      // Facteurs de qualité
      const avgReadTime = stats.total_read_time_minutes / stats.total_notes;
      const publishedRatio = stats.published_notes / stats.total_notes;
      const favoriteRatio = stats.favorite_notes / stats.total_notes;

      const readTimeScore = Math.min(100, (avgReadTime / 5) * 100); // 5 min = 100%
      const publishScore = publishedRatio * 100;
      const favoriteScore = favoriteRatio * 100;

      return Math.round((readTimeScore * 0.4 + publishScore * 0.4 + favoriteScore * 0.2));
    })();

    return {
      notes_per_week: Math.round(avgNotesPerWeek * 10) / 10,
      words_per_note: avgWordsPerNote,
      consistency_score: consistencyScore,
      quality_score: qualityScore,
      productivity_trend: periodComparison?.notes_change_percent || 0,
      active_days: new Set(activity.map(a => new Date(a.date).toDateString())).size
    };
  }, [stats, activity, periodComparison]);

  const topTags = useMemo(() => {
    if (!stats?.tag_distribution) return [];

    return Object.entries(stats.tag_distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count, percentage: Math.round((count / stats.total_notes) * 100) }));
  }, [stats]);

  const topNotebooks = useMemo(() => {
    return notebookStats
      .sort((a, b) => b.notes_count - a.notes_count)
      .slice(0, 5);
  }, [notebookStats]);

  const recentTrends = useMemo(() => {
    if (!activity.length) return { daily: [], weekly: [] };

    const now = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayActivity = activity.find(a =>
        new Date(a.date).toDateString() === date.toDateString()
      );

      return {
        date: date.toISOString().split('T')[0],
        notes: dayActivity?.notes_created || 0,
        words: dayActivity?.words_written || 0
      };
    }).reverse();

    const weeklyTrends = [];
    for (let i = 0; i < last30Days.length; i += 7) {
      const week = last30Days.slice(i, i + 7);
      const weekTotal = week.reduce((sum, day) => ({
        notes: sum.notes + day.notes,
        words: sum.words + day.words
      }), { notes: 0, words: 0 });

      weeklyTrends.push({
        week: `S${Math.ceil((i + 1) / 7)}`,
        ...weekTotal
      });
    }

    return {
      daily: last30Days.slice(-7), // 7 derniers jours
      weekly: weeklyTrends
    };
  }, [activity]);

  // ==========================================
  // ACTIONS DE GESTION DES OBJECTIFS
  // ==========================================

  const createGoal = useCallback(async (goalData: Omit<NoteGoal, 'id' | 'candidate_id' | 'created_at' | 'progress'>) => {
    if (!user?.id) return null;

    try {
      const response = await NotesAPI.createNoteGoal(user.id, goalData);
      if (response.success && response.data) {
        setGoals(prev => [...prev, response.data!]);
        return response.data;
      }
    } catch (err) {
      console.error('Erreur lors de la création de l\'objectif:', err);
    }
    return null;
  }, [user?.id]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<NoteGoal>) => {
    try {
      const response = await NotesAPI.updateNoteGoal(goalId, updates);
      if (response.success && response.data) {
        setGoals(prev => prev.map(g => g.id === goalId ? response.data! : g));
        return response.data;
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'objectif:', err);
    }
    return null;
  }, []);

  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      const response = await NotesAPI.deleteNoteGoal(goalId);
      if (response.success) {
        setGoals(prev => prev.filter(g => g.id !== goalId));
        return true;
      }
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'objectif:', err);
    }
    return false;
  }, []);

  // ==========================================
  // ACTIONS UTILITAIRES
  // ==========================================

  const refresh = useCallback(async (newTimeRange?: TimeRange) => {
    const range = newTimeRange || timeRange;
    await Promise.all([
      fetchStats(range),
      fetchTrends(range),
      fetchRecommendations(),
      fetchGoals()
    ]);
  }, [fetchStats, fetchTrends, fetchRecommendations, fetchGoals, timeRange]);

  const exportStats = useCallback(async (format: 'csv' | 'json' = 'json') => {
    if (!stats) return null;

    const exportData = {
      period: timeRange,
      generated_at: new Date().toISOString(),
      stats,
      notebookStats,
      activity,
      productivityMetrics,
      topTags,
      recommendations: includeRecommendations ? recommendations : []
    };

    if (format === 'csv') {
      // Conversion CSV basique pour les métriques principales
      const csvData = [
        ['Métrique', 'Valeur'],
        ['Total notes', stats.total_notes.toString()],
        ['Total mots', stats.total_words.toString()],
        ['Notes publiées', stats.published_notes.toString()],
        ['Notes favorites', stats.favorite_notes.toString()],
        ['Temps de lecture total', `${stats.total_read_time_minutes} min`],
        ['Score de consistance', `${productivityMetrics?.consistency_score || 0}%`],
        ['Score de qualité', `${productivityMetrics?.quality_score || 0}%`]
      ].map(row => row.join(',')).join('\n');

      return csvData;
    }

    return JSON.stringify(exportData, null, 2);
  }, [stats, notebookStats, activity, productivityMetrics, topTags, recommendations, timeRange, includeRecommendations]);

  // ==========================================
  // EFFETS
  // ==========================================

  // Chargement initial
  useEffect(() => {
    if (user?.id) {
      refresh();
    }
  }, [user?.id, refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // Données principales
    stats,
    notebookStats,
    activity,
    recommendations,
    goals,
    periodComparison,
    productivityMetrics,

    // Données calculées
    topTags,
    topNotebooks,
    recentTrends,

    // États
    loading,
    error,
    lastUpdated,

    // Actions
    refresh,
    createGoal,
    updateGoal,
    deleteGoal,
    exportStats,

    // Configuration
    timeRange,
    setTimeRange: (range: TimeRange) => refresh(range)
  };
};