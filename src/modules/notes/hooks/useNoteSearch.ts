/**
 * Hook useNoteSearch - Recherche Avancée dans les Notes
 *
 * Hook spécialisé pour la recherche et le filtrage des notes :
 * - Recherche textuelle full-text
 * - Filtres avancés et facettes
 * - Suggestions et autocomplétion
 * - Historique des recherches
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { NotesAPI } from '../services/notesAPI';
import { useDebounce } from '@/ui/components/useDebounce';
import type {
  NoteSearchResult,
  NoteSearchFilters,
  NoteFilters,
  SearchSuggestion,
  UseNoteSearchReturn
} from '../types';

export const useNoteSearch = (
  options: {
    debounceMs?: number;
    minQueryLength?: number;
    maxResults?: number;
    enableSuggestions?: boolean;
    enableHistory?: boolean;
    storageKey?: string;
  } = {}
): UseNoteSearchReturn => {
  const { user } = useAuth();
  const {
    debounceMs = 300,
    minQueryLength = 2,
    maxResults = 50,
    enableSuggestions = true,
    enableHistory = true,
    storageKey = 'note-search-history'
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<NoteSearchFilters>({});
  const [results, setResults] = useState<NoteSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const debouncedQuery = useDebounce(query, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ==========================================
  // GESTION DE L'HISTORIQUE
  // ==========================================

  const loadHistory = useCallback(() => {
    if (!enableHistory) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const history = JSON.parse(stored);
        setSearchHistory(Array.isArray(history) ? history.slice(0, 10) : []);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement de l\'historique de recherche:', err);
    }
  }, [enableHistory, storageKey]);

  const saveToHistory = useCallback((searchQuery: string) => {
    if (!enableHistory || !searchQuery.trim() || searchQuery.length < minQueryLength) return;

    setSearchHistory(prev => {
      const newHistory = [searchQuery, ...prev.filter(q => q !== searchQuery)].slice(0, 10);

      try {
        localStorage.setItem(storageKey, JSON.stringify(newHistory));
      } catch (err) {
        console.warn('Erreur lors de la sauvegarde de l\'historique:', err);
      }

      return newHistory;
    });
  }, [enableHistory, minQueryLength, storageKey]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('Erreur lors de la suppression de l\'historique:', err);
    }
  }, [storageKey]);

  // ==========================================
  // RECHERCHE PRINCIPALE
  // ==========================================

  const performSearch = useCallback(async (
    searchQuery: string,
    searchFilters: Partial<NoteSearchFilters> = {},
    append: boolean = false
  ) => {
    if (!user?.id || !searchQuery.trim() || searchQuery.length < minQueryLength) {
      if (!append) {
        setResults([]);
        setTotalResults(0);
        setHasSearched(false);
      }
      return;
    }

    // Annuler la recherche précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const fullFilters: NoteFilters = {
        candidate_id: user.id,
        search: searchQuery.trim(),
        limit: maxResults,
        page: append ? Math.floor(results.length / maxResults) + 1 : 1,
        ...searchFilters
      };

      const response = await NotesAPI.searchNotes(
        user.id,
        searchQuery.trim(),
        fullFilters
      );

      if (response.success && response.data) {
        if (append) {
          setResults(prev => [...prev, ...response.data!]);
        } else {
          setResults(response.data);
          setHasSearched(true);
          saveToHistory(searchQuery.trim());
        }

        // Extraire le total depuis les métadonnées de réponse si disponible
        const total = (response as any)?.total || response.data.length;
        setTotalResults(total);
      } else {
        setError(response.error || 'Erreur lors de la recherche');
      }
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, minQueryLength, maxResults, results.length, saveToHistory]);

  // ==========================================
  // SUGGESTIONS
  // ==========================================

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!enableSuggestions || !user?.id || !searchQuery.trim() || searchQuery.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await NotesAPI.getSearchSuggestions(user.id, searchQuery.trim());
      if (response.success && response.data) {
        setSuggestions(response.data.slice(0, 5)); // Limiter à 5 suggestions
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des suggestions:', err);
      setSuggestions([]);
    }
  }, [enableSuggestions, user?.id, minQueryLength]);

  // ==========================================
  // FILTRES ET ACTIONS
  // ==========================================

  const updateFilters = useCallback((newFilters: Partial<NoteSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));

    if (query && hasSearched) {
      performSearch(query, { ...filters, ...newFilters });
    }
  }, [filters, query, hasSearched, performSearch]);

  const clearFilters = useCallback(() => {
    setFilters({});

    if (query && hasSearched) {
      performSearch(query, {});
    }
  }, [query, hasSearched, performSearch]);

  const loadMore = useCallback(() => {
    if (loading || results.length >= totalResults) return;

    performSearch(query, filters, true);
  }, [loading, results.length, totalResults, query, filters, performSearch]);

  const clearResults = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setHasSearched(false);
    setTotalResults(0);
    setError(null);
  }, []);

  // ==========================================
  // RECHERCHES RAPIDES
  // ==========================================

  const searchInNotebook = useCallback(async (notebookId: string, searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    await performSearch(searchQuery, { notebook_id: notebookId });
  }, [query, performSearch]);

  const searchByTag = useCallback(async (tag: string) => {
    await performSearch(`tag:${tag}`, {});
  }, [performSearch]);

  const searchByType = useCallback(async (type: 'personal' | 'meeting' | 'project' | 'idea') => {
    await performSearch(query || '*', { type });
  }, [query, performSearch]);

  const searchRecent = useCallback(async (days: number = 7) => {
    const date = new Date();
    date.setDate(date.getDate() - days);

    await performSearch(query || '*', {
      date_from: date.toISOString().split('T')[0]
    });
  }, [query, performSearch]);

  // ==========================================
  // MÉTRIQUES ET HELPERS
  // ==========================================

  const searchMetrics = useMemo(() => {
    return {
      totalResults,
      currentResultsCount: results.length,
      hasMore: results.length < totalResults,
      isFiltered: Object.keys(filters).length > 0,
      averageScore: results.length > 0
        ? results.reduce((sum, r) => sum + (r.relevance_score || 0), 0) / results.length
        : 0
    };
  }, [results, totalResults, filters]);

  const highlightedResults = useMemo(() => {
    if (!query.trim()) return results;

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);

    return results.map(result => ({
      ...result,
      highlighted_title: result.title, // Sera traité côté composant
      highlighted_content: result.content_preview, // Sera traité côté composant
      highlighted_terms: queryTerms
    }));
  }, [results, query]);

  // ==========================================
  // EFFETS
  // ==========================================

  // Chargement initial de l'historique
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Recherche automatique lors du changement de query debouncée
  useEffect(() => {
    if (debouncedQuery !== query) return; // Éviter les recherches multiples

    if (debouncedQuery.trim() && debouncedQuery.length >= minQueryLength) {
      performSearch(debouncedQuery, filters);
      if (enableSuggestions) {
        fetchSuggestions(debouncedQuery);
      }
    } else if (debouncedQuery.trim() === '') {
      setResults([]);
      setSuggestions([]);
      setHasSearched(false);
      setTotalResults(0);
    }
  }, [debouncedQuery, filters, minQueryLength, performSearch, fetchSuggestions, enableSuggestions, query]);

  // Cleanup lors du démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // État de la recherche
    query,
    setQuery,
    filters,
    results: highlightedResults,
    suggestions,
    searchHistory,

    // Métriques
    searchMetrics,
    totalResults,
    loading,
    error,
    hasSearched,

    // Actions principales
    search: (q: string) => {
      setQuery(q);
      performSearch(q, filters);
    },
    clearResults,
    loadMore,

    // Gestion des filtres
    updateFilters,
    clearFilters,

    // Recherches spécialisées
    searchInNotebook,
    searchByTag,
    searchByType,
    searchRecent,

    // Gestion de l'historique
    clearHistory,

    // Utilitaires
    hasMore: searchMetrics.hasMore,
    isFiltered: searchMetrics.isFiltered
  };
};