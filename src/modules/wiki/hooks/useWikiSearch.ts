import { useState, useEffect, useCallback, useMemo } from 'react';
import { WikiAPI } from '../services/wikiAPI';
import {
  WikiSearchResult,
  WikiSearchFilters,
  WikiError,
  UseWikiSearchReturn
} from '../types';

interface UseWikiSearchOptions {
  projectId: string;
  debounceMs?: number;
  minQueryLength?: number;
  enableSuggestions?: boolean;
}

export function useWikiSearch({
  projectId,
  debounceMs = 300,
  minQueryLength = 2,
  enableSuggestions = true
}: UseWikiSearchOptions): UseWikiSearchReturn {
  // États principaux
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WikiError | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);

  // Requête de recherche actuelle
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<WikiSearchFilters>({});

  // Suggestions et historique
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Timer pour le debounce
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * Charge l'historique des recherches depuis le localStorage
   */
  const loadRecentSearches = useCallback(() => {
    try {
      const stored = localStorage.getItem(`wiki-recent-searches-${projectId}`);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  }, [projectId]);

  /**
   * Sauvegarde une recherche dans l'historique
   */
  const saveToRecentSearches = useCallback((query: string) => {
    if (!query.trim() || query.length < minQueryLength) return;

    try {
      const newRecent = [query, ...recentSearches.filter(q => q !== query)].slice(0, 10);
      setRecentSearches(newRecent);
      localStorage.setItem(`wiki-recent-searches-${projectId}`, JSON.stringify(newRecent));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'historique:', error);
    }
  }, [recentSearches, projectId, minQueryLength]);

  /**
   * Génère des suggestions basées sur l'historique et les résultats
   */
  const generateSuggestions = useCallback((query: string, searchResults: WikiSearchResult[]) => {
    if (!enableSuggestions || !query) {
      setSuggestions([]);
      return;
    }

    const suggestions: string[] = [];

    // Suggestions basées sur l'historique
    const historySuggestions = recentSearches
      .filter(search => search.toLowerCase().includes(query.toLowerCase()) && search !== query)
      .slice(0, 3);
    suggestions.push(...historySuggestions);

    // Suggestions basées sur les titres des résultats
    const titleSuggestions = searchResults
      .map(result => result.page.title)
      .filter(title => title.toLowerCase().includes(query.toLowerCase()) && title !== query)
      .slice(0, 3);
    suggestions.push(...titleSuggestions);

    // Suggestions basées sur les tags (si disponibles)
    const tagSuggestions = searchResults
      .flatMap(result => result.page.tags || [])
      .filter(tag => tag.toLowerCase().includes(query.toLowerCase()) && tag !== query)
      .slice(0, 2);
    suggestions.push(...tagSuggestions);

    // Supprimer les doublons et limiter
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 8);
    setSuggestions(uniqueSuggestions);
  }, [enableSuggestions, recentSearches]);

  /**
   * Effectue la recherche
   */
  const performSearch = useCallback(async (query: string, filters?: WikiSearchFilters) => {
    if (!query.trim() || query.length < minQueryLength) {
      setResults([]);
      setTotalResults(0);
      setSearchTime(0);
      setError(null);
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      const response = await WikiAPI.search(projectId, query, filters);

      if (response.success) {
        setResults(response.data);
        setTotalResults(response.data.length);
        setSearchTime(Date.now() - startTime);

        // Générer des suggestions
        generateSuggestions(query, response.data);

        // Sauvegarder dans l'historique
        saveToRecentSearches(query);
      } else {
        setError(response.error || {
          code: 'SEARCH_ERROR',
          message: 'Erreur lors de la recherche'
        });
        setResults([]);
        setTotalResults(0);
      }
    } catch (err) {
      console.error('useWikiSearch.performSearch:', err);
      setError({
        code: 'SEARCH_ERROR',
        message: 'Impossible d\'effectuer la recherche'
      });
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, minQueryLength, generateSuggestions, saveToRecentSearches]);

  /**
   * Lance une recherche avec debounce
   */
  const search = useCallback((query: string, filters?: WikiSearchFilters) => {
    setCurrentQuery(query);
    setCurrentFilters(filters || {});

    // Annuler le timer précédent
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // Lancer la recherche après le délai
    const timer = setTimeout(() => {
      performSearch(query, filters);
    }, debounceMs);

    setSearchTimer(timer);
  }, [performSearch, debounceMs, searchTimer]);

  /**
   * Efface les résultats de recherche
   */
  const clearSearch = useCallback(() => {
    setCurrentQuery('');
    setCurrentFilters({});
    setResults([]);
    setTotalResults(0);
    setSearchTime(0);
    setError(null);
    setSuggestions([]);

    if (searchTimer) {
      clearTimeout(searchTimer);
      setSearchTimer(null);
    }
  }, [searchTimer]);

  /**
   * Recherche instantanée (sans debounce)
   */
  const instantSearch = useCallback((query: string, filters?: WikiSearchFilters) => {
    setCurrentQuery(query);
    setCurrentFilters(filters || {});
    performSearch(query, filters);
  }, [performSearch]);

  /**
   * Relance la dernière recherche
   */
  const repeatLastSearch = useCallback(() => {
    if (currentQuery) {
      performSearch(currentQuery, currentFilters);
    }
  }, [currentQuery, currentFilters, performSearch]);

  // Initialisation - charger l'historique
  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  // Nettoyage du timer au démontage
  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  // Suggestions enrichies avec l'historique
  const enrichedSuggestions = useMemo(() => {
    if (!currentQuery || currentQuery.length < minQueryLength) {
      return recentSearches.slice(0, 5); // Afficher l'historique récent
    }
    return suggestions;
  }, [currentQuery, minQueryLength, recentSearches, suggestions]);

  return {
    results,
    loading,
    error,
    totalResults,
    searchTime,
    search,
    clearSearch,
    suggestions: enrichedSuggestions,
    recentSearches,
    // Fonctions utilitaires supplémentaires
    instantSearch,
    repeatLastSearch,
    currentQuery,
    currentFilters
  };
}