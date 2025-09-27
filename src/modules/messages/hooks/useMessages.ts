import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { MessageAPI } from '../services/messageAPI';
import type {
  MessageThread,
  Message,
  MessageFilters,
  ThreadFilters,
  MessageStats
} from '../types';

export const useMessages = (threadId: string, filters?: MessageFilters) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [useMessages] Loading messages for thread:', threadId);
      const data = await MessageAPI.getThreadMessages(threadId, filters);
      setMessages(data);
      console.log('✅ [useMessages] Loaded messages:', data.length);
    } catch (err) {
      console.error('❌ [useMessages] Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [threadId, filters]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    refetch: loadMessages,
    setMessages
  };
};

export const useMessageThreads = (projectId: string, filters?: ThreadFilters) => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [useMessageThreads] Loading threads for project:', projectId);
      const data = await MessageAPI.getProjectThreads(projectId, filters);
      setThreads(data);
      console.log('✅ [useMessageThreads] Loaded threads:', data.length);
    } catch (err) {
      console.error('❌ [useMessageThreads] Error loading threads:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  return {
    threads,
    loading,
    error,
    refetch: loadThreads,
    setThreads
  };
};

export const useMessageStats = (projectId: string) => {
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      console.log('📊 [useMessageStats] Loading stats for project:', projectId);
      const data = await MessageAPI.getProjectMessageStats(projectId);
      setStats(data);
      console.log('✅ [useMessageStats] Stats loaded:', data);
    } catch (err) {
      console.error('❌ [useMessageStats] Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refetch: loadStats
  };
};