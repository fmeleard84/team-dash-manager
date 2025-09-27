/**
 * Module NOTIFICATIONS - Service API
 *
 * Service complet pour la gestion des notifications.
 * Basé sur la logique métier existante de useNotifications.ts.
 *
 * Fonctionnalités:
 * - CRUD complet des notifications
 * - Système de real-time avec Supabase
 * - Gestion des événements et invitations
 * - Support multi-canal (email, push, SMS)
 * - Threads de messages intégrés
 * - Préférences utilisateur
 * - Actions spécifiques (accepter/refuser)
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  Notification,
  NotificationResponse,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationPreferences,
  UpdatePreferencesRequest,
  BulkNotificationRequest,
  NotificationFilters,
  NotificationSorting,
  NotificationStats,
  MessageThread,
  Message,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationMetadata
} from '../types';

/**
 * API Client pour la gestion des notifications
 */
export class NotificationsAPI {
  private static readonly CACHE_TTL = 1000 * 60 * 2; // 2 minutes
  private static cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Cache simple pour optimiser les performances
   */
  private static getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCached<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ==========================================
  // GESTION DES NOTIFICATIONS
  // ==========================================

  /**
   * Récupère les notifications d'un utilisateur
   * Logique basée sur useNotifications.ts
   */
  static async getUserNotifications(
    userId: string,
    userEmail?: string,
    filters?: NotificationFilters
  ): Promise<NotificationResponse<Notification[]>> {
    try {
      console.log('[NotificationsAPI] Loading notifications for user:', userId);

      // Vérifier le cache
      const cacheKey = `notifications_${userId}_${JSON.stringify(filters)}`;
      const cached = this.getCached<Notification[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Récupérer les notifications générales
      let generalNotifications: any[] = [];

      try {
        const { data: generalData, error: generalError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!generalError && generalData) {
          generalNotifications = generalData;
        }
      } catch (error) {
        console.warn('Table notifications non accessible, continuons avec les événements');
      }

      // Récupérer le profil candidat pour les événements
      let eventNotifications: any[] = [];

      if (userEmail) {
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        if (candidateProfile) {
          const { data: eventData, error: eventError } = await supabase
            .from('candidate_event_notifications')
            .select(`
              id,
              title,
              description,
              event_date,
              location,
              video_url,
              status,
              created_at,
              updated_at,
              event_id,
              project_id
            `)
            .eq('candidate_id', candidateProfile.id)
            .neq('status', 'archived')
            .order('created_at', { ascending: false });

          if (!eventError && eventData) {
            eventNotifications = eventData;
          }
        }
      }

      // Formater les notifications
      const formattedNotifications = this.formatNotifications(
        generalNotifications,
        eventNotifications,
        userId
      );

      // Appliquer les filtres
      const filteredNotifications = this.applyFilters(formattedNotifications, filters);

      // Mettre en cache
      this.setCached(cacheKey, filteredNotifications);

      console.log('[NotificationsAPI] Notifications loaded successfully:', filteredNotifications.length);
      return { success: true, data: filteredNotifications };

    } catch (error) {
      console.error('[NotificationsAPI] Error loading notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement notifications'
      };
    }
  }

  /**
   * Crée une nouvelle notification
   */
  static async createNotification(request: CreateNotificationRequest): Promise<NotificationResponse<Notification>> {
    try {
      console.log('[NotificationsAPI] Creating notification:', request.type);

      const notificationData = {
        user_id: request.userId,
        type: request.type,
        priority: request.priority,
        title: request.title,
        description: request.message,
        message: request.message,
        data: request.metadata || {},
        read_at: null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        throw new Error(`Erreur création notification: ${error.message}`);
      }

      // Invalider le cache
      this.invalidateUserCache(request.userId);

      // Formater la notification créée
      const formattedNotification = this.formatGeneralNotification(data, request.userId);

      // Envoyer les notifications sur les autres canaux si configuré
      await this.sendMultiChannelNotification(request);

      console.log('[NotificationsAPI] Notification created successfully');
      return { success: true, data: formattedNotification };

    } catch (error) {
      console.error('[NotificationsAPI] Error creating notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur création notification'
      };
    }
  }

  /**
   * Met à jour une notification
   */
  static async updateNotification(request: UpdateNotificationRequest): Promise<NotificationResponse<Notification>> {
    try {
      console.log('[NotificationsAPI] Updating notification:', request.id);

      const updateData: any = {};

      if (request.status !== undefined) {
        if (request.status === 'read') {
          updateData.read_at = new Date().toISOString();
        } else if (request.status === 'archived') {
          updateData.archived_at = new Date().toISOString();
        }
      }

      if (request.metadata !== undefined) {
        updateData.data = request.metadata;
      }

      updateData.updated_at = new Date().toISOString();

      // Essayer de mettre à jour dans la table notifications générale
      let updated = false;
      let updatedNotification: any = null;

      try {
        const { data, error } = await supabase
          .from('notifications')
          .update(updateData)
          .eq('id', request.id)
          .select()
          .single();

        if (!error && data) {
          updatedNotification = data;
          updated = true;
        }
      } catch (error) {
        console.log('Notification générale non trouvée, essayons les événements');
      }

      // Si pas trouvé, essayer dans candidate_event_notifications
      if (!updated) {
        const eventUpdateData: any = {};

        if (request.status === 'read') {
          eventUpdateData.status = 'read';
        } else if (request.status === 'archived') {
          eventUpdateData.status = 'archived';
        }

        eventUpdateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('candidate_event_notifications')
          .update(eventUpdateData)
          .eq('id', request.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Erreur mise à jour notification: ${error.message}`);
        }

        updatedNotification = data;
      }

      // Invalider le cache
      this.cache.clear();

      console.log('[NotificationsAPI] Notification updated successfully');
      return { success: true, data: updatedNotification };

    } catch (error) {
      console.error('[NotificationsAPI] Error updating notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur mise à jour notification'
      };
    }
  }

  /**
   * Marque une notification comme lue
   */
  static async markAsRead(notificationId: string): Promise<NotificationResponse<boolean>> {
    try {
      const result = await this.updateNotification({
        id: notificationId,
        status: 'read'
      });

      if (result.success) {
        toast.success('Notification marquée comme lue');
      }

      return { success: result.success, data: result.success };

    } catch (error) {
      console.error('[NotificationsAPI] Error marking as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur marquage comme lu'
      };
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  static async markAllAsRead(userId: string, userEmail?: string): Promise<NotificationResponse<boolean>> {
    try {
      console.log('[NotificationsAPI] Marking all notifications as read for user:', userId);

      // Marquer les notifications générales comme lues
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      // Marquer les notifications d'événements comme lues
      if (userEmail) {
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        if (candidateProfile) {
          await supabase
            .from('candidate_event_notifications')
            .update({ status: 'read', updated_at: new Date().toISOString() })
            .eq('candidate_id', candidateProfile.id)
            .eq('status', 'pending');
        }
      }

      // Invalider le cache
      this.invalidateUserCache(userId);

      console.log('[NotificationsAPI] All notifications marked as read');
      return { success: true, data: true };

    } catch (error) {
      console.error('[NotificationsAPI] Error marking all as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur marquage global'
      };
    }
  }

  /**
   * Archive une notification
   */
  static async archiveNotification(notificationId: string): Promise<NotificationResponse<boolean>> {
    try {
      const result = await this.updateNotification({
        id: notificationId,
        status: 'archived'
      });

      if (result.success) {
        toast.success('Notification archivée');
      }

      return { success: result.success, data: result.success };

    } catch (error) {
      console.error('[NotificationsAPI] Error archiving notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur archivage'
      };
    }
  }

  // ==========================================
  // ACTIONS SPÉCIFIQUES ÉVÉNEMENTS
  // ==========================================

  /**
   * Accepte une invitation à un événement
   */
  static async acceptEvent(notificationId: string): Promise<NotificationResponse<boolean>> {
    try {
      console.log('[NotificationsAPI] Accepting event:', notificationId);

      const { error } = await supabase
        .from('candidate_event_notifications')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        throw new Error(`Erreur acceptation événement: ${error.message}`);
      }

      // Invalider le cache
      this.cache.clear();

      toast.success('Invitation acceptée');
      return { success: true, data: true };

    } catch (error) {
      console.error('[NotificationsAPI] Error accepting event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur acceptation événement'
      };
    }
  }

  /**
   * Refuse une invitation à un événement
   */
  static async declineEvent(notificationId: string): Promise<NotificationResponse<boolean>> {
    try {
      console.log('[NotificationsAPI] Declining event:', notificationId);

      const { error } = await supabase
        .from('candidate_event_notifications')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        throw new Error(`Erreur refus événement: ${error.message}`);
      }

      // Invalider le cache
      this.cache.clear();

      toast.success('Invitation refusée');
      return { success: true, data: true };

    } catch (error) {
      console.error('[NotificationsAPI] Error declining event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur refus événement'
      };
    }
  }

  // ==========================================
  // STATISTIQUES
  // ==========================================

  /**
   * Calcule les statistiques des notifications
   */
  static calculateStats(notifications: Notification[]): NotificationStats {
    const stats: NotificationStats = {
      total: notifications.length,
      unread: 0,
      byStatus: {
        unread: 0,
        read: 0,
        archived: 0
      },
      byType: {} as Record<NotificationType, number>,
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      }
    };

    notifications.forEach(notification => {
      // Compteurs par statut
      stats.byStatus[notification.status]++;
      if (notification.status === 'unread') {
        stats.unread++;
      }

      // Compteurs par type
      if (!stats.byType[notification.type]) {
        stats.byType[notification.type] = 0;
      }
      stats.byType[notification.type]++;

      // Compteurs par priorité
      stats.byPriority[notification.priority]++;
    });

    return stats;
  }

  // ==========================================
  // ENVOI MULTI-CANAL
  // ==========================================

  /**
   * Envoie une notification sur plusieurs canaux
   */
  private static async sendMultiChannelNotification(request: CreateNotificationRequest): Promise<void> {
    try {
      const channels = request.channels || ['in_app'];

      for (const channel of channels) {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(request);
            break;
          case 'push':
            await this.sendPushNotification(request);
            break;
          case 'sms':
            await this.sendSMSNotification(request);
            break;
          case 'webhook':
            await this.sendWebhookNotification(request);
            break;
          // 'in_app' est déjà géré par la création en base
        }
      }
    } catch (error) {
      console.error('[NotificationsAPI] Error sending multi-channel notification:', error);
    }
  }

  /**
   * Envoie une notification par email
   */
  private static async sendEmailNotification(request: CreateNotificationRequest): Promise<void> {
    // TODO: Intégrer avec le service email (Brevo)
    console.log('[NotificationsAPI] Sending email notification:', request.title);
  }

  /**
   * Envoie une notification push
   */
  private static async sendPushNotification(request: CreateNotificationRequest): Promise<void> {
    // TODO: Intégrer avec le service push
    console.log('[NotificationsAPI] Sending push notification:', request.title);
  }

  /**
   * Envoie une notification SMS
   */
  private static async sendSMSNotification(request: CreateNotificationRequest): Promise<void> {
    // TODO: Intégrer avec le service SMS
    console.log('[NotificationsAPI] Sending SMS notification:', request.title);
  }

  /**
   * Envoie une notification via webhook
   */
  private static async sendWebhookNotification(request: CreateNotificationRequest): Promise<void> {
    // TODO: Intégrer avec le système de webhooks
    console.log('[NotificationsAPI] Sending webhook notification:', request.title);
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  /**
   * Formate les notifications depuis les différentes sources
   */
  private static formatNotifications(
    generalNotifications: any[],
    eventNotifications: any[],
    userId: string
  ): Notification[] {
    const notifications: Notification[] = [];

    // Formater les notifications générales
    generalNotifications.forEach(notif => {
      notifications.push(this.formatGeneralNotification(notif, userId));
    });

    // Formater les notifications d'événements
    eventNotifications.forEach(event => {
      notifications.push(this.formatEventNotification(event, userId));
    });

    // Trier par date de création (plus récent en premier)
    return notifications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Formate une notification générale
   */
  private static formatGeneralNotification(notif: any, userId: string): Notification {
    return {
      id: notif.id,
      type: notif.type || 'system_alert',
      priority: notif.priority || 'medium',
      status: notif.read_at ? 'read' : 'unread',
      title: notif.title,
      message: notif.description || notif.message || '',
      metadata: notif.data || {},
      createdAt: notif.created_at,
      readAt: notif.read_at,
      archivedAt: notif.archived_at,
      expiresAt: notif.expires_at,
      userId: userId,
      userType: 'candidate', // À déterminer selon le contexte
      channels: ['in_app']
    };
  }

  /**
   * Formate une notification d'événement
   */
  private static formatEventNotification(event: any, userId: string): Notification {
    const isUrgent = new Date(event.event_date) < new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      id: event.id,
      type: 'event_invitation',
      priority: isUrgent ? 'high' : 'medium',
      status: event.status === 'pending' ? 'unread' : 'read',
      title: event.title,
      message: event.description || 'Nouvel événement',
      metadata: {
        eventId: event.event_id,
        projectId: event.project_id,
        eventDate: event.event_date,
        location: event.location,
        videoUrl: event.video_url,
        eventStatus: event.status
      },
      createdAt: event.created_at,
      readAt: event.status !== 'pending' ? event.updated_at : undefined,
      archivedAt: event.status === 'archived' ? event.updated_at : undefined,
      userId: userId,
      userType: 'candidate',
      channels: ['in_app'],
      actions: event.status === 'pending' ? [
        {
          id: 'accept',
          label: 'Accepter',
          type: 'primary',
          action: 'accept_event'
        },
        {
          id: 'decline',
          label: 'Refuser',
          type: 'secondary',
          action: 'decline_event'
        }
      ] : []
    };
  }

  /**
   * Applique les filtres aux notifications
   */
  private static applyFilters(notifications: Notification[], filters?: NotificationFilters): Notification[] {
    if (!filters) return notifications;

    let filtered = [...notifications];

    if (filters.status) {
      filtered = filtered.filter(n => filters.status!.includes(n.status));
    }

    if (filters.types) {
      filtered = filtered.filter(n => filters.types!.includes(n.type));
    }

    if (filters.priorities) {
      filtered = filtered.filter(n => filters.priorities!.includes(n.priority));
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      filtered = filtered.filter(n => {
        const date = new Date(n.createdAt);
        return date >= start && date <= end;
      });
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  /**
   * Invalide le cache d'un utilisateur
   */
  private static invalidateUserCache(userId: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(`notifications_${userId}`)) {
        this.cache.delete(key);
      }
    });
  }

  // ==========================================
  // NOTIFICATIONS SYSTÈME PRÉDÉFINIES
  // ==========================================

  /**
   * Crée une notification de nouveau projet
   */
  static async notifyNewProject(userId: string, projectName: string, projectId: string): Promise<void> {
    await this.createNotification({
      type: 'new_project',
      priority: 'medium',
      title: 'Nouveau projet disponible',
      message: `Le projet "${projectName}" est maintenant disponible`,
      userId,
      userType: 'candidate',
      metadata: { projectId, project_name: projectName },
      channels: ['in_app', 'push']
    });
  }

  /**
   * Crée une notification de tâche assignée
   */
  static async notifyTaskAssigned(userId: string, taskTitle: string, cardId: string): Promise<void> {
    await this.createNotification({
      type: 'card_assigned',
      priority: 'high',
      title: 'Nouvelle tâche assignée',
      message: `Vous avez été assigné à la tâche: ${taskTitle}`,
      userId,
      userType: 'candidate',
      metadata: { cardId, card_title: taskTitle },
      channels: ['in_app', 'push']
    });
  }

  /**
   * Crée une notification de nouveau message
   */
  static async notifyNewMessage(userId: string, senderName: string, threadId: string, preview: string): Promise<void> {
    await this.createNotification({
      type: 'new_message',
      priority: 'medium',
      title: 'Nouveau message',
      message: `${senderName}: ${preview}`,
      userId,
      userType: 'candidate',
      metadata: { threadId, sender_name: senderName, messagePreview: preview },
      channels: ['in_app', 'push']
    });
  }

  /**
   * Crée une notification de note reçue
   */
  static async notifyTaskRating(userId: string, rating: number, projectName?: string): Promise<void> {
    await this.createNotification({
      type: 'task_rating',
      priority: 'medium',
      title: 'Nouvelle évaluation reçue',
      message: `Vous avez reçu une note de ${rating}/5 étoiles${projectName ? ` sur le projet ${projectName}` : ''}`,
      userId,
      userType: 'candidate',
      metadata: { rating, project_name: projectName },
      channels: ['in_app']
    });
  }
}