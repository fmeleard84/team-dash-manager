import { useState, useCallback } from 'react';
import { MessageAPI } from '../services/messageAPI';
import type {
  MessageThread,
  Message,
  MessageParticipant,
  CreateThreadData,
  UpdateThreadData,
  SendMessageData,
  UpdateMessageData,
  AddParticipantData
} from '../types';

export const useMessageActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Thread Actions
  const createThread = useCallback(async (data: CreateThreadData): Promise<MessageThread | null> => {
    try {
      setLoading(true);
      setError(null);
      const thread = await MessageAPI.createThread(data);
      console.log('✅ [useMessageActions] Thread created:', thread.id);
      return thread;
    } catch (err) {
      console.error('❌ [useMessageActions] Error creating thread:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateThread = useCallback(async (
    threadId: string,
    updates: UpdateThreadData
  ): Promise<MessageThread | null> => {
    try {
      setLoading(true);
      setError(null);
      const thread = await MessageAPI.updateThread(threadId, updates);
      console.log('✅ [useMessageActions] Thread updated:', thread.id);
      return thread;
    } catch (err) {
      console.error('❌ [useMessageActions] Error updating thread:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteThread = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await MessageAPI.deleteThread(threadId);
      console.log('✅ [useMessageActions] Thread deleted:', threadId);
      return true;
    } catch (err) {
      console.error('❌ [useMessageActions] Error deleting thread:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Message Actions
  const sendMessage = useCallback(async (data: SendMessageData): Promise<Message | null> => {
    try {
      setLoading(true);
      setError(null);
      const message = await MessageAPI.sendMessage(data);
      console.log('✅ [useMessageActions] Message sent:', message.id);
      return message;
    } catch (err) {
      console.error('❌ [useMessageActions] Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMessage = useCallback(async (
    messageId: string,
    updates: UpdateMessageData
  ): Promise<Message | null> => {
    try {
      setLoading(true);
      setError(null);
      const message = await MessageAPI.updateMessage(messageId, updates);
      console.log('✅ [useMessageActions] Message updated:', message.id);
      return message;
    } catch (err) {
      console.error('❌ [useMessageActions] Error updating message:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await MessageAPI.deleteMessage(messageId);
      console.log('✅ [useMessageActions] Message deleted:', messageId);
      return true;
    } catch (err) {
      console.error('❌ [useMessageActions] Error deleting message:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Participant Actions
  const addParticipant = useCallback(async (data: AddParticipantData): Promise<MessageParticipant | null> => {
    try {
      setLoading(true);
      setError(null);
      const participant = await MessageAPI.addParticipant(data);
      console.log('✅ [useMessageActions] Participant added:', participant.user_id);
      return participant;
    } catch (err) {
      console.error('❌ [useMessageActions] Error adding participant:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeParticipant = useCallback(async (threadId: string, userId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await MessageAPI.removeParticipant(threadId, userId);
      console.log('✅ [useMessageActions] Participant removed:', userId);
      return true;
    } catch (err) {
      console.error('❌ [useMessageActions] Error removing participant:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (threadId: string, userId: string): Promise<boolean> => {
    try {
      await MessageAPI.markMessagesAsRead(threadId, userId);
      console.log('✅ [useMessageActions] Messages marked as read for thread:', threadId);
      return true;
    } catch (err) {
      console.error('❌ [useMessageActions] Error marking as read:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du marquage');
      return false;
    }
  }, []);

  const searchMessages = useCallback(async (projectId: string, query: string): Promise<Message[]> => {
    try {
      setLoading(true);
      setError(null);
      const messages = await MessageAPI.searchMessages(projectId, query);
      console.log('✅ [useMessageActions] Search completed, found:', messages.length);
      return messages;
    } catch (err) {
      console.error('❌ [useMessageActions] Error searching messages:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Thread actions
    createThread,
    updateThread,
    deleteThread,

    // Message actions
    sendMessage,
    updateMessage,
    deleteMessage,

    // Participant actions
    addParticipant,
    removeParticipant,
    markAsRead,

    // Search
    searchMessages,

    // State
    loading,
    error,
    clearError
  };
};