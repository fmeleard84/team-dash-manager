import { useState, useEffect, useCallback } from 'react';
import { PaymentsAPI } from '../services/paymentsAPI';
import {
  PaymentStats,
  TopClient,
  ProjectEarnings,
  TaxReport,
  PaymentError,
  UsePaymentStatsReturn
} from '../types';

interface UsePaymentStatsOptions {
  candidateId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // en millisecondes
}

export function usePaymentStats({
  candidateId,
  autoRefresh = false,
  refreshInterval = 60000 // 1 minute par défaut
}: UsePaymentStatsOptions): UsePaymentStatsReturn {
  // États
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);

  /**
   * Charge les statistiques générales
   */
  const loadStats = useCallback(async () => {
    if (!candidateId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await PaymentsAPI.getPaymentStats(candidateId);

      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.error || {
          code: 'UNKNOWN_ERROR',
          message: 'Erreur inconnue lors du chargement des statistiques'
        });
      }
    } catch (err) {
      console.error('usePaymentStats.loadStats:', err);
      setError({
        code: 'FETCH_ERROR',
        message: 'Impossible de charger les statistiques'
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
   * Récupère les statistiques d'un client spécifique
   */
  const getClientStats = useCallback(async (clientId: string): Promise<TopClient | null> => {
    try {
      if (!stats || !stats.top_clients.length) {
        await loadStats();
      }

      const clientStats = stats?.top_clients.find(client => client.client_id === clientId);
      return clientStats || null;
    } catch (error) {
      console.error('usePaymentStats.getClientStats:', error);
      return null;
    }
  }, [stats, loadStats]);

  /**
   * Récupère les statistiques d'un projet spécifique
   */
  const getProjectStats = useCallback(async (projectId: string): Promise<ProjectEarnings | null> => {
    try {
      if (!stats || !stats.earnings_by_project.length) {
        await loadStats();
      }

      const projectStats = stats?.earnings_by_project.find(project => project.project_id === projectId);
      return projectStats || null;
    } catch (error) {
      console.error('usePaymentStats.getProjectStats:', error);
      return null;
    }
  }, [stats, loadStats]);

  /**
   * Génère un rapport fiscal pour une période donnée
   */
  const getTaxReport = useCallback(async (
    year: number,
    quarter?: number
  ): Promise<TaxReport> => {
    try {
      // Simuler la génération d'un rapport fiscal
      // Dans une vraie implémentation, cela appellerait un service spécialisé

      const startDate = quarter
        ? new Date(year, (quarter - 1) * 3, 1)
        : new Date(year, 0, 1);

      const endDate = quarter
        ? new Date(year, quarter * 3, 0) // Dernier jour du trimestre
        : new Date(year, 11, 31); // 31 décembre

      // Calculer les revenus pour la période
      let totalIncome = 0;
      let paymentsCount = 0;

      if (stats && stats.earnings_by_month) {
        stats.earnings_by_month.forEach(monthly => {
          const monthDate = new Date(monthly.year, monthly.month - 1, 1);
          if (monthDate >= startDate && monthDate <= endDate) {
            totalIncome += monthly.earnings_cents;
            paymentsCount += monthly.payments_count;
          }
        });
      }

      const taxRate = 0.20; // 20% par défaut
      const taxableIncome = totalIncome; // Simplification - pas de déductions
      const taxOwed = Math.round(taxableIncome * taxRate);

      const report: TaxReport = {
        id: `tax_report_${year}${quarter ? `_Q${quarter}` : ''}`,
        year,
        quarter,
        total_income_cents: totalIncome,
        total_expenses_cents: 0, // À implémenter avec un système de frais
        taxable_income_cents: taxableIncome,
        tax_owed_cents: taxOwed,
        payments_included: paymentsCount,
        generated_at: new Date().toISOString(),
        download_url: `/tax-reports/${year}${quarter ? `-Q${quarter}` : ''}.pdf`
      };

      return report;
    } catch (error) {
      console.error('usePaymentStats.getTaxReport:', error);
      throw new Error('Impossible de générer le rapport fiscal');
    }
  }, [stats]);

  /**
   * Calcule la progression par rapport à la période précédente
   */
  const calculateGrowth = useCallback((
    currentPeriod: number,
    previousPeriod: number
  ): { percentage: number; trend: 'up' | 'down' | 'stable' } => {
    if (previousPeriod === 0) {
      return { percentage: currentPeriod > 0 ? 100 : 0, trend: 'up' };
    }

    const percentage = ((currentPeriod - previousPeriod) / previousPeriod) * 100;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentage > 5) trend = 'up';
    else if (percentage < -5) trend = 'down';

    return { percentage: Math.round(percentage * 100) / 100, trend };
  }, []);

  /**
   * Calcule les moyennes glissantes
   */
  const calculateMovingAverages = useCallback((
    periods: number = 3
  ): { earnings: number; hours: number } | null => {
    if (!stats || !stats.earnings_by_month || stats.earnings_by_month.length < periods) {
      return null;
    }

    const recentMonths = stats.earnings_by_month.slice(-periods);
    const avgEarnings = recentMonths.reduce((sum, month) => sum + month.earnings_cents, 0) / periods;
    const avgHours = recentMonths.reduce((sum, month) => sum + month.hours_worked, 0) / periods;

    return {
      earnings: Math.round(avgEarnings),
      hours: Math.round(avgHours * 100) / 100
    };
  }, [stats]);

  /**
   * Prédit les revenus futurs basés sur les tendances
   */
  const predictFutureEarnings = useCallback((
    monthsAhead: number = 3
  ): { predicted_earnings_cents: number; confidence: number } => {
    if (!stats || !stats.earnings_by_month || stats.earnings_by_month.length < 3) {
      return { predicted_earnings_cents: 0, confidence: 0 };
    }

    const recentMonths = stats.earnings_by_month.slice(-6); // 6 derniers mois
    const avgGrowthRate = recentMonths.reduce((sum, month, index) => {
      if (index === 0) return sum;
      const previousMonth = recentMonths[index - 1];
      const growth = previousMonth.earnings_cents > 0
        ? (month.earnings_cents - previousMonth.earnings_cents) / previousMonth.earnings_cents
        : 0;
      return sum + growth;
    }, 0) / (recentMonths.length - 1);

    const lastMonthEarnings = recentMonths[recentMonths.length - 1].earnings_cents;
    const predictedEarnings = Math.round(
      lastMonthEarnings * Math.pow(1 + avgGrowthRate, monthsAhead)
    );

    // Calculer un score de confiance basé sur la régularité des revenus
    const earningsValues = recentMonths.map(m => m.earnings_cents);
    const mean = earningsValues.reduce((sum, val) => sum + val, 0) / earningsValues.length;
    const variance = earningsValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / earningsValues.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;

    // Plus le coefficient de variation est faible, plus la confiance est élevée
    const confidence = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));

    return {
      predicted_earnings_cents: Math.max(0, predictedEarnings),
      confidence: Math.round(confidence)
    };
  }, [stats]);

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
    getClientStats,
    getProjectStats,
    getTaxReport
  };
}