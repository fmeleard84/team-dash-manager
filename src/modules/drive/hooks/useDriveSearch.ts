/**
 * Hook spécialisé pour la recherche avancée dans les drives
 * Avec debouncing, historique et filtres intelligents
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DriveAPI } from '../services/driveAPI';
import type { DriveSearchResult, DriveFilters } from '../types';

interface UseDriveSearchOptions {
  driveId: string;
  debounceMs?: number;
  enableHistory?: boolean;
  maxHistoryItems?: number;
}

interface UseDriveSearchReturn {
  // État de la recherche
  query: string;
  results: DriveSearchResult[];
  loading: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: (searchQuery?: string, searchFilters?: DriveFilters) => Promise<void>;
  clearResults: () => void;
  clearHistory: () => void;

  // Filtres
  filters: DriveFilters;
  setFilters: (filters: DriveFilters) => void;
  resetFilters: () => void;

  // Historique
  searchHistory: string[];
  useHistoryItem: (historyQuery: string) => void;

  // Statistiques
  totalResults: number;
  searchTime: number;
}

const DEFAULT_FILTERS: DriveFilters = {};

export function useDriveSearch({
  driveId,
  debounceMs = 300,
  enableHistory = true,
  maxHistoryItems = 10
}: UseDriveSearchOptions): UseDriveSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DriveSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DriveFilters>(DEFAULT_FILTERS);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchTime, setSearchTime] = useState(0);

  // Recherche avec debouncing
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: DriveFilters) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const startTime = Date.now();

        const searchResults = await DriveAPI.searchFiles(driveId, searchQuery, searchFilters);

        setResults(searchResults);
        setSearchTime(Date.now() - startTime);

        // Ajouter à l'historique
        if (enableHistory && searchQuery.trim()) {
          setSearchHistory(prev => {
            const newHistory = [searchQuery, ...prev.filter(item => item !== searchQuery)];
            return newHistory.slice(0, maxHistoryItems);
          });
        }

      } catch (err) {
        console.error('[useDriveSearch] Error searching:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs),
    [driveId, debounceMs, enableHistory, maxHistoryItems]
  );

  // Fonction de recherche manuelle
  const search = useCallback(async (searchQuery?: string, searchFilters?: DriveFilters) => {
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
    }
  }, [query, filters, debouncedSearch]);

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

  // Filtres de recherche intelligents basés sur les résultats
  const smartFilters = useMemo(() => {
    if (results.length === 0) return {};

    const fileTypes = new Set<string>();
    const extensions = new Set<string>();
    const creators = new Set<string>();

    results.forEach(result => {
      if (result.node.mime_type) {
        fileTypes.add(result.node.mime_type);
      }
      if (result.node.file_extension) {
        extensions.add(result.node.file_extension);
      }
      if (result.node.created_by) {
        creators.add(result.node.created_by);
      }
    });

    return {
      availableFileTypes: Array.from(fileTypes),
      availableExtensions: Array.from(extensions),
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

    // Historique
    searchHistory,
    useHistoryItem,

    // Statistiques
    totalResults,
    searchTime,

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