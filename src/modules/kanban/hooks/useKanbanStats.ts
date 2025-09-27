import { useState, useEffect, useCallback } from 'react';
import { KanbanAPI } from '../services/kanbanAPI';
import type { KanbanStats, TeamMember } from '../types';

export const useKanbanStats = (boardId: string) => {
  const [stats, setStats] = useState<KanbanStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);
      console.log('📊 [useKanbanStats] Loading stats for board:', boardId);
      const data = await KanbanAPI.getBoardStats(boardId);
      setStats(data);
      console.log('✅ [useKanbanStats] Stats loaded:', data);
    } catch (err) {
      console.error('❌ [useKanbanStats] Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

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

export const useKanbanMembers = (boardId: string) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);
      console.log('👥 [useKanbanMembers] Loading members for board:', boardId);
      const data = await KanbanAPI.getBoardMembers(boardId);
      setMembers(data);
      console.log('✅ [useKanbanMembers] Members loaded:', data.length);
    } catch (err) {
      console.error('❌ [useKanbanMembers] Error loading members:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return {
    members,
    loading,
    error,
    refetch: loadMembers
  };
};