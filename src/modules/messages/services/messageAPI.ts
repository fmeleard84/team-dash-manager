import { supabase } from '@/integrations/supabase/client';
import type {
  MessageThread,
  Message,
  MessageParticipant,
  MessageAttachment,
  MessageStats,
  ThreadAnalytics,
  UserPresence,
  MessageFilters,
  ThreadFilters,
  CreateThreadData,
  UpdateThreadData,
  SendMessageData,
  UpdateMessageData,
  AddParticipantData,
  MessageNotification,
  MessageTemplate,
  AIResponse
} from '../types';

export class MessageAPI {
  /**
   * Récupère tous les threads d'un projet
   */
  static async getProjectThreads(projectId: string, filters?: ThreadFilters): Promise<MessageThread[]> {
    console.log('🔍 [MessageAPI] Loading threads for project:', projectId);

    let query = supabase
      .from('message_threads')
      .select(`
        *,
        message_participants (
          *,
          profiles (
            first_name,
            email,
            avatar
          )
        )
      `)
      .eq('project_id', projectId)
      .order('last_message_at', { ascending: false });

    if (filters) {
      if (filters.thread_type) {
        query = query.eq('thread_type', filters.thread_type);
      }
      if (filters.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived);
      }
      if (filters.participant_id) {
        query = query.contains('participants', [filters.participant_id]);
      }
      if (filters.search_query) {
        query = query.ilike('title', `%${filters.search_query}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [MessageAPI] Error fetching threads:', error);
      throw error;
    }

    return data?.map(thread => this.transformThreadData(thread)) || [];
  }

  /**
   * Récupère un thread par son ID
   */
  static async getThreadById(threadId: string): Promise<MessageThread | null> {
    const { data, error } = await supabase
      .from('message_threads')
      .select(`
        *,
        message_participants (
          *,
          profiles (
            first_name,
            email,
            avatar
          )
        )
      `)
      .eq('id', threadId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('❌ [MessageAPI] Error fetching thread:', error);
      throw error;
    }

    return data ? this.transformThreadData(data) : null;
  }

  /**
   * Crée un nouveau thread
   */
  static async createThread(threadData: CreateThreadData): Promise<MessageThread> {
    const { data, error } = await supabase
      .from('message_threads')
      .insert({
        project_id: threadData.project_id,
        title: threadData.title,
        description: threadData.description,
        thread_type: threadData.thread_type || 'general',
        settings: {
          allow_file_uploads: true,
          allow_reactions: true,
          allow_mentions: true,
          ai_assistant_enabled: false,
          require_approval_to_join: false,
          ...threadData.settings
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [MessageAPI] Error creating thread:', error);
      throw error;
    }

    // Ajouter les participants
    if (threadData.participants && threadData.participants.length > 0) {
      await this.addParticipants(data.id, threadData.participants);
    }

    // Ajouter le créateur comme participant owner
    await this.addParticipant({
      thread_id: data.id,
      user_id: data.created_by,
      role: 'owner'
    });

    // Envoyer le message initial si fourni
    if (threadData.initial_message) {
      await this.sendMessage({
        thread_id: data.id,
        content: threadData.initial_message,
        message_type: 'text'
      });
    }

    return this.transformThreadData(data);
  }

  /**
   * Met à jour un thread
   */
  static async updateThread(threadId: string, updates: UpdateThreadData): Promise<MessageThread> {
    const { data, error } = await supabase
      .from('message_threads')
      .update({
        title: updates.title,
        description: updates.description,
        thread_type: updates.thread_type,
        is_archived: updates.is_archived,
        settings: updates.settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', threadId)
      .select()
      .single();

    if (error) {
      console.error('❌ [MessageAPI] Error updating thread:', error);
      throw error;
    }

    return this.transformThreadData(data);
  }

  /**
   * Supprime un thread (soft delete)
   */
  static async deleteThread(threadId: string): Promise<void> {
    const { error } = await supabase
      .from('message_threads')
      .update({ is_archived: true })
      .eq('id', threadId);

    if (error) {
      console.error('❌ [MessageAPI] Error deleting thread:', error);
      throw error;
    }
  }

  /**
   * Récupère les messages d'un thread
   */
  static async getThreadMessages(threadId: string, filters?: MessageFilters): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select(`
        *,
        message_attachments (*),
        profiles (
          first_name,
          email,
          avatar
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (filters) {
      if (filters.message_type) {
        query = query.eq('message_type', filters.message_type);
      }
      if (filters.sender_id) {
        query = query.eq('sender_id', filters.sender_id);
      }
      if (filters.has_attachments) {
        query = filters.has_attachments
          ? query.not('message_attachments', 'is', null)
          : query.is('message_attachments', null);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.search_query) {
        query = query.ilike('content', `%${filters.search_query}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [MessageAPI] Error fetching messages:', error);
      throw error;
    }

    return data?.map(message => this.transformMessageData(message)) || [];
  }

  /**
   * Envoie un nouveau message
   */
  static async sendMessage(messageData: SendMessageData): Promise<Message> {
    // Insérer le message principal
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: messageData.thread_id,
        content: messageData.content,
        parent_message_id: messageData.parent_message_id,
        message_type: messageData.message_type || 'text',
        mentions: messageData.mentions || [],
        metadata: messageData.metadata
      })
      .select(`
        *,
        profiles (
          first_name,
          email,
          avatar
        )
      `)
      .single();

    if (messageError) {
      console.error('❌ [MessageAPI] Error sending message:', messageError);
      throw messageError;
    }

    // Gérer les attachements si présents
    if (messageData.attachments && messageData.attachments.length > 0) {
      await this.uploadMessageAttachments(message.id, messageData.attachments);
    }

    // Mettre à jour last_message_at du thread
    await supabase
      .from('message_threads')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', messageData.thread_id);

    return this.transformMessageData(message);
  }

  /**
   * Met à jour un message
   */
  static async updateMessage(messageId: string, updates: UpdateMessageData): Promise<Message> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.is_edited = true;
    }

    if (updates.is_deleted !== undefined) {
      updateData.is_deleted = updates.is_deleted;
    }

    const { data, error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', messageId)
      .select(`
        *,
        message_attachments (*),
        profiles (
          first_name,
          email,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('❌ [MessageAPI] Error updating message:', error);
      throw error;
    }

    return this.transformMessageData(data);
  }

  /**
   * Supprime un message
   */
  static async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('❌ [MessageAPI] Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Ajoute un participant à un thread
   */
  static async addParticipant(participantData: AddParticipantData): Promise<MessageParticipant> {
    const { data, error } = await supabase
      .from('message_participants')
      .insert({
        thread_id: participantData.thread_id,
        user_id: participantData.user_id,
        role: participantData.role || 'member',
        notification_settings: participantData.notification_settings || {
          email_notifications: true,
          push_notifications: true,
          mention_notifications: true,
          thread_notifications: true
        }
      })
      .select(`
        *,
        profiles (
          first_name,
          email,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('❌ [MessageAPI] Error adding participant:', error);
      throw error;
    }

    return this.transformParticipantData(data);
  }

  /**
   * Ajoute plusieurs participants
   */
  static async addParticipants(threadId: string, userIds: string[]): Promise<MessageParticipant[]> {
    const participants = userIds.map(userId => ({
      thread_id: threadId,
      user_id: userId,
      role: 'member' as const,
      notification_settings: {
        email_notifications: true,
        push_notifications: true,
        mention_notifications: true,
        thread_notifications: true
      }
    }));

    const { data, error } = await supabase
      .from('message_participants')
      .insert(participants)
      .select(`
        *,
        profiles (
          first_name,
          email,
          avatar
        )
      `);

    if (error) {
      console.error('❌ [MessageAPI] Error adding participants:', error);
      throw error;
    }

    return data?.map(participant => this.transformParticipantData(participant)) || [];
  }

  /**
   * Retire un participant d'un thread
   */
  static async removeParticipant(threadId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('message_participants')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [MessageAPI] Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Marque les messages comme lus
   */
  static async markMessagesAsRead(threadId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('message_participants')
      .update({
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('thread_id', threadId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [MessageAPI] Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques de messages d'un projet
   */
  static async getProjectMessageStats(projectId: string): Promise<MessageStats> {
    // Statistiques des threads
    const { data: threadsCount } = await supabase
      .from('message_threads')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('is_archived', false);

    // Statistiques des messages
    const { data: messagesCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .in('thread_id',
        (await supabase
          .from('message_threads')
          .select('id')
          .eq('project_id', projectId)
        ).data?.map(t => t.id) || []
      )
      .eq('is_deleted', false);

    // Messages d'aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const { data: todayMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`);

    // Participants actifs
    const { data: activeParticipants } = await supabase
      .from('message_participants')
      .select('user_id', { count: 'exact' })
      .gte('last_seen_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Attachments
    const { data: attachmentsCount } = await supabase
      .from('message_attachments')
      .select('id', { count: 'exact' });

    return {
      total_threads: threadsCount?.length || 0,
      total_messages: messagesCount?.length || 0,
      unread_messages: 0, // TODO: calculer les non lus
      active_participants: activeParticipants?.length || 0,
      messages_today: todayMessages?.length || 0,
      most_active_thread: '', // TODO: thread le plus actif
      response_time_avg_minutes: 0, // TODO: calculer temps de réponse
      file_attachments_count: attachmentsCount?.length || 0
    };
  }

  /**
   * Recherche dans les messages
   */
  static async searchMessages(projectId: string, query: string): Promise<Message[]> {
    const { data: threadIds } = await supabase
      .from('message_threads')
      .select('id')
      .eq('project_id', projectId);

    if (!threadIds) return [];

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        message_attachments (*),
        profiles (
          first_name,
          email,
          avatar
        )
      `)
      .in('thread_id', threadIds.map(t => t.id))
      .ilike('content', `%${query}%`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ [MessageAPI] Error searching messages:', error);
      throw error;
    }

    return data?.map(message => this.transformMessageData(message)) || [];
  }

  /**
   * Upload des attachements pour un message
   */
  private static async uploadMessageAttachments(messageId: string, files: File[]): Promise<MessageAttachment[]> {
    const attachments: MessageAttachment[] = [];

    for (const file of files) {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `messages/${messageId}/${fileName}`;

      // Upload le fichier
      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('❌ [MessageAPI] Error uploading file:', uploadError);
        continue;
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath);

      // Insérer l'attachment en base
      const { data: attachment, error: attachmentError } = await supabase
        .from('message_attachments')
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          is_image: file.type.startsWith('image/'),
          is_video: file.type.startsWith('video/'),
          is_document: file.type.includes('pdf') || file.type.includes('document')
        })
        .select()
        .single();

      if (!attachmentError && attachment) {
        attachments.push(attachment as MessageAttachment);
      }
    }

    return attachments;
  }

  // Méthodes de transformation des données
  private static transformThreadData(rawThread: any): MessageThread {
    return {
      id: rawThread.id,
      project_id: rawThread.project_id,
      title: rawThread.title,
      description: rawThread.description,
      created_by: rawThread.created_by,
      created_at: rawThread.created_at,
      updated_at: rawThread.updated_at,
      last_message_at: rawThread.last_message_at,
      is_active: rawThread.is_active ?? true,
      unread_count: 0, // TODO: calculer
      participants: rawThread.message_participants?.map((p: any) =>
        this.transformParticipantData(p)
      ) || [],
      thread_type: rawThread.thread_type || 'general',
      is_archived: rawThread.is_archived || false,
      metadata: rawThread.metadata
    };
  }

  private static transformMessageData(rawMessage: any): Message {
    return {
      id: rawMessage.id,
      thread_id: rawMessage.thread_id,
      sender_id: rawMessage.sender_id,
      sender_name: rawMessage.profiles?.first_name || 'Utilisateur',
      sender_email: rawMessage.profiles?.email || '',
      sender_avatar: rawMessage.profiles?.avatar,
      content: rawMessage.content,
      created_at: rawMessage.created_at,
      updated_at: rawMessage.updated_at,
      parent_message_id: rawMessage.parent_message_id,
      is_edited: rawMessage.is_edited || false,
      message_attachments: rawMessage.message_attachments || [],
      message_type: rawMessage.message_type || 'text',
      mentions: rawMessage.mentions || [],
      reactions: [], // TODO: récupérer reactions
      is_deleted: rawMessage.is_deleted || false,
      metadata: rawMessage.metadata
    };
  }

  private static transformParticipantData(rawParticipant: any): MessageParticipant {
    return {
      id: rawParticipant.id,
      thread_id: rawParticipant.thread_id,
      user_id: rawParticipant.user_id,
      user_name: rawParticipant.profiles?.first_name || 'Utilisateur',
      user_email: rawParticipant.profiles?.email || '',
      user_avatar: rawParticipant.profiles?.avatar,
      role: rawParticipant.role || 'member',
      joined_at: rawParticipant.created_at,
      last_seen_at: rawParticipant.last_seen_at,
      is_online: false, // TODO: calculer depuis presence
      notification_settings: rawParticipant.notification_settings
    };
  }
}