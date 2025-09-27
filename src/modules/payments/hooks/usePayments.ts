import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentsAPI } from '../services/paymentsAPI';
import {
  Payment,
  PaymentStats,
  PaymentFilters,
  PaymentError,
  UsePaymentsReturn
} from '../types';

interface UsePaymentsOptions {
  candidateId: string;
  initialFilters?: PaymentFilters;
  autoRefresh?: boolean;
  realtime?: boolean;
}

export function usePayments({
  candidateId,
  initialFilters = {
    sort_by: 'payment_date',
    sort_order: 'desc',
    per_page: 20,
    page: 1
  },
  autoRefresh = false,
  realtime = true
}: UsePaymentsOptions): UsePaymentsReturn {
  // États principaux
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);
  const [filters, setFilters] = useState<PaymentFilters>(initialFilters);
  const [hasMore, setHasMore] = useState(false);

  /**
   * Charge les paiements avec les filtres actuels
   */
  const loadPayments = useCallback(async (append = false) => {
    if (!candidateId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await PaymentsAPI.getPayments(candidateId, filters);

      if (response.success) {
        if (append) {
          setPayments(prev => [...prev, ...response.data]);
        } else {
          setPayments(response.data);
        }

        setHasMore(response.pagination.has_next);
      } else {
        setError(response.error || {
          code: 'UNKNOWN_ERROR',
          message: 'Erreur inconnue lors du chargement des paiements'
        });
      }
    } catch (err) {
      console.error('usePayments.loadPayments:', err);
      setError({
        code: 'FETCH_ERROR',
        message: 'Impossible de charger les paiements'
      });
    } finally {
      setLoading(false);
    }
  }, [candidateId, filters]);

  /**
   * Charge les statistiques
   */
  const loadStats = useCallback(async () => {
    if (!candidateId) return;

    try {
      const response = await PaymentsAPI.getPaymentStats(candidateId);

      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('usePayments.loadStats:', err);
    }
  }, [candidateId]);

  /**
   * Met à jour les filtres
   */
  const updateFilters = useCallback((newFilters: Partial<PaymentFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1 // Reset à la page 1 sauf si explicitement spécifié
    }));
  }, []);

  /**
   * Charge plus de paiements (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const nextPage = (filters.page || 1) + 1;
    const newFilters = { ...filters, page: nextPage };

    setLoading(true);
    setError(null);

    try {
      const response = await PaymentsAPI.getPayments(candidateId, newFilters);

      if (response.success) {
        setPayments(prev => [...prev, ...response.data]);
        setHasMore(response.pagination.has_next);
        setFilters(newFilters);
      } else {
        setError(response.error || {
          code: 'UNKNOWN_ERROR',
          message: 'Erreur lors du chargement de plus de paiements'
        });
      }
    } catch (err) {
      console.error('usePayments.loadMore:', err);
      setError({
        code: 'LOAD_MORE_ERROR',
        message: 'Impossible de charger plus de paiements'
      });
    } finally {
      setLoading(false);
    }
  }, [candidateId, filters, hasMore, loading]);

  /**
   * Recharge les données
   */
  const refetch = useCallback(async () => {
    await Promise.all([
      loadPayments(false),
      loadStats()
    ]);
  }, [loadPayments, loadStats]);

  // Chargement initial
  useEffect(() => {
    if (candidateId) {
      refetch();
    }
  }, [candidateId, refetch]);

  // Rechargement quand les filtres changent
  useEffect(() => {
    if (candidateId) {
      loadPayments(false);
    }
  }, [filters, loadPayments]);

  // Auto-refresh périodique
  useEffect(() => {
    if (!autoRefresh || !candidateId) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [autoRefresh, candidateId, refetch]);

  // Configuration du real-time
  useEffect(() => {
    if (!realtime || !candidateId) return;

    const channel = supabase
      .channel(`payments-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoice_payments',
          filter: `candidate_id=eq.${candidateId}`
        },
        async (payload) => {
          console.log('Payment realtime event:', payload);

          if (payload.eventType === 'INSERT') {
            // Nouveau paiement ajouté
            const response = await PaymentsAPI.getPayment(payload.new.id);
            if (response.success) {
              setPayments(prev => [response.data, ...prev]);
              // Recharger les stats
              loadStats();
            }
          } else if (payload.eventType === 'UPDATE') {
            // Paiement mis à jour
            setPayments(prev => prev.map(payment =>
              payment.id === payload.new.id
                ? { ...payment, ...payload.new }
                : payment
            ));

            // Si le statut de paiement a changé, recharger les stats
            if (payload.old.status !== payload.new.status) {
              loadStats();
            }
          } else if (payload.eventType === 'DELETE') {
            // Paiement supprimé
            setPayments(prev => prev.filter(payment => payment.id !== payload.old.id));
            loadStats();
          }
        }
      )
      .subscribe();

    // Écouter aussi les changements sur les enregistrements de temps
    const timeTrackingChannel = supabase
      .channel(`time-tracking-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_tracking_sessions',
          filter: `candidate_id=eq.${candidateId}`
        },
        async (payload) => {
          console.log('Time tracking realtime event:', payload);

          // Recharger les stats quand des sessions de temps sont mises à jour
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            loadStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(timeTrackingChannel);
    };
  }, [realtime, candidateId, loadStats]);

  return {
    payments,
    loading,
    error,
    stats,
    filters,
    updateFilters,
    refetch,
    hasMore,
    loadMore
  };
}