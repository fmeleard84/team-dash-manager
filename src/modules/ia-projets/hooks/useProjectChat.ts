/**
 * Hook Chat IA - Module IA PROJETS
 *
 * Hook spécialisé pour la gestion des conversations avec l'assistant IA.
 * Fournit une interface React optimisée pour le chat temps réel.
 *
 * Fonctionnalités :
 * - Gestion des messages temps réel
 * - États de frappe et connexion
 * - Historique des conversations
 * - Retry automatique en cas d'erreur
 * - Optimisation des performances
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { ProjectAIAPI } from '../services';
import { supabase } from '@/integrations/supabase/client';
import type {
  AIConversation,
  AIMessage,
  UseProjectChatReturn,
  ConversationType,
  MessageAttachment
} from '../types';

/**
 * Hook spécialisé pour le chat avec l'IA projet
 */
export function useProjectChat(assistantId?: string): UseProjectChatReturn {
  // État de conversation
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Gestion d'erreurs et retry
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Références pour optimisation
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Charge les messages de la conversation active
   */
  useEffect(() => {
    if (conversation?.id) {
      loadMessages(conversation.id);
      subscribeToMessages(conversation.id);
    }

    return () => {
      // Cleanup des subscriptions
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [conversation?.id]);

  /**
   * Auto-scroll vers le dernier message
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Charge les messages d'une conversation
   */
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversationId', conversationId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      setError(null);

    } catch (error) {
      console.error('[useProjectChat] Erreur loadMessages:', error);
      setError('Erreur lors du chargement des messages');
    }
  }, []);

  /**
   * S'abonne aux nouveaux messages en temps réel
   */
  const subscribeToMessages = useCallback((conversationId: string) => {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_messages',
          filter: `conversationId=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as AIMessage;
          setMessages(prev => [...prev, newMessage]);

          // Arrêter l'indicateur de frappe si c'est un message de l'assistant
          if (newMessage.role === 'assistant') {
            setIsTyping(false);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Démarre une nouvelle conversation
   */
  const startNewConversation = useCallback(async (
    type: ConversationType
  ): Promise<boolean> => {
    if (!assistantId) {
      toast.error('Aucun assistant disponible');
      return false;
    }

    try {
      setError(null);
      setRetryCount(0);

      const response = await ProjectAIAPI.startConversation({
        assistantId,
        type
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur création conversation');
      }

      const newConversation = response.data.conversation;
      setConversation(newConversation);

      // Ajouter le message de bienvenue s'il existe
      if (response.data.welcomeMessage) {
        setMessages([response.data.welcomeMessage]);
      }

      setIsConnected(true);
      return true;

    } catch (error) {
      console.error('[useProjectChat] Erreur startNewConversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur conversation';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [assistantId]);

  /**
   * Envoie un message
   */
  const sendMessage = useCallback(async (
    content: string,
    attachments?: MessageAttachment[]
  ): Promise<boolean> => {
    if (!conversation) {
      toast.error('Aucune conversation active');
      return false;
    }

    if (!content.trim()) {
      toast.error('Le message ne peut pas être vide');
      return false;
    }

    try {
      setError(null);

      // Annuler la requête précédente si elle existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Afficher l'indicateur de frappe pour l'IA
      setIsTyping(true);

      const response = await ProjectAIAPI.sendMessage({
        conversationId: conversation.id,
        content: content.trim(),
        attachments
      });

      if (!response.success) {
        throw new Error(response.error || 'Erreur envoi message');
      }

      setRetryCount(0);
      return true;

    } catch (error) {
      console.error('[useProjectChat] Erreur sendMessage:', error);

      setIsTyping(false);

      // Ne pas afficher d'erreur si la requête a été annulée
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erreur envoi';
      setError(errorMessage);

      // Proposer un retry si on n'a pas dépassé le max
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        toast.error(`${errorMessage} - Tentative ${retryCount + 1}/${maxRetries}`);
      } else {
        toast.error(errorMessage);
        setIsConnected(false);
      }

      return false;
    }
  }, [conversation, retryCount, maxRetries]);

  /**
   * Termine la conversation active
   */
  const endConversation = useCallback(async (): Promise<boolean> => {
    if (!conversation) return true;

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({
          status: 'completed',
          endedAt: new Date().toISOString(),
          duration: Date.now() - new Date(conversation.startedAt).getTime()
        })
        .eq('id', conversation.id);

      if (error) throw error;

      setConversation(null);
      setMessages([]);
      setIsTyping(false);
      setError(null);
      setRetryCount(0);

      return true;

    } catch (error) {
      console.error('[useProjectChat] Erreur endConversation:', error);
      setError('Erreur fin de conversation');
      return false;
    }
  }, [conversation]);

  /**
   * Modifie un message existant
   */
  const editMessage = useCallback(async (
    messageId: string,
    newContent: string
  ): Promise<boolean> => {
    if (!newContent.trim()) {
      toast.error('Le contenu ne peut pas être vide');
      return false;
    }

    try {
      const { error } = await supabase
        .from('ai_messages')
        .update({
          content: newContent.trim(),
          edited: true,
          editedAt: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      // Mettre à jour l'état local
      setMessages(prev =>
        prev.map(msg => msg.id === messageId
          ? { ...msg, content: newContent.trim(), edited: true, editedAt: new Date().toISOString() }
          : msg
        )
      );

      toast.success('Message modifié');
      return true;

    } catch (error) {
      console.error('[useProjectChat] Erreur editMessage:', error);
      toast.error('Erreur modification message');
      return false;
    }
  }, []);

  /**
   * Supprime un message
   */
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      // Mettre à jour l'état local
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      toast.success('Message supprimé');
      return true;

    } catch (error) {
      console.error('[useProjectChat] Erreur deleteMessage:', error);
      toast.error('Erreur suppression message');
      return false;
    }
  }, []);

  /**
   * Régénère une réponse de l'IA
   */
  const regenerateResponse = useCallback(async (messageId: string): Promise<boolean> => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'assistant') {
      toast.error('Impossible de régénérer ce message');
      return false;
    }

    try {
      // Supprimer le message existant
      await deleteMessage(messageId);

      // Trouver le message utilisateur précédent
      const messageIndex = messages.findIndex(m => m.id === messageId);
      const previousUserMessage = messages
        .slice(0, messageIndex)
        .reverse()
        .find(m => m.role === 'user');

      if (!previousUserMessage) {
        toast.error('Message utilisateur précédent non trouvé');
        return false;
      }

      // Renvoyer le message pour obtenir une nouvelle réponse
      return await sendMessage(previousUserMessage.content, previousUserMessage.attachments);

    } catch (error) {
      console.error('[useProjectChat] Erreur regenerateResponse:', error);
      toast.error('Erreur régénération réponse');
      return false;
    }
  }, [messages, deleteMessage, sendMessage]);

  /**
   * Retry de la dernière action
   */
  const retryLastAction = useCallback(async (): Promise<boolean> => {
    if (retryCount >= maxRetries) {
      toast.error('Nombre maximum de tentatives atteint');
      return false;
    }

    // Récupérer le dernier message utilisateur
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(m => m.role === 'user');

    if (!lastUserMessage) {
      toast.error('Aucun message à renvoyer');
      return false;
    }

    return await sendMessage(lastUserMessage.content, lastUserMessage.attachments);
  }, [retryCount, maxRetries, messages, sendMessage]);

  /**
   * Scroll vers le bas
   */
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  /**
   * Simule l'état de frappe de l'utilisateur
   */
  const simulateTyping = useCallback((duration: number = 2000) => {
    setIsTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, duration);
  }, []);

  /**
   * Récupère les statistiques de la conversation
   */
  const getConversationStats = useCallback(() => {
    if (!conversation || messages.length === 0) {
      return {
        messageCount: 0,
        userMessages: 0,
        aiMessages: 0,
        averageResponseTime: 0,
        tokensUsed: 0,
        duration: 0
      };
    }

    const userMessages = messages.filter(m => m.role === 'user').length;
    const aiMessages = messages.filter(m => m.role === 'assistant').length;
    const totalTokens = messages.reduce((acc, m) => acc + (m.tokensUsed || 0), 0);
    const responseTimes = messages
      .filter(m => m.role === 'assistant' && m.processingTime)
      .map(m => m.processingTime!);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((acc, time) => acc + time, 0) / responseTimes.length
      : 0;

    const duration = conversation.endedAt
      ? new Date(conversation.endedAt).getTime() - new Date(conversation.startedAt).getTime()
      : Date.now() - new Date(conversation.startedAt).getTime();

    return {
      messageCount: messages.length,
      userMessages,
      aiMessages,
      averageResponseTime,
      tokensUsed: totalTokens,
      duration
    };
  }, [conversation, messages]);

  // Valeurs calculées
  const canRetry = retryCount < maxRetries && !isTyping;
  const hasMessages = messages.length > 0;
  const lastMessage = messages[messages.length - 1];

  return {
    // État de conversation
    conversation,
    messages,
    isTyping,
    isConnected,

    // Actions de chat
    sendMessage,
    startNewConversation,
    endConversation,

    // Gestion des messages
    editMessage,
    deleteMessage,
    regenerateResponse,

    // État et contrôles
    error,
    retryCount,
    canRetry,

    // Méthodes utilitaires
    retryLastAction: retryLastAction,
    simulateTyping,
    scrollToBottom,
    getConversationStats,

    // Valeurs calculées
    hasMessages,
    lastMessage
  };
}