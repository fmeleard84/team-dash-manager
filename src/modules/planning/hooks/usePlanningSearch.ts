/**
 * Hook spécialisé pour la recherche avancée dans le planning
 * Avec debouncing, filtres intelligents et suggestions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PlanningAPI } from '../services/planningAPI';
import type { PlanningSearchResult, EventFilters, ProjectEvent } from '../types';

interface UsePlanningSearchOptions {
  projectIds?: string[];
  debounceMs?: number;
  enableHistory?: boolean;
  maxHistoryItems?: number;
  enableSuggestions?: boolean;
}

interface UsePlanningSearchReturn {
  // État de la recherche
  query: string;
  results: PlanningSearchResult[];
  loading: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: (searchQuery?: string, searchFilters?: EventFilters) => Promise<void>;
  clearResults: () => void;
  clearHistory: () => void;

  // Filtres
  filters: EventFilters;
  setFilters: (filters: EventFilters) => void;
  resetFilters: () => void;

  // Historique et suggestions
  searchHistory: string[];
  suggestions: string[];
  useHistoryItem: (historyQuery: string) => void;

  // Statistiques
  totalResults: number;
  searchTime: number;
  resultsBreakdown: {
    byEventType: Record<string, number>;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

const DEFAULT_FILTERS: EventFilters = {};

export function usePlanningSearch({
  projectIds = [],
  debounceMs = 300,
  enableHistory = true,
  maxHistoryItems = 10,
  enableSuggestions = true
}: UsePlanningSearchOptions = {}): UsePlanningSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlanningSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchTime, setSearchTime] = useState(0);

  // Recherche avec debouncing
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: EventFilters) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const startTime = Date.now();

        const searchResults = await PlanningAPI.searchEvents(
          searchQuery,
          projectIds.length > 0 ? projectIds : undefined,
          searchFilters
        );

        setResults(searchResults);
        setSearchTime(Date.now() - startTime);

        // Ajouter à l'historique
        if (enableHistory && searchQuery.trim()) {
          setSearchHistory(prev => {
            const newHistory = [searchQuery, ...prev.filter(item => item !== searchQuery)];
            return newHistory.slice(0, maxHistoryItems);
          });
        }

        // Générer des suggestions basées sur les résultats
        if (enableSuggestions) {
          generateSuggestions(searchResults, searchQuery);
        }

      } catch (err) {
        console.error('[usePlanningSearch] Error searching:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs),
    [projectIds, debounceMs, enableHistory, maxHistoryItems, enableSuggestions]
  );

  // Fonction de recherche manuelle
  const search = useCallback(async (searchQuery?: string, searchFilters?: EventFilters) => {
    const finalQuery = searchQuery ?? query;
    const finalFilters = searchFilters ?? filters;
    await debouncedSearch(finalQuery, finalFilters);
  }, [query, filters, debouncedSearch]);

  // Effet pour recherche automatique lors des changements
  useEffect(() => {
    if (query.trim() && query.length >= 2) {
      debouncedSearch(query, filters);
    } else {
      setResults([]);
      setSuggestions([]);
    }
  }, [query, filters, debouncedSearch]);

  // Générer des suggestions intelligentes
  const generateSuggestions = useCallback((searchResults: PlanningSearchResult[], currentQuery: string) => {
    const suggestions = new Set<string>();

    // Suggestions basées sur les titres des résultats
    searchResults.forEach(result => {
      const words = result.event.title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !word.includes(currentQuery.toLowerCase()) && suggestions.size < 5) {
          suggestions.add(word);
        }
      });
    });

    // Suggestions basées sur les types d'événements
    const eventTypes = [...new Set(searchResults.map(r => r.event.event_type))];
    eventTypes.forEach(type => {
      if (suggestions.size < 8) {
        suggestions.add(getEventTypeLabel(type));
      }
    });

    setSuggestions(Array.from(suggestions).slice(0, 8));
  }, []);

  // Utiliser un élément de l'historique
  const useHistoryItem = useCallback((historyQuery: string) => {
    setQuery(historyQuery);
  }, []);

  // Effacer les résultats
  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
    setSearchTime(0);
    setSuggestions([]);
  }, []);

  // Effacer l'historique
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  // Réinitialiser les filtres
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Statistiques calculées
  const totalResults = results.length;

  const resultsBreakdown = useMemo(() => {
    const byEventType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    results.forEach(result => {
      const event = result.event;

      // Par type d'événement
      byEventType[event.event_type] = (byEventType[event.event_type] || 0) + 1;

      // Par statut
      byStatus[event.status] = (byStatus[event.status] || 0) + 1;

      // Par priorité
      byPriority[event.priority] = (byPriority[event.priority] || 0) + 1;
    });

    return { byEventType, byStatus, byPriority };
  }, [results]);

  // Filtres intelligents basés sur les résultats
  const smartFilters = useMemo(() => {
    if (results.length === 0) return {};

    const eventTypes = new Set<string>();
    const locations = new Set<string>();
    const creators = new Set<string>();

    results.forEach(result => {
      eventTypes.add(result.event.event_type);
      if (result.event.location) locations.add(result.event.location);
      if (result.event.created_by) creators.add(result.event.created_by);
    });

    return {
      availableEventTypes: Array.from(eventTypes),
      availableLocations: Array.from(locations),
      availableCreators: Array.from(creators)
    };
  }, [results]);

  return {
    // État
    query,
    results,
    loading,
    error,

    // Actions
    setQuery,
    search,
    clearResults,
    clearHistory,

    // Filtres
    filters,
    setFilters,
    resetFilters,

    // Historique et suggestions
    searchHistory,
    suggestions,
    useHistoryItem,

    // Statistiques
    totalResults,
    searchTime,
    resultsBreakdown,

    // Filtres intelligents (non inclus dans le type de retour mais disponible)
    ...smartFilters
  };
}

/**
 * Fonction utilitaire de debouncing
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Fonction utilitaire pour les libellés des types d'événements
 */
function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    'meeting': 'Réunion',
    'kickoff': 'Kickoff',
    'review': 'Revue',
    'demo': 'Démo',
    'workshop': 'Atelier',
    'planning': 'Planification',
    'other': 'Autre'
  };

  return labels[eventType] || eventType;
}