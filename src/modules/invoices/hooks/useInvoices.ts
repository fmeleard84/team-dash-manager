/**
 * Hook useInvoices - Gestion Principal des Factures
 *
 * Hook principal pour la gestion des factures avec :
 * - Récupération paginée et temps réel
 * - Filtrage et tri avancés
 * - Cache intelligent et optimisations
 * - Génération automatique depuis time tracking
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { InvoicesAPI } from '../services/invoicesAPI';
import type {
  Invoice,
  InvoiceProject,
  InvoiceFilters,
  CompanyInfo,
  UseInvoicesReturn,
  PaginatedResult
} from '../types';

export const useInvoices = (
  initialFilters: Partial<InvoiceFilters> = {},
  options: {
    pageSize?: number;
    enableRealtime?: boolean;
    autoLoadProjects?: boolean;
  } = {}
): UseInvoicesReturn => {
  const { user } = useAuth();
  const {
    pageSize = 20,
    enableRealtime = true,
    autoLoadProjects = true
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<InvoiceProject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [filters, setFilters] = useState<InvoiceFilters>({
    client_id: user?.id || '',
    page: 1,
    limit: pageSize,
    sort_by: 'created_at',
    sort_direction: 'desc',
    ...initialFilters
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // RÉCUPÉRATION DES DONNÉES
  // ==========================================

  const fetchInvoices = useCallback(async (
    newFilters?: Partial<InvoiceFilters>,
    append: boolean = false
  ) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const updatedFilters = { ...filters, ...newFilters, client_id: user.id };
      const response = await InvoicesAPI.getInvoices(updatedFilters);

      if (response.success && response.data) {
        const paginatedData = response.data as PaginatedResult<Invoice>;

        if (append) {
          setInvoices(prev => [...prev, ...paginatedData.data]);
        } else {
          setInvoices(paginatedData.data);
        }

        setTotalCount(paginatedData.total_count);
        setCurrentPage(paginatedData.page);
      } else {
        setError(response.error || 'Erreur lors de la récupération des factures');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters]);

  const fetchProjects = useCallback(async () => {
    if (!user?.id || !autoLoadProjects) return;

    try {
      // Récupérer les projets du client pour les filtres
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status, owner_id, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (err) {
      console.warn('Erreur lors de la récupération des projets:', err);
    }
  }, [user?.id, autoLoadProjects]);

  const fetchCompanyInfo = useCallback(async () => {
    try {
      const response = await InvoicesAPI.getCompanyInfo();
      if (response.success && response.data) {
        setCompanyInfo(response.data);
      }
    } catch (err) {
      console.warn('Erreur lors de la récupération des informations entreprise:', err);
    }
  }, []);

  // ==========================================
  // GESTION DE LA PAGINATION
  // ==========================================

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;

    const nextPage = currentPage + 1;
    setFilters(prev => ({ ...prev, page: nextPage }));
    fetchInvoices({ page: nextPage }, true);
  }, [currentPage, loading, fetchInvoices]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchInvoices({ page: 1 }, false);
  }, [fetchInvoices]);

  // ==========================================
  // GESTION DES FILTRES
  // ==========================================

  const updateFilters = useCallback((newFilters: Partial<InvoiceFilters>) => {
    setCurrentPage(1);
    const updatedFilters = {
      ...filters,
      ...newFilters,
      page: 1,
      client_id: user?.id || ''
    };
    setFilters(updatedFilters);
    fetchInvoices(updatedFilters, false);
  }, [filters, user?.id, fetchInvoices]);

  const resetFilters = useCallback(() => {
    const defaultFilters: InvoiceFilters = {
      client_id: user?.id || '',
      page: 1,
      limit: pageSize,
      sort_by: 'created_at',
      sort_direction: 'desc'
    };
    setFilters(defaultFilters);
    setCurrentPage(1);
    fetchInvoices(defaultFilters, false);
  }, [user?.id, pageSize, fetchInvoices]);

  // ==========================================
  // OPÉRATIONS SPÉCIALISÉES
  // ==========================================

  const getInvoiceById = useCallback(async (id: string): Promise<Invoice | null> => {
    try {
      const response = await InvoicesAPI.getInvoiceById(id);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Erreur lors de la récupération de la facture:', err);
      return null;
    }
  }, []);

  const generateInvoiceForPeriod = useCallback(async (
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      const response = await InvoicesAPI.createInvoice({
        project_id: projectId,
        period_start: startDate,
        period_end: endDate,
        auto_generate_items: true
      });

      if (response.success && response.data) {
        // Actualiser la liste des factures
        await refresh();
        return response.data.id;
      } else {
        setError(response.error || 'Erreur lors de la génération de la facture');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, refresh]);

  // ==========================================
  // MÉTRIQUES ET CALCULS
  // ==========================================

  const hasMore = useMemo(() => {
    return currentPage * pageSize < totalCount;
  }, [currentPage, pageSize, totalCount]);

  const isFiltered = useMemo(() => {
    return Object.keys(filters).length > 4; // Plus que les filtres de base
  }, [filters]);

  // Statistiques rapides
  const quickStats = useMemo(() => {
    return {
      totalInvoices: totalCount,
      draftInvoices: invoices.filter(i => i.status === 'draft').length,
      sentInvoices: invoices.filter(i => i.status === 'sent').length,
      paidInvoices: invoices.filter(i => i.status === 'paid').length,
      overdueInvoices: invoices.filter(i => {
        const dueDate = new Date(i.due_date);
        const today = new Date();
        return dueDate < today && i.status !== 'paid';
      }).length,
      totalRevenue: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.total_cents, 0),
      pendingRevenue: invoices
        .filter(i => i.status === 'sent')
        .reduce((sum, i) => sum + i.total_cents, 0)
    };
  }, [invoices, totalCount]);

  // ==========================================
  // FONCTIONS UTILITAIRES
  // ==========================================

  const formatCurrency = useCallback((cents: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  }, []);

  const formatMinutesToHours = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h${mins.toString().padStart(2, '0')}`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  }, []);

  const getInvoiceStatusInfo = useCallback((invoice: Invoice): { label: string; color: string; } => {
    const today = new Date();
    const dueDate = new Date(invoice.due_date);

    switch (invoice.status) {
      case 'paid':
        return { label: 'Payée', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
      case 'cancelled':
        return { label: 'Annulée', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
      case 'draft':
        return { label: 'Brouillon', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
      case 'sent':
        if (today > dueDate) {
          return { label: 'En retard', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
        }
        return { label: 'En attente', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
      case 'overdue':
        return { label: 'En retard', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
      default:
        return { label: 'Inconnu', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
    }
  }, []);

  // ==========================================
  // EFFETS
  // ==========================================

  // Chargement initial
  useEffect(() => {
    if (user?.id) {
      fetchInvoices();
      fetchProjects();
      fetchCompanyInfo();
    }
  }, [user?.id]);

  // Réabonnement temps réel
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

    let subscription: any = null;

    const setupRealtimeSubscription = async () => {
      try {
        subscription = await InvoicesAPI.subscribeToInvoices(
          user.id,
          (updatedInvoice: Invoice) => {
            setInvoices(prev => {
              const existingIndex = prev.findIndex(i => i.id === updatedInvoice.id);
              if (existingIndex >= 0) {
                // Mise à jour
                const updated = [...prev];
                updated[existingIndex] = updatedInvoice;
                return updated;
              } else {
                // Nouvelle facture
                return [updatedInvoice, ...prev];
              }
            });
          },
          (invoiceId: string) => {
            setInvoices(prev => prev.filter(i => i.id !== invoiceId));
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
    invoices,
    projects,
    totalCount,
    companyInfo,

    // États
    loading,
    error,
    hasMore,
    filters,

    // Actions principales
    refresh,
    loadMore,
    updateFilters,
    resetFilters,

    // Actions spécialisées
    getInvoiceById,
    generateInvoiceForPeriod,

    // Utilitaires
    formatCurrency,
    formatMinutesToHours,
    getInvoiceStatusInfo,

    // Métriques
    quickStats
  };
};