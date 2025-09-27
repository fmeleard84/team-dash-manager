/**
 * Hook useReports - Gestion Principal des Rapports
 *
 * Hook principal pour la gestion des rapports avec :
 * - Récupération paginée et temps réel
 * - Filtrage et tri avancés
 * - Cache intelligent et optimisations
 * - CRUD complet sur les rapports
 * - Génération automatique
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { ReportsAPI } from '../services/reportsAPI';
import type {
  Report,
  ReportFilters,
  UseReportsReturn,
  CreateReportData,
  UpdateReportData,
  PaginatedResult,
  DateRange,
  ReportStatus,
  ReportType
} from '../types';

export const useReports = (
  initialFilters: Partial<ReportFilters> = {},
  options: {
    pageSize?: number;
    enableRealtime?: boolean;
    autoLoad?: boolean;
  } = {}
): UseReportsReturn => {
  const { user } = useAuth();
  const {
    pageSize = 20,
    enableRealtime = true,
    autoLoad = true
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [reports, setReports] = useState<Report[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ReportFilters>({
    date_range: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    period_type: 'month',
    ...initialFilters
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // RÉCUPÉRATION DES DONNÉES
  // ==========================================

  const fetchReports = useCallback(async (
    newFilters?: Partial<ReportFilters>,
    append: boolean = false
  ) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const updatedFilters = { ...filters, ...newFilters };
      const response = await ReportsAPI.getReports(
        user.id,
        updatedFilters,
        append ? currentPage : 1,
        pageSize
      );

      if (response.success && response.data) {
        const paginatedData = response.data as PaginatedResult<Report>;

        if (append) {
          setReports(prev => [...prev, ...paginatedData.data]);
        } else {
          setReports(paginatedData.data);
        }

        setTotalCount(paginatedData.total_count);
        setCurrentPage(paginatedData.page);
      } else {
        setError(response.error || 'Erreur lors de la récupération des rapports');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters, currentPage, pageSize]);

  // ==========================================
  // GESTION DE LA PAGINATION
  // ==========================================

  const hasMore = useMemo(() => {
    return currentPage * pageSize < totalCount;
  }, [currentPage, pageSize, totalCount]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchReports({ page: nextPage }, true);
  }, [currentPage, hasMore, loading, fetchReports]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    fetchReports(filters, false);
  }, [fetchReports, filters]);

  // ==========================================
  // GESTION DES FILTRES
  // ==========================================

  const updateFilters = useCallback((newFilters: Partial<ReportFilters>) => {
    setCurrentPage(1);
    const updatedFilters = {
      ...filters,
      ...newFilters
    };
    setFilters(updatedFilters);
    fetchReports(updatedFilters, false);
  }, [filters, fetchReports]);

  const resetFilters = useCallback(() => {
    const defaultFilters: ReportFilters = {
      date_range: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      period_type: 'month'
    };
    setFilters(defaultFilters);
    setCurrentPage(1);
    fetchReports(defaultFilters, false);
  }, [fetchReports]);

  // ==========================================
  // OPÉRATIONS CRUD
  // ==========================================

  const createReport = useCallback(async (data: CreateReportData): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      const response = await ReportsAPI.createReport({
        ...data,
        client_id: user.id
      } as any);

      if (response.success && response.data) {
        // Actualiser la liste des rapports
        await refresh();
        return response.data.id;
      } else {
        setError(response.error || 'Erreur lors de la création du rapport');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, refresh]);

  const updateReport = useCallback(async (
    id: string,
    data: UpdateReportData
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await ReportsAPI.updateReport(id, data);

      if (response.success) {
        // Mise à jour locale
        setReports(prev => prev.map(report =>
          report.id === id
            ? { ...report, ...response.data }
            : report
        ));
        return true;
      } else {
        setError(response.error || 'Erreur lors de la mise à jour du rapport');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteReport = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await ReportsAPI.deleteReport(id);

      if (response.success) {
        // Suppression locale
        setReports(prev => prev.filter(report => report.id !== id));
        setTotalCount(prev => Math.max(0, prev - 1));
        return true;
      } else {
        setError(response.error || 'Erreur lors de la suppression du rapport');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateReport = useCallback(async (id: string): Promise<string | null> => {
    try {
      setLoading(true);

      // Marquer le rapport en génération localement
      setReports(prev => prev.map(report =>
        report.id === id
          ? { ...report, status: 'generating' as ReportStatus }
          : report
      ));

      const response = await ReportsAPI.generateReport(id);

      if (response.success && response.data) {
        // Mettre à jour le statut
        setReports(prev => prev.map(report =>
          report.id === id
            ? { ...report, status: 'ready' as ReportStatus, last_generated: new Date().toISOString() }
            : report
        ));
        return response.data.id;
      } else {
        setError(response.error || 'Erreur lors de la génération du rapport');
        // Remettre le statut précédent en cas d'erreur
        setReports(prev => prev.map(report =>
          report.id === id
            ? { ...report, status: 'failed' as ReportStatus }
            : report
        ));
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // FONCTIONS UTILITAIRES
  // ==========================================

  const getReportById = useCallback((id: string): Report | null => {
    return reports.find(report => report.id === id) || null;
  }, [reports]);

  const getReportsByType = useCallback((type: ReportType): Report[] => {
    return reports.filter(report => report.type === type);
  }, [reports]);

  const getReportsByStatus = useCallback((status: ReportStatus): Report[] => {
    return reports.filter(report => report.status === status);
  }, [reports]);

  // Statistiques rapides
  const quickStats = useMemo(() => {
    return {
      totalReports: totalCount,
      draftReports: reports.filter(r => r.status === 'draft').length,
      activeReports: reports.filter(r => r.status === 'active').length,
      scheduledReports: reports.filter(r => r.is_scheduled).length,
      generatingReports: reports.filter(r => r.status === 'generating').length,
      recentReports: reports.filter(r => {
        const created = new Date(r.created_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return created > weekAgo;
      }).length
    };
  }, [reports, totalCount]);

  // ==========================================
  // EFFETS
  // ==========================================

  // Chargement initial
  useEffect(() => {
    if (user?.id && autoLoad) {
      fetchReports();
    }
  }, [user?.id, autoLoad]);

  // Réabonnement temps réel
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

    let subscription: any = null;

    const setupRealtimeSubscription = async () => {
      try {
        subscription = await ReportsAPI.subscribeToReports(
          user.id,
          (newReport: Report) => {
            setReports(prev => [newReport, ...prev]);
            setTotalCount(prev => prev + 1);
          },
          (updatedReport: Report) => {
            setReports(prev => prev.map(report =>
              report.id === updatedReport.id ? updatedReport : report
            ));
          },
          (reportId: string) => {
            setReports(prev => prev.filter(report => report.id !== reportId));
            setTotalCount(prev => Math.max(0, prev - 1));
          }
        );
      } catch (err) {
        console.warn('Erreur lors de l\'abonnement temps réel:', err);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe?.();
      }
    };
  }, [enableRealtime, user?.id]);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // Données
    reports,
    totalCount,
    loading,
    error,

    // Actions principales
    refresh,
    createReport,
    updateReport,
    deleteReport,
    generateReport,

    // Filtres et pagination
    filters,
    updateFilters,
    resetFilters,
    hasMore,
    loadMore,

    // Utilitaires
    getReportById,
    getReportsByType,
    getReportsByStatus,

    // Statistiques
    quickStats
  };
};