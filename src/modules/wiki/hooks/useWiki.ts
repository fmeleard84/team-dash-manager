import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WikiAPI } from '../services/wikiAPI';
import {
  WikiPage,
  WikiNavigation,
  WikiStats,
  WikiSettings,
  WikiFilters,
  WikiError,
  UseWikiReturn
} from '../types';

interface UseWikiOptions {
  projectId: string;
  filters?: WikiFilters;
  autoRefresh?: boolean;
  realtime?: boolean;
}

export function useWiki({
  projectId,
  filters,
  autoRefresh = false,
  realtime = true
}: UseWikiOptions): UseWikiReturn {
  // États principaux
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [navigation, setNavigation] = useState<WikiNavigation | null>(null);
  const [stats, setStats] = useState<WikiStats | null>(null);
  const [settings, setSettings] = useState<WikiSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WikiError | null>(null);

  // ID utilisateur actuel
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /**
   * Récupère l'utilisateur actuel
   */
  const getCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    }
  }, []);

  /**
   * Charge les pages avec filtres
   */
  const loadPages = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await WikiAPI.getPages(projectId, filters);

      if (response.success) {
        setPages(response.data);
      } else {
        setError(response.error || {
          code: 'UNKNOWN_ERROR',
          message: 'Erreur inconnue lors du chargement des pages'
        });
      }
    } catch (err) {
      console.error('useWiki.loadPages:', err);
      setError({
        code: 'FETCH_ERROR',
        message: 'Impossible de charger les pages du wiki'
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  /**
   * Charge la navigation
   */
  const loadNavigation = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await WikiAPI.getNavigation(projectId);

      if (response.success) {
        // Enrichir la navigation avec l'utilisateur actuel
        const enrichedNavigation: WikiNavigation = {
          ...response.data,
          authors: response.data.authors.map(author => ({
            ...author,
            is_current_user: author.id === currentUserId
          }))
        };
        setNavigation(enrichedNavigation);
      }
    } catch (err) {
      console.error('useWiki.loadNavigation:', err);
    }
  }, [projectId, currentUserId]);

  /**
   * Charge les statistiques
   */
  const loadStats = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await WikiAPI.getStats(projectId);

      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('useWiki.loadStats:', err);
    }
  }, [projectId]);

  /**
   * Charge les paramètres du wiki
   */
  const loadSettings = useCallback(async () => {
    if (!projectId) return;

    try {
      // Configuration par défaut (peut être enrichie depuis la base)
      const defaultSettings: WikiSettings = {
        project_id: projectId,
        auto_save_interval: 30, // 30 secondes
        default_visibility: 'public',
        allow_comments: true,
        allow_anonymous_comments: false,
        require_approval_for_comments: false,
        enable_version_history: true,
        max_versions_per_page: 50,
        enable_notifications: true,
        notification_types: ['page_created', 'page_updated', 'comment_added'],
        export_formats: ['pdf', 'html', 'markdown'],
        custom_templates: []
      };

      setSettings(defaultSettings);
    } catch (err) {
      console.error('useWiki.loadSettings:', err);
    }
  }, [projectId]);

  /**
   * Recharge toutes les données
   */
  const refetch = useCallback(async () => {
    await Promise.all([
      loadPages(),
      loadNavigation(),
      loadStats(),
      loadSettings()
    ]);
  }, [loadPages, loadNavigation, loadStats, loadSettings]);

  // Fonctions de recharge individuelles
  const refetchPages = loadPages;
  const refetchNavigation = loadNavigation;
  const refetchStats = loadStats;

  // Initialisation
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  useEffect(() => {
    if (projectId && currentUserId !== null) {
      refetch();
    }
  }, [projectId, currentUserId, refetch]);

  // Auto-refresh périodique
  useEffect(() => {
    if (!autoRefresh || !projectId) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [autoRefresh, projectId, refetch]);

  // Configuration du real-time
  useEffect(() => {
    if (!realtime || !projectId || !currentUserId) return;

    const channel = supabase
      .channel(`wiki-pages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wiki_pages',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          console.log('Wiki pages realtime event:', payload);

          if (payload.eventType === 'INSERT') {
            // Nouvelle page ajoutée
            const response = await WikiAPI.getPage(payload.new.id);
            if (response.success) {
              setPages(prev => [response.data, ...prev]);

              // Notification seulement si ce n'est pas l'utilisateur actuel
              if (payload.new.author_id !== currentUserId) {
                // Vous pouvez ajouter une notification toast ici
                console.log('Nouvelle page wiki ajoutée:', payload.new.title);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            // Page mise à jour
            setPages(prev => prev.map(page =>
              page.id === payload.new.id
                ? { ...page, ...payload.new }
                : page
            ));

            // Notification pour les changements importants
            if (payload.new.last_edited_by !== currentUserId) {
              console.log('Page wiki modifiée:', payload.new.title);
            }
          } else if (payload.eventType === 'DELETE') {
            // Page supprimée
            setPages(prev => prev.filter(page => page.id !== payload.old.id));

            console.log('Page wiki supprimée');
          }

          // Recharger la navigation et les stats
          await Promise.all([loadNavigation(), loadStats()]);
        }
      )
      .subscribe();

    // Également écouter les commentaires pour mettre à jour les compteurs
    const commentsChannel = supabase
      .channel(`wiki-comments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wiki_comments',
          filter: `page_id=in.(${pages.map(p => p.id).join(',')})`
        },
        async (payload) => {
          console.log('Wiki comments realtime event:', payload);

          // Mettre à jour les compteurs de commentaires
          if (payload.eventType === 'INSERT') {
            setPages(prev => prev.map(page =>
              page.id === payload.new.page_id
                ? { ...page, comments_count: (page.comments_count || 0) + 1 }
                : page
            ));
          } else if (payload.eventType === 'DELETE') {
            setPages(prev => prev.map(page =>
              page.id === payload.old.page_id
                ? { ...page, comments_count: Math.max(0, (page.comments_count || 0) - 1) }
                : page
            ));
          }

          await loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(commentsChannel);
    };
  }, [realtime, projectId, currentUserId, pages.length, loadNavigation, loadStats]);

  // Effet pour recharger les données quand les filtres changent
  useEffect(() => {
    if (projectId && currentUserId !== null) {
      loadPages();
    }
  }, [filters, loadPages, projectId, currentUserId]);

  return {
    pages,
    loading,
    error,
    navigation,
    stats,
    settings,
    refetch,
    refetchPages,
    refetchNavigation,
    refetchStats
  };
}