import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EvaluationsAPI } from '../services/evaluationsAPI';
import {
  EvaluationItem,
  TaskRating,
  TaskComment,
  EvaluationFilters,
  EvaluationError,
  UseEvaluationsReturn
} from '../types';

interface UseEvaluationsOptions {
  candidateId: string;
  initialFilters?: Partial<EvaluationFilters>;
  autoRefresh?: boolean;
  realtime?: boolean;
}

export function useEvaluations({
  candidateId,
  initialFilters = {
    sort_by: 'created_at',
    sort_order: 'desc',
    per_page: 20,
    page: 1
  },
  autoRefresh = false,
  realtime = true
}: UseEvaluationsOptions): UseEvaluationsReturn {
  // États principaux
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [ratings, setRatings] = useState<TaskRating[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<EvaluationError | null>(null);
  const [filters, setFilters] = useState<EvaluationFilters>(initialFilters as EvaluationFilters);
  const [hasMore, setHasMore] = useState(false);

  /**
   * Charge les évaluations avec les filtres actuels
   */
  const loadEvaluations = useCallback(async (append = false) => {
    if (!candidateId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await EvaluationsAPI.getEvaluations(candidateId, filters);

      if (response.success) {
        if (append) {
          setEvaluations(prev => [...prev, ...response.data]);
        } else {
          setEvaluations(response.data);
        }

        // Séparer les ratings des commentaires
        const ratingsData = response.data.filter(item => item.type === 'rating') as (EvaluationItem & { rating: number })[];
        const ratingsOnly: TaskRating[] = ratingsData.map(item => ({
          id: item.id,
          task_id: '', // À enrichir si nécessaire
          project_id: item.project_id,
          candidate_id: candidateId,
          client_id: '', // À enrichir si nécessaire
          rating: item.rating!,
          comment: item.comment || null,
          created_at: item.date,
          updated_at: item.date,
          task_title: item.task_title,
          project_title: item.project_title
        }));

        if (append) {
          setRatings(prev => [...prev, ...ratingsOnly]);
        } else {
          setRatings(ratingsOnly);
        }

        setHasMore(response.pagination.has_next);
      } else {
        setError(response.error || {
          code: 'UNKNOWN_ERROR',
          message: 'Erreur inconnue lors du chargement des évaluations',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('useEvaluations.loadEvaluations:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Impossible de charger les évaluations',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [candidateId, filters]);

  /**
   * Met à jour les filtres
   */
  const updateFilters = useCallback((newFilters: Partial<EvaluationFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1 // Reset à la page 1 sauf si explicitement spécifié
    }));
  }, []);

  /**
   * Charge plus d'évaluations (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const nextPage = (filters.page || 1) + 1;
    const newFilters = { ...filters, page: nextPage };

    setLoading(true);
    setError(null);

    try {
      const response = await EvaluationsAPI.getEvaluations(candidateId, newFilters);

      if (response.success) {
        setEvaluations(prev => [...prev, ...response.data]);

        // Ajouter les nouvelles évaluations aux ratings
        const newRatings = response.data
          .filter(item => item.type === 'rating')
          .map(item => ({
            id: item.id,
            task_id: '',
            project_id: item.project_id,
            candidate_id: candidateId,
            client_id: '',
            rating: item.rating!,
            comment: item.comment || null,
            created_at: item.date,
            updated_at: item.date,
            task_title: item.task_title,
            project_title: item.project_title
          })) as TaskRating[];

        setRatings(prev => [...prev, ...newRatings]);
        setHasMore(response.pagination.has_next);
        setFilters(newFilters);
      } else {
        setError(response.error || {
          code: 'LOAD_MORE_ERROR',
          message: 'Erreur lors du chargement de plus d\'évaluations',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('useEvaluations.loadMore:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Impossible de charger plus d\'évaluations',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [candidateId, filters, hasMore, loading]);

  /**
   * Recharge les données
   */
  const refetch = useCallback(async () => {
    await loadEvaluations(false);
  }, [loadEvaluations]);

  // Chargement initial
  useEffect(() => {
    if (candidateId) {
      loadEvaluations(false);
    }
  }, [candidateId, loadEvaluations]);

  // Rechargement quand les filtres changent
  useEffect(() => {
    if (candidateId) {
      loadEvaluations(false);
    }
  }, [filters, loadEvaluations]);

  // Auto-refresh périodique
  useEffect(() => {
    if (!autoRefresh || !candidateId) return;

    const interval = setInterval(() => {
      refetch();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [autoRefresh, candidateId, refetch]);

  // Configuration du real-time
  useEffect(() => {
    if (!realtime || !candidateId) return;

    const channel = supabase
      .channel(`evaluations-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_ratings',
          filter: `candidate_id=eq.${candidateId}`
        },
        async (payload) => {
          console.log('Evaluation realtime event:', payload);

          if (payload.eventType === 'INSERT') {
            // Nouvelle évaluation ajoutée
            const response = await EvaluationsAPI.getRating(payload.new.id);
            if (response.success) {
              const newEvaluationItem: EvaluationItem = {
                id: response.data.id,
                type: 'rating',
                date: response.data.created_at,
                project_id: response.data.project_id,
                project_title: response.data.project_title,
                rating: response.data.rating,
                comment: response.data.comment,
                task_title: response.data.task_title
              };

              setEvaluations(prev => [newEvaluationItem, ...prev]);
              setRatings(prev => [response.data, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Évaluation mise à jour
            setEvaluations(prev => prev.map(eval => {
              if (eval.id === payload.new.id && eval.type === 'rating') {
                return {
                  ...eval,
                  rating: payload.new.rating,
                  comment: payload.new.comment
                };
              }
              return eval;
            }));

            setRatings(prev => prev.map(rating =>
              rating.id === payload.new.id
                ? { ...rating, ...payload.new }
                : rating
            ));
          } else if (payload.eventType === 'DELETE') {
            // Évaluation supprimée
            setEvaluations(prev => prev.filter(eval => eval.id !== payload.old.id));
            setRatings(prev => prev.filter(rating => rating.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtime, candidateId]);

  return {
    evaluations,
    ratings,
    comments,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    updateFilters,
    filters
  };
}