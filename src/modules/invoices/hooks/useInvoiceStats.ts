/**
 * Hook useInvoiceStats - Statistiques et Analytiques des Factures
 *
 * Hook spécialisé pour les statistiques et analyses avancées :
 * - Revenus et tendances financières
 * - Performance des paiements
 * - Analyses par client et projet
 * - Export comptable et rapports
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { InvoicesAPI } from '../services/invoicesAPI';
import type {
  InvoiceStats,
  MonthlyRevenue,
  PaymentTrend,
  ClientInvoicingStats,
  UseInvoiceStatsReturn,
  TimeRange
} from '../types';

export const useInvoiceStats = (
  options: {
    timeRange?: TimeRange;
    includeTrends?: boolean;
    includeClientStats?: boolean;
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UseInvoiceStatsReturn => {
  const { user } = useAuth();
  const {
    timeRange = 'month',
    includeTrends = true,
    includeClientStats = true,
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrend[]>([]);
  const [clientStats, setClientStats] = useState<ClientInvoicingStats[]>([]);
  const [currentTimeRange, setCurrentTimeRange] = useState<TimeRange>(timeRange);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ==========================================
  // RÉCUPÉRATION DES STATISTIQUES
  // ==========================================

  const fetchStats = useCallback(async (range: TimeRange = currentTimeRange) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await InvoicesAPI.getInvoiceStats(user.id, range);

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Erreur lors du calcul des statistiques');
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentTimeRange]);

  const fetchTrends = useCallback(async (range: TimeRange = currentTimeRange) => {
    if (!user?.id || !includeTrends) return;

    try {
      // Simuler des données de tendance pour l'instant
      // TODO: Implémenter dans InvoicesAPI
      const mockTrends: PaymentTrend[] = [];
      const now = new Date();

      // Générer des données pour les 12 derniers mois
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        mockTrends.push({
          period,
          amount_cents: Math.floor(Math.random() * 500000) + 100000,
          invoice_count: Math.floor(Math.random() * 20) + 5,
          average_amount_cents: 0,
          payment_success_rate: 0.8 + Math.random() * 0.2
        });
      }

      // Calculer les moyennes
      mockTrends.forEach(trend => {
        trend.average_amount_cents = trend.invoice_count > 0
          ? Math.round(trend.amount_cents / trend.invoice_count)
          : 0;
      });

      setPaymentTrends(mockTrends);
    } catch (err) {
      console.warn('Erreur lors du chargement des tendances:', err);
    }
  }, [user?.id, currentTimeRange, includeTrends]);

  const fetchMonthlyRevenue = useCallback(async () => {
    if (!user?.id || !stats) return;

    try {
      // Utiliser les données de stats.monthly_revenue si disponibles
      if (stats.monthly_revenue && stats.monthly_revenue.length > 0) {
        setMonthlyRevenue(stats.monthly_revenue);
      } else {
        // Générer des données simulées
        const mockRevenue: MonthlyRevenue[] = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

          mockRevenue.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            revenue_cents: Math.floor(Math.random() * 400000) + 50000,
            invoice_count: Math.floor(Math.random() * 15) + 3,
            average_days_to_payment: Math.floor(Math.random() * 20) + 5
          });
        }

        setMonthlyRevenue(mockRevenue);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des revenus mensuels:', err);
    }
  }, [user?.id, stats]);

  const fetchClientStats = useCallback(async () => {
    if (!user?.id || !includeClientStats) return;

    try {
      // TODO: Implémenter dans InvoicesAPI
      // Pour l'instant, générer des données simulées
      const mockClientStats: ClientInvoicingStats[] = [
        {
          client_id: user.id,
          client_name: 'Client Principal',
          total_invoices: stats?.total_invoices || 0,
          total_revenue_cents: stats?.total_revenue_cents || 0,
          average_payment_days: stats?.average_payment_days || 15,
          last_invoice_date: new Date().toISOString().split('T')[0],
          last_payment_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          preferred_payment_method: 'stripe'
        }
      ];

      setClientStats(mockClientStats);
    } catch (err) {
      console.warn('Erreur lors du chargement des statistiques client:', err);
    }
  }, [user?.id, includeClientStats, stats]);

  // ==========================================
  // MÉTRIQUES CALCULÉES
  // ==========================================

  const revenueGrowth = useMemo(() => {
    if (monthlyRevenue.length < 2) return 0;

    const thisMonth = monthlyRevenue[monthlyRevenue.length - 1];
    const lastMonth = monthlyRevenue[monthlyRevenue.length - 2];

    if (lastMonth.revenue_cents === 0) return 0;

    return ((thisMonth.revenue_cents - lastMonth.revenue_cents) / lastMonth.revenue_cents) * 100;
  }, [monthlyRevenue]);

  const averageInvoiceValue = useMemo(() => {
    if (!stats || stats.total_invoices === 0) return 0;

    return Math.round(stats.total_revenue_cents / stats.total_invoices);
  }, [stats]);

  const paymentEfficiency = useMemo(() => {
    if (!stats) return 0;

    const totalInvoices = stats.total_invoices;
    const paidInvoices = stats.paid_invoices;

    if (totalInvoices === 0) return 0;

    return Math.round((paidInvoices / totalInvoices) * 100);
  }, [stats]);

  const overdueRate = useMemo(() => {
    if (!stats) return 0;

    const totalInvoices = stats.total_invoices;
    const overdueInvoices = stats.overdue_invoices;

    if (totalInvoices === 0) return 0;

    return Math.round((overdueInvoices / totalInvoices) * 100);
  }, [stats]);

  const chartData = useMemo(() => {
    return {
      revenue: monthlyRevenue.map(data => ({
        name: `${data.year}-${data.month.toString().padStart(2, '0')}`,
        value: data.revenue_cents / 100,
        invoices: data.invoice_count
      })),
      trends: paymentTrends.map(trend => ({
        name: trend.period,
        amount: trend.amount_cents / 100,
        count: trend.invoice_count,
        successRate: Math.round(trend.payment_success_rate * 100)
      })),
      statusDistribution: stats ? Object.entries(stats.status_distribution).map(([status, count]) => ({
        name: status,
        value: count
      })) : [],
      paymentMethods: stats ? Object.entries(stats.payment_method_distribution).map(([method, count]) => ({
        name: method,
        value: count
      })) : []
    };
  }, [monthlyRevenue, paymentTrends, stats]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const refresh = useCallback(async (newTimeRange?: TimeRange) => {
    const range = newTimeRange || currentTimeRange;
    setCurrentTimeRange(range);

    await Promise.all([
      fetchStats(range),
      fetchTrends(range)
    ]);

    // Fetch dependent data after stats are loaded
    setTimeout(() => {
      fetchMonthlyRevenue();
      fetchClientStats();
    }, 100);
  }, [fetchStats, fetchTrends, fetchMonthlyRevenue, fetchClientStats, currentTimeRange]);

  const setTimeRange = useCallback((range: TimeRange) => {
    refresh(range);
  }, [refresh]);

  const exportAccountingData = useCallback(async (
    format: 'xml' | 'csv' | 'json'
  ): Promise<string | null> => {
    if (!user?.id || !stats) return null;

    try {
      // TODO: Implémenter dans InvoicesAPI
      const exportData = {
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        format,
        total_revenue_cents: stats.total_revenue_cents,
        total_vat_cents: stats.total_vat_cents,
        currency: 'EUR'
      };

      if (format === 'json') {
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Déclencher le téléchargement
        const a = document.createElement('a');
        a.href = url;
        a.download = `accounting-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return url;
      }

      if (format === 'csv') {
        const csvData = [
          ['Type', 'Montant HT', 'TVA', 'Montant TTC'],
          ['Revenus', (stats.total_revenue_cents - stats.total_vat_cents) / 100, stats.total_vat_cents / 100, stats.total_revenue_cents / 100]
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `accounting-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        return url;
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de l\'export comptable:', error);
      return null;
    }
  }, [user?.id, stats]);

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
    monthlyRevenue,
    paymentTrends,
    clientStats,

    // États
    loading,
    error,
    timeRange: currentTimeRange,
    lastUpdated,

    // Actions
    refresh,
    setTimeRange,
    exportAccountingData,

    // Métriques calculées
    revenueGrowth,
    averageInvoiceValue,
    paymentEfficiency,
    overdueRate,

    // Données pour graphiques
    chartData
  };
};