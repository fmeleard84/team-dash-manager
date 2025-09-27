/**
 * Module NOTIFICATIONS - Hook useNotifications
 *
 * Hook React complet pour la gestion des notifications.
 * Basé sur la logique métier existante de /src/hooks/useNotifications.ts.
 *
 * Fonctionnalités:
 * - Chargement et cache des notifications
 * - Real-time subscriptions avec Supabase
 * - Actions complètes (markAsRead, archive, accept/decline)
 * - Support événements et notifications générales
 * - Filtrage et statistiques
 * - Optimisations de performance
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { NotificationsAPI } from '../services';
import type {
  Notification,
  NotificationFilters,
  NotificationSorting,
  NotificationStats,
  UseNotificationsProps,
  UseNotificationsReturn,
  NotificationPreferences,
  RealTimeSubscriptionOptions
} from '../types';

/**
 * Hook principal pour la gestion des notifications
 * Compatible avec l'implémentation existante
 */
export const useNotifications = (props?: UseNotificationsProps): UseNotificationsReturn => {
  const { filters, sorting, autoRefresh = true, realTimeEnabled = true } = props || {};
  const { user } = useAuth();

  // États
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Refs pour la gestion des subscriptions
  const channelRef = useRef<any>(null);
  const lastNotificationRef = useRef<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // FONCTIONS DE CHARGEMENT
  // ==========================================

  /**
   * Charge les notifications depuis l'API
   */
  const loadNotifications = useCallback(async (force = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (!force && !loading) setLoading(true);

      console.log('[useNotifications] Loading notifications...');

      const result = await NotificationsAPI.getUserNotifications(
        user.id,
        user.email || undefined,
        filters
      );

      if (result.success) {
        setNotifications(result.data);
        setError(null);
        setLastRefresh(new Date());
      } else {
        setError(result.error || 'Erreur lors du chargement des notifications');
        console.error('[useNotifications] Load error:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('[useNotifications] Exception:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filters, loading]);

  /**
   * Actualise les données
   */
  const refetch = useCallback(() => {
    return loadNotifications(true);
  }, [loadNotifications]);

  // ==========================================
  // ACTIONS SUR LES NOTIFICATIONS
  // ==========================================

  /**
   * Marque une notification comme lue
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      console.log('[useNotifications] Marking as read:', notificationId);

      const result = await NotificationsAPI.markAsRead(notificationId);

      if (result.success) {
        // Mise à jour optimiste
        setNotifications(prev => prev.map(n =>
          n.id === notificationId
            ? { ...n, status: 'read', readAt: new Date().toISOString() }
            : n
        ));
      } else {
        throw new Error(result.error || 'Erreur marquage comme lu');
      }

      return result;
    } catch (err) {
      console.error('[useNotifications] Mark as read error:', err);
      toast.error('Erreur lors du marquage comme lu');
      throw err;
    }
  }, []);

  /**
   * Marque toutes les notifications comme lues
   */
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[useNotifications] Marking all as read');

      const result = await NotificationsAPI.markAllAsRead(user.id, user.email || undefined);

      if (result.success) {
        // Mise à jour optimiste
        setNotifications(prev => prev.map(n => ({
          ...n,
          status: 'read' as const,
          readAt: new Date().toISOString()
        })));

        toast.success('Toutes les notifications ont été marquées comme lues');
      } else {
        throw new Error(result.error || 'Erreur marquage global');
      }

      return result;
    } catch (err) {
      console.error('[useNotifications] Mark all as read error:', err);
      toast.error('Erreur lors du marquage global');
      throw err;
    }
  }, [user]);

  /**
   * Archive une notification
   */
  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      console.log('[useNotifications] Archiving notification:', notificationId);

      const result = await NotificationsAPI.archiveNotification(notificationId);

      if (result.success) {
        // Retirer de la liste (optimistic)
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        throw new Error(result.error || 'Erreur archivage');
      }

      return result;
    } catch (err) {
      console.error('[useNotifications] Archive error:', err);
      toast.error('Erreur lors de l\'archivage');
      throw err;
    }
  }, []);

  /**
   * Accepte une invitation d'événement
   */
  const acceptEvent = useCallback(async (notificationId: string) => {
    try {
      console.log('[useNotifications] Accepting event:', notificationId);

      const result = await NotificationsAPI.acceptEvent(notificationId);

      if (result.success) {
        // Mise à jour optimiste
        setNotifications(prev => prev.map(n =>
          n.id === notificationId
            ? {
                ...n,
                status: 'read',
                readAt: new Date().toISOString(),
                metadata: { ...n.metadata, eventStatus: 'accepted' },
                actions: [] // Retirer les actions
              }
            : n
        ));
      } else {
        throw new Error(result.error || 'Erreur acceptation événement');
      }

      return result;
    } catch (err) {
      console.error('[useNotifications] Accept event error:', err);
      toast.error('Erreur lors de l\'acceptation');
      throw err;
    }
  }, []);

  /**
   * Refuse une invitation d'événement
   */
  const declineEvent = useCallback(async (notificationId: string) => {
    try {
      console.log('[useNotifications] Declining event:', notificationId);

      const result = await NotificationsAPI.declineEvent(notificationId);

      if (result.success) {
        // Mise à jour optimiste
        setNotifications(prev => prev.map(n =>
          n.id === notificationId
            ? {
                ...n,
                status: 'read',
                readAt: new Date().toISOString(),
                metadata: { ...n.metadata, eventStatus: 'declined' },
                actions: [] // Retirer les actions
              }
            : n
        ));
      } else {
        throw new Error(result.error || 'Erreur refus événement');
      }

      return result;
    } catch (err) {
      console.error('[useNotifications] Decline event error:', err);
      toast.error('Erreur lors du refus');
      throw err;
    }
  }, []);

  // ==========================================
  // DONNÉES COMPUTÉES
  // ==========================================

  /**
   * Notifications filtrées et triées
   */
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    // Appliquer le tri
    if (sorting) {
      result.sort((a, b) => {
        const aValue = a[sorting.field];
        const bValue = b[sorting.field];

        const comparison = new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
        return sorting.direction === 'asc' ? -comparison : comparison;
      });
    } else {
      // Tri par défaut : plus récent en premier
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [notifications, sorting]);

  /**
   * Statistiques des notifications
   */
  const stats = useMemo((): NotificationStats => {
    return NotificationsAPI.calculateStats(notifications);
  }, [notifications]);

  /**
   * Nombre de notifications non lues
   */
  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.status === 'unread').length;
  }, [notifications]);

  /**
   * Indicateur de nouvelles notifications
   */
  const hasNew = useMemo(() => {
    return unreadCount > 0;
  }, [unreadCount]);

  // ==========================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================

  /**
   * Configure les subscriptions real-time
   */
  const setupRealTimeSubscriptions = useCallback(() => {
    if (!user || !realTimeEnabled) return;

    console.log('[useNotifications] Setting up real-time subscriptions');

    // Nettoyer l'ancienne subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Créer une nouvelle subscription
    const channel = supabase
      .channel(`notifications-${user.id}`)

      // Notifications d'événements candidat
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_event_notifications'
        },
        (payload) => {
          console.log('[useNotifications] Event notification changed:', payload);
          loadNotifications(true);
        }
      )

      // Notifications générales
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[useNotifications] General notification changed:', payload);
          loadNotifications(true);
        }
      )

      // Nouvelles notes sur tâches
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_ratings'
        },
        async (payload) => {
          if (payload.new && payload.new.id !== lastNotificationRef.current) {
            lastNotificationRef.current = payload.new.id;
            toast.success('Nouvelle note reçue sur une tâche');
            loadNotifications(true);
          }
        }
      )

      // Nouvelles assignations de cartes
      .on(
        'postgres_changes',
        {
          event: ['INSERT', 'UPDATE'],
          schema: 'public',
          table: 'kanban_cards'
        },
        async (payload) => {
          if (payload.new && payload.new.assigned_to) {
            const assignedUsers = Array.isArray(payload.new.assigned_to)
              ? payload.new.assigned_to
              : [payload.new.assigned_to];

            // Vérifier si l'utilisateur courant est assigné
            const isAssigned = assignedUsers.some((assignedUser: string) =>
              assignedUser && (
                assignedUser.includes(user?.email || '') ||
                assignedUser.includes(user?.user_metadata?.firstName) ||
                assignedUser.includes(user?.user_metadata?.lastName)
              )
            );

            if (isAssigned && payload.eventType === 'INSERT') {
              toast.success('Nouvelle tâche vous a été assignée');
              loadNotifications(true);
            }
          }
        }
      )

      // Nouveaux messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          if (payload.new && payload.new.sender_id !== user?.id) {
            toast.success('Nouveau message reçu');
            loadNotifications(true);
          }
        }
      )

      // Nouveaux projets
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects'
        },
        async (payload) => {
          if (payload.new) {
            const projectStatus = payload.new.status || 'pause';
            if (projectStatus === 'pause') {
              toast.success('Nouveau projet créé');
            }
            loadNotifications(true);
          }
        }
      )

      // Projets démarrés
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects'
        },
        async (payload) => {
          if (payload.new && payload.new.status === 'play' && payload.old?.status !== 'play') {
            toast.success('Un projet a été démarré');
            loadNotifications(true);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [user, realTimeEnabled, loadNotifications]);

  // ==========================================
  // AUTO-REFRESH
  // ==========================================

  /**
   * Configure l'auto-refresh
   */
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefresh) return;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      loadNotifications(true);
      setupAutoRefresh(); // Récursif
    }, 30000); // 30 secondes
  }, [autoRefresh, loadNotifications]);

  // ==========================================
  // EFFETS
  // ==========================================

  /**
   * Chargement initial et setup des subscriptions
   */
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Chargement initial
    loadNotifications();

    // Setup real-time
    setupRealTimeSubscriptions();

    // Setup auto-refresh
    setupAutoRefresh();

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [user?.id, user?.email, loadNotifications, setupRealTimeSubscriptions, setupAutoRefresh]);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // Données
    notifications: filteredNotifications,
    loading,
    error,
    stats,
    unreadCount,
    hasNew,
    lastRefresh,

    // Actions
    markAsRead,
    markAllAsRead,
    archiveNotification,
    acceptEvent,
    declineEvent,
    refetch,

    // Utilitaires
    loadNotifications
  };
};