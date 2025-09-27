import { useState, useEffect, useCallback } from 'react';
import { EvaluationsAPI } from '../services/evaluationsAPI';
import {
  EvaluationStats,
  ProjectEvaluationStats,
  ClientEvaluationStats,
  EvaluationError,
  UseEvaluationStatsReturn
} from '../types';

interface UseEvaluationStatsOptions {
  candidateId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // en millisecondes
}

export function useEvaluationStats({
  candidateId,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes par défaut
}: UseEvaluationStatsOptions): UseEvaluationStatsReturn {
  // États
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<EvaluationError | null>(null);

  /**
   * Charge les statistiques des évaluations
   */
  const loadStats = useCallback(async () => {
    if (!candidateId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await EvaluationsAPI.getEvaluationStats(candidateId);

      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.error || {
          code: 'UNKNOWN_ERROR',
          message: 'Erreur inconnue lors du chargement des statistiques',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('useEvaluationStats.loadStats:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Impossible de charger les statistiques',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  /**
   * Recharge les statistiques
   */
  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  /**
   * Récupère les statistiques d'un projet spécifique
   */
  const getProjectStats = useCallback(async (projectId: string): Promise<ProjectEvaluationStats | null> => {
    try {
      if (!stats || !stats.project_stats.length) {
        await loadStats();
      }

      const projectStats = stats?.project_stats.find(project => project.project_id === projectId);
      return projectStats || null;
    } catch (error) {
      console.error('useEvaluationStats.getProjectStats:', error);
      return null;
    }
  }, [stats, loadStats]);

  /**
   * Récupère les statistiques d'un client spécifique
   */
  const getClientStats = useCallback(async (clientId: string): Promise<ClientEvaluationStats | null> => {
    try {
      if (!stats || !stats.client_stats.length) {
        await loadStats();
      }

      const clientStats = stats?.client_stats.find(client => client.client_id === clientId);
      return clientStats || null;
    } catch (error) {
      console.error('useEvaluationStats.getClientStats:', error);
      return null;
    }
  }, [stats, loadStats]);

  /**
   * Analyse la tendance des évaluations sur une période donnée
   */
  const getTrendAnalysis = useCallback(async (months: number = 6): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    percentage: number;
    confidence: number;
  }> => {
    try {
      if (!stats || !stats.monthly_stats || stats.monthly_stats.length < 2) {
        return { trend: 'stable', percentage: 0, confidence: 0 };
      }

      const recentMonths = stats.monthly_stats.slice(-months);

      if (recentMonths.length < 2) {
        return { trend: 'stable', percentage: 0, confidence: 0 };
      }

      // Calculer la tendance linéaire
      const ratings = recentMonths.map((month, index) => ({ x: index, y: month.average_rating }));

      // Régression linéaire simple
      const n = ratings.length;
      const sumX = ratings.reduce((sum, point) => sum + point.x, 0);
      const sumY = ratings.reduce((sum, point) => sum + point.y, 0);
      const sumXY = ratings.reduce((sum, point) => sum + point.x * point.y, 0);
      const sumXX = ratings.reduce((sum, point) => sum + point.x * point.x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

      // Calculer le pourcentage de changement
      const firstRating = recentMonths[0].average_rating;
      const lastRating = recentMonths[recentMonths.length - 1].average_rating;
      const percentage = firstRating > 0 ? Math.abs((lastRating - firstRating) / firstRating * 100) : 0;

      // Déterminer la tendance
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (slope > 0.05) trend = 'improving';
      else if (slope < -0.05) trend = 'declining';

      // Calculer la confiance basée sur la régularité des données
      const avgRating = sumY / n;
      const variance = ratings.reduce((sum, point) => sum + Math.pow(point.y - avgRating, 2), 0) / n;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = avgRating > 0 ? standardDeviation / avgRating : 1;

      // Plus le coefficient de variation est faible, plus la confiance est élevée
      const confidence = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));

      return {
        trend,
        percentage: Math.round(percentage * 100) / 100,
        confidence: Math.round(confidence)
      };
    } catch (error) {
      console.error('useEvaluationStats.getTrendAnalysis:', error);
      return { trend: 'stable', percentage: 0, confidence: 0 };
    }
  }, [stats]);

  /**
   * Compare les statistiques avec la période précédente
   */
  const compareWithPreviousPeriod = useCallback((currentStats: EvaluationStats) => {
    try {
      if (!currentStats.monthly_stats || currentStats.monthly_stats.length < 2) {
        return {
          rating_change: 0,
          volume_change: 0,
          satisfaction_change: 'stable' as const
        };
      }

      const recent = currentStats.monthly_stats.slice(-1)[0];
      const previous = currentStats.monthly_stats.slice(-2, -1)[0];

      if (!recent || !previous) {
        return {
          rating_change: 0,
          volume_change: 0,
          satisfaction_change: 'stable' as const
        };
      }

      // Changement de note moyenne
      const ratingChange = recent.average_rating - previous.average_rating;

      // Changement de volume
      const volumeChange = recent.total_ratings - previous.total_ratings;

      // Changement de satisfaction générale
      let satisfactionChange: 'improved' | 'declined' | 'stable' = 'stable';
      if (ratingChange > 0.1) satisfactionChange = 'improved';
      else if (ratingChange < -0.1) satisfactionChange = 'declined';

      return {
        rating_change: Math.round(ratingChange * 100) / 100,
        volume_change: volumeChange,
        satisfaction_change: satisfactionChange
      };
    } catch (error) {
      console.error('useEvaluationStats.compareWithPreviousPeriod:', error);
      return {
        rating_change: 0,
        volume_change: 0,
        satisfaction_change: 'stable' as const
      };
    }
  }, []);

  /**
   * Calcule les métriques de performance
   */
  const calculatePerformanceMetrics = useCallback((currentStats: EvaluationStats | null) => {
    if (!currentStats) {
      return {
        excellence_rate: 0,
        satisfaction_score: 0,
        improvement_potential: 0,
        consistency_score: 0
      };
    }

    // Taux d'excellence (notes 4 et 5)
    const excellentRatings = (currentStats.rating_distribution[4] || 0) + (currentStats.rating_distribution[5] || 0);
    const excellenceRate = currentStats.total_ratings > 0 ? (excellentRatings / currentStats.total_ratings) * 100 : 0;

    // Score de satisfaction global (note moyenne sur 5 * 20 pour avoir un pourcentage)
    const satisfactionScore = (currentStats.average_rating / 5) * 100;

    // Potentiel d'amélioration (basé sur la distribution des notes)
    const lowRatings = (currentStats.rating_distribution[1] || 0) + (currentStats.rating_distribution[2] || 0);
    const improvementPotential = currentStats.total_ratings > 0 ? (lowRatings / currentStats.total_ratings) * 100 : 0;

    // Score de consistance (basé sur l'écart-type des notes mensuelles)
    let consistencyScore = 100;
    if (currentStats.monthly_stats.length > 1) {
      const monthlyRatings = currentStats.monthly_stats.map(m => m.average_rating);
      const avgMonthlyRating = monthlyRatings.reduce((sum, rating) => sum + rating, 0) / monthlyRatings.length;
      const variance = monthlyRatings.reduce((sum, rating) => sum + Math.pow(rating - avgMonthlyRating, 2), 0) / monthlyRatings.length;
      const standardDeviation = Math.sqrt(variance);

      // Plus l'écart-type est faible, plus la consistance est élevée
      consistencyScore = Math.max(0, 100 - (standardDeviation * 50));
    }

    return {
      excellence_rate: Math.round(excellenceRate),
      satisfaction_score: Math.round(satisfactionScore),
      improvement_potential: Math.round(improvementPotential),
      consistency_score: Math.round(consistencyScore)
    };
  }, []);

  /**
   * Génère des recommandations basées sur les statistiques
   */
  const generateRecommendations = useCallback((currentStats: EvaluationStats | null): string[] => {
    const recommendations: string[] = [];

    if (!currentStats || currentStats.total_ratings === 0) {
      recommendations.push("Commencez à recevoir des évaluations pour améliorer votre profil");
      return recommendations;
    }

    // Recommandations basées sur la note moyenne
    if (currentStats.average_rating < 3) {
      recommendations.push("Focalisez-vous sur l'amélioration de la qualité de vos livrables");
      recommendations.push("Demandez des retours détaillés à vos clients pour comprendre les axes d'amélioration");
    } else if (currentStats.average_rating < 4) {
      recommendations.push("Vous êtes sur la bonne voie ! Continuez à soigner la qualité de votre travail");
      recommendations.push("Travaillez sur la communication avec vos clients pour dépasser leurs attentes");
    } else {
      recommendations.push("Excellente performance ! Maintenez cette qualité de travail");
    }

    // Recommandations basées sur la distribution
    const lowRatings = (currentStats.rating_distribution[1] || 0) + (currentStats.rating_distribution[2] || 0);
    if (lowRatings > 0) {
      recommendations.push("Analysez les projets avec des notes faibles pour identifier les problèmes récurrents");
    }

    // Recommandations basées sur la tendance
    if (currentStats.recent_trend === 'declining') {
      recommendations.push("Attention : vos évaluations sont en baisse. Réévaluez votre approche");
    } else if (currentStats.recent_trend === 'improving') {
      recommendations.push("Bonne dynamique ! Vos évaluations s'améliorent");
    }

    // Recommandations basées sur les commentaires
    const commentRate = currentStats.total_ratings > 0 ? (currentStats.total_comments / currentStats.total_ratings) * 100 : 0;
    if (commentRate < 50) {
      recommendations.push("Encouragez vos clients à laisser des commentaires détaillés");
    }

    return recommendations;
  }, []);

  // Chargement initial
  useEffect(() => {
    if (candidateId) {
      loadStats();
    }
  }, [candidateId, loadStats]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !candidateId) return;

    const interval = setInterval(() => {
      loadStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, candidateId, refreshInterval, loadStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
    getProjectStats,
    getClientStats,
    getTrendAnalysis,
    compareWithPreviousPeriod,
    calculatePerformanceMetrics: () => calculatePerformanceMetrics(stats),
    generateRecommendations: () => generateRecommendations(stats)
  };
}