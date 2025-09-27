/**
 * Hook useReportAnalytics - Analytics et Métriques Avancées
 *
 * Hook spécialisé pour les analytics et métriques avec :
 * - Métriques temps réel et historiques
 * - Analytics par projet et candidat
 * - Tendances et comparaisons
 * - Export des données analytics
 * - Actualisation automatique
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { ReportsAPI } from '../services/reportsAPI';
import type {
  DashboardMetrics,
  ProjectAnalytics,
  CandidatePerformance,
  UseReportAnalyticsReturn,
  DateRange,
  ReportFormat,
  TimePeriod
} from '../types';

export const useReportAnalytics = (
  initialTimeRange: DateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  },
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
    enableRealtime?: boolean;
  } = {}
): UseReportAnalyticsReturn => {
  const { user } = useAuth();
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute
    enableRealtime = true
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics[]>([]);
  const [candidatePerformance, setCandidatePerformance] = useState<CandidatePerformance[]>([]);

  const [timeRange, setTimeRange] = useState<DateRange>(initialTimeRange);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ==========================================
  // RÉCUPÉRATION DES MÉTRIQUES
  // ==========================================

  const refreshMetrics = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Récupérer les métriques du dashboard
      const metricsResponse = await ReportsAPI.getDashboardMetrics(user.id, timeRange);

      if (metricsResponse.success && metricsResponse.data) {
        setDashboardMetrics(metricsResponse.data);
      } else {
        setError(metricsResponse.error || 'Erreur lors du chargement des métriques');
      }

      // Récupérer les analytics par projet
      const analyticsResponse = await ReportsAPI.getProjectAnalytics(user.id, {
        date_range: timeRange,
        project_ids: selectedProjects.length > 0 ? selectedProjects : undefined
      });

      if (analyticsResponse.success && analyticsResponse.data) {
        setProjectAnalytics(analyticsResponse.data);
      }

      // TODO: Implémenter getCandidatePerformance
      // Pour l'instant, on génère des données simulées
      setCandidatePerformance([]);

      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  }, [user?.id, timeRange, selectedProjects]);

  // ==========================================
  // EXPORT DES MÉTRIQUES
  // ==========================================

  const exportMetrics = useCallback(async (format: ReportFormat): Promise<string | null> => {
    if (!user?.id || !dashboardMetrics) return null;

    try {
      setLoading(true);

      // Créer un rapport temporaire avec les données actuelles
      const tempReportData = {
        executive_summary: {
          period: `${timeRange.start} - ${timeRange.end}`,
          total_cost: dashboardMetrics.total_cost_period,
          total_hours: Math.floor(dashboardMetrics.total_time_period / 60),
          active_projects: dashboardMetrics.active_projects_count,
          key_achievements: ['Métriques exportées avec succès'],
          main_challenges: [],
          next_period_forecast: []
        },
        key_metrics: {
          cost_per_hour: dashboardMetrics.current_cost_per_minute * 60,
          utilization_rate: 85,
          project_success_rate: 92,
          team_satisfaction: 4.2,
          budget_variance: -3.5,
          delivery_performance: 88
        },
        project_analytics: projectAnalytics,
        candidate_performance: candidatePerformance,
        financial_analysis: {
          period_start: timeRange.start,
          period_end: timeRange.end,
          period_type: 'custom' as TimePeriod,
          total_revenue: dashboardMetrics.total_cost_period,
          billable_hours: Math.floor(dashboardMetrics.total_time_period / 60),
          average_hourly_rate: dashboardMetrics.current_cost_per_minute * 60,
          total_costs: dashboardMetrics.total_cost_period,
          candidate_costs: dashboardMetrics.total_cost_period * 0.8,
          platform_fees: dashboardMetrics.total_cost_period * 0.15,
          other_expenses: dashboardMetrics.total_cost_period * 0.05,
          gross_margin: dashboardMetrics.total_cost_period * 0.25,
          margin_percentage: 25,
          previous_period: {
            revenue_change: 12.5,
            cost_change: 8.3,
            margin_change: 15.2,
            percentage_change: 12.5
          },
          year_over_year: {
            revenue_change: 28.7,
            cost_change: 22.1,
            margin_change: 35.5,
            percentage_change: 28.7
          },
          revenue_by_project: [],
          cost_by_category: [],
          monthly_breakdown: [],
          forecast_next_month: dashboardMetrics.total_cost_period * 1.1,
          forecast_confidence: 85
        },
        trends: {
          cost_trends: dashboardMetrics.cost_trend,
          productivity_trends: dashboardMetrics.time_trend,
          quality_trends: {
            current: 92,
            previous: 89,
            change: 3,
            change_percentage: 3.4,
            direction: 'up' as const,
            trend_line: []
          },
          satisfaction_trends: {
            current: 4.2,
            previous: 4.0,
            change: 0.2,
            change_percentage: 5,
            direction: 'up' as const,
            trend_line: []
          },
          seasonal_patterns: []
        },
        recommendations: [],
        charts_data: {
          dashboard_overview: ReportsAPI.generateSampleChartData('line', 7)
        },
        benchmarks: []
      };

      // Utiliser l'API d'export (simulé pour maintenant)
      const exportResponse = await ReportsAPI.exportReport(
        `metrics_${Date.now()}`,
        format,
        {
          [format]: {
            include_charts: true,
            include_raw_data: true
          }
        }
      );

      if (exportResponse.success && exportResponse.data) {
        return exportResponse.data.id;
      } else {
        setError(exportResponse.error || 'Erreur lors de l\'export');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, dashboardMetrics, projectAnalytics, candidatePerformance, timeRange]);

  // ==========================================
  // UTILITAIRES ET CALCULS
  // ==========================================

  // Métriques dérivées
  const derivedMetrics = useMemo(() => {
    if (!dashboardMetrics) return null;

    return {
      averageProjectCost: projectAnalytics.length > 0
        ? projectAnalytics.reduce((sum, p) => sum + p.total_cost, 0) / projectAnalytics.length
        : 0,

      averageProjectDuration: projectAnalytics.length > 0
        ? projectAnalytics.reduce((sum, p) => sum + p.total_time_minutes, 0) / projectAnalytics.length
        : 0,

      mostExpensiveProject: projectAnalytics.reduce(
        (max, p) => p.total_cost > max.total_cost ? p : max,
        projectAnalytics[0] || { project_name: 'Aucun', total_cost: 0 }
      ),

      mostEfficientProject: projectAnalytics.reduce(
        (max, p) => p.efficiency_score > max.efficiency_score ? p : max,
        projectAnalytics[0] || { project_name: 'Aucun', efficiency_score: 0 }
      ),

      costEfficiencyRatio: dashboardMetrics.total_time_period > 0
        ? dashboardMetrics.total_cost_period / (dashboardMetrics.total_time_period / 60)
        : 0,

      activeVsCompleted: {
        active: dashboardMetrics.active_projects_count,
        completed: dashboardMetrics.completed_projects_count,
        ratio: dashboardMetrics.completed_projects_count > 0
          ? dashboardMetrics.active_projects_count / dashboardMetrics.completed_projects_count
          : 0
      }
    };
  }, [dashboardMetrics, projectAnalytics]);

  // Tendances et changements
  const trendAnalysis = useMemo(() => {
    if (!dashboardMetrics) return null;

    return {
      costTrend: {
        direction: dashboardMetrics.cost_trend.direction,
        percentage: dashboardMetrics.cost_trend.change_percentage,
        isPositive: dashboardMetrics.cost_trend.change >= 0
      },
      timeTrend: {
        direction: dashboardMetrics.time_trend.direction,
        percentage: dashboardMetrics.time_trend.change_percentage,
        isPositive: dashboardMetrics.time_trend.change >= 0
      },
      projectTrend: {
        direction: dashboardMetrics.project_trend.direction,
        percentage: dashboardMetrics.project_trend.change_percentage,
        isPositive: dashboardMetrics.project_trend.change >= 0
      }
    };
  }, [dashboardMetrics]);

  // ==========================================
  // GESTION DES PÉRIODES
  // ==========================================

  const setPredefinedTimeRange = useCallback((period: TimePeriod) => {
    const end = new Date().toISOString().split('T')[0];
    let start: string;

    switch (period) {
      case 'day':
        start = end;
        break;
      case 'week':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'quarter':
        start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    setTimeRange({ start, end });
  }, []);

  // ==========================================
  // EFFETS
  // ==========================================

  // Chargement initial et actualisation
  useEffect(() => {
    if (user?.id) {
      refreshMetrics();
    }
  }, [user?.id, timeRange, selectedProjects, refreshMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user?.id) return;

    const interval = setInterval(() => {
      refreshMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMetrics, user?.id]);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // Données principales
    dashboardMetrics,
    projectAnalytics,
    candidatePerformance,

    // États
    loading,
    error,
    lastUpdated,

    // Actions
    refreshMetrics,
    exportMetrics,

    // Filtres et période
    timeRange,
    setTimeRange,
    setPredefinedTimeRange,
    selectedProjects,
    setSelectedProjects,

    // Données dérivées
    derivedMetrics,
    trendAnalysis
  };
};