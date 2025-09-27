/**
 * Hook useNotes - Gestion Principal des Notes
 *
 * Hook principal pour la gestion des notes avec :
 * - Récupération paginée et temps réel
 * - Filtrage et tri avancés
 * - Cache intelligent et optimisations
 * - Gestion des notebooks
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { NotesAPI } from '../services/notesAPI';
import type {
  Note,
  Notebook,
  NoteFilters,
  NoteSortBy,
  NoteAPIResponse,
  UseNotesReturn,
  PaginatedResult
} from '../types';

export const useNotes = (
  initialFilters: Partial<NoteFilters> = {},
  options: {
    pageSize?: number;
    sortBy?: NoteSortBy;
    enableRealtime?: boolean;
    preloadNotebooks?: boolean;
  } = {}
): UseNotesReturn => {
  const { user } = useAuth();
  const {
    pageSize = 20,
    sortBy = 'updated_at',
    enableRealtime = true,
    preloadNotebooks = true
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<NoteFilters>({
    candidate_id: user?.id || '',
    status: ['draft', 'published'],
    page: 1,
    limit: pageSize,
    sort_by: sortBy,
    ...initialFilters
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // RÉCUPÉRATION DES DONNÉES
  // ==========================================

  const fetchNotes = useCallback(async (
    newFilters?: Partial<NoteFilters>,
    append: boolean = false
  ) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const updatedFilters = { ...filters, ...newFilters };
      const response = await NotesAPI.getNotes(updatedFilters);

      if (response.success && response.data) {
        const paginatedData = response.data as PaginatedResult<Note>;

        if (append) {
          setNotes(prev => [...prev, ...paginatedData.data]);
        } else {
          setNotes(paginatedData.data);
        }

        setTotalCount(paginatedData.total_count);
        setCurrentPage(paginatedData.page);
      } else {
        setError(response.error || 'Erreur lors de la récupération des notes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters]);

  const fetchNotebooks = useCallback(async () => {
    if (!user?.id || !preloadNotebooks) return;

    try {
      const response = await NotesAPI.getNotebooks(user.id);
      if (response.success && response.data) {
        setNotebooks(response.data);
      }
    } catch (err) {
      console.warn('Erreur lors de la récupération des notebooks:', err);
    }
  }, [user?.id, preloadNotebooks]);

  // ==========================================
  // GESTION DE LA PAGINATION
  // ==========================================

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;

    const nextPage = currentPage + 1;
    setFilters(prev => ({ ...prev, page: nextPage }));
    fetchNotes({ page: nextPage }, true);
  }, [currentPage, loading, fetchNotes]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchNotes({ page: 1 }, false);
  }, [fetchNotes]);

  // ==========================================
  // GESTION DES FILTRES
  // ==========================================

  const updateFilters = useCallback((newFilters: Partial<NoteFilters>) => {
    setCurrentPage(1);
    const updatedFilters = {
      ...filters,
      ...newFilters,
      page: 1,
      candidate_id: user?.id || ''
    };
    setFilters(updatedFilters);
    fetchNotes(updatedFilters, false);
  }, [filters, user?.id, fetchNotes]);

  const resetFilters = useCallback(() => {
    const defaultFilters: NoteFilters = {
      candidate_id: user?.id || '',
      status: ['draft', 'published'],
      page: 1,
      limit: pageSize,
      sort_by: sortBy
    };
    setFilters(defaultFilters);
    setCurrentPage(1);
    fetchNotes(defaultFilters, false);
  }, [user?.id, pageSize, sortBy, fetchNotes]);

  // ==========================================
  // OPÉRATIONS SPÉCIALISÉES
  // ==========================================

  const getNotesInNotebook = useCallback(async (notebookId: string) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await NotesAPI.getNotesInNotebook(notebookId, user.id);

      if (response.success && response.data) {
        setNotes(response.data);
        setTotalCount(response.data.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getFavoriteNotes = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await NotesAPI.getFavoriteNotes(user.id);

      if (response.success && response.data) {
        setNotes(response.data);
        setTotalCount(response.data.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getRecentNotes = useCallback(async (days: number = 7) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await NotesAPI.getRecentNotes(user.id, days);

      if (response.success && response.data) {
        setNotes(response.data);
        setTotalCount(response.data.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ==========================================
  // MÉTRIQUES ET CALCULS
  // ==========================================

  const metrics = useMemo(() => {
    return {
      totalNotes: totalCount,
      notesInCurrentView: notes.length,
      pinnedNotes: notes.filter(n => n.is_pinned).length,
      favoriteNotes: notes.filter(n => n.is_favorite).length,
      draftNotes: notes.filter(n => n.status === 'draft').length,
      publishedNotes: notes.filter(n => n.status === 'published').length,
      archivedNotes: notes.filter(n => n.status === 'archived').length,
      totalWordCount: notes.reduce((sum, note) => sum + note.word_count, 0),
      averageReadTime: notes.length > 0
        ? Math.round(notes.reduce((sum, note) => sum + note.read_time_minutes, 0) / notes.length)
        : 0
    };
  }, [notes, totalCount]);

  const hasMore = useMemo(() => {
    return currentPage * pageSize < totalCount;
  }, [currentPage, pageSize, totalCount]);

  const isFiltered = useMemo(() => {
    return Object.keys(filters).length > 4; // Plus que les filtres de base
  }, [filters]);

  // ==========================================
  // EFFETS
  // ==========================================

  // Chargement initial
  useEffect(() => {
    if (user?.id) {
      fetchNotes();
      fetchNotebooks();
    }
  }, [user?.id]);

  // Réabonnement temps réel
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

    let subscription: any = null;

    const setupRealtimeSubscription = async () => {
      try {
        subscription = await NotesAPI.subscribeToNotes(
          user.id,
          (updatedNote: Note) => {
            setNotes(prev => {
              const existingIndex = prev.findIndex(n => n.id === updatedNote.id);
              if (existingIndex >= 0) {
                // Mise à jour
                const updated = [...prev];
                updated[existingIndex] = updatedNote;
                return updated;
              } else {
                // Nouvelle note (si elle correspond aux filtres actuels)
                return [updatedNote, ...prev];
              }
            });
          },
          (noteId: string) => {
            setNotes(prev => prev.filter(n => n.id !== noteId));
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
    notes,
    notebooks,
    totalCount,
    currentPage,
    filters,
    metrics,

    // États
    loading,
    error,
    hasMore,
    isFiltered,

    // Actions principales
    refresh,
    loadMore,
    updateFilters,
    resetFilters,

    // Actions spécialisées
    getNotesInNotebook,
    getFavoriteNotes,
    getRecentNotes,

    // Utilitaires
    setNotes, // Pour les optimisations locales
    setError // Pour la gestion d'erreur externe
  };
};